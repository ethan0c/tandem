export interface ReadingState {
  chapter: number;
  page: number;
  hostOnly: boolean;
  unit?: string;
}
export interface RoomStory {
  id: string;
  kind: "anime" | "manga";
  title: string;
}
export const initialReading: ReadingState = {
  chapter: 1,
  page: 0,
  hostOnly: false,
};
export function readingUpdate(
  current: ReadingState,
  value: unknown,
  isHost: boolean,
): ReadingState | null {
  if (!value || typeof value !== "object") return null;
  const patch = value as Partial<ReadingState>;
  if (
    patch.unit !== undefined &&
    (typeof patch.unit !== "string" ||
      (patch.unit !== "" && !/^[a-z0-9][a-z0-9_-]{0,79}$/i.test(patch.unit)))
  )
    return null;
  if (current.hostOnly && !isHost) return null;
  if (
    patch.hostOnly !== undefined &&
    (!isHost || typeof patch.hostOnly !== "boolean")
  )
    return null;
  if (
    patch.chapter !== undefined &&
    (!Number.isFinite(patch.chapter) ||
      patch.chapter < 1 ||
      patch.chapter > 1_000_000)
  )
    return null;
  if (
    patch.page !== undefined &&
    (!Number.isInteger(patch.page) || patch.page < 0 || patch.page > 499)
  )
    return null;
  return {
    ...(patch.unit !== undefined
      ? { unit: patch.unit }
      : current.unit
        ? { unit: current.unit }
        : {}),
    chapter: patch.chapter ?? current.chapter,
    page: patch.page ?? current.page,
    hostOnly: patch.hostOnly ?? current.hostOnly,
  };
}
export function validStory(value: unknown): RoomStory | null {
  if (!value || typeof value !== "object") return null;
  const story = value as RoomStory;
  return typeof story.id === "string" &&
    /^\d{1,10}$/.test(story.id) &&
    (story.kind === "anime" || story.kind === "manga") &&
    typeof story.title === "string" &&
    story.title.trim().length > 0
    ? {
        id: story.id,
        kind: story.kind,
        title: story.title.trim().slice(0, 160),
      }
    : null;
}
