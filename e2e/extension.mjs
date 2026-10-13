import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';

function background() {
  let listener;
  let removed;
  const sent = [];
  vm.runInNewContext(readFileSync(new URL('../extension/background.js', import.meta.url), 'utf8'), {
    chrome: {
      runtime: { onMessage: { addListener(fn) { listener = fn; } } },
      tabs: {
        onRemoved: { addListener(fn) { removed = fn; } },
        sendMessage(tab, message, options) { sent.push({ tab, message, options }); return Promise.resolve(); },
      },
    },
  });
  return {
    sent,
    send(frameId, message, tab = 1) { listener({ to: 'top', ...message }, { tab: { id: tab }, frameId }); },
    remove(tab) { removed(tab); },
  };
}

test('only the elected player sends playback, and remote commands target it', () => {
  const b = background();
  b.send(0, { type: 'tandem:session', active: true });
  b.send(0, { type: 'tandem:status', hasVideo: true, area: 100 });
  b.send(2, { type: 'tandem:status', hasVideo: true, area: 10000 });
  const before = b.sent.length;
  b.send(0, { type: 'tandem:event', playing: true, time: 5 });
  assert.equal(b.sent.length, before);
  b.send(2, { type: 'tandem:event', playing: true, time: 5 });
  assert.equal(b.sent.at(-1).options.frameId, 0);
  b.send(0, { type: 'tandem:apply', state: { playing: true, time: 9, localUpdatedAt: 1 } });
  assert.equal(b.sent.at(-1).options.frameId, 2);
  b.send(2, { type: 'tandem:status', hasVideo: false });
  assert.ok(b.sent.some(({ message, options }) => message.type === 'tandem:apply' && options.frameId === 0));
  b.send(0, { type: 'tandem:status', hasVideo: false });
  assert.equal(b.sent.at(-1).message.hasVideo, false);
});

test('late frames join an active session; leaving and tab removal clear state', () => {
  const b = background();
  b.send(0, { type: 'tandem:session', active: true });
  b.send(3, { type: 'tandem:controller-ready' });
  assert.equal(b.sent.at(-1).options.frameId, 3);
  assert.equal(b.sent.at(-1).message.active, true);
  b.send(0, { type: 'tandem:session', active: false });
  const before = b.sent.length;
  b.send(3, { type: 'tandem:controller-ready' });
  assert.equal(b.sent.length, before);
  b.send(0, { type: 'tandem:session', active: true });
  b.remove(1);
  const after = b.sent.length;
  b.send(3, { type: 'tandem:event', time: 5 });
  assert.equal(b.sent.length, after);
});

test('manifest configures all ten service targets and optional site access', () => {
  const m = JSON.parse(readFileSync(new URL('../extension/manifest.json', import.meta.url), 'utf8'));
  for (const host of ['netflix.com', 'primevideo.com', 'youtube.com', 'disneyplus.com', 'hulu.com', 'max.com', 'crunchyroll.com', 'tv.apple.com', 'paramountplus.com', 'peacocktv.com']) {
    assert.ok(m.content_scripts[0].matches.includes(`*://*.${host}/*`), host);
  }
  assert.ok(m.permissions.includes('scripting'));
  assert.ok(m.optional_host_permissions.includes('https://*/*'));
});
