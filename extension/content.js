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
  let inAd = false;

  // Pages that mark an ad on the player. While one shows, this player stands down and the others
  // wait. Sites not listed here fall back to the panel's BRB button.
  const AD_SELECTORS = [
    ".html5-video-player.ad-showing", // YouTube
  ];

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
    if (!video || inAd || Date.now() < suppressUntil || !Number.isFinite(video.currentTime)) return;
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
    // During an ad the element is playing the ad; the room's state is applied once the show is back.
    if (!video || !state || inAd || video.readyState < 1) return;
    suppressUntil = Date.now() + 1000;
    const exp = expected();
    if (Math.abs(video.currentTime - exp) > 0.5) video.currentTime = exp;
    if (state.playing && video.paused) video.play().catch(() => {});
    else if (!state.playing && !video.paused) video.pause();
  }

  function checkAd() {
    const now = !!video && AD_SELECTORS.some((selector) => document.querySelector(selector));
    if (now === inAd) return;
    inAd = now;
    if (video) video.playbackRate = 1;
    relay({ to: "top", type: "tandem:ad", inAd });
    if (inAd) return;
    // Back to the show: lead the room from wherever this player picks up, which releases the others.
    setTimeout(() => {
      if (!video || inAd || !Number.isFinite(video.currentTime)) return;
      const playing = !video.paused && !video.ended;
      state = { playing, time: video.currentTime, localUpdatedAt: Date.now() };
      relay({ to: "top", type: "tandem:event", playing, time: video.currentTime, reason: "seek" });
    }, 800);
  }

  function reportProgress() {
    if (!video || inAd || !Number.isFinite(video.currentTime) || !Number.isFinite(video.duration)) return;
    relay({ to: "top", type: "tandem:progress", time: video.currentTime, duration: video.duration, playing: !video.paused && !video.ended });
  }

  function driftTick() {
    checkAd();
    if (!video || !state || inAd) return;
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
      reportProgress();
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
    if (inAd) {
      inAd = false;
      relay({ to: "top", type: "tandem:ad", inAd: false });
    }
  }

  /* ------------------------------------------------------------------ */
  /* Overlay host (top frame only)                                       */
  /* ------------------------------------------------------------------ */
  let host = null;
  let iframe = null;
  let appOrigin = DEFAULT_ORIGIN;
  let roomId = null;
  /** Seconds to pick the show up from, when the popup resumes one of "our shows". */
  let resumeAt = 0;
  let pageTimer = null;
  let sentPage = "";

  /** The episode this tab is on, for invite links and "our shows". */
  function pageInfo() {
    return { url: location.href.split("#")[0], title: document.title.trim().slice(0, 120) };
  }

  function sendPage(force) {
    const page = pageInfo();
    const key = page.url + "\n" + page.title;
    if (!iframe?.contentWindow || (!force && key === sentPage)) return;
    sentPage = key;
    iframe.contentWindow.postMessage({ type: "tandem:page", ...page }, appOrigin);
  }

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
    // Same two linked frames as the web app's LogoMark (src/components/Logo.tsx).
    mark.setAttribute("viewBox", "0 0 32 32");
    mark.setAttribute("width", "18");
    mark.setAttribute("height", "18");
    for (const xy of [4, 12]) {
      const frame = document.createElementNS(SVG, "rect");
      frame.setAttribute("x", xy);
      frame.setAttribute("y", xy);
      frame.setAttribute("width", 16);
      frame.setAttribute("height", 16);
      frame.setAttribute("rx", 5);
      frame.setAttribute("fill", "none");
      frame.setAttribute("stroke", "#8b5cf6");
      frame.setAttribute("stroke-width", 2.25);
      mark.appendChild(frame);
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
    iframe.src = `${appOrigin}/overlay/${encodeURIComponent(id)}${resumeAt > 0 ? `?t=${Math.floor(resumeAt)}` : ""}`;
    resumeAt = 0;
    iframe.allow = "camera; microphone; autoplay; clipboard-write";

    host.append(bar, iframe);
    document.documentElement.appendChild(host);
    makeDraggable(bar, host);
    clearInterval(pageTimer);
    pageTimer = setInterval(() => sendPage(false), 3000);

    relay({ to: "all", type: "tandem:session", active: true });
  }

  function unmountOverlay(keepSession) {
    flushHistory();
    host?.remove();
    host = null;
    iframe = null;
    roomId = null;
    partnerPresent = false;
    clearInterval(pageTimer);
    pageTimer = null;
    sentPage = "";
    reactionLayer?.remove();
    reactionLayer = null;
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
        sendPage(true);
        break;
      case "tandem:reaction":
        floatReaction(m.emoji);
        break;
      case "tandem:pause":
        relay({ to: "all", type: "tandem:pause" });
        break;
      case "tandem:partner":
        partnerPresent = !!m.present;
        break;
      case "tandem:close":
        unmountOverlay(false);
        break;
    }
  });

  /* ------------------------------------------------------------------ */
  /* Reactions float up over the video                                   */
  /* ------------------------------------------------------------------ */
  let reactionLayer = null;

  function floatReaction(emoji) {
    if (!IS_TOP || !host || typeof emoji !== "string" || !emoji || emoji.length > 8) return;
    if (!reactionLayer?.isConnected) {
      reactionLayer = document.createElement("div");
      reactionLayer.id = "tandem-reactions";
      document.documentElement.appendChild(reactionLayer);
    }
    const el = document.createElement("span");
    el.className = "tandem-reaction";
    el.textContent = emoji;
    el.style.left = `${10 + Math.random() * 80}%`;
    const remove = () => el.remove();
    el.addEventListener("animationend", remove);
    setTimeout(remove, 4000);
    reactionLayer.appendChild(el);
  }

  /* ------------------------------------------------------------------ */
  /* Our shows: what you watched together, kept in this browser only     */
  /* ------------------------------------------------------------------ */
  const HISTORY_KEY = "tandem:history";
  const DAYS_KEY = "tandem:days";
  const HISTORY_LIMIT = 30;
  let partnerPresent = false;
  let lastProgressAt = 0;
  let lastFlushAt = 0;
  /** Latest position plus seconds watched with someone since the last write. */
  let progress = null;

  function localDay(d = new Date()) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function recordProgress(msg) {
    if (!roomId || !Number.isFinite(msg.time) || !Number.isFinite(msg.duration) || msg.duration < 60) return;
    const now = Date.now();
    const delta = lastProgressAt ? Math.min((now - lastProgressAt) / 1000, 5) : 0;
    lastProgressAt = now;
    const page = pageInfo();
    if (progress && progress.url !== page.url) flushHistory();
    progress = {
      ...page,
      roomId,
      site: location.hostname.replace(/^www\./, ""),
      time: msg.time,
      duration: msg.duration,
      together: (progress?.together ?? 0) + (msg.playing && partnerPresent ? delta : 0),
    };
    if (now - lastFlushAt > 10_000) flushHistory();
  }

  function flushHistory() {
    const p = progress;
    if (!p) return;
    lastFlushAt = Date.now();
    progress = { ...p, together: 0 };
    chrome.storage.local.get([HISTORY_KEY, DAYS_KEY]).then((saved) => {
      const history = Array.isArray(saved[HISTORY_KEY]) ? saved[HISTORY_KEY] : [];
      const previous = history.find((h) => h.url === p.url);
      const entry = {
        url: p.url,
        title: p.title || previous?.title || p.site,
        site: p.site,
        roomId: p.roomId,
        time: p.time,
        duration: p.duration,
        together: (previous?.together ?? 0) + p.together,
        updatedAt: Date.now(),
      };
      const next = [entry, ...history.filter((h) => h.url !== p.url)].slice(0, HISTORY_LIMIT);
      const days = saved[DAYS_KEY] && typeof saved[DAYS_KEY] === "object" ? saved[DAYS_KEY] : {};
      if (p.together > 0) days[localDay()] = (days[localDay()] ?? 0) + p.together;
      return chrome.storage.local.set({ [HISTORY_KEY]: next, [DAYS_KEY]: days });
    }).catch(() => {});
  }

  window.addEventListener("pagehide", () => flushHistory());

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
      case "tandem:pause":
        if (video && !inAd && !video.paused) video.pause();
        break;
      case "tandem:progress":
        if (IS_TOP) recordProgress(msg);
        break;
      case "tandem:event":
      case "tandem:status":
      case "tandem:drift":
      case "tandem:ad":
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
      resumeAt = Number(hash.get("tandemAt")) || 0;
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
