// Tests never use the TURN relay: it is metered, and test browsers on one machine connect directly
// anyway. Add this init script to every test context before anything else wraps RTCPeerConnection.
export function noTurn() {
  const PC = window.RTCPeerConnection;
  window.RTCPeerConnection = class extends PC {
    constructor(config = {}, ...rest) {
      const iceServers = (config.iceServers ?? [])
        .map((s) => ({ ...s, urls: [].concat(s.urls).filter((u) => !/^turns?:/i.test(u)) }))
        .filter((s) => s.urls.length);
      super({ ...config, iceServers }, ...rest);
    }
  };
}
