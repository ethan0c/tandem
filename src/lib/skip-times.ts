export interface SkipWindow { start: number; end: number }

export function skipWindow(value: unknown): SkipWindow | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  const item = value as Record<string, unknown>;
  const { start, end } = item;
  if (typeof start !== "number" || typeof end !== "number" ||
      !Number.isFinite(start) || !Number.isFinite(end) ||
      start < 0 || end <= start || end > 4 * 60 * 60) return;
  return { start, end };
}

export function aniSkipWindows(value: unknown, duration: number): { intro?: SkipWindow; outro?: SkipWindow } {
  if (!Number.isFinite(duration) || duration <= 0 || !value || typeof value !== "object") return {};
  const results = (value as Record<string, unknown>).results;
  if (!Array.isArray(results)) return {};
  const choose = (types: string[]): SkipWindow | undefined => {
    const matches = results.flatMap((entry) => {
      if (!entry || typeof entry !== "object") return [];
      const item = entry as Record<string, unknown>;
      if (!types.includes(String(item.skipType))) return [];
      const interval = item.interval && typeof item.interval === "object" ? item.interval as Record<string, unknown> : {};
      const window = skipWindow({ start: interval.startTime, end: interval.endTime });
      if (!window || window.end > duration + 10) return [];
      return [{ window, difference: Math.abs(Number(item.episodeLength) - duration), rank: types.indexOf(String(item.skipType)) }];
    });
    matches.sort((a, b) => a.difference - b.difference || a.rank - b.rank);
    return matches[0]?.window;
  };
  return { intro: choose(["op", "mixed-op"]), outro: choose(["ed", "mixed-ed"]) };
}
