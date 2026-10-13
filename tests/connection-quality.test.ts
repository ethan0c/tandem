import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ConnectionQuality, setCameraQuality } from '../src/lib/connection-quality';

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
