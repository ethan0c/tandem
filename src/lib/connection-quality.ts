/** Use interval loss, not lifetime totals, so a connection can recover. */
export class ConnectionQuality {
  private received = new Map<string, { received: number; lost: number }>();
  private bad = 0;
  private good = 0;
  poor = false;

  sample(stats: RTCStatsReport, state: RTCPeerConnectionState) {
    let measured = false;
    let struggling = state === "disconnected" || state === "failed";
    measured ||= struggling;
    const selected = new Set<string>();
    stats.forEach((s) => {
      if (s.type === "transport" && s.selectedCandidatePairId) selected.add(s.selectedCandidatePairId);
    });
    stats.forEach((s) => {
      if (s.type === "candidate-pair" && (selected.has(s.id) || s.nominated) && s.state === "succeeded" && typeof s.currentRoundTripTime === "number") {
        measured = true;
        struggling ||= s.currentRoundTripTime > 0.6;
      }
      if (s.type === "outbound-rtp" && s.qualityLimitationReason === "bandwidth") {
        measured = true;
        struggling = true;
      }
      if (s.type === "inbound-rtp" && typeof s.packetsReceived === "number" && typeof s.packetsLost === "number") {
        const prev = this.received.get(s.id);
        this.received.set(s.id, { received: s.packetsReceived, lost: s.packetsLost });
        if (prev) {
          const received = s.packetsReceived - prev.received;
          const lost = Math.max(0, s.packetsLost - prev.lost);
          if (received >= 0 && received + lost >= 20) {
            measured = true;
            struggling ||= lost / (received + lost) > 0.05;
          }
        }
      }
    });
    if (!measured) return this.poor;
    this.bad = struggling ? this.bad + 1 : 0;
    this.good = struggling ? 0 : this.good + 1;
    if (this.bad >= 3) this.poor = true;
    if (this.good >= 5) this.poor = false;
    return this.poor;
  }
}

/** Limit only the camera sender; screen sharing uses its own connections. */
export async function setCameraQuality(pc: RTCPeerConnection, poor: boolean) {
  for (const sender of pc.getSenders()) {
    if (sender.track?.kind !== "video") continue;
    try {
      const params = sender.getParameters();
      if (!params.encodings?.length) continue;
      const height = sender.track.getSettings().height ?? 720;
      for (const encoding of params.encodings) {
        encoding.maxBitrate = poor ? 220_000 : 900_000;
        encoding.maxFramerate = poor ? 15 : 24;
        encoding.scaleResolutionDownBy = Math.max(1, height / (poor ? 360 : 720));
      }
      params.degradationPreference = "maintain-framerate";
      await sender.setParameters(params);
    } catch {
      // Unsupported constraints or a closing connection must not interrupt the call.
    }
  }
}
