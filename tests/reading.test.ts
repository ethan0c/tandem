import assert from "node:assert/strict";
import { test } from "node:test";
import { initialReading, readingUpdate, validStory } from "../src/lib/reading";
import { parseRoomCode } from "../src/lib/room-id";
test("a reader can navigate shared pages; only the host can lock navigation", () => {
  assert.deepEqual(readingUpdate(initialReading, { page: 2, chapter: 7.5 }, false), { page: 2, chapter: 7.5, hostOnly: false });
  assert.equal(readingUpdate(initialReading, { hostOnly: true }, false), null);
  assert.equal(readingUpdate({ ...initialReading, hostOnly: true }, { page: 2 }, false), null);
  assert.equal(readingUpdate({ ...initialReading, hostOnly: true }, { hostOnly: false }, true)?.hostOnly, false);
});
test("invalid page, chapter and story values never enter shared room state", () => {
  for (const patch of [{ page: -1 }, { page: 500 }, { page: 2.5 }, { chapter: NaN }, { chapter: Infinity }, { chapter: 0 }, null]) assert.equal(readingUpdate(initialReading, patch, true), null);
  assert.equal(validStory({ id: "../../../", kind: "anime", title: "x" }), null);
  assert.equal(validStory({ id: "38", kind: "manga", title: " One Piece " })?.title, "One Piece");
  assert.equal(parseRoomCode("http://localhost:3000/read/abcd-efgh"), "abcd-efgh");
});
