import assert from "node:assert/strict";
import { test } from "node:test";
import { approvedCatalogSource, approvedVideo, directAnime, directManga, safePageBase } from "../src/lib/content-types";

test("rooms accept only catalog episode identities, never shared stream URLs", () => {
  assert.equal(approvedCatalogSource({ kind: "catalog", mediaId: "7442", unitId: "av-mkissa-sub-1", sourceId: "16498" }), true);
  assert.equal(approvedCatalogSource({ kind: "catalog", mediaId: "7442", unitId: "av-mkissa-sub-1", sourceId: "wrong" }), false);
  assert.equal(approvedCatalogSource({ kind: "catalog", mediaId: "7442", unitId: "https://evil.example/video.mp4" }), false);
});
import { readingUpdate, initialReading } from "../src/lib/reading";
test("room video sources accept only exact registered URLs", () => {
  assert.equal(approvedVideo("4650", directAnime["4650"].streams[0].url), true);
  assert.equal(approvedVideo("4650", "https://example.com/movie.mp4"), false);
  assert.equal(approvedVideo("__proto__", "x"), false);
  assert.equal(approvedVideo("unknown", "https://archive.org/anything"), false);
});
test("chapter page bases are restricted to provider hosts and preserve legitimate paths", () => {
  assert.equal(safePageBase("https://uploads.mangadex.org"), "https://uploads.mangadex.org");
  assert.equal(safePageBase("https://node.mangadex.network/token/"), "https://node.mangadex.network/token");
  for (const url of ["http://uploads.mangadex.org", "https://uploads.mangadex.org.evil.test", "http://127.0.0.1", "https://user:pass@uploads.mangadex.org"]) assert.equal(safePageBase(url), null);
});
test("licensed reading source has attribution and can be shared through reading state", () => {
  const chapter = directManga["24249"];
  assert.equal(chapter.pages?.length, 16);
  assert.ok(chapter.credit.includes("CC BY-NC-SA"));
  assert.equal(readingUpdate(initialReading, { unit: chapter.unit.id, chapter: 12 }, true)?.unit, chapter.unit.id);
  assert.equal(readingUpdate(initialReading, { unit: "https://untrusted.test/pages" }, true), null);
});
