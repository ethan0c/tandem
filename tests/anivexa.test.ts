import assert from "node:assert/strict";
import test from "node:test";
import { parseAnivexaEpisodes, parseAnivexaPlayback } from "../src/lib/anivexa-parsers";

test("MKissa exposes both audio tracks with stable IDs and skips episode zero", () => {
  const units = parseAnivexaEpisodes({ mkissa: { episodes: { sub: [
    { id: "watch/mkissa/16498/sub/mkissa-0", number: 0 },
    { id: "watch/mkissa/16498/sub/mkissa-1", number: 1, title: "First episode" },
  ], dub: [
    { id: "watch/mkissa/16498/dub/mkissa-1", number: 1, title: "First episode" },
  ] } } });
  assert.deepEqual(units, [
    { id: "av-mkissa-sub-1", number: 1, label: "Episode 1", title: "First episode", language: "ja", group: "Sub" },
    { id: "av-mkissa-dub-1", number: 1, label: "Episode 1", title: "First episode", language: "en", group: "Dub" },
  ]);
});

test("MKissa playback uses the extracted HLS URL and rejects unsafe links", () => {
  const playback = parseAnivexaPlayback({ sources: [
    { name: "Default", type: "iframe", url: "https://allanime.day/clock.json", extractedType: "hls", extractedUrl: "https://video.example/master.m3u8", priority: 8 },
    { name: "Unsafe", extractedType: "hls", extractedUrl: "http://localhost/private", priority: 9 },
  ] });
  assert.deepEqual(playback.streams, [{ url: "https://video.example/master.m3u8", type: "application/vnd.apple.mpegurl", label: "Default" }]);
});

test("MKissa provider errors are surfaced", () => {
  assert.throws(() => parseAnivexaEpisodes({ mkissa: { error: "unavailable" } }), /MKissa: unavailable/);
});
