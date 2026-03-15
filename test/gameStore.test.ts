import { expect, test } from "vitest";

import { createGameStore, hasPlayerProgress } from "../src/app/gameStore.js";
import { createInitialState } from "../src/game/engine.js";
import type { GameAction, GameState, TickOptions } from "../src/game/types.js";

function createStorage() {
  const values = new Map();
  return {
    getItem(key: string) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key: string, value: string) {
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

test("hasPlayerProgress detects hired contributors even before clicks", () => {
  const state = createInitialState(2_000);
  state.developers.junior = 1;

  expect(hasPlayerProgress(state, 2_000)).toBe(true);
});

test("advance and reset use injected clock and state hooks", () => {
  const storage = createStorage();
  const advanceCalls: TickOptions[] = [];
  const loadedState = createInitialState(100);
  const createdStates: number[] = [];
  const store = createGameStore({
    storage,
    now: () => 4_000,
    load: () => loadedState,
    createState: (nowMs = 0) => {
      createdStates.push(nowMs);
      return createInitialState(nowMs);
    },
    advanceState: (state: GameState, options?: TickOptions) => {
      advanceCalls.push(options ?? {});
      return {
        ...state,
        lastTickAt: options?.nowMs ?? state.lastTickAt,
      };
    },
  });

  const advanced = store.advance();
  const reset = store.reset();

  expect(advanceCalls).toHaveLength(1);
  expect(advanceCalls[0].nowMs).toBe(4_000);
  expect(advanced.lastTickAt).toBe(4_000);
  expect(createdStates).toEqual([4_000]);
  expect(reset.lastTickAt).toBe(4_000);
});

test("dispatch passes through action, explicit nowMs, and random", () => {
  const storage = createStorage();
  const actions: Array<{
    action: GameAction | null | undefined;
    options?: TickOptions;
  }> = [];
  const store = createGameStore({
    storage,
    load: () => createInitialState(100),
    advanceState: (state: GameState, options?: TickOptions) => {
      actions.push({ action: options?.action, options });
      return state;
    },
  });
  const random = () => 0.25;

  store.dispatch(
    { type: "CLICK", bonusMultiplier: 1.1 },
    { nowMs: 9_000, random },
  );

  expect(actions).toHaveLength(1);
  expect(actions[0].action).toEqual({ type: "CLICK", bonusMultiplier: 1.1 });
  expect(actions[0].options?.nowMs).toBe(9_000);
  expect(actions[0].options?.random).toBe(random);
});
