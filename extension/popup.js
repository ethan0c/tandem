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
  const { appOrigin = "http://localhost:3000" } = await chrome.storage.sync.get("appOrigin");
  $("#origin").value = appOrigin;
  $("#origin").addEventListener("change", () => {
    const v = $("#origin").value.trim().replace(/\/+$/, "") || "http://localhost:3000";
    $("#origin").value = v;
    chrome.storage.sync.set({ appOrigin: v });
  });

  let status = null;
  try {
    status = await chrome.tabs.sendMessage(tab.id, { type: "tandem:get" }, { frameId: 0 });
  } catch {
    $("#unsupported").hidden = false;
    return;
  }

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
    const origin = $("#origin").value.trim().replace(/\/+$/, "") || "http://localhost:3000";
    await chrome.storage.sync.set({ appOrigin: origin });
    await send({ type: "tandem:open", roomId, appOrigin: origin });
    window.close();
  };
  $("#create").addEventListener("click", () => open(newRoomId()));
  $("#join").addEventListener("submit", (e) => {
    e.preventDefault();
    const code = parseRoomCode($("#code").value);
    if (!code) {
      $("#error").hidden = false;
      $("#error").textContent = "Paste a room link or an 8-character code.";
      return;
    }
    open(code);
  });
}

main();
