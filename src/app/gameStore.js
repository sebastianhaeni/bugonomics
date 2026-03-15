import {
  createInitialState,
  getDeveloperCount,
  getVisibleDeveloperCount,
  tick,
} from "../game/engine.js";
import { loadState, saveState } from "../game/persistence.js";

export function hasPlayerProgress(state, nowMs = Date.now()) {
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
} = {}) {
  let state = load(storage, now());

  function getState() {
    return state;
  }

  function dispatch(action, options = {}) {
    state = advanceState(state, {
      action,
      nowMs: options.nowMs ?? now(),
      random: options.random,
    });
    return state;
  }

  function advance(options = {}) {
    state = advanceState(state, {
      nowMs: options.nowMs ?? now(),
      random: options.random,
    });
    return state;
  }

  function reset(nowMs = now()) {
    state = createState(nowMs);
    return state;
  }

  function persist() {
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
