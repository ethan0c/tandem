import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cleanAnalyticsUrl } from '../src/lib/analytics-url';

test('keeps public pages as they are', () => {
  assert.equal(cleanAnalyticsUrl('https://www.ilovemygf.site/guides/watch-youtube-together'), 'https://www.ilovemygf.site/guides/watch-youtube-together');
});

test('room codes and invite details never reach analytics', () => {
  assert.equal(cleanAnalyticsUrl('https://www.ilovemygf.site/room/k3f9-x2qa'), 'https://www.ilovemygf.site/room/[id]');
  assert.equal(cleanAnalyticsUrl('https://www.ilovemygf.site/call/k3f9-x2qa'), 'https://www.ilovemygf.site/call/[id]');
  assert.equal(
    cleanAnalyticsUrl('https://www.ilovemygf.site/join/k3f9-x2qa?from=Sam&what=Frieren&to=https%3A%2F%2Fexample.com'),
    'https://www.ilovemygf.site/join/[id]',
  );
});

test('story numbers in the hash and any query string are dropped', () => {
  assert.equal(cleanAnalyticsUrl('https://www.ilovemygf.site/recap#eyJ2IjoxfQ'), 'https://www.ilovemygf.site/recap');
  assert.equal(cleanAnalyticsUrl('https://www.ilovemygf.site/?utm_source=reddit'), 'https://www.ilovemygf.site/');
});

test('the extension call window is not counted', () => {
  assert.equal(cleanAnalyticsUrl('https://www.ilovemygf.site/overlay/k3f9-x2qa?t=120'), null);
});
