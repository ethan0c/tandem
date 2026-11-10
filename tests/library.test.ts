import assert from "node:assert/strict";
import { test } from "node:test";
import { matchTitle, mergeEntries, parseBackup, parseLibraryText } from "../src/lib/library";
import seed from "../src/content/catalog.json";
import type { CatalogTitle, LibraryEntry } from "../src/lib/catalog-types";
const media = seed[0] as CatalogTitle;
const entry: LibraryEntry = { media, status: "current", progress: 5, favorite: false, subscribed: true, updatedAt: 10 };
test("pasted subscriptions ignore navigation and merge duplicate chapter progress", () => {
  assert.deepEqual(parseLibraryText("Weeb Central\nSubscriptions\nOne Piece — Chapter 45\nTokyo Ghoul\nChapter 17.5\nOne Piece - Ch. 44\nhttps://weebcentral.com\nPage 1"), [{ title: "One Piece", progress: 45, status: "current" }, { title: "Tokyo Ghoul", progress: 17.5, status: "current" }]);
});
test("matching uses alternate titles but never silently picks a partial match", () => {
  assert.equal(matchTitle(media.originalTitle, [media])?.id, media.id);
  assert.equal(matchTitle("Attack", [media]), undefined);
});
test("merging keeps the newest revision without duplicating a saved title", () => {
  assert.deepEqual(mergeEntries([entry], [{ ...entry, progress: 1, updatedAt: 9 }]), [entry]);
  assert.equal(mergeEntries([entry], [{ ...entry, progress: 8, updatedAt: 11 }])[0].progress, 8);
});
test("backup validates every row and rejects invalid progress or media", () => {
  assert.deepEqual(parseBackup(JSON.stringify([entry])), [entry]);
  assert.throws(() => parseBackup(JSON.stringify([{ ...entry, progress: -1 }])));
  assert.throws(() => parseBackup(JSON.stringify([{ ...entry, media: { id: "script" } }])));
  assert.throws(() => parseBackup('{"entries":[]}'));
});
