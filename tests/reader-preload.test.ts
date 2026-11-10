import { test } from "node:test";
import assert from "node:assert/strict";
import { createPagePreloader } from "../src/lib/reader-preload";

test("reader preloading caps requests, replaces old batches, and releases images", () => {
  const images: HTMLImageElement[] = [];
  const loader = createPagePreloader(() => {
    const stub = { src: "", onload: null, onerror: null, removeAttribute() { stub.src = ""; } };
    const image = stub as unknown as HTMLImageElement;
    images.push(image);
    return image;
  });
  const finish = (index: number) => images[index].onload?.call(images[index], new Event("load"));
  loader.setTargets(["a", "b", "c", "d", "a"]);
  assert.deepEqual(images.map((image) => image.src), ["a", "b"]);
  assert.ok(images.every((image) => image.fetchPriority === "low"));
  finish(0);
  assert.equal(images[2].src, "c");
  loader.setTargets(["e", "a"]);
  finish(1);
  assert.equal(images[3].src, "e");
  finish(2);
  assert.equal(images.length, 4, "outdated page d and completed page a are not requested");
  loader.dispose();
  assert.equal(images[3].src, "");
  assert.equal(images[3].onload, null);
  loader.setTargets(["f"]);
  assert.equal(images.length, 4);
});
