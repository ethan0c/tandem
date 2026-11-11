import type { ContentUnit } from "@/lib/content-types";

export type AudioTrack = "Sub" | "Dub";

export function availableAudioTracks(units: ContentUnit[]): AudioTrack[] {
  return (["Sub", "Dub"] as const).filter((track) => units.some((unit) => unit.group === track));
}

export function AudioTrackToggle({ tracks, active, onChange, disabled = false }: {
  tracks: AudioTrack[];
  active: AudioTrack;
  onChange: (track: AudioTrack) => void;
  disabled?: boolean;
}) {
  if (tracks.length < 2) return null;
  return (
    <div className="audio-track-control">
      <span className="audio-track-label">Audio</span>
      <div className="audio-track-toggle" role="group" aria-label="Audio track">
        {tracks.map((track) => (
          <button
            key={track}
            type="button"
            className="audio-track-option"
            aria-pressed={active === track}
            disabled={disabled}
            onClick={() => onChange(track)}
          >
            {track}
          </button>
        ))}
      </div>
    </div>
  );
}
