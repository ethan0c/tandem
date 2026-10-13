// Tandem content script.
// Runs in every frame of a supported site. The top frame hosts the floating Tandem overlay
// (an iframe of the Tandem web app). Whichever frame owns the <video> element acts as the
// playback controller. The two halves talk through background.js.
(() => {
  if (window.__tandemLoaded) return;
  window.__tandemLoaded = true;

  const IS_TOP = window === window.top;
  const DEFAULT_ORIGIN = "https://www.ilovemygf.site";
  const SESSION_KEY = "tandem:room";

  const relay = (msg) => chrome.runtime.sendMessage(msg).catch(() => {});

  /* ------------------------------------------------------------------ */
  /* Playback controller (any frame that has a <video>)                  */
  /* ------------------------------------------------------------------ */
  let active = false;
  let video = null;
  let state = null; // { playing, time, localUpdatedAt }
  let suppressUntil = 0;
  let driftTimer = null;
  let observer = null;
  let lastDriftSent = 0;

  let scanTimer = null;
  let pendingScan = null;
  let linkedVideo = false;
  let pageUrl = location.href;
  let mediaSource = "";

  function videoArea(v) {
    const rect = v.getBoundingClientRect();
    const style = getComputedStyle(v);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return 0;
    return Math.max(0, Math.min(rect.right, innerWidth) - Math.max(rect.left, 0)) *
      Math.max(0, Math.min(rect.bottom, innerHeight) - Math.max(rect.top, 0));
  }

  function pickVideo() {
    const videos = [];
    const visit = (root) => {
      videos.push(...root.querySelectorAll("video"));
      for (const element of root.querySelectorAll("*")) {
        if (element.shadowRoot) visit(element.shadowRoot);
      }
    };
    visit(document);
    return videos.filter((v) => videoArea(v) > 0)
      .sort((a, b) => videoArea(b) - videoArea(a))[0] ?? null;
  }

  function reportPlayer() {
    relay({ to: "top", type: "tandem:status", hasVideo: !!video, area: video ? videoArea(video) : 0 });
  }

  function expected() {
    if (!state) return 0;
    return state.playing ? state.time + (Date.now() - state.localUpdatedAt) / 1000 : state.time;
  }

  function onUserEvent(e) {
    if (!video || Date.now() < suppressUntil || !Number.isFinite(video.currentTime)) return;
    const playing = !video.paused && !video.ended;
    const time = video.currentTime;
    state = { playing, time, localUpdatedAt: Date.now() };
    const reason = e.type === "seeked" ? "seek" : playing ? "play" : "pause";
    relay({ to: "top", type: "tandem:event", playing, time, reason });
  }

  const EVENTS = ["play", "pause", "seeked"];

  function attach(v) {
    if (video === v) return;
    if (video) state = null;
    detach();
    video = v;
    mediaSource = v.currentSrc;
    EVENTS.forEach((ev) => v.addEventListener(ev, onUserEvent));
    v.addEventListener("loadedmetadata", applyState);
    reportPlayer();
    if (state) applyState();
  }

  function detach() {
    if (!video) return;
    EVENTS.forEach((ev) => video.removeEventListener(ev, onUserEvent));
    video.removeEventListener("loadedmetadata", applyState);
    video.playbackRate = 1;
    video = null;
    reportPlayer();
  }

  function applyState() {
    if (!video || !state || video.readyState < 1) return;
    suppressUntil = Date.now() + 1000;
    const exp = expected();
    if (Math.abs(video.currentTime - exp) > 0.5) video.currentTime = exp;
    if (state.playing && video.paused) video.play().catch(() => {});
    else if (!state.playing && !video.paused) video.pause();
  }

  function driftTick() {
    if (!video || !state) return;
    if (!state.playing || video.paused || video.seeking || video.readyState < 3) {
      if (video.playbackRate !== 1) video.playbackRate = 1;
      return;
    }
    const diff = video.currentTime - expected();
    if (Date.now() - lastDriftSent > 1000) {
      lastDriftSent = Date.now();
      relay({ to: "top", type: "tandem:drift", drift: diff });
    }
    if (Math.abs(diff) > 1.5) {
      suppressUntil = Date.now() + 1000;
      video.currentTime = expected();
      video.playbackRate = 1;
    } else if (Math.abs(diff) > 0.12) {
      video.playbackRate = diff > 0 ? 0.92 : 1.08;
    } else if (video.playbackRate !== 1) {
      video.playbackRate = 1;
    }
  }

  function startController() {
    if (active) return;
    active = true;
    const rescan = () => {
      const v = pickVideo();
      if (v) attach(v);
      else if (video) detach();
    };
    rescan();
    observer = new MutationObserver(() => {
      if (pendingScan) return;
      pendingScan = setTimeout(() => {
        pendingScan = null;
        rescan();
      }, 300);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    scanTimer = setInterval(() => {
      // SPA episode changes and reused media elements must not seek to the previous episode.
      if (location.href !== pageUrl || (video && video.currentSrc !== mediaSource)) {
        pageUrl = location.href;
        mediaSource = video?.currentSrc ?? "";
        state = null;
      }
      rescan();
      reportPlayer();
    }, 1500);
    driftTimer = setInterval(driftTick, 500);
  }

  function stopController() {
    active = false;
    observer?.disconnect();
    observer = null;
    clearInterval(scanTimer);
    clearTimeout(pendingScan);
    scanTimer = null;
    pendingScan = null;
    clearInterval(driftTimer);
    driftTimer = null;
    detach();
    state = null;
  }

  /* ------------------------------------------------------------------ */
  /* Overlay host (top frame only)                                       */
  /* ------------------------------------------------------------------ */
  let host = null;
  let iframe = null;
  let appOrigin = DEFAULT_ORIGIN;
  let roomId = null;

  function mountOverlay(id, origin) {
    if (!IS_TOP) return;
    if (origin) appOrigin = origin;
    roomId = id;
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ roomId: id, appOrigin }));
    } catch {}
    if (host) unmountOverlay(true);

    host = document.createElement("div");
    host.id = "tandem-overlay-host";

    const bar = document.createElement("div");
    bar.className = "tandem-bar";
    const label = document.createElement("span");
    const SVG = "http://www.w3.org/2000/svg";
    const mark = document.createElementNS(SVG, "svg");
    mark.setAttribute("viewBox", "0 0 64 40");
    mark.setAttribute("width", "20");
    mark.setAttribute("height", "12.5");
    for (const cx of [21, 43]) {
      const ring = document.createElementNS(SVG, "circle");
      ring.setAttribute("cx", cx);
      ring.setAttribute("cy", 20);
      ring.setAttribute("r", 15);
      ring.setAttribute("fill", "none");
      ring.setAttribute("stroke", "#a78bfa");
      ring.setAttribute("stroke-width", 7);
      mark.appendChild(ring);
    }
    const word = document.createElement("b");
    word.textContent = "tandem";
    const code = document.createElement("code");
    code.textContent = id;
    label.append(mark, word, code);
    const close = document.createElement("button");
    close.title = "Leave room";
    close.textContent = "×";
    close.addEventListener("click", () => unmountOverlay(false));
    bar.append(label, close);

    iframe = document.createElement("iframe");
    iframe.src = `${appOrigin}/overlay/${encodeURIComponent(id)}`;
    iframe.allow = "camera; microphone; autoplay; clipboard-write";

    host.append(bar, iframe);
    document.documentElement.appendChild(host);
    makeDraggable(bar, host);

    relay({ to: "all", type: "tandem:session", active: true });
  }

  function unmountOverlay(keepSession) {
    host?.remove();
    host = null;
    iframe = null;
    roomId = null;
    if (!keepSession) {
      try {
        sessionStorage.removeItem(SESSION_KEY);
      } catch {}
      relay({ to: "all", type: "tandem:session", active: false });
      if (pseudoEl) exitPseudo();
    }
  }

  function makeDraggable(handle, el) {
    let start = null;
    handle.addEventListener("pointerdown", (e) => {
      if (e.target.closest("button")) return;
      const r = el.getBoundingClientRect();
      el.style.left = r.left + "px";
      el.style.top = r.top + "px";
      el.style.right = "auto";
      el.style.bottom = "auto";
      start = { x: e.clientX - r.left, y: e.clientY - r.top };
      handle.classList.add("dragging");
      handle.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    handle.addEventListener("pointermove", (e) => {
      if (!start) return;
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const x = Math.min(Math.max(0, e.clientX - start.x), window.innerWidth - w);
      const y = Math.min(Math.max(0, e.clientY - start.y), window.innerHeight - h);
      el.style.left = x + "px";
      el.style.top = y + "px";
    });
    const end = () => {
      start = null;
      handle.classList.remove("dragging");
    };
    handle.addEventListener("pointerup", end);
    handle.addEventListener("pointercancel", end);
  }

  // Messages from the overlay iframe.
  window.addEventListener("message", (e) => {
    if (!IS_TOP || !iframe || e.source !== iframe.contentWindow || e.origin !== appOrigin) return;
    const m = e.data;
    if (!m || typeof m !== "object") return;
    switch (m.type) {
      case "tandem:apply":
        relay({ to: "all", type: "tandem:apply", state: m.state });
        break;
      case "tandem:resize":
        if (typeof m.height === "number" && m.height > 80) iframe.style.height = Math.min(m.height, 720) + "px";
        break;
      case "tandem:ready":
        relay({ to: "all", type: "tandem:probe" });
        break;
      case "tandem:close":
        unmountOverlay(false);
        break;
    }
  });

  /* ------------------------------------------------------------------ */
  /* Fullscreen: keep the overlay visible                                */
  /* ------------------------------------------------------------------ */
  let pseudoEl = null;
  let handlingFs = false;

  function exitPseudo() {
    pseudoEl?.classList.remove("tandem-pseudo-fs");
    pseudoEl = null;
  }

  document.addEventListener("fullscreenchange", async () => {
    if (!IS_TOP || !host || handlingFs) return;
    const fe = document.fullscreenElement;
    if (fe && fe !== document.documentElement && !fe.contains(host)) {
      handlingFs = true;
      try {
        await document.exitFullscreen();
        await document.documentElement.requestFullscreen();
      } catch {
        /* keep pseudo-fullscreen without browser fullscreen */
      }
      pseudoEl = fe;
      fe.classList.add("tandem-pseudo-fs");
      handlingFs = false;
    } else if (!fe && pseudoEl) {
      exitPseudo();
    }
  });

  /* ------------------------------------------------------------------ */
  /* Extension messaging                                                 */
  /* ------------------------------------------------------------------ */
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (!msg || typeof msg !== "object") return;
    switch (msg.type) {
      // from popup
      case "tandem:open":
        mountOverlay(msg.roomId, msg.appOrigin);
        sendResponse({ ok: true });
        break;
      case "tandem:close":
        unmountOverlay(false);
        sendResponse({ ok: true });
        break;
      case "tandem:get":
        sendResponse({ roomId, appOrigin, hasVideo: linkedVideo });
        break;
      // relayed from other frames
      case "tandem:session":
        if (msg.active) startController();
        else stopController();
        break;
      case "tandem:apply":
        if (!active) startController();
        if (!msg.state || typeof msg.state.playing !== "boolean" ||
          !Number.isFinite(msg.state.time) || msg.state.time < 0 || !Number.isFinite(msg.state.localUpdatedAt)) return;
        state = msg.state;
        applyState();
        break;
      case "tandem:probe":
        if (active) reportPlayer();
        break;
      case "tandem:event":
      case "tandem:status":
      case "tandem:drift":
        if (msg.type === "tandem:status") linkedVideo = !!msg.hasVideo;
        if (IS_TOP && iframe?.contentWindow) iframe.contentWindow.postMessage(msg, appOrigin);
        break;
    }
  });

  /* ------------------------------------------------------------------ */
  /* Boot                                                                */
  /* ------------------------------------------------------------------ */
  relay({ to: "top", type: "tandem:controller-ready" });
  if (IS_TOP) {
    chrome.storage.sync.get("appOrigin").then(({ appOrigin: saved }) => {
      if (saved) appOrigin = saved;
      // Invite links can carry the room in the hash: https://site/…#tandem=k3f9-x2qa
      const hash = new URLSearchParams(location.hash.replace(/^#/, ""));
      const fromHash = hash.get("tandem");
      if (fromHash) {
        history.replaceState(null, "", location.pathname + location.search);
        mountOverlay(fromHash.toLowerCase());
        return;
      }
      try {
        const saved = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
        if (saved?.roomId) mountOverlay(saved.roomId, saved.appOrigin);
      } catch {}
    });
  }
})();
