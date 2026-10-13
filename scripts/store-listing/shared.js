// Fills [data-logo], [data-panel] and [data-video] placeholders so every mockup shares one markup.
// The mark is LogoMark from src/components/Logo.tsx: two linked frames.
const mark = (size, color = "#8b5cf6") =>
  `<svg width="${size}" height="${size}" viewBox="0 0 32 32" fill="none"><rect x="4" y="4" width="16" height="16" rx="5" stroke="${color}" stroke-width="2.25"/><rect x="12" y="12" width="16" height="16" rx="5" stroke="${color}" stroke-width="2.25"/></svg>`;

// Lucide icons, as used by the web app.
const icon = {
  mic: '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/>',
  cam: '<path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/>',
  out: '<path d="m16 17 5-5-5-5"/><path d="M21 12H9"/><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>',
  copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  pause: '<rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/>',
  back: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  fwd: '<path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>',
  vol: '<path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"/><path d="M16 9a5 5 0 0 1 0 6"/><path d="M19.364 18.364a9 9 0 0 0 0-12.728"/>',
  max: '<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  chev: '<path d="m9 18 6-6-6-6"/>',
};
const svg = (name, size) => `<svg class="i" viewBox="0 0 24 24"${size ? ` style="width:${size}px;height:${size}px"` : ""}>${icon[name]}</svg>`;

for (const el of document.querySelectorAll("[data-logo]")) {
  const size = Number(el.dataset.logo);
  el.classList.add("logo");
  el.innerHTML = `${mark(size)}<b style="font-size:${size * 0.78}px">tandem</b>`;
}

for (const el of document.querySelectorAll("[data-icon]")) el.innerHTML = svg(el.dataset.icon, el.dataset.size);

for (const el of document.querySelectorAll("[data-panel]")) {
  el.innerHTML = `<div class="panel" style="zoom:${el.dataset.panel}">
    <div class="bar"><span>${mark(18)}<b>tandem</b><code>k3f9-x2qa</code></span><span class="x">×</span></div>
    <div class="stage"><span class="name">Mika</span><div class="avatar">M</div><div class="you">You</div></div>
    <div class="controls">
      <span class="tog">${svg("mic")}</span><span class="tog">${svg("cam")}</span><span class="tog">${svg("vol")}</span>
      <div class="members"><span>A</span><span>M</span></div>
      <span class="leave">${svg("out")} Leave</span>
    </div>
    <div class="foot"><span>${mark(14)} k3f9-x2qa</span><span class="ok">Watching together</span></div></div>`;
}

// data-video="bar" adds the room's top bar; data-progress sets the seek position.
for (const el of document.querySelectorAll("[data-video]")) {
  const h = el.offsetHeight;
  const progress = el.dataset.progress ?? "38%";
  el.classList.add("video", "glow");
  el.innerHTML = `
    <div class="scrim"></div>
    ${
      el.dataset.video === "bar"
        ? `<div class="top"></div><div class="topbar">${`<span class="logo">${mark(20)}<b style="font-size:16px">tandem</b></span>`}
          <span class="room">k3f9-x2qa ${svg("copy", 12)}</span><span class="pill">Watching together</span>
          <span class="leave">${svg("out", 13)} Leave</span></div>`
        : ""
    }
    <div class="track" style="top:${h - 58}px"><i style="width:${progress}"></i></div>
    <div class="ctrl" style="top:${h - 46}px"><span class="play">${svg("pause", 15)}</span>${svg("back", 16)}${svg("fwd", 16)}<span>8:51 / 23:40</span><span class="fs">${svg("vol", 16)}</span>${svg("max", 16)}</div>`;
}
