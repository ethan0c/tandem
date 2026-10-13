/** Camera adaptation and user warnings have separate thresholds. */
export class ConnectionQuality {
  private received = new Map<string, { received: number; lost: number }>();
  private bad = 0;
  private good = 0;
  private limitedSamples = 0;
  private healthySamples = 0;
  private startedAt: number | null = null;
  poor = false;
  limited = false;

  constructor(private warmupMs = 10_000) {}

  sample(stats: RTCStatsReport, state: RTCPeerConnectionState, now = Date.now()) {
    this.startedAt ??= now;
    let measured = false;
    let struggling = state === "disconnected" || state === "failed";
    let constrained = struggling;
    measured ||= struggling;
    const selected = new Set<string>();
    stats.forEach((s) => {
      if (s.type === "transport" && s.selectedCandidatePairId) selected.add(s.selectedCandidatePairId);
    });
    stats.forEach((s) => {
      if (s.type === "candidate-pair" && (selected.has(s.id) || (!selected.size && s.nominated)) && s.state === "succeeded" && typeof s.currentRoundTripTime === "number") {
        measured = true;
        constrained ||= s.currentRoundTripTime > 0.6;
        struggling ||= s.currentRoundTripTime > 1;
      }
      if (s.type === "outbound-rtp" && s.qualityLimitationReason === "bandwidth") {
        measured = true;
        constrained = true;
        // Normal browser video adaptation alone should not alarm the user.
      }
      if (s.type === "inbound-rtp" && typeof s.packetsReceived === "number" && typeof s.packetsLost === "number") {
        const prev = this.received.get(s.id);
        this.received.set(s.id, { received: s.packetsReceived, lost: s.packetsLost });
        if (prev) {
          const received = s.packetsReceived - prev.received;
          const lost = Math.max(0, s.packetsLost - prev.lost);
          if (received >= 0 && received + lost >= 20) {
            measured = true;
            const loss = lost / (received + lost);
            constrained ||= loss > 0.05;
            struggling ||= loss > (s.kind === "audio" || s.mediaType === "audio" ? 0.08 : 0.12);
          }
        }
      }
    });
    if (!measured) {
      this.bad = this.good = this.limitedSamples = this.healthySamples = 0;
      return this.poor;
    }
    this.limitedSamples = constrained ? this.limitedSamples + 1 : 0;
    this.healthySamples = constrained ? 0 : this.healthySamples + 1;
    if (this.limitedSamples >= 3) this.limited = true;
    if (this.healthySamples >= 5) this.limited = false;
    if (now - this.startedAt < this.warmupMs) return this.poor;
    this.bad = struggling ? this.bad + 1 : 0;
    this.good = struggling ? 0 : this.good + 1;
    if (this.bad >= 5) this.poor = true;
    if (this.good >= 3) this.poor = false;
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
