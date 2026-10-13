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
      if (s.type === "outbound-rtp" && (s.qualityLimitationReason === "bandwidth" || s.qualityLimitationReason === "cpu")) {
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

/**
 * Screen share steps, best first. The top step is the largest capture we ever ask for, so it never
 * scales; the rest trade resolution for a picture the link and the encoder can keep up with.
 */
export const SHARE_TIERS = [
  { height: 2160, bitrate: 20_000_000 },
  { height: 1440, bitrate: 12_000_000 },
  { height: 1080, bitrate: 6_000_000 },
  { height: 720, bitrate: 2_500_000 },
] as const;
/** Healthy samples (2 s apart) before trying a step up, and how far failed tries can push that out. */
const SHARE_UP_MIN = 15;
const SHARE_UP_MAX = 240;
/** A step up that is undone sooner than this counts as failed. */
const SHARE_UP_PROBATION_MS = 60_000;

/**
 * Steps a screen share down when the encoder is starved, by the link (weak Wi-Fi) or by the CPU (a
 * background tab gets less of it), and back up once it has been healthy for a while. Each step up
 * that fails quickly doubles the wait before the next, so a machine that can't hold 4K settles
 * instead of flapping.
 */
export class ShareAdaptation {
  tier = 0;
  private limitedSamples = 0;
  private healthySamples = 0;
  private upAfter = SHARE_UP_MIN;
  private steppedUpAt: number | null = null;
  private startedAt: number | null = null;

  /** The bandwidth estimate starts low and ramps up; that early "bandwidth" limit is not a weak link. */
  constructor(private warmupMs = 15_000) {}

  sample(stats: RTCStatsReport, now = Date.now()) {
    this.startedAt ??= now;
    let measured = false;
    let constrained = false;
    const selected = new Set<string>();
    stats.forEach((s) => {
      if (s.type === "transport" && s.selectedCandidatePairId) selected.add(s.selectedCandidatePairId);
    });
    stats.forEach((s) => {
      const video = s.kind === "video" || s.mediaType === "video";
      if (s.type === "outbound-rtp" && video && typeof s.qualityLimitationReason === "string") {
        measured = true;
        constrained ||= s.qualityLimitationReason === "bandwidth" || s.qualityLimitationReason === "cpu";
      }
      if (s.type === "remote-inbound-rtp" && video && typeof s.fractionLost === "number") {
        measured = true;
        constrained ||= s.fractionLost > 0.05;
      }
      if (s.type === "candidate-pair" && (selected.has(s.id) || (!selected.size && s.nominated)) && s.state === "succeeded" && typeof s.currentRoundTripTime === "number") {
        measured = true;
        constrained ||= s.currentRoundTripTime > 0.6;
      }
    });
    if (!measured || now - this.startedAt < this.warmupMs) return this.tier;
    this.limitedSamples = constrained ? this.limitedSamples + 1 : 0;
    this.healthySamples = constrained ? 0 : this.healthySamples + 1;
    if (this.steppedUpAt !== null && !constrained && now - this.steppedUpAt >= SHARE_UP_PROBATION_MS) {
      // The last step up held: future tries can come quickly again.
      this.upAfter = SHARE_UP_MIN;
      this.steppedUpAt = null;
    }
    if (this.limitedSamples >= 4 && this.tier < SHARE_TIERS.length - 1) {
      if (this.steppedUpAt !== null) this.upAfter = Math.min(this.upAfter * 2, SHARE_UP_MAX);
      this.steppedUpAt = null;
      this.tier++;
      this.limitedSamples = this.healthySamples = 0;
    } else if (this.healthySamples >= this.upAfter && this.tier > 0) {
      this.tier--;
      this.steppedUpAt = now;
      this.limitedSamples = this.healthySamples = 0;
    }
    return this.tier;
  }
}

/** Apply a share step to every video sender. Shed frames rather than resolution within a step. */
export async function setShareQuality(pc: RTCPeerConnection, tier: number) {
  const { height: maxHeight, bitrate } = SHARE_TIERS[tier];
  for (const sender of pc.getSenders()) {
    if (sender.track?.kind !== "video") continue;
    try {
      const params = sender.getParameters();
      if (!params.encodings?.length) continue;
      const height = sender.track.getSettings().height ?? maxHeight;
      params.encodings[0].maxBitrate = bitrate;
      params.encodings[0].scaleResolutionDownBy = Math.max(1, height / maxHeight);
      params.degradationPreference = "maintain-resolution";
      await sender.setParameters(params);
    } catch {
      // Unsupported constraints or a closing connection must not interrupt the share.
    }
  }
}
