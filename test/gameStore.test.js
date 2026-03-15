import { expect, test } from "vitest";

import { createGameStore, hasPlayerProgress } from "../src/app/gameStore.js";
import { createInitialState } from "../src/game/engine.js";

function createStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };
}

test("game store dispatch updates state and persist delegates to save", () => {
  const storage = createStorage();
  let persistedState = null;
  const store = createGameStore({
    storage,
    now: () => 1_000,
    load: () => createInitialState(1_000),
    save: (state) => {
      persistedState = state;
    },
  });

  const nextState = store.dispatch(
    { type: "CLICK", bonusMultiplier: 1 },
    { nowMs: 2_000 },
  );
  store.persist();

  expect(nextState.loc).toBeGreaterThan(0);
  expect(nextState.totalClicks).toBe(1);
  expect(persistedState).toBe(nextState);
});

test("hasPlayerProgress only becomes true after meaningful progress", () => {
  const idleState = createInitialState(1_000);
  expect(hasPlayerProgress(idleState, 1_000)).toBe(false);

  const progressedState = {
    ...idleState,
    totalClicks: 1,
  };
  expect(hasPlayerProgress(progressedState, 1_000)).toBe(true);
});
