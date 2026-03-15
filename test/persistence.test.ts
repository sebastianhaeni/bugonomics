import { expect, test } from "vitest";

import { createInitialState } from "../src/game/engine.js";
import { STORAGE_BACKUP_KEY, STORAGE_KEY } from "../src/game/constants.js";
import {
  decodeShareState,
  encodeShareState,
  loadState,
  saveState,
} from "../src/game/persistence.js";

function createStorage(seedValue: string | null = null, backupValue: string | null = null) {
  const values = new Map<string, string | null>([
    [STORAGE_KEY, seedValue],
    [STORAGE_BACKUP_KEY, backupValue],
  ]);

  return {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
  };
}

test("share state roundtrips through encode/decode", () => {
  const state = createInitialState(1_000);
  state.loc = 42;
  state.reputation = 3;

  const encoded = encodeShareState(state);
  const decoded = decodeShareState(encoded, 2_000);

  expect(decoded.loc).toBe(42);
  expect(decoded.reputation).toBe(3);
});

test("loadState falls back to a fresh state on bad JSON", () => {
  const storage = createStorage("{not-json");

  const loaded = loadState(storage, 5_000);

  expect(loaded.lastTickAt).toBe(5_000);
  expect(loaded.totalClicks).toBe(0);
});

test("saveState writes JSON to storage under the storage key", () => {
  const written = new Map<string, string>();
  const storage = {
    getItem() {
      return null;
    },
    setItem(key: string, value: string) {
      written.set(key, value);
    },
  };
  const state = createInitialState(1_500);
  state.totalClicks = 4;

  saveState(state, storage);

  expect(JSON.parse(written.get(STORAGE_KEY) ?? "").totalClicks).toBe(4);
  expect(JSON.parse(written.get(STORAGE_BACKUP_KEY) ?? "").totalClicks).toBe(4);
});

test("loadState normalizes persisted values", () => {
  const storage = createStorage(
    JSON.stringify({
      dollars: -100,
      upgrades: { unlock_mid_developers: 1 },
      activeBoosts: [{ expiresAt: 9_999, multiplier: 2, source: "boost" }],
    }),
  );

  const loaded = loadState(storage, 5_000);

  expect(loaded.dollars).toBe(0);
  expect(loaded.unlocks.mid).toBe(true);
  expect(loaded.activeBoosts).toHaveLength(1);
});

test("decodeShareState rejects empty input", () => {
  expect(() => decodeShareState("", 2_000)).toThrow("Share code is empty.");
});

test("loadState creates a fresh state when storage is empty", () => {
  const loaded = loadState(createStorage(null), 7_000);

  expect(loaded.lastTickAt).toBe(7_000);
  expect(loaded.dollars).toBe(0);
});

test("loadState falls back to backup snapshot when primary is corrupted", () => {
  const backup = JSON.stringify({
    totalClicks: 23,
    lastTickAt: 8_000,
    dollars: 12,
  });

  const loaded = loadState(createStorage("{bad-json", backup), 9_000);

  expect(loaded.totalClicks).toBe(23);
  expect(loaded.dollars).toBe(12);
  expect(loaded.lastTickAt).toBe(8_000);
});

test("loadState prefers the newest valid snapshot", () => {
  const primary = JSON.stringify({
    totalClicks: 11,
    lastTickAt: 5_000,
  });
  const backup = JSON.stringify({
    totalClicks: 17,
    lastTickAt: 8_000,
  });

  const loaded = loadState(createStorage(primary, backup), 9_000);

  expect(loaded.totalClicks).toBe(17);
  expect(loaded.lastTickAt).toBe(8_000);
});

test("encode and decode use browser base64 helpers when available", () => {
  const originalWindow = globalThis.window;
  const state = createInitialState(1_000);
  state.totalClicks = 12;
  const browserWindow = {
    btoa: (value: string) => Buffer.from(value, "utf-8").toString("base64"),
    atob: (value: string) => Buffer.from(value, "base64").toString("utf-8"),
  };
  Object.defineProperty(globalThis, "window", {
    value: browserWindow,
    configurable: true,
  });

  const encoded = encodeShareState(state);
  const decoded = decodeShareState(encoded, 2_000);

  expect(decoded.totalClicks).toBe(12);

  Object.defineProperty(globalThis, "window", {
    value: originalWindow,
    configurable: true,
  });
});
