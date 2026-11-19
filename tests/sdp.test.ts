import assert from 'node:assert/strict';
import { test } from 'node:test';
import { startVideoBitrate, tuneMusicOpus, tuneSdp } from '../src/lib/sdp';

const answer = [
  'v=0',
  'm=audio 9 UDP/TLS/RTP/SAVPF 111 63',
  'a=rtpmap:111 opus/48000/2',
  'a=fmtp:111 minptime=10;useinbandfec=1',
  'a=rtpmap:63 red/48000/2',
  'a=fmtp:63 111/111',
  'm=video 9 UDP/TLS/RTP/SAVPF 98 99 102',
  'a=rtpmap:98 VP9/90000',
  'a=fmtp:98 profile-id=0',
  'a=rtpmap:99 rtx/90000',
  'a=fmtp:99 apt=98',
  'a=rtpmap:102 H264/90000',
  '',
].join('\r\n');

test('music Opus: stereo at full rate, FEC on, DTX off, existing params kept', () => {
  const sdp = tuneMusicOpus(answer, 128);
  assert.match(sdp, /^a=fmtp:111 minptime=10;useinbandfec=1;stereo=1;sprop-stereo=1;maxaveragebitrate=128000;maxplaybackrate=48000;usedtx=0\r$/m);
  assert.match(sdp, /^a=fmtp:63 111\/111\r$/m, 'RED is left alone');
  assert.ok(sdp.split('\r\n').every((l) => !l.includes('\n')), 'line endings preserved');
});

test('start bitrate goes on every video codec, adding an fmtp line where missing, not on RTX', () => {
  const sdp = startVideoBitrate(answer, 4000);
  assert.match(sdp, /^a=fmtp:98 profile-id=0;x-google-start-bitrate=4000\r$/m);
  assert.match(sdp, /^a=rtpmap:102 H264\/90000\r\na=fmtp:102 x-google-start-bitrate=4000\r$/m);
  assert.match(sdp, /^a=fmtp:99 apt=98\r$/m);
});

test('tuneSdp applies edits in order and passes through a description without SDP', () => {
  const desc = tuneSdp({ type: 'answer', sdp: answer } as RTCSessionDescriptionInit, (s) => tuneMusicOpus(s), (s) => startVideoBitrate(s, 1));
  assert.equal(desc.type, 'answer');
  assert.match(desc.sdp!, /stereo=1/);
  assert.match(desc.sdp!, /x-google-start-bitrate=1/);
  const empty = { type: 'rollback' } as RTCSessionDescriptionInit;
  assert.equal(tuneSdp(empty, tuneMusicOpus), empty);
});
