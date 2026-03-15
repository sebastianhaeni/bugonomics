import { expect, test } from "vitest";

import { createInitialState } from "../src/game/engine.js";
import {
  STORAGE_KEY,
} from "../src/game/constants.js";
import {
  decodeShareState,
  encodeShareState,
  loadState,
  saveState,
} from "../src/game/persistence.js";

function createStorage(seedValue: string | null = null) {
  let currentValue = seedValue;
  return {
    getItem() {
      return currentValue;
    },
    setItem(_key: string, value: string) {
      currentValue = value;
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
  let writtenKey = "";
  let writtenValue = "";
  const storage = {
    getItem() {
      return null;
    },
    setItem(key: string, value: string) {
      writtenKey = key;
      writtenValue = value;
    },
  };
  const state = createInitialState(1_500);
  state.totalClicks = 4;

  saveState(state, storage);

  expect(writtenKey).toBe(STORAGE_KEY);
  expect(JSON.parse(writtenValue).totalClicks).toBe(4);
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
