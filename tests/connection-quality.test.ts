import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ConnectionQuality, setCameraQuality } from '../src/lib/connection-quality';

function report(...rows: Record<string, unknown>[]) {
  return new Map(rows.map((row) => [row.id, row])) as unknown as RTCStatsReport;
}
const latency = (rtt: number) => report({ id: 'pair', type: 'candidate-pair', nominated: true, state: 'succeeded', currentRoundTripTime: rtt });

test('requires sustained trouble and sustained recovery', () => {
  const quality = new ConnectionQuality();
  assert.equal(quality.sample(latency(0.9), 'connected'), false);
  assert.equal(quality.sample(latency(0.9), 'connected'), false);
  assert.equal(quality.sample(latency(0.9), 'connected'), true);
  for (let i = 0; i < 4; i++) assert.equal(quality.sample(latency(0.1), 'connected'), true);
  assert.equal(quality.sample(latency(0.1), 'connected'), false);
});

test('uses interval loss and recovers despite historical lost packets', () => {
  const quality = new ConnectionQuality();
  const sample = (received: number, lost: number) => quality.sample(report({ id: 'in', type: 'inbound-rtp', packetsReceived: received, packetsLost: lost }), 'connected');
  sample(0, 0);
  sample(90, 10); sample(180, 20);
  assert.equal(sample(270, 30), true);
  for (let i = 1; i <= 5; i++) sample(270 + i * 100, 30);
  assert.equal(quality.poor, false);
});

test('ignores unused ICE pairs and CPU encoding limits', () => {
  const quality = new ConnectionQuality();
  for (let i = 0; i < 4; i++) {
    quality.sample(report({ id: 'unused', type: 'candidate-pair', state: 'succeeded', currentRoundTripTime: 2 }, { id: 'out', type: 'outbound-rtp', qualityLimitationReason: 'cpu' }), 'connected');
  }
  assert.equal(quality.poor, false);
});

test('missing samples do not declare recovery; disconnected calls warn', () => {
  const quality = new ConnectionQuality();
  for (let i = 0; i < 3; i++) quality.sample(report(), 'disconnected');
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
