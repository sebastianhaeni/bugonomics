import type { GameAction, GameState } from "../game/types.js";
import { clamp01 } from "./math.js";

interface ManualWriteControllerOptions {
  clickButton: HTMLButtonElement;
  comboMeter: HTMLElement;
  comboBursts: HTMLElement;
  locBursts: HTMLElement;
  shell: HTMLElement;
  ensureAudioStarted: () => void;
  startMusic: () => void;
  isGameOver: (state: GameState) => boolean;
  getState: () => GameState;
  getClickLocGain: (state: GameState) => number;
  dispatchAction: (action: GameAction) => void;
}

const COMBO_TIMEOUT_MS = 1800;

export function createManualWriteController({
  clickButton,
  comboMeter,
  comboBursts,
  locBursts,
  shell,
  ensureAudioStarted,
  startMusic,
  isGameOver,
  getState,
  getClickLocGain,
  dispatchAction,
}: ManualWriteControllerOptions) {
  const comboState = {
    count: 0,
    lastHitAt: 0,
  };

  function performManualWrite(callouts: string[]): void {
    const state = getState();
    if (isGameOver(state)) {
      return;
    }

    ensureAudioStarted();
    startMusic();
    const nowMs = Date.now();
    const flowMultiplier = getFlowMultiplierForNextWrite();
    const gain = getClickLocGain(state) * flowMultiplier;
    dispatchAction({ type: "CLICK", bonusMultiplier: flowMultiplier });
    triggerClickButtonFx();
    spawnLocBurst(gain);
    registerManualWriteFeedback(nowMs, flowMultiplier, callouts);
  }

  function triggerClickButtonFx(): void {
    clickButton.classList.remove("is-firing");
    void clickButton.offsetWidth;
    clickButton.classList.add("is-firing");
    window.setTimeout(() => {
      clickButton.classList.remove("is-firing");
    }, 280);
  }

  function registerManualWriteFeedback(
    nowMs: number,
    flowMultiplier: number,
    callouts: string[],
  ): void {
    if (nowMs - comboState.lastHitAt > COMBO_TIMEOUT_MS) {
      comboState.count = 0;
    }
    comboState.count += 1;
    comboState.lastHitAt = nowMs;

    const callout = callouts[Math.floor(Math.random() * callouts.length)];
    comboMeter.textContent =
      comboState.count > 1 ? `Flow x${comboState.count} - ${callout}` : "Flow x1";
    comboMeter.classList.toggle("is-hot", comboState.count >= 6);

    if (
      comboState.count >= 8 &&
      (comboState.count % 8 === 0 || Math.random() < 0.04)
    ) {
      spawnComboBurst(callout);
    }
  }

  function spawnComboBurst(text: string): void {
    const burst = document.createElement("span");
    burst.className = "combo-burst";
    burst.textContent = text;
    burst.style.setProperty("--x", "0px");
    comboBursts.append(burst);
    window.setTimeout(() => burst.remove(), 1000);
  }

  function spawnLocBurst(amount: number): void {
    const burst = document.createElement("span");
    burst.className = "loc-burst";
    burst.textContent = `+${amount.toFixed(1)} LOC`;

    const offsetX = Math.round((Math.random() - 0.5) * 120);
    burst.style.setProperty("--x", `${offsetX}px`);

    locBursts.append(burst);
    window.setTimeout(() => burst.remove(), 850);
  }

  function reset(): void {
    comboState.count = 0;
    comboState.lastHitAt = 0;
    comboMeter.textContent = "Flow x0";
    comboMeter.classList.remove("is-hot");
    comboBursts.replaceChildren();
    shell.classList.remove("focus-tunnel");
    shell.style.removeProperty("--focus-intensity");
  }

  function getFlowMultiplierForNextWrite(): number {
    const nextCombo = comboState.count + 1;
    const cappedCombo = Math.min(nextCombo, 12);
    return 1 + Math.max(0, cappedCombo - 1) * 0.05;
  }

  function renderCombo(nowMs: number): void {
    expireFlowIfNeeded(nowMs);
  }

  function renderFocusTunnel(nowMs: number): void {
    const comboAgeMs = nowMs - comboState.lastHitAt;
    const isActive = comboState.count >= 4 && comboAgeMs <= COMBO_TIMEOUT_MS;
    if (!isActive) {
      shell.classList.remove("focus-tunnel");
      shell.style.removeProperty("--focus-intensity");
      return;
    }

    const intensity = clamp01((comboState.count - 3) / 9);
    shell.classList.add("focus-tunnel");
    shell.style.setProperty("--focus-intensity", intensity.toFixed(3));
  }

  function expireFlowIfNeeded(nowMs: number): void {
    if (comboState.count <= 0) {
      return;
    }

    if (nowMs - comboState.lastHitAt > COMBO_TIMEOUT_MS) {
      comboState.count = 0;
      comboMeter.textContent = "Flow x0";
      comboMeter.classList.remove("is-hot");
    }
  }

  return {
    performManualWrite,
    reset,
    renderCombo,
    renderFocusTunnel,
    getFlowMultiplierForNextWrite,
    expireFlowIfNeeded,
  };
}
