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
  const fromUrl = trimmed.match(/(?:\/room\/|\/overlay\/|#tandem=)([a-z0-9-]+)/i);
  const code = (fromUrl ? fromUrl[1] : trimmed).toLowerCase();
  return /^[a-z0-9-]{4,24}$/.test(code) ? code : null;
}

async function main() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const { appOrigin = "https://www.ilovemygf.site" } = await chrome.storage.sync.get("appOrigin");
  $("#origin").value = appOrigin;
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
      const url = new URL(tab.url);
      url.hash = `tandem=${status.roomId}`;
      await navigator.clipboard.writeText(url.toString());
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
