import { chromium } from "playwright";
import assert from "node:assert/strict";
import { readFileSync, mkdirSync } from "node:fs";
const base = process.env.BASE_URL || "http://localhost:3000";
const seed = JSON.parse(
  readFileSync(new URL("../src/content/catalog.json", import.meta.url)),
);
const output =
  process.env.SCREENSHOT_DIR || "/private/tmp/tandem-mobile-checks";
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const errors = [];
let checked = 0;
const sizes = [320, 360, 375, 390, 414, 430, 768, 1024, 1440];
const paths = [
  "/",
  "/discover",
  "/anime",
  "/manga",
  "/library",
  "/library/import",
  "/rooms",
  "/account",
  "/title/anime/7442",
  "/title/manga/38",
  "/read/mobile-check",
];
async function geometry(page, label) {
  const problem = await page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const offenders = [...document.querySelectorAll("body *")].flatMap((e) => {
      const style = getComputedStyle(e);
      const rect = e.getBoundingClientRect();
      if (
        !rect.width ||
        !rect.height ||
        style.position === "fixed" ||
        style.visibility === "hidden" ||
        e.closest('[aria-hidden="true"], #intro, .hero-side, .hero-horizon')
      )
        return [];
      if (rect.left < -1 || rect.right > width + 1)
        return [
          {
            tag: e.tagName,
            class: String(e.className).slice(0, 100),
            width: rect.width,
            left: rect.left,
          },
        ];
      return [];
    });
    const badIcons = [
      ...document.querySelectorAll("button > svg, a.btn3d > svg"),
    ].flatMap((svg) => {
      if (!svg.closest("button.btn3d, a.btn3d, button.control-button"))
        return [];
      const a = svg.getBoundingClientRect();
      const b = svg.parentElement.getBoundingClientRect();
      if (!a.width || !b.width) return [];
      return a.left < b.left + 2 ||
        a.right > b.right - 2 ||
        a.top < b.top + 2 ||
        a.bottom > b.bottom - 2
        ? [
            svg.parentElement.getAttribute("aria-label") ||
              svg.parentElement.textContent,
          ]
        : [];
    });
    return {
      width,
      scroll: document.documentElement.scrollWidth,
      offenders: offenders.slice(0, 8),
      badIcons,
    };
  });
  assert.equal(
    problem.scroll <= problem.width + 1,
    true,
    `${label}: horizontal overflow ${JSON.stringify(problem)}`,
  );
  assert.deepEqual(
    problem.badIcons,
    [],
    `${label}: icons must remain inside buttons`,
  );
  const nav = page.locator(".platform-nav");
  if (await nav.count()) {
    const bounds = await nav.locator("a").evaluateAll((links) =>
      links.map((a) => {
        const r = a.getBoundingClientRect();
        return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
      }),
    );
    for (let i = 1; i < bounds.length; i++)
      assert.ok(
        bounds[i].left >= bounds[i - 1].right - 1,
        `${label}: navigation overlaps`,
      );
  }
  checked++;
}
try {
  for (const width of sizes) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      isMobile: width < 768,
      hasTouch: width < 768,
      reducedMotion: "reduce",
    });
    const entries = [
      seed[0],
      seed.find((m) => m.kind === "manga" && m.id === "38"),
    ].map((media, i) => ({
      media: {
        ...media,
        title:
          i === 0
            ? "Attack on Titan — a longer series title to check wrapping"
            : media.title,
      },
      status: "current",
      progress: i ? 120 : 4,
      favorite: true,
      subscribed: true,
      updatedAt: Date.now(),
    }));
    await context.addInitScript((list) => {
      localStorage.setItem("tandem:library:v1", JSON.stringify(list));
      sessionStorage.setItem("tandem:intro-seen", "1");
    }, entries);
    // Layout checks use fixed catalog data. Live source behavior is verified separately.
    await context.route("**/api/catalog?**", async (route) => {
      const p = new URL(route.request().url()).searchParams;
      const kind = p.get("kind") || "anime";
      const id = p.get("id");
      const title = seed.find((t) => t.kind === kind && t.id === id);
      await route.fulfill({
        json: id
          ? { title, providers: [] }
          : {
              items: seed.filter((t) => t.kind === kind),
              hasMore: false,
              source: "live",
            },
      });
    });
    await context.route("**/api/content?**", (route) =>
      route.fulfill({
        json: {
          media: seed[0],
          source: "",
          units: [],
          total: 0,
          hasMore: false,
          notice: "No in-site source is available for this title.",
        },
      }),
    );
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(`${width}: ${error.message}`));
    for (const path of paths) {
      await page.goto(base + path);
      await page.locator("h1").waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(450);
      await geometry(page, `${width} ${path}`);
      if (
        [320, 390, 1440].includes(width) &&
        ["/anime", "/library", "/title/manga/38", "/"].includes(path)
      )
        await page.screenshot({
          path: `${output}/${width}-${path.replaceAll("/", "_") || "home"}.png`,
          fullPage: false,
        });
    }
    await page.goto(base + "/library/import");
    await page
      .getByLabel("Your manga list")
      .fill("One Piece — Chapter 120\nTokyo Ghoul — Chapter 17");
    await page.getByRole("button", { name: "Review matches" }).click();
    await page
      .getByRole("button", { name: "Import selected titles" })
      .waitFor();
    await geometry(page, `${width} import review`);
    await page.goto(base + "/read/mobile-check-" + width);
    await page
      .getByRole("textbox", { name: "Your name" })
      .fill("Mobile tester");
    await page.getByRole("button", { name: "Join reading room" }).click();
    await page
      .getByRole("button", { name: "Choose images", exact: true })
      .waitFor();
    await page
      .locator("input[type=file]")
      .setInputFiles([
        "public/hero/series-dragon.jpg",
        "public/hero/sports-match.jpg",
      ]);
    await page.getByRole("spinbutton", { name: "Page number" }).waitFor();
    await geometry(page, `${width} reader controls`);
    const next = page.getByRole("button", { name: "Next page", exact: true });
    await next.click();
    assert.equal(
      await page.getByRole("spinbutton", { name: "Page number" }).inputValue(),
      "2",
    );
    await geometry(page, `${width} reader next page`);
    if (width === 320 || width === 390)
      await page.screenshot({
        path: `${output}/${width}-reader.png`,
        fullPage: false,
      });
    await context.close();
    console.log(
      `PASS ${width}px: ${paths.length} pages, import review, reader navigation, icon containment.`,
    );
  }
  assert.deepEqual(errors, [], `Browser errors: ${errors.join("\n")}`);
  console.log(`PASS ${checked} layout checks. Screenshots: ${output}`);
} finally {
  await browser.close();
}
