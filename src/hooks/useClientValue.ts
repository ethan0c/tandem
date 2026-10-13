"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** Read a browser-only value (localStorage, window.location) without hydration mismatches. */
export function useClientValue<T>(read: () => T, serverValue: T): T {
  return useSyncExternalStore(noop, read, () => serverValue);
}
