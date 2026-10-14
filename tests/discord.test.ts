import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { test } from 'node:test';
import { respond, verifyDiscordRequest } from '../src/lib/discord';

const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const publicHex = Buffer.from(publicKey.export({ format: 'jwk' }).x!, 'base64url').toString('hex');
const now = Date.now();
const ts = String(Math.floor(now / 1000));
const signed = (body: string, timestamp = ts) => sign(null, Buffer.from(timestamp + body), privateKey).toString('hex');

test('accepts only requests signed by the app key, and only fresh ones', () => {
  const body = '{"type":1}';
  assert.equal(verifyDiscordRequest(body, signed(body), ts, publicHex, now), true);
  assert.equal(verifyDiscordRequest('{"type":2}', signed(body), ts, publicHex, now), false, 'tampered body');
  const other = Buffer.from(generateKeyPairSync('ed25519').publicKey.export({ format: 'jwk' }).x!, 'base64url').toString('hex');
  assert.equal(verifyDiscordRequest(body, signed(body), ts, other, now), false, 'wrong key');
  assert.equal(verifyDiscordRequest(body, null, ts, publicHex, now), false, 'no signature');
  const old = String(Math.floor(now / 1000) - 600);
  assert.equal(verifyDiscordRequest(body, signed(body, old), old, publicHex, now), false, 'replayed later');
});

test('answers the ping Discord sends when the endpoint is set up', () => {
  assert.deepEqual(respond({ type: 1 }), { type: 1 });
});

test('/watch posts a join button for a new room, named after whoever typed it', () => {
  const reply = respond(
    { type: 2, data: { name: 'watch', options: [{ name: 'what', value: 'Frieren ep 4' }, { name: 'link', value: 'https://www.youtube.com/watch?v=x' }] }, member: { user: { username: 'sam', global_name: 'Sam' } } },
    'abcd-efgh',
  ) as { type: number; data: { content: string; components: { components: { url: string }[] }[]; allowed_mentions: unknown } };
  assert.equal(reply.type, 4);
  assert.match(reply.data.content, /\*\*Sam\*\* started a watch room for \*\*Frieren ep 4\*\*/);
  const url = new URL(reply.data.components[0].components[0].url);
  assert.equal(url.pathname, '/join/abcd-efgh');
  assert.equal(url.searchParams.get('from'), 'Sam');
  assert.equal(url.searchParams.get('to'), 'https://www.youtube.com/watch?v=x');
  assert.equal(url.searchParams.get('utm_source'), 'discord');
  assert.deepEqual(reply.data.allowed_mentions, { parse: [] });
});

test('in a DM the user comes from the interaction itself', () => {
  const reply = respond({ type: 2, data: { name: 'watch' }, user: { username: 'alex' } }, 'abcd-efgh') as { data: { content: string } };
  assert.match(reply.data.content, /^\*\*alex\*\* started a watch room 🍿/);
});

test('what people type cannot restyle the message, hide a link or ping anyone', () => {
  const reply = respond({ type: 2, data: { name: 'watch', options: [{ name: 'what', value: '**[free nitro](https://evil.example)** @everyone' }] }, user: { username: 'x' } }, 'abcd-efgh') as { data: { content: string; allowed_mentions: unknown } };
  assert.ok(!reply.data.content.includes('[free nitro]'), 'no masked link');
  assert.ok(reply.data.content.includes('\\*\\*'), 'bold markers escaped');
  assert.deepEqual(reply.data.allowed_mentions, { parse: [] });
});

test('a link that is not a web address is refused, privately', () => {
  const reply = respond({ type: 2, data: { name: 'watch', options: [{ name: 'link', value: 'javascript:alert(1)' }] }, user: { username: 'x' } }) as { data: { flags: number } };
  assert.equal(reply.data.flags, 64);
});
