import { STORAGE_KEY } from "./constants.js";
import { createInitialState, normalizeState } from "./engine.js";

export function saveState(state, storage = window.localStorage) {
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function loadState(storage = window.localStorage, nowMs = Date.now()) {
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

export function encodeShareState(state) {
  const json = JSON.stringify(state);
  if (typeof window !== "undefined" && window.btoa) {
    return window.btoa(encodeURIComponent(json));
  }

  return Buffer.from(encodeURIComponent(json), "utf-8").toString("base64");
}

export function decodeShareState(encoded, nowMs = Date.now()) {
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
