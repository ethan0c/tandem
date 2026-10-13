// Relays messages between frames of the same tab.
// Content scripts cannot talk to each other directly, so every cross-frame message
// goes content script -> here -> content script(s).
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (!sender.tab || !msg || !msg.to) return;
  const tabId = sender.tab.id;
  const opts = msg.to === "top" ? { frameId: 0 } : {};
  chrome.tabs.sendMessage(tabId, msg, opts).catch(() => {});
});
