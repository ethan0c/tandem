import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchPublicCatalog, readStoredContentCatalog } from "../src/lib/public-catalog-client";

test("public metadata shares concurrent requests, caches success, and can refresh", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  globalThis.fetch = async () => { calls++; await gate; return Response.json({ items: ["title"] }); };
  try {
    const url = "/api/catalog?kind=anime&q=concurrent-test";
    const first = fetchPublicCatalog(url), second = fetchPublicCatalog(url);
    assert.equal(calls, 1);
    release();
    assert.deepEqual(await first, await second);
    await fetchPublicCatalog(url);
    assert.equal(calls, 1);
    await fetchPublicCatalog(url, true);
    assert.equal(calls, 2);
  } finally { globalThis.fetch = original; }
});

test("playback and private endpoints never enter the public cache; errors are retriable", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => ++calls === 1 ? Response.json({ error: "Source unavailable" }, { status: 503 }) : Response.json({ items: [] });
  try {
    await assert.rejects(fetchPublicCatalog("/api/content?kind=manga&id=1&unit=signed-chapter"));
    await assert.rejects(fetchPublicCatalog("/api/private-library?user=1"));
    assert.equal(calls, 0);
    const url = "/api/catalog?kind=manga&q=retry-test";
    await assert.rejects(fetchPublicCatalog(url), /Source unavailable/);
    assert.deepEqual(await fetchPublicCatalog(url), { items: [] });
    assert.equal(calls, 2);
  } finally { globalThis.fetch = original; }
});

test("a hard refresh can reuse a complete episode list when a provider briefly returns fewer episodes", async () => {
  const originalFetch = globalThis.fetch;
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
    getItem: (key: string) => values.get(key) || null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  } });
  const url = "/api/content?kind=anime&id=7442&language=en&offset=0";
  const media = { kind: "anime", id: "7442", title: "Attack on Titan" };
  const unit = (number: number) => ({ id: `av-mkissa-sub-${number}`, number, label: `Episode ${number}` });
  let calls = 0;
  globalThis.fetch = async () => Response.json({ media, source: "MKissa", units: ++calls === 1 ? [unit(1), unit(2)] : [unit(1)], total: calls === 1 ? 2 : 1, hasMore: false });
  try {
    assert.equal((await fetchPublicCatalog(url)).units.length, 2);
    assert.equal(readStoredContentCatalog(url)?.units.length, 2);
    assert.equal((await fetchPublicCatalog(url, true)).units.length, 2);
    assert.equal(readStoredContentCatalog(url)?.units.length, 2);
    assert.equal(readStoredContentCatalog(`${url}&unit=av-mkissa-sub-1`), null);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalStorage) Object.defineProperty(globalThis, "localStorage", originalStorage);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});
