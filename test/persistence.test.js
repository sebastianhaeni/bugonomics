import { expect, test } from "vitest";

import { createInitialState } from "../src/game/engine.js";
import {
  decodeShareState,
  encodeShareState,
  loadState,
} from "../src/game/persistence.js";

function createStorage(seedValue = null) {
  let currentValue = seedValue;
  return {
    getItem() {
      return currentValue;
    },
    setItem(_key, value) {
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
