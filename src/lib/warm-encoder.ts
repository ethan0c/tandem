import { preferCodecs } from "@/hooks/useWebRTC";

let warmed = false;

/**
 * A hardware video encoder can take several seconds to produce its first frame in a fresh browser
 * (about 6 s measured for a screen share with VideoToolbox), and a viewer stares at a blank share all
 * that time. Starting it once is enough for the rest of the browser session, so do it ahead of a
 * share: a hidden connection to ourselves encodes a few frames of a blank canvas with the same codec
 * a share uses, then everything is closed again. While it starts, other video encoding in the
 * browser stalls too, so never call this on the way into a call.
 */
export function warmVideoEncoder() {
  if (warmed || typeof RTCPeerConnection === "undefined") return;
  warmed = true;
  void (async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext("2d");
    let frame = 0;
    // A changing picture, or the encoder has nothing new to encode.
    const draw = setInterval(() => {
      if (!ctx) return;
      ctx.fillStyle = frame++ % 2 ? "#111" : "#222";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }, 100);
    const stream = canvas.captureStream(10);
    const sender = new RTCPeerConnection();
    const receiver = new RTCPeerConnection();
    const done = () => {
      clearInterval(draw);
      stream.getTracks().forEach((t) => t.stop());
      sender.close();
      receiver.close();
    };
    try {
      sender.onicecandidate = (e) => { if (e.candidate) receiver.addIceCandidate(e.candidate).catch(() => {}); };
      receiver.onicecandidate = (e) => { if (e.candidate) sender.addIceCandidate(e.candidate).catch(() => {}); };
      for (const track of stream.getTracks()) sender.addTrack(track, stream);
      preferCodecs(sender);
      await sender.setLocalDescription(await sender.createOffer());
      await receiver.setRemoteDescription(sender.localDescription!);
      await receiver.setLocalDescription(await receiver.createAnswer());
      await sender.setRemoteDescription(receiver.localDescription!);
      // Until the first frame is encoded, or give up after a while.
      const deadline = Date.now() + 15_000;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 500));
        const stats = await sender.getStats();
        const encoded = [...stats.values()].some((s) => s.type === "outbound-rtp" && s.kind === "video" && s.framesEncoded > 0);
        if (encoded) break;
      }
    } catch {
      /* Only a head start: a share still works without it, just slower to begin. */
    } finally {
      done();
    }
  })();
}
