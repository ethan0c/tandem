/**
 * Small, targeted SDP edits. Each one only touches a codec's `a=fmtp` parameters, which browsers read
 * from the remote description to configure what they send.
 */

type Params = Record<string, string | number>;

/** Payload types in the SDP whose rtpmap names one of `codecs` (lower case, e.g. "opus", "vp9"). */
function payloadTypes(sdp: string, codecs: string[]): string[] {
  const out: string[] = [];
  for (const m of sdp.matchAll(/^a=rtpmap:(\d+) ([\w-]+)\//gim)) {
    if (codecs.includes(m[2].toLowerCase())) out.push(m[1]);
  }
  return out;
}

/** Merge `params` into the fmtp line of each payload type, adding the line if there is none. */
function mergeFmtp(sdp: string, pts: string[], params: Params): string {
  const eol = sdp.includes("\r\n") ? "\r\n" : "\n";
  const lines = sdp.split(eol);
  for (const pt of pts) {
    const at = lines.findIndex((l) => l.startsWith(`a=fmtp:${pt} `));
    const existing = new Map<string, string>();
    if (at !== -1) {
      for (const pair of lines[at].slice(`a=fmtp:${pt} `.length).split(";")) {
        const [k, ...v] = pair.trim().split("=");
        if (k) existing.set(k, v.join("="));
      }
    }
    for (const [k, v] of Object.entries(params)) existing.set(k, String(v));
    const line = `a=fmtp:${pt} ${Array.from(existing, ([k, v]) => (v === "" ? k : `${k}=${v}`)).join(";")}`;
    if (at !== -1) lines[at] = line;
    else {
      const rtpmap = lines.findIndex((l) => l.startsWith(`a=rtpmap:${pt} `));
      if (rtpmap !== -1) lines.splice(rtpmap + 1, 0, line);
    }
  }
  return lines.join(eol);
}

/**
 * The show's sound: full-band stereo Opus at up to `kbps`, with loss recovery but no silence
 * suppression (DTX would gate quiet scenes and music tails). Default Opus in a call is ~32 kbps mono.
 */
export function tuneMusicOpus(sdp: string, kbps = 128): string {
  return mergeFmtp(sdp, payloadTypes(sdp, ["opus"]), {
    stereo: 1,
    "sprop-stereo": 1,
    maxaveragebitrate: kbps * 1000,
    maxplaybackrate: 48000,
    useinbandfec: 1,
    usedtx: 0,
  });
}

/**
 * Chrome-only: where the bandwidth estimate starts. It otherwise starts at ~300 kbps and takes
 * 10–20 s to ramp, so a share opens blurry. Other browsers ignore the parameter.
 */
export function startVideoBitrate(sdp: string, kbps: number): string {
  return mergeFmtp(sdp, payloadTypes(sdp, ["vp8", "vp9", "h264", "av1"]), { "x-google-start-bitrate": kbps });
}

export function tuneSdp<T extends RTCSessionDescriptionInit>(desc: T, ...edits: ((sdp: string) => string)[]): T {
  if (!desc.sdp) return desc;
  return { ...desc, sdp: edits.reduce((sdp, edit) => edit(sdp), desc.sdp) };
}
