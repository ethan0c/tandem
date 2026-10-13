import { WifiOff } from "lucide-react";

export function ConnectionNotice({ poor, cameraOn, onTurnCameraOff }: { poor: boolean; cameraOn: boolean; onTurnCameraOff: () => void }) {
  if (!poor) return null;
  return (
    <div role="status" className="border-t border-amber-300/15 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
      <p className="flex items-center gap-1.5 font-medium"><WifiOff className="size-3.5 shrink-0" /> Weak call connection</p>
      <p className="mt-1 leading-relaxed">{cameraOn ? "Try turning your camera off to give audio more bandwidth." : "Camera is off. If audio still breaks up, try a stronger connection."}</p>
      {cameraOn && <button onClick={onTurnCameraOff} className="mt-2 rounded-lg border border-amber-200/20 px-2.5 py-1.5 font-medium transition hover:bg-amber-200/10 focus-visible:outline-2 focus-visible:outline-amber-200">Turn camera off</button>}
    </div>
  );
}
