import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ConnectionQuality, RELAY_SHARE_TIER, SHARE_TIERS, ShareAdaptation, setCameraQuality, setShareQuality, viaRelay } from '../src/lib/connection-quality';

function report(...rows: Record<string, unknown>[]) {
  return new Map(rows.map((row) => [row.id, row])) as unknown as RTCStatsReport;
}
const latency = (rtt: number) => report({ id: 'pair', type: 'candidate-pair', nominated: true, state: 'succeeded', currentRoundTripTime: rtt });

test('requires sustained trouble and sustained recovery', () => {
  const quality = new ConnectionQuality(0);
  assert.equal(quality.sample(latency(1.2), 'connected'), false);
  assert.equal(quality.sample(latency(1.2), 'connected'), false);
  assert.equal(quality.sample(latency(1.2), 'connected'), false);
  assert.equal(quality.sample(latency(1.2), 'connected'), false);
  assert.equal(quality.sample(latency(1.2), 'connected'), true);
  for (let i = 0; i < 2; i++) assert.equal(quality.sample(latency(0.1), 'connected'), true);
  assert.equal(quality.sample(latency(0.1), 'connected'), false);
});

test('uses interval loss and recovers despite historical lost packets', () => {
  const quality = new ConnectionQuality(0);
  const sample = (received: number, lost: number) => quality.sample(report({ id: 'in', type: 'inbound-rtp', packetsReceived: received, packetsLost: lost }), 'connected');
  sample(0, 0);
  sample(80, 20); sample(160, 40); sample(240, 60); sample(320, 80);
  assert.equal(sample(400, 100), true);
  for (let i = 1; i <= 5; i++) sample(400 + i * 100, 100);
  assert.equal(quality.poor, false);
});

test('ignores unused ICE pairs and CPU encoding limits', () => {
  const quality = new ConnectionQuality(0);
  for (let i = 0; i < 4; i++) {
    quality.sample(report({ id: 'unused', type: 'candidate-pair', state: 'succeeded', currentRoundTripTime: 2 }, { id: 'out', type: 'outbound-rtp', qualityLimitationReason: 'cpu' }), 'connected');
  }
  assert.equal(quality.poor, false);
});

test('missing samples do not declare recovery; disconnected calls warn', () => {
  const quality = new ConnectionQuality(0);
  for (let i = 0; i < 5; i++) quality.sample(report(), 'disconnected');
  assert.equal(quality.poor, true);
  for (let i = 0; i < 5; i++) quality.sample(report(), 'connected');
  assert.equal(quality.poor, true);
});

test('camera limits reduce bandwidth and restore without touching audio', async () => {
  let latest: RTCRtpSendParameters | undefined;
  const video = { track: { kind: 'video', getSettings: () => ({ height: 1080 }) }, getParameters: () => ({ encodings: [{}] }), setParameters: async (params: RTCRtpSendParameters) => { latest = params; } };
  const audio = { track: { kind: 'audio' }, getParameters: () => { throw Error('audio must remain untouched'); } };
  const pc = { getSenders: () => [video, audio] } as unknown as RTCPeerConnection;
  await setCameraQuality(pc, true);
  assert.equal(latest?.encodings[0].maxBitrate, 220_000);
  assert.equal(latest?.encodings[0].scaleResolutionDownBy, 3);
  await setCameraQuality(pc, false);
  assert.equal(latest?.encodings[0].maxBitrate, 900_000);
  assert.equal(latest?.encodings[0].scaleResolutionDownBy, 1.5);
  // Through the metered relay: half the bitrate at 540p. A struggling link still wins.
  await setCameraQuality(pc, false, true);
  assert.equal(latest?.encodings[0].maxBitrate, 450_000);
  assert.equal(latest?.encodings[0].scaleResolutionDownBy, 2);
  await setCameraQuality(pc, true, true);
  assert.equal(latest?.encodings[0].maxBitrate, 220_000);
});


test('bandwidth adaptation and moderate latency lower camera quality without warning', () => {
  const quality = new ConnectionQuality(0);
  for (let i = 0; i < 20; i++) quality.sample(report(
    { id: 'pair', type: 'candidate-pair', nominated: true, state: 'succeeded', currentRoundTripTime: 0.7 },
    { id: 'video', type: 'outbound-rtp', qualityLimitationReason: 'bandwidth' },
  ), 'connected');
  assert.equal(quality.limited, true);
  assert.equal(quality.poor, false);
});

test('call startup has a grace period before counting sustained trouble', () => {
  const quality = new ConnectionQuality();
  for (let now = 0; now < 18_000; now += 2000) assert.equal(quality.sample(latency(1.2), 'connected', now), false);
  assert.equal(quality.sample(latency(1.2), 'connected', 18_000), true);
});

test('a brief interruption does not warn and unknown samples break the streak', () => {
  const quality = new ConnectionQuality(0);
  for (let i = 0; i < 4; i++) quality.sample(latency(1.2), 'connected');
  quality.sample(report(), 'connected');
  assert.equal(quality.sample(latency(1.2), 'connected'), false);
  assert.equal(quality.sample(latency(0.1), 'connected'), false);
});

const shareStats = (reason: string, rtt = 0.05) => report(
  { id: 'pair', type: 'candidate-pair', nominated: true, state: 'succeeded', currentRoundTripTime: rtt },
  { id: 'out', type: 'outbound-rtp', kind: 'video', qualityLimitationReason: reason },
);

test('screen share steps down under sustained CPU or bandwidth limits, not during warmup', () => {
  const share = new ShareAdaptation();
  for (let now = 0; now < 14_000; now += 2000) assert.equal(share.sample(shareStats('bandwidth'), now), 0);
  for (let i = 0; i < 3; i++) share.sample(shareStats('cpu'), 16_000 + i * 2000);
  assert.equal(share.sample(shareStats('cpu'), 22_000), 1);
  for (let i = 0; i < 20; i++) share.sample(shareStats('bandwidth'), 24_000 + i * 2000);
  assert.equal(share.tier, SHARE_TIERS.length - 1);
});

test('screen share steps back up and backs off after a failed try', () => {
  const share = new ShareAdaptation(0);
  let now = 0;
  const run = (reason: string, n: number) => { for (let i = 0; i < n; i++) share.sample(shareStats(reason), now += 2000); };
  run('cpu', 4);
  assert.equal(share.tier, 1);
  run('none', 15);
  assert.equal(share.tier, 0);
  run('cpu', 4);
  assert.equal(share.tier, 1);
  run('none', 29);
  assert.equal(share.tier, 1, 'the failed step up doubles the wait');
  run('none', 1);
  assert.equal(share.tier, 0);
  run('none', 30);
  run('cpu', 4);
  run('none', 15);
  assert.equal(share.tier, 0, 'a step up that held resets the wait');
});

test('share steps scale the capture to the step height', async () => {
  let latest: RTCRtpSendParameters | undefined;
  const video = { track: { kind: 'video', getSettings: () => ({ height: 2160 }) }, getParameters: () => ({ encodings: [{}] }), setParameters: async (params: RTCRtpSendParameters) => { latest = params; } };
  const pc = { getSenders: () => [video] } as unknown as RTCPeerConnection;
  await setShareQuality(pc, 0);
  assert.equal(latest?.encodings[0].scaleResolutionDownBy, 1);
  await setShareQuality(pc, 2);
  assert.equal(latest?.encodings[0].scaleResolutionDownBy, 2);
  assert.equal(latest?.encodings[0].maxBitrate, 6_000_000);
});

test('tells a relayed connection from a direct one, by the pair in use', () => {
  const stats = (local: string, remote: string) => report(
    { id: 't', type: 'transport', selectedCandidatePairId: 'p' },
    { id: 'p', type: 'candidate-pair', localCandidateId: 'l', remoteCandidateId: 'r', state: 'succeeded', nominated: true },
    { id: 'l', type: 'local-candidate', candidateType: local },
    { id: 'r', type: 'remote-candidate', candidateType: remote },
  );
  assert.equal(viaRelay(stats('host', 'srflx')), false);
  assert.equal(viaRelay(stats('relay', 'host')), true);
  assert.equal(viaRelay(stats('srflx', 'relay')), true, 'the other side relaying counts too');
  assert.equal(viaRelay(report()), false, 'not connected yet');
});

test('the relay cap is the lowest share step', () => {
  assert.equal(RELAY_SHARE_TIER, SHARE_TIERS.length - 1);
  assert.ok(SHARE_TIERS[RELAY_SHARE_TIER].bitrate <= 2_500_000);
});
