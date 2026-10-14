import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { test } from 'node:test';
import { TURN_TTL_S, mintIceServers } from '../src/lib/turn';

const URLS = 'stun:stun.relay.metered.ca:80,turn:global.relay.metered.ca:80,turns:global.relay.metered.ca:443?transport=tcp,';
const reply = (status: number, body: unknown) => (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

test('without a provider set up, nothing is minted and the page keeps its own setting', async () => {
  assert.equal(await mintIceServers({ NEXT_PUBLIC_TURN_URL: URLS }, reply(200, {})), null);
});

test('Metered: an expiring credential for the relay addresses only, secret never in the result', async () => {
  let asked = '';
  let sent: { expiryInSeconds?: number } = {};
  const fetchImpl = (async (url: string, init: RequestInit) => {
    asked = url;
    sent = JSON.parse(String(init.body));
    return new Response(JSON.stringify({ username: 'u1', password: 'p1' }));
  }) as unknown as typeof fetch;
  const minted = await mintIceServers({ METERED_DOMAIN: 'tandem.metered.live', METERED_SECRET_KEY: 's3cr3t', NEXT_PUBLIC_TURN_URL: URLS }, fetchImpl, 1_000);
  assert.ok(asked.startsWith('https://tandem.metered.live/api/v1/turn/credential?secretKey='));
  assert.equal(sent.expiryInSeconds, TURN_TTL_S);
  assert.deepEqual(minted, {
    iceServers: [{ urls: ['turn:global.relay.metered.ca:80', 'turns:global.relay.metered.ca:443?transport=tcp'], username: 'u1', credential: 'p1' }],
    expiresAt: 1_000 + TURN_TTL_S * 1000,
  });
  assert.ok(!JSON.stringify(minted).includes('s3cr3t'));
});

test('Metered refusing is an error, so the route answers 502 and the page falls back', async () => {
  await assert.rejects(mintIceServers({ METERED_DOMAIN: 'x.metered.live', METERED_SECRET_KEY: 'bad', NEXT_PUBLIC_TURN_URL: URLS }, reply(401, { error: 'invalid key' })));
});

test('Cloudflare: keeps the relay entries from either response shape', async () => {
  const env = { CLOUDFLARE_TURN_KEY_ID: 'k', CLOUDFLARE_TURN_API_TOKEN: 't' };
  const list = await mintIceServers(env, reply(200, { iceServers: [{ urls: ['stun:stun.cloudflare.com:3478', 'turn:turn.cloudflare.com:3478?transport=udp'], username: 'a', credential: 'b' }] }));
  assert.deepEqual(list?.iceServers, [{ urls: ['turn:turn.cloudflare.com:3478?transport=udp'], username: 'a', credential: 'b' }]);
  const single = await mintIceServers(env, reply(200, { iceServers: { urls: ['turns:turn.cloudflare.com:5349?transport=tcp'], username: 'a', credential: 'b' } }));
  assert.equal(single?.iceServers.length, 1);
});

test('own relay (coturn): credentials computed here, valid only until they expire', async () => {
  const fetchImpl = (async () => { throw new Error('nothing should be called'); }) as unknown as typeof fetch;
  const minted = await mintIceServers({ TURN_SECRET: 'shh', TURN_URLS: 'turn:turn.example.com:3478,turns:turn.example.com:443?transport=tcp' }, fetchImpl, 1_000_000);
  const server = minted!.iceServers[0];
  const expiry = Math.floor((1_000_000 + TURN_TTL_S * 1000) / 1000);
  assert.equal(server.username, `${expiry}:tandem`);
  // What coturn computes to check it: base64(HMAC-SHA1(secret, username)).
  assert.equal(server.credential, createHmac('sha1', 'shh').update(`${expiry}:tandem`).digest('base64'));
  assert.deepEqual(server.urls, ['turn:turn.example.com:3478', 'turns:turn.example.com:443?transport=tcp']);
  assert.ok(!JSON.stringify(minted).includes('shh'));
});

test('own relay wins over a hosted provider when both are set', async () => {
  const minted = await mintIceServers({ TURN_SECRET: 's', TURN_URLS: 'turn:a:3478', METERED_DOMAIN: 'x', METERED_SECRET_KEY: 'y' }, reply(500, {}));
  assert.match(String(minted!.iceServers[0].username), /:tandem$/);
});
