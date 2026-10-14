const $ = (s) => document.querySelector(s);
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

function newRoomId() {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const raw = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
  return `${raw.slice(0, 4)}-${raw.slice(4)}`;
}

function parseRoomCode(input) {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const fromUrl = trimmed.match(/(?:\/(?:room|join|call|overlay)\/|#tandem=)([a-z0-9-]+)/i);
  const code = (fromUrl ? fromUrl[1] : trimmed).toLowerCase();
  return /^[a-z0-9-]{4,24}$/.test(code) ? code : null;
}

function clock(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const pad = (n) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
}

function localDay(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Days in a row with at least a few minutes together, counting back from today (or yesterday). */
function streak(days) {
  const d = new Date();
  if (!(days[localDay(d)] >= 180)) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days[localDay(d)] >= 180) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

/** "Our shows": recorded by content.js while you watch in a room, kept in this browser only. */
async function showHistory() {
  const saved = await chrome.storage.local.get(["tandem:history", "tandem:days"]);
  const history = Array.isArray(saved["tandem:history"]) ? saved["tandem:history"] : [];
  const days = saved["tandem:days"] && typeof saved["tandem:days"] === "object" ? saved["tandem:days"] : {};
  if (!history.length) return;
  $("#ours").hidden = false;

  const hours = Object.values(days).reduce((sum, s) => sum + (Number(s) || 0), 0) / 3600;
  const episodes = history.filter((h) => h.together >= 300).length;
  const run = streak(days);
  const parts = [];
  if (episodes) parts.push(`${episodes} ${episodes === 1 ? "episode" : "episodes"} together`);
  if (hours >= 0.1) parts.push(`${hours < 10 ? hours.toFixed(1) : Math.round(hours)} h watched`);
  if (run > 1) parts.push(`${run}-day streak 🔥`);
  $("#stats").textContent = parts.length ? parts.join(" · ") : "Watch with someone to start your story.";

  for (const entry of history.slice(0, 4)) {
    const li = document.createElement("li");
    const info = document.createElement("span");
    info.className = "show";
    const title = document.createElement("span");
    title.className = "title";
    title.textContent = entry.title;
    title.title = entry.title;
    const meta = document.createElement("span");
    meta.className = "meta";
    const finished = entry.duration && entry.time / entry.duration > 0.95;
    meta.textContent = `${entry.site} · ${finished ? "finished" : `${clock(entry.time)} of ${clock(entry.duration)}`}`;
    const bar = document.createElement("span");
    bar.className = "bar";
    const fill = document.createElement("i");
    fill.style.width = `${Math.min(100, Math.round((entry.time / entry.duration) * 100)) || 0}%`;
    bar.append(fill);
    info.append(title, meta, bar);
    const resume = document.createElement("button");
    resume.className = "btn btn-dark btn-sm";
    resume.textContent = finished ? "Rewatch" : "Resume";
    resume.addEventListener("click", () => {
      // Same room as last time, picking up where you stopped. content.js reads both from the hash.
      const url = new URL(entry.url);
      url.hash = `tandem=${entry.roomId}${finished ? "" : `&tandemAt=${Math.floor(entry.time)}`}`;
      chrome.tabs.create({ url: url.toString() });
      window.close();
    });
    li.append(info, resume);
    $("#shows").append(li);
  }
}

async function main() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const { appOrigin = "https://www.ilovemygf.site" } = await chrome.storage.sync.get("appOrigin");
  $("#origin").value = appOrigin;
  $("#plan").addEventListener("click", () => {
    const origin = $("#origin").value.trim().replace(/\/+$/, "") || "https://www.ilovemygf.site";
    chrome.tabs.create({ url: `${origin}/plan` });
    window.close();
  });
  showHistory().catch(() => {});
  $("#origin").addEventListener("change", () => {
    const v = $("#origin").value.trim().replace(/\/+$/, "") || "https://www.ilovemygf.site";
    $("#origin").value = v;
    chrome.storage.sync.set({ appOrigin: v });
  });

  if (!tab?.id || !/^https?:\/\//.test(tab.url || "")) {
    $("#unsupported").hidden = false;
    $("#access-message").textContent = "Open a video website first, then click Tandem.";
    $("#enable").hidden = true;
    return;
  }

  let status = null;
  try {
    status = await chrome.tabs.sendMessage(tab.id, { type: "tandem:get" }, { frameId: 0 });
  } catch {
    $("#unsupported").hidden = false;
    $("#enable").addEventListener("click", async () => {
      const origin = `${new URL(tab.url).origin}/*`;
      try {
        const granted = await chrome.permissions.request({ origins: [origin] });
        if (!granted) {
          $("#access-error").hidden = false;
          $("#access-error").textContent = "Allow Tandem to use this site, then try again.";
          return;
        }
        const id = `tandem-${new URL(tab.url).origin.replace(/[^a-z0-9]/gi, "-")}`;
        const existing = await chrome.scripting.getRegisteredContentScripts({ ids: [id] });
        if (!existing.length) {
          await chrome.scripting.registerContentScripts([{
            id, matches: [origin], js: ["content.js"], css: ["content.css"],
            allFrames: true, runAt: "document_idle", persistAcrossSessions: true,
          }]);
        }
        // activeTab covers the current top frame; cross-origin frames require their own access.
        try {
          await chrome.scripting.insertCSS({ target: { tabId: tab.id, allFrames: true }, files: ["content.css"] });
          await chrome.scripting.executeScript({ target: { tabId: tab.id, allFrames: true }, files: ["content.js"] });
        } catch {
          await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ["content.css"] });
          await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
        }
        window.location.reload();
      } catch {
        $("#access-error").hidden = false;
        $("#access-error").textContent = "Could not turn on Tandem here. Refresh the page and try again.";
      }
    });
    return;
  }

  $("#compatibility").hidden = /(^|\.)miruro\.(tv|to|online)$/.test(new URL(tab.url).hostname);
  const send = (msg) => chrome.tabs.sendMessage(tab.id, msg, { frameId: 0 });

  if (status?.roomId) {
    $("#active").hidden = false;
    $("#current").textContent = status.roomId;
    $("#player").textContent = status.hasVideo ? "Ready to watch together." : "Looking for a video on this page…";
    $("#copy").addEventListener("click", async () => {
      // The invite page helps a partner without the extension get it first, then opens this episode.
      const invite = new URL(`${status.appOrigin || appOrigin}/join/${status.roomId}`);
      const page = new URL(tab.url);
      page.hash = "";
      invite.searchParams.set("to", page.toString());
      if (tab.title) invite.searchParams.set("what", tab.title.slice(0, 120));
      await navigator.clipboard.writeText(invite.toString());
      $("#copy").textContent = "Copied!";
    });
    $("#leave").addEventListener("click", async () => {
      await send({ type: "tandem:close" });
      window.close();
    });
    return;
  }

  $("#idle").hidden = false;
  const open = async (roomId) => {
    const origin = $("#origin").value.trim().replace(/\/+$/, "") || "https://www.ilovemygf.site";
    await chrome.storage.sync.set({ appOrigin: origin });
    await send({ type: "tandem:open", roomId, appOrigin: origin });
    window.close();
  };
  const showError = () => {
    $("#error").hidden = false;
    $("#error").textContent = "Could not open the room. Refresh the page and try again.";
  };
  $("#create").addEventListener("click", () => open(newRoomId()).catch(showError));
  $("#join").addEventListener("submit", (e) => {
    e.preventDefault();
    const code = parseRoomCode($("#code").value);
    if (!code) {
      $("#error").hidden = false;
      $("#error").textContent = "Paste the room link or code your partner sent you.";
      return;
    }
    open(code).catch(showError);
  });
}

main().catch(() => {
  $("#unsupported").hidden = false;
  $("#access-error").hidden = false;
  $("#access-error").textContent = "Could not open Tandem on this tab. Refresh the page and try again.";
});
