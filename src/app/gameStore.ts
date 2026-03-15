import {
  createInitialState,
  getDeveloperCount,
  getVisibleDeveloperCount,
  tick,
} from "../game/engine.js";
import { loadState, saveState } from "../game/persistence.js";
import type { GameAction, GameState, StorageLike, TickOptions } from "../game/types.js";

interface GameStoreOptions {
  storage?: StorageLike;
  now?: () => number;
  load?: (storage: StorageLike, nowMs?: number) => GameState;
  save?: (state: GameState, storage: StorageLike) => void;
  createState?: (nowMs?: number) => GameState;
  advanceState?: (state: GameState, options?: TickOptions) => GameState;
}

export function hasPlayerProgress(state: GameState, nowMs = Date.now()): boolean {
  const baseline = createInitialState(nowMs);
  return (
    state.dollars > baseline.dollars ||
    state.loc > 0 ||
    getDeveloperCount(state) > 0 ||
    getVisibleDeveloperCount(state, nowMs) > 0 ||
    state.totalClicks > 0
  );
}

export function createGameStore({
  storage = window.localStorage,
  now = () => Date.now(),
  load = loadState,
  save = saveState,
  createState = createInitialState,
  advanceState = tick,
}: GameStoreOptions = {}) {
  let state: GameState = load(storage, now());

  function getState() {
    return state;
  }

  function dispatch(action: GameAction, options: TickOptions = {}): GameState {
    state = advanceState(state, {
      action,
      nowMs: options.nowMs ?? now(),
      random: options.random,
    });
    return state;
  }

  function advance(options: TickOptions = {}): GameState {
    state = advanceState(state, {
      nowMs: options.nowMs ?? now(),
      random: options.random,
    });
    return state;
  }

  function reset(nowMs = now()): GameState {
    state = createState(nowMs);
    return state;
  }

  function persist(): GameState {
    save(state, storage);
    return state;
  }

  return {
    getState,
    dispatch,
    advance,
    reset,
    persist,
  };
}
