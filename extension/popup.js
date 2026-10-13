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
        if (!granted) throw new Error("Site access was not granted.");
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
      } catch (error) {
        $("#access-error").hidden = false;
        $("#access-error").textContent = error.message || "Could not enable Tandem here. Try reloading the page.";
      }
    });
    return;
  }

  $("#compatibility").hidden = /(^|\.)miruro\.(tv|to|online)$/.test(new URL(tab.url).hostname);
  const send = (msg) => chrome.tabs.sendMessage(tab.id, msg, { frameId: 0 });

  if (status?.roomId) {
    $("#active").hidden = false;
    $("#current").textContent = status.roomId;
    $("#player").textContent = status.hasVideo ? "Linked to the page's video player." : "Looking for a video on this page…";
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
  const showError = (error) => {
    $("#error").hidden = false;
    $("#error").textContent = error.message || "Could not open the room. Reload the page and try again.";
  };
  $("#create").addEventListener("click", () => open(newRoomId()).catch(showError));
  $("#join").addEventListener("submit", (e) => {
    e.preventDefault();
    const code = parseRoomCode($("#code").value);
    if (!code) {
      $("#error").hidden = false;
      $("#error").textContent = "Paste a room link or an 8-character code.";
      return;
    }
    open(code).catch(showError);
  });
}

main().catch((error) => {
  $("#unsupported").hidden = false;
  $("#access-error").hidden = false;
  $("#access-error").textContent = error.message || "Could not connect to this tab.";
});
