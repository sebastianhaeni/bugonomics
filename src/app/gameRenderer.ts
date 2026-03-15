import { TRADEOFF_MODES } from "../game/constants.js";
import {
  getBaseLocPerSecond,
  getBugPenaltyMultiplier,
  getBugRiskSummary,
  getClickLocGain,
  getLocDollarConversionRate,
  getTechDebtRepairCost,
  getTechDebtStatus,
  isGameOver,
} from "../game/engine.js";
import type { GameAction, GameState, TechDebtStatus } from "../game/types.js";
import {
  getBoughtUpgradeCount,
  getCompanyStagePresentation,
} from "./progression.js";
import { clamp01, ratioByLog } from "./math.js";
import type { ShellButtons, ShellElements, StatCards } from "./shell.js";

interface TeamLane {
  dotClass: string;
  units: HTMLElement;
  count: HTMLElement;
}

interface AudioLike {
  maybePlayGameOverSfx: (state: GameState) => void;
  setMusicRunning: (shouldRun: boolean) => void;
  setThreatLevel: (level: number) => void;
}

interface CodeBackgroundLike {
  init: () => void;
  setSpeed: (locPerSecond: number) => void;
}

interface ManualWriteLike {
  expireFlowIfNeeded: (nowMs: number) => void;
  getFlowMultiplierForNextWrite: () => number;
  renderCombo: (nowMs: number) => void;
  renderFocusTunnel: (nowMs: number) => void;
}

interface ManagementPanelsLike {
  init: () => void;
  render: (state: GameState, nowMs: number) => void;
  getTotalUpgradeCount: () => number;
}

interface GameRendererOptions {
  buttons: ShellButtons;
  elements: ShellElements;
  statCards: StatCards;
  audio: AudioLike;
  codeBackground: CodeBackgroundLike;
  manualWrite: ManualWriteLike;
  managementPanels: ManagementPanelsLike;
  applyAction: (action: GameAction) => void;
  requiredChild: <T extends Element>(root: ParentNode, selector: string) => T;
}

const STRATEGIC_DEBT_AUTO_POSTPONE_MS = 15_000;

export function createGameRenderer({
  buttons,
  elements,
  statCards,
  audio,
  codeBackground,
  manualWrite,
  managementPanels,
  applyAction,
  requiredChild,
}: GameRendererOptions) {
  const locLineNodes: HTMLDivElement[] = [];
  const teamLanes = new Map<string, TeamLane>();
  const tradeoffButtons = new Map<string, HTMLButtonElement>();
  const strategicDebtUrgency = {
    debtId: null as string | null,
    startedAtMs: 0,
  };

  function init(): void {
    initTradeoffSelect();
    initLocVisual();
    initTeamVisual();
    codeBackground.init();
    managementPanels.init();
  }

  function initTradeoffSelect(): void {
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

  function initLocVisual(): void {
    for (let i = 0; i < 84; i += 1) {
      const line = document.createElement("div");
      line.className = "loc-line";
      elements.locVisual.append(line);
      locLineNodes.push(line);
    }
  }

  function initTeamVisual(): void {
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

  function render(state: GameState): void {
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
    renderCompanyEvolution(state);

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
      state,
      conversionRate,
      effectiveLocPerSecond,
      debt,
      boughtUpgrades,
      totalUpgrades,
    });
    renderTechDebtFill(debtPercent, debt.progress);

    const repairCost = getTechDebtRepairCost(state);
    elements.repairTechDebt.textContent = `Refactor Debt ($${repairCost})`;
    elements.repairTechDebt.disabled =
      state.dollars < repairCost || isGameOver(state) || debt.techDebtPoints <= 0;
    document.body.classList.toggle(
      "alarm-tech-debt",
      debt.progress >= 0.85 && !isGameOver(state),
    );

    renderStrategicDebt(state, nowMs);

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
    renderLocVisual(state);
    renderTeamVisual(state);
    renderGameOver(state);
    audio.maybePlayGameOverSfx(state);
    manualWrite.renderCombo(nowMs);
    manualWrite.renderFocusTunnel(nowMs);
  }

  function renderCompanyEvolution(state: GameState): void {
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

  function renderLocVisual(state: GameState): void {
    const locPerBar = 50;
    const visibleCapacity = locPerBar * locLineNodes.length;
    let locInView = state.lifetimeLoc % visibleCapacity;
    if (state.lifetimeLoc > 0 && locInView === 0) {
      locInView = visibleCapacity;
    }

    for (let i = 0; i < locLineNodes.length; i += 1) {
      const barStart = i * locPerBar;
      const barProgress = clamp01((locInView - barStart) / locPerBar);
      const line = locLineNodes[i];
      line.style.setProperty("--fill", `${(barProgress * 100).toFixed(2)}%`);
      line.classList.toggle("is-active", barProgress > 0);
    }
  }

  function renderTeamVisual(state: GameState): void {
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

      for (let i = 0; i < shown; i += 1) {
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

  function renderStrategicDebt(state: GameState, nowMs: number): void {
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
      Math.ceil(
        (1 - urgencyProgress) * (STRATEGIC_DEBT_AUTO_POSTPONE_MS / 1000),
      ),
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

  function renderGameOver(state: GameState): void {
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

  function renderTechDebtFill(debtPercent: number, progress: number): void {
    elements.techDebtFill.style.width = `${debtPercent}%`;
    elements.techDebtFill.className = "";
    if (progress >= 0.9) {
      elements.techDebtFill.classList.add("debt-near-collapse");
    } else if (progress >= 0.7) {
      elements.techDebtFill.classList.add("debt-critical");
    } else if (progress >= 0.4) {
      elements.techDebtFill.classList.add("debt-warning");
    } else {
      elements.techDebtFill.classList.add("debt-stable");
    }
  }

  function setStatCardFill(card: HTMLElement, ratio: number): void {
    card.style.setProperty(
      "--stat-fill",
      `${(clamp01(ratio) * 100).toFixed(2)}%`,
    );
  }

  function renderStatCardFills({
    state,
    conversionRate,
    effectiveLocPerSecond,
    debt,
    boughtUpgrades,
    totalUpgrades,
  }: {
    state: GameState;
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
    setStatCardFill(
      statCards.lifetime,
      ratioByLog(state.lifetimeLoc, 5_000_000),
    );
  }

  return {
    init,
    render,
  };
}
