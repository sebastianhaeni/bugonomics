import { TRADEOFF_MODES } from "./game/constants.js";
import {
  getBaseLocPerSecond,
  getBugRiskSummary,
  getBugPenaltyMultiplier,
  getClickLocGain,
  getPrestigeGain,
  getPrestigeLocThreshold,
  getReleaseVersion,
  getLocDollarConversionRate,
  getTechDebtStatus,
  getTechDebtRepairCost,
  isGameOver,
} from "./game/engine.js";
import {
  COMBO_CALLOUTS,
  getBoughtUpgradeCount,
  getCompanyStagePresentation,
} from "./app/progression.js";
import { createAudioController } from "./app/audioController.js";
import { createGameStore, hasPlayerProgress } from "./app/gameStore.js";
import { clamp01, ratioByLog } from "./app/math.js";
import { mountGameShell } from "./app/shell.js";
import { registerServiceWorker } from "./app/registerServiceWorker.js";
import { requiredChild } from "./app/domHelpers.js";
import { createCodeBackgroundController } from "./app/codeBackgroundController.js";
import { createManualWriteController } from "./app/manualWriteController.js";
import { createManagementPanelsController } from "./app/managementPanelsController.js";
import type { GameAction, GameState, TechDebtStatus } from "./game/types.js";

registerServiceWorker();

const store = createGameStore({ storage: window.localStorage });
let state = store.getState();
const STRATEGIC_DEBT_AUTO_POSTPONE_MS = 15_000;
const KEYBOARD_WRITE_DEBOUNCE_MS = 180;
const KEYBOARD_HINT_VISIBLE_MS = 6000;

const app = document.querySelector("#app");
if (!(app instanceof HTMLElement)) {
  throw new Error("Missing #app root");
}
const { elements, buttons, statCards } = mountGameShell(app);

const locLineNodes: HTMLDivElement[] = [];
const teamLanes = new Map<
  string,
  { dotClass: string; units: HTMLElement; count: HTMLElement }
>();
const tradeoffButtons = new Map<string, HTMLButtonElement>();
const strategicDebtUrgency = {
  debtId: null as string | null,
  startedAtMs: 0,
};
let lastKeyboardWriteAt = 0;
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

buttons.click.addEventListener("click", () => {
  manualWrite.performManualWrite(COMBO_CALLOUTS);
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

function initTradeoffSelect() {
  TRADEOFF_MODES.forEach((mode) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "strategy-mode";
    button.setAttribute("data-mode-id", mode.id);
    button.innerHTML = `
          <strong>${mode.label}</strong>
          <span>${mode.description}</span>
        `;
    tradeoffButtons.set(mode.id, button);
    elements.tradeoffModes.append(button);
  });
}

function initLocVisual() {
  for (let i = 0; i < 84; i++) {
    const line = document.createElement("div");
    line.className = "loc-line";
    elements.locVisual.append(line);
    locLineNodes.push(line);
  }
}

function initTeamVisual() {
  const laneConfig = [
    { key: "ai", label: "AI Agent", dotClass: "ai" },
    { key: "junior", label: "Jr Dev", dotClass: "junior" },
    { key: "mid", label: "Mid Dev", dotClass: "mid" },
    { key: "senior", label: "Sr Dev", dotClass: "senior" },
    { key: "architect", label: "Architect", dotClass: "architect" },
    { key: "product", label: "Product", dotClass: "product" },
    { key: "ux", label: "UX", dotClass: "ux" },
    { key: "sre", label: "SRE", dotClass: "sre" },
  ];

  laneConfig.forEach((lane) => {
    const row = document.createElement("div");
    row.className = "team-lane";
    row.innerHTML = `
          <span class="team-label">${lane.label}</span>
          <div class="team-units"></div>
          <span class="team-count">0</span>
        `;

    teamLanes.set(lane.key, {
      dotClass: lane.dotClass,
      units: requiredChild(row, ".team-units"),
      count: requiredChild(row, ".team-count"),
    });

    elements.teamVisual.append(row);
  });
}


function renderCompanyEvolution() {
  const stage = getCompanyStagePresentation(state.lifetimeDollars);
  const { current, next, isMaxStage, progress } = stage;

  elements.companyStage.textContent = current.label;
  elements.companyNote.textContent = isMaxStage
    ? `${current.note} Peak scale reached.`
    : `${current.note} Next: ${next.label} at $${next.minDollars.toLocaleString()}.`;
  elements.companyFill.style.width = `${(progress * 100).toFixed(2)}%`;

  elements.companyEvolution.classList.remove(
    "company-garage",
    "company-startup",
    "company-scaleup",
    "company-unicorn",
  );
  elements.companyEvolution.classList.add(`company-${current.id}`);
}

function renderLocVisual() {
  const locPerBar = 50;
  const visibleCapacity = locPerBar * locLineNodes.length;
  let locInView = state.lifetimeLoc % visibleCapacity;
  if (state.lifetimeLoc > 0 && locInView === 0) {
    locInView = visibleCapacity;
  }

  for (let i = 0; i < locLineNodes.length; i++) {
    const barStart = i * locPerBar;
    const barProgress = clamp01((locInView - barStart) / locPerBar);
    const line = locLineNodes[i];
    line.style.setProperty("--fill", `${(barProgress * 100).toFixed(2)}%`);
    line.classList.toggle("is-active", barProgress > 0);
  }
}

function renderTeamVisual() {
  const counts = {
    junior: state.developers.junior,
    mid: state.developers.mid,
    senior: state.developers.senior,
    architect: state.developers.architect,
    ai: Math.max(0, Number(state.aiAgents ?? state.aiTokens ?? 0)),
    product: state.supportTeam?.product || 0,
    ux: state.supportTeam?.ux || 0,
    sre: state.supportTeam?.sre || 0,
  };

  const maxDots = 18;
  for (const [key, lane] of teamLanes.entries()) {
    const total = Math.max(
      0,
      Math.floor(counts[key as keyof typeof counts] || 0),
    );
    lane.count.textContent = String(total);

    const shown = Math.min(maxDots, total);
    lane.units.replaceChildren();

    for (let i = 0; i < shown; i++) {
      const dot = document.createElement("span");
      dot.className = `team-dot ${lane.dotClass}`;
      lane.units.append(dot);
    }

    if (total > maxDots) {
      const more = document.createElement("span");
      more.className = "team-more";
      more.textContent = `+${total - maxDots}`;
      lane.units.append(more);
    }
  }
}

function render() {
  const nowMs = Date.now();
  audio.setMusicRunning(!isGameOver(state));
  manualWrite.expireFlowIfNeeded(nowMs);
  const baseLocPerSecond = getBaseLocPerSecond(state, nowMs);
  const bugPenalty = getBugPenaltyMultiplier(state);
  const effectiveLocPerSecond = baseLocPerSecond * bugPenalty;

  elements.dollars.textContent = `$${state.dollars.toFixed(2)}`;
  const conversionRate = getLocDollarConversionRate(state);
  elements.conversion.textContent = `$${conversionRate.toFixed(2)}`;
  elements.locps.textContent = effectiveLocPerSecond.toFixed(2);
  codeBackground.setSpeed(effectiveLocPerSecond);
  elements.tokens.textContent = String(state.aiTokens);
  elements.bugs.textContent = String(state.bugs.length);
  elements.reputation.textContent = String(state.reputation);
  elements.lifetime.textContent = Math.floor(
    state.lifetimeLoc,
  ).toLocaleString();
  const boughtUpgrades = getBoughtUpgradeCount(state);
  const totalUpgrades = managementPanels.getTotalUpgradeCount();
  elements.upgrades.textContent = `${boughtUpgrades} / ${totalUpgrades}`;
  renderCompanyEvolution();

  const clickGain =
    getClickLocGain(state) * manualWrite.getFlowMultiplierForNextWrite();
  buttons.click.textContent = `Write line of code (+${clickGain.toFixed(1)} LOC)`;
  buttons.click.disabled = isGameOver(state);

  const bugRisk = getBugRiskSummary(state, nowMs);
  elements.devBugRisk.textContent = `Developer bug risk: ~${bugRisk.humanExpectedBugsPerMinute.toFixed(2)} bugs/min per dev`;
  elements.aiBugRisk.textContent = `AI agent bug risk: ~${bugRisk.aiExpectedBugsPerMinute.toFixed(2)} bugs/min per agent`;
  const debt = getTechDebtStatus(state, nowMs);
  const debtPercent = Math.round(debt.progress * 100);
  audio.setThreatLevel(debt.progress);
  elements.techDebtRisk.textContent = `Tech debt risk: ${debt.stage} (${debtPercent}%)`;
  elements.techDebtBugs.textContent = `Bugs: ${debt.bugCount}`;
  elements.techDebtMeta.textContent = `Structural debt: ${Math.floor(debt.techDebtPoints)}`;
  elements.output.textContent = `x${debt.structuralPenaltyMultiplier.toFixed(2)}`;
  renderStatCardFills({
    conversionRate,
    effectiveLocPerSecond,
    debt,
    boughtUpgrades,
    totalUpgrades,
  });
  elements.techDebtFill.style.width = `${debtPercent}%`;
  elements.techDebtFill.className = "";
  if (debt.progress >= 0.9) {
    elements.techDebtFill.classList.add("debt-near-collapse");
  } else if (debt.progress >= 0.7) {
    elements.techDebtFill.classList.add("debt-critical");
  } else if (debt.progress >= 0.4) {
    elements.techDebtFill.classList.add("debt-warning");
  } else {
    elements.techDebtFill.classList.add("debt-stable");
  }
  const repairCost = getTechDebtRepairCost(state);
  elements.repairTechDebt.textContent = `Refactor Debt ($${repairCost})`;
  elements.repairTechDebt.disabled =
    state.dollars < repairCost || isGameOver(state) || debt.techDebtPoints <= 0;
  document.body.classList.toggle(
    "alarm-tech-debt",
    debt.progress >= 0.85 && !isGameOver(state),
  );

  renderStrategicDebt(nowMs);

  TRADEOFF_MODES.forEach((mode) => {
    const button = tradeoffButtons.get(mode.id);
    if (!button) {
      return;
    }

    const isActive = mode.id === state.tradeoffMode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
    button.disabled = isGameOver(state);
  });

  managementPanels.render(state, nowMs);
  renderLocVisual();
  renderTeamVisual();
  renderGameOver();
  audio.maybePlayGameOverSfx(state);
  manualWrite.renderCombo(nowMs);
  manualWrite.renderFocusTunnel(nowMs);

  if (hasPlayerProgress(state, nowMs)) {
    store.persist();
  }
}

function renderStrategicDebt(nowMs: number): void {
  if (!state.strategicDebt) {
    elements.strategicDebtBox.hidden = true;
    strategicDebtUrgency.debtId = null;
    strategicDebtUrgency.startedAtMs = 0;
    buttons.strategicPostpone.classList.remove("is-auto-postpone");
    buttons.strategicPostpone.style.removeProperty("--urgency-progress");
    return;
  }

  if (strategicDebtUrgency.debtId !== state.strategicDebt.id) {
    strategicDebtUrgency.debtId = state.strategicDebt.id;
    strategicDebtUrgency.startedAtMs = nowMs;
  }

  elements.strategicDebtBox.hidden = false;
  elements.strategicDebtTitle.textContent = state.strategicDebt.title;
  elements.strategicDebtDescription.textContent =
    state.strategicDebt.description;
  const rewriteCost = Math.ceil(state.strategicDebt.rewriteCostLoc);
  const postponePenalty = Math.ceil(state.strategicDebt.postponeDebtPenalty);
  const urgencyProgress = clamp01(
    (nowMs - strategicDebtUrgency.startedAtMs) /
      STRATEGIC_DEBT_AUTO_POSTPONE_MS,
  );

  buttons.strategicRewrite.textContent = `Rewrite ($${rewriteCost})`;
  buttons.strategicRewrite.disabled =
    state.dollars < rewriteCost || isGameOver(state);
  const secondsLeft = Math.max(
    0,
    Math.ceil((1 - urgencyProgress) * (STRATEGIC_DEBT_AUTO_POSTPONE_MS / 1000)),
  );
  buttons.strategicPostpone.textContent =
    secondsLeft > 0
      ? `Auto-postpone in ${secondsLeft}s (+${postponePenalty} debt)`
      : `Postponing... (+${postponePenalty} debt)`;
  buttons.strategicPostpone.disabled = isGameOver(state);
  buttons.strategicPostpone.classList.add("is-auto-postpone");
  buttons.strategicPostpone.style.setProperty(
    "--urgency-progress",
    `${(urgencyProgress * 100).toFixed(2)}%`,
  );

  if (urgencyProgress >= 1 && !isGameOver(state)) {
    applyAction({ type: "POSTPONE_STRATEGIC_DEBT" });
  }
}

function renderGameOver() {
  if (!isGameOver(state)) {
    elements.gameOverOverlay.hidden = true;
    return;
  }

  if (!state.gameOver) {
    return;
  }

  elements.gameOverOverlay.hidden = false;
  elements.gameOverTitle.textContent = state.gameOver.title || "Game Over";
  elements.gameOverMessage.textContent =
    state.gameOver.message || "Your run has ended.";
}

initTradeoffSelect();
initLocVisual();
initTeamVisual();
codeBackground.init();
managementPanels.init();

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

function setStatCardFill(card: HTMLElement, ratio: number): void {
  if (!card) {
    return;
  }

  card.style.setProperty(
    "--stat-fill",
    `${(clamp01(ratio) * 100).toFixed(2)}%`,
  );
}

function renderStatCardFills({
  conversionRate,
  effectiveLocPerSecond,
  debt,
  boughtUpgrades,
  totalUpgrades,
}: {
  conversionRate: number;
  effectiveLocPerSecond: number;
  debt: TechDebtStatus;
  boughtUpgrades: number;
  totalUpgrades: number;
}): void {
  setStatCardFill(statCards.dollars, ratioByLog(state.dollars, 50_000));
  setStatCardFill(statCards.conversion, clamp01(conversionRate / 1.85));
  setStatCardFill(statCards.locps, ratioByLog(effectiveLocPerSecond, 600));
  setStatCardFill(
    statCards.output,
    clamp01((debt.structuralPenaltyMultiplier - 0.35) / 0.65),
  );
  setStatCardFill(
    statCards.upgrades,
    clamp01(boughtUpgrades / Math.max(1, totalUpgrades)),
  );
  setStatCardFill(statCards.ai, clamp01(state.aiTokens / 60));
  setStatCardFill(statCards.bugs, clamp01(state.bugs.length / 20));
  setStatCardFill(statCards.reputation, ratioByLog(state.reputation, 200));
  setStatCardFill(statCards.lifetime, ratioByLog(state.lifetimeLoc, 5_000_000));
}
