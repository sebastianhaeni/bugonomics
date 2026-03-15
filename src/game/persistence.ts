import { STORAGE_BACKUP_KEY, STORAGE_KEY } from "./constants.js";
import type { GameState, StorageLike } from "./types.js";
import { createInitialState, normalizeState } from "./engine.js";

export function saveState(
  state: GameState,
  storage: StorageLike = window.localStorage,
): void {
  const serialized = JSON.stringify(state);
  storage.setItem(STORAGE_KEY, serialized);
  storage.setItem(STORAGE_BACKUP_KEY, serialized);
}

export function loadState(
  storage: StorageLike = window.localStorage,
  nowMs = Date.now(),
): GameState {
  const candidates = [
    readStoredState(storage, STORAGE_KEY, nowMs),
    readStoredState(storage, STORAGE_BACKUP_KEY, nowMs),
  ].filter((value): value is GameState => value !== null);

  if (candidates.length === 0) {
    return createInitialState(nowMs);
  }

  return candidates.reduce((latest, candidate) =>
    candidate.lastTickAt > latest.lastTickAt ? candidate : latest,
  );
}

function readStoredState(
  storage: StorageLike,
  key: string,
  nowMs: number,
): GameState | null {
  const raw = storage.getItem(key);
  if (!raw) {
    return null;
  }

  try {
    return normalizeState(JSON.parse(raw), nowMs);
  } catch {
    return null;
  }
}

export function encodeShareState(state: GameState): string {
  const json = JSON.stringify(state);
  if (typeof window !== "undefined" && window.btoa) {
    return window.btoa(encodeURIComponent(json));
  }

  return Buffer.from(encodeURIComponent(json), "utf-8").toString("base64");
}

export function decodeShareState(
  encoded: string,
  nowMs = Date.now(),
): GameState {
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
