// Elect one visible player per tab so trailers and embedded videos cannot fight over sync.
const sessions = new Map();
chrome.tabs.onRemoved.addListener((tabId) => sessions.delete(tabId));
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (!sender.tab || !msg || !msg.to) return;
  const tabId = sender.tab.id;
  const frameId = sender.frameId ?? 0;
  const send = (message, frame) => chrome.tabs.sendMessage(tabId, message, frame === undefined ? {} : { frameId: frame }).catch(() => {});
  if (msg.type === "tandem:session") {
    if (frameId !== 0) return;
    if (msg.active) sessions.set(tabId, { candidates: new Map(), selected: null, state: null });
    else sessions.delete(tabId);
    send(msg);
    return;
  }
  const session = sessions.get(tabId);
  if (msg.type === "tandem:controller-ready") {
    if (session) send({ type: "tandem:session", active: true }, frameId);
    return;
  }
  if (msg.type === "tandem:status") {
    if (!session) return;
    if (msg.hasVideo && Number.isFinite(msg.area) && msg.area > 0) session.candidates.set(frameId, msg.area);
    else session.candidates.delete(frameId);
    const selected = [...session.candidates].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    if (selected !== session.selected) {
      session.selected = selected;
      if (selected !== null && session.state) send({ type: "tandem:apply", state: session.state }, selected);
    }
    send({ to: "top", type: "tandem:status", hasVideo: selected !== null }, 0);
    return;
  }
  if (msg.type === "tandem:apply") {
    if (frameId !== 0 || !session) return;
    session.state = msg.state;
    if (session.selected !== null) send(msg, session.selected);
    return;
  }
  if (msg.type === "tandem:event" || msg.type === "tandem:drift") {
    if (session?.selected !== frameId) return;
  }
  send(msg, msg.to === "top" ? 0 : undefined);
});
