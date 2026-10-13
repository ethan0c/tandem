// Fills [data-logo], [data-panel] and [data-video] placeholders so every mockup shares one markup.
const ring = (w, color) =>
  `<svg width="${w}" height="${w * 0.625}" viewBox="0 0 64 40" fill="none"><circle cx="21" cy="20" r="15" stroke="${color}" stroke-width="7"/><circle cx="43" cy="20" r="15" stroke="${color}" stroke-width="7"/></svg>`;

const icon = {
  mic: '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/>',
  cam: '<path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/>',
  out: '<path d="m16 17 5-5-5-5"/><path d="M21 12H9"/><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>',
};
const svg = (name) => `<svg class="i" viewBox="0 0 24 24">${icon[name]}</svg>`;

for (const el of document.querySelectorAll("[data-logo]")) {
  const size = Number(el.dataset.logo);
  const light = el.dataset.tone === "light";
  el.classList.add("logo");
  el.innerHTML = `${ring(size * 1.15, light ? "#a78bfa" : "#7c3aed")}<b style="font-size:${size * 0.72}px;color:${light ? "#fff" : "var(--ink)"}">tandem</b>`;
}

for (const el of document.querySelectorAll("[data-panel]")) {
  el.innerHTML = `<div class="panel" style="zoom:${el.dataset.panel}">
    <div class="bar"><span>${ring(20, "#a78bfa")}<b>tandem</b><code>k7f-29q</code></span><span class="x">×</span></div>
    <div class="stage"><span class="name">Mika</span><div class="avatar">M</div><div class="you">You</div></div>
    <div class="controls">
      <span class="tog">${svg("mic")}</span><span class="tog">${svg("cam")}</span>
      <div class="members"><span>A</span><span>M</span></div>
      <span class="leave">${svg("out")} Leave</span>
    </div>
    <div class="foot"><span>${ring(14, "#7c3aed")} k7f-29q</span><span class="ok">In sync · 0.04s</span></div></div>`;
}

for (const el of document.querySelectorAll("[data-video]")) {
  const h = el.offsetHeight;
  el.classList.add("video", "glow");
  el.innerHTML = `
    <div class="scrim"></div>
    ${el.dataset.video === "pill" ? '<div class="pill"><span class="dot"></span>In sync · 0.04s</div>' : ""}
    <div class="track" style="top:${h - 52}px"><i style="width:52%"></i></div>
    <div class="ctrl" style="top:${h - 36}px"><span>❚❚</span><span>12:41 / 23:50</span><span class="fs">⛶</span></div>`;
}
