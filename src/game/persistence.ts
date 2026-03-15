import { STORAGE_KEY } from "./constants.js";
import type { GameState, StorageLike } from "./types.js";
import { createInitialState, normalizeState } from "./engine.js";

export function saveState(
  state: GameState,
  storage: StorageLike = window.localStorage,
): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function loadState(
  storage: StorageLike = window.localStorage,
  nowMs = Date.now(),
): GameState {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) {
    return createInitialState(nowMs);
  }

  try {
    return normalizeState(JSON.parse(raw), nowMs);
  } catch {
    return createInitialState(nowMs);
  }
}

export function encodeShareState(state: GameState): string {
  const json = JSON.stringify(state);
  if (typeof window !== "undefined" && window.btoa) {
    return window.btoa(encodeURIComponent(json));
  }

  return Buffer.from(encodeURIComponent(json), "utf-8").toString("base64");
}

export function decodeShareState(encoded: string, nowMs = Date.now()): GameState {
  if (!encoded || typeof encoded !== "string") {
    throw new Error("Share code is empty.");
  }

  let decoded;
  if (typeof window !== "undefined" && window.atob) {
    decoded = window.atob(encoded);
  } else {
    decoded = Buffer.from(encoded, "base64").toString("utf-8");
  }

  return normalizeState(JSON.parse(decodeURIComponent(decoded)), nowMs);
}
