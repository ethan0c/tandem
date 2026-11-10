import assert from "node:assert/strict";
import { test } from "node:test";
import type { CatalogTitle } from "../src/lib/catalog-types";
import {
  parseReAnimeEpisodes,
  parseReAnimeSearch,
  parseReAnimeServers,
  parseWeebChapters,
  parseWeebPages,
  parseWeebSearch,
  pickExactTitle,
} from "../src/lib/source-parsers";

const media = { title: "Naruto", originalTitle: "Naruto", aliases: [], year: 2002 } as unknown as CatalogTitle;
const series = "01J76XY7E3JVY2XJGG8VGP46NN";
const chapter = "01KZRQMMZR1KFA9KKHQGNN0H0Z";

test("source matching requires an unambiguous title", () => {
  assert.equal(pickExactTitle(media, [{ title: "Naruto", id: 1 }])?.id, 1);
  assert.equal(pickExactTitle(media, [{ title: "Naruto", id: 1 }, { title: "Naruto", id: 2 }]), null);
  assert.equal(pickExactTitle(media, [{ title: "Naruto", year: 2002, id: 1 }, { title: "Naruto", year: 2010, id: 2 }])?.id, 1);
});

test("ReAnime adapters accept episode and server data and reject untrusted embeds", () => {
  assert.equal(parseReAnimeSearch({ data: [{ slug: "naruto-abc123", title: "Naruto", anilist: 20 }] })[0].slug, "naruto-abc123");
  assert.deepEqual(parseReAnimeEpisodes({ episodes: [{ episode_number: 2, title: "Two" }, { number: 1, title: "One" }] }).map((u) => u.id), ["ra-1", "ra-2"]);
  const servers = parseReAnimeServers({ sub: [
    { dataLink: "https://flixcloud.cc/e/abc123?v=2", serverName: "HD-2", dataType: "sub" },
    { dataLink: "http://127.0.0.1/e/x?v=2", serverName: "Bad" },
    { dataLink: "https://flixcloud.cc.evil.test/e/x?v=2", serverName: "Bad" },
  ] });
  assert.equal(servers.length, 1);
  assert.equal(servers[0].url, "https://flixcloud.cc/e/abc123?v=2");
});

test("WeebCentral search, chapter, and page HTML maps to reader units", () => {
  const search = `<a href="/series/${series}/Naruto"><img alt="Naruto" src="cover.jpg"><span class="text-ellipsis">Naruto</span></a>`;
  assert.deepEqual(parseWeebSearch(search), [{ id: series, title: "Naruto" }]);
  const chapters = `<a href="/chapters/${chapter}"><span>Chapter 183</span></a>`;
  assert.equal(parseWeebChapters(chapters)[0].id, `wc-${chapter}`);
  const pages = `<section><img alt="Page 1" src="https://official.lowee.us/manga/naruto/001.png"><img alt="Page 2" data-src="https://official.lowee.us/manga/naruto/002.png"><img alt="Logo" src="https://evil.test/logo.png"></section>`;
  assert.deepEqual(parseWeebPages(pages), ["https://official.lowee.us/manga/naruto/001.png", "https://official.lowee.us/manga/naruto/002.png"]);
});
