import assert from "node:assert/strict";
import test from "node:test";
import { aniSkipWindows, skipWindow } from "../src/lib/skip-times";

test("skip windows accept bounded intervals", () => {
  assert.deepEqual(skipWindow({ start: 120, end: 210 }), { start: 120, end: 210 });
  assert.equal(skipWindow({ start: 220, end: 120 }), undefined);
  assert.equal(skipWindow({ start: -1, end: 90 }), undefined);
});

test("AniSkip chooses intervals closest to the actual duration", () => {
  const data = { results: [
    { skipType: "op", episodeLength: 1442, interval: { startTime: 128, endTime: 218 } },
    { skipType: "mixed-op", episodeLength: 1420, interval: { startTime: 75, endTime: 135 } },
    { skipType: "ed", episodeLength: 1447, interval: { startTime: 1343, endTime: 1431 } },
  ] };
  assert.deepEqual(aniSkipWindows(data, 1444), { intro: { start: 128, end: 218 }, outro: { start: 1343, end: 1431 } });
  assert.deepEqual(aniSkipWindows(data, 1540), {});
});
