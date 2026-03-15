import { TRADEOFF_MODES } from "./game/constants.js";
import {
  getClickLocGain,
  getPrestigeGain,
  getPrestigeLocThreshold,
  getReleaseVersion,
  isGameOver,
} from "./game/engine.js";
import { COMBO_CALLOUTS } from "./app/progression.js";
import { createAudioController } from "./app/audioController.js";
import { createGameStore, hasPlayerProgress } from "./app/gameStore.js";
import { mountGameShell } from "./app/shell.js";
import { registerServiceWorker } from "./app/registerServiceWorker.js";
import { requiredChild } from "./app/domHelpers.js";
import { createCodeBackgroundController } from "./app/codeBackgroundController.js";
import { createManualWriteController } from "./app/manualWriteController.js";
import { createManagementPanelsController } from "./app/managementPanelsController.js";
import { createGameRenderer } from "./app/gameRenderer.js";
import type { GameAction, GameState } from "./game/types.js";

registerServiceWorker();

const store = createGameStore({ storage: window.localStorage });
let state = store.getState();
const STRATEGIC_DEBT_AUTO_POSTPONE_MS = 15_000;
const KEYBOARD_WRITE_DEBOUNCE_MS = 180;
const KEYBOARD_HINT_VISIBLE_MS = 6000;
const TOUCH_WRITE_SUPPRESS_CLICK_MS = 500;

const app = document.querySelector("#app");
if (!(app instanceof HTMLElement)) {
  throw new Error("Missing #app root");
}
const { elements, buttons, statCards } = mountGameShell(app);
let lastKeyboardWriteAt = 0;
let lastTouchWriteAt = 0;
const audio = createAudioController({ isGameOver });
const codeBackground = createCodeBackgroundController({
  container: elements.codeBackground,
});
const manualWrite = createManualWriteController({
  clickButton: buttons.click,
  comboMeter: elements.comboMeter,
  comboBursts: elements.comboBursts,
  locBursts: elements.locBursts,
  shell: elements.shell,
  ensureAudioStarted: () => audio.ensureStarted(),
  startMusic: () => audio.setMusicRunning(true),
  isGameOver,
  getState: () => state,
  getClickLocGain,
  dispatchAction: applyAction,
});
const managementPanels = createManagementPanelsController({
  elements: {
    developers: elements.developers,
    upgradeShop: elements.upgradeShop,
    upgradeOwned: elements.upgradeOwned,
    achievements: elements.achievements,
    upgradeLocked: elements.upgradeLocked,
    lockedSummary: elements.lockedSummary,
    bugList: elements.bugList,
    eventList: elements.eventList,
    prestigeUpgradeList: elements.prestigeUpgradeList,
    goalTarget: elements.goalTarget,
    goalProgress: elements.goalProgress,
    goalProgressFill: elements.goalProgressFill,
    goalReward: elements.goalReward,
    prestigeReset: elements.prestigeReset,
  },
  requiredChild,
  getState: () => state,
  applyAction,
  getPrestigeGain,
  getPrestigeLocThreshold,
  getReleaseVersion,
});
const gameRenderer = createGameRenderer({
  buttons,
  elements,
  statCards,
  audio,
  codeBackground,
  manualWrite,
  managementPanels,
  applyAction,
  requiredChild,
});

function applyAction(action: GameAction): void {
  if (isGameOver(state)) {
    return;
  }
  audio.ensureStarted();
  audio.setMusicRunning(true);
  const previousState = state;
  const nextState = store.dispatch(action);
  audio.playActionSfx(previousState, nextState, action);
  state = nextState;
  store.persist();
  render();
}

const performManualWriteFromUi = (): void => {
  manualWrite.performManualWrite(COMBO_CALLOUTS);
};

buttons.click.addEventListener("pointerdown", (event) => {
  if (event.pointerType === "mouse") {
    return;
  }
  if (event.cancelable) {
    event.preventDefault();
  }
  lastTouchWriteAt = Date.now();
  performManualWriteFromUi();
});

buttons.click.addEventListener("click", () => {
  if (Date.now() - lastTouchWriteAt < TOUCH_WRITE_SUPPRESS_CLICK_MS) {
    return;
  }
  performManualWriteFromUi();
});

window.addEventListener("keydown", (event) => {
  if (event.defaultPrevented || event.repeat) {
    return;
  }
  if (event.metaKey || event.ctrlKey || event.altKey) {
    return;
  }

  const target = event.target;
  if (target instanceof HTMLElement) {
    if (target.isContentEditable || target.closest("input, textarea, select")) {
      return;
    }
  }

  if (event.key.length !== 1) {
    return;
  }

  const nowMs = Date.now();
  if (nowMs - lastKeyboardWriteAt < KEYBOARD_WRITE_DEBOUNCE_MS) {
    return;
  }
  lastKeyboardWriteAt = nowMs;
  manualWrite.performManualWrite(COMBO_CALLOUTS);
});

elements.tradeoffModes.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const modeButton = target.closest("button[data-mode-id]");
  if (!modeButton) {
    return;
  }

  const modeId = modeButton.getAttribute("data-mode-id") as
    | GameState["tradeoffMode"]
    | null;
  if (!modeId || modeId === state.tradeoffMode) {
    return;
  }

  applyAction({ type: "SET_TRADEOFF_MODE", modeId });
});

elements.prestigeReset.addEventListener("click", () => {
  applyAction({ type: "PRESTIGE_RESET" });
});

elements.restart.addEventListener("click", () => {
  state = store.reset(Date.now());
  codeBackground.reset();
  manualWrite.reset();
  store.persist();
  render();
});

elements.repairTechDebt.addEventListener("click", () => {
  applyAction({ type: "PAY_TECH_DEBT" });
});

buttons.strategicRewrite.addEventListener("click", () => {
  applyAction({ type: "RESOLVE_STRATEGIC_DEBT" });
});

buttons.strategicPostpone.addEventListener("click", () => {
  applyAction({ type: "POSTPONE_STRATEGIC_DEBT" });
});

buttons.gameOverRestart.addEventListener("click", () => {
  state = store.reset(Date.now());
  codeBackground.reset();
  manualWrite.reset();
  store.persist();
  render();
});

function render() {
  gameRenderer.render(state);
  const nowMs = Date.now();
  if (hasPlayerProgress(state, nowMs)) {
    store.persist();
  }
}
gameRenderer.init();

elements.clickPrimaryWrap?.classList.add("show-tip");
window.setTimeout(() => {
  elements.clickPrimaryWrap?.classList.remove("show-tip");
  elements.clickPrimaryWrap?.classList.add("tip-expired");
}, KEYBOARD_HINT_VISIBLE_MS);

window.setInterval(() => {
  state = store.advance();
  store.persist();
  render();
}, 250);

render();
