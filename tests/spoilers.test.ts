import { test } from "node:test";
import assert from "node:assert/strict";
import { adjacentUnits, isUnitCompleted, unitLabel } from "../src/lib/spoilers";
import type { ContentUnit } from "../src/lib/content-types";

test("starting a chapter never reveals its title; only completed progress does", () => {
  assert.equal(isUnitCompleted(12, 11), false);
  assert.equal(isUnitCompleted(12, 12), true);
  assert.equal(isUnitCompleted(12.5, 12), false);
  assert.equal(isUnitCompleted(0, 0), false);
  assert.equal(isUnitCompleted(NaN, 12), false);
  assert.equal(isUnitCompleted(12, Infinity), false);
  assert.equal(unitLabel("anime", { number: 4 }), "Episode 4");
  assert.equal(unitLabel("manga", { number: 12.5 }), "Chapter 12.5");
});

test("chapter navigation skips alternate releases of the same chapter", () => {
  const units: ContentUnit[] = [3, 1, 2, 2, 2.5].map((number, index) => ({ id: String(index), number, label: "Unsafe provider label", title: "Spoiler", language: "en" }));
  const adjacent = adjacentUnits(units, units[2]);
  assert.equal(adjacent.previous?.number, 1);
  assert.equal(adjacent.next?.number, 2.5);
  assert.equal(unitLabel("manga", units[2]), "Chapter 2");
  assert.equal(adjacentUnits(units, units[0]).next, undefined);
});
