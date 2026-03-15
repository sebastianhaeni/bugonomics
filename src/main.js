import {
  AI_AGENT_LOC_PER_SECOND,
  DEVELOPER_LEVELS,
  PRESTIGE_UPGRADES,
  PRODUCT_TEAM_ROLES,
  TRADEOFF_MODES,
  UPGRADE_CATALOG,
} from "./game/constants.js";
import {
  createInitialState,
  getAiTokenCost,
  getBaseLocPerSecond,
  getBugRiskSummary,
  getBugPenaltyMultiplier,
  getClickLocGain,
  getDeveloperCount,
  getHireCost,
  getPrestigeGain,
  getPrestigeLocThreshold,
  getPrestigeUpgradeCost,
  getPrestigeUpgradeLevel,
  getReleaseVersion,
  getLocDollarConversionRate,
  getSupportHireCost,
  getTechDebtStatus,
  getTechDebtRepairCost,
  getUpgradeCost,
  getUpgradeLevel,
  getVisibleDeveloperCount,
  isGameOver,
  tick,
} from "./game/engine.js";
import { CODE_BACKGROUND_SNIPPETS } from "./game/codeBackgroundSnippets.js";
import {
  ACHIEVEMENTS,
  ACTIVE_UPGRADE_CATALOG,
  COMBO_CALLOUTS,
  getAchievementStatus,
  getBoughtUpgradeCount,
  getCompanyStagePresentation,
} from "./app/progression.js";
import { createAudioController } from "./app/audioController.js";
import { createGameStore, hasPlayerProgress } from "./app/gameStore.js";
import { clamp01, ratioByLog } from "./app/math.js";
import { mountGameShell } from "./app/shell.js";
import { registerServiceWorker } from "./app/registerServiceWorker.js";

registerServiceWorker();

const store = createGameStore({ storage: window.localStorage });
let state = store.getState();
const STRATEGIC_DEBT_AUTO_POSTPONE_MS = 15_000;
const KEYBOARD_WRITE_DEBOUNCE_MS = 180;
const KEYBOARD_HINT_VISIBLE_MS = 6000;
const COMBO_TIMEOUT_MS = 1800;

const app = document.querySelector("#app");
const { elements, buttons, statCards } = mountGameShell(app);

const UPGRADE_BY_ID = new Map(
  UPGRADE_CATALOG.map((upgrade) => [upgrade.id, upgrade]),
);
const developerRows = {};
const teamHireRows = {};
const upgradeRows = new Map();
const prestigeRows = new Map();
const achievementRows = new Map();
const bugRows = new Map();
const eventRows = new Map();
const locLineNodes = [];
const upgradeListDomCache = {
  shop: "",
  owned: "",
  locked: "",
};
const teamLanes = new Map();
const tradeoffButtons = new Map();
const strategicDebtUrgency = {
  debtId: null,
  startedAtMs: 0,
};
const comboState = {
  count: 0,
  lastHitAt: 0,
};
let lastKeyboardWriteAt = 0;
const codeBackgroundState = {
  speedCharsPerSecond: 0,
  targetCharsPerSecond: 4,
  lastFrameMs: 0,
  rafId: 0,
  currentLine: null,
  maxLines: 130,
};
const audio = createAudioController({ isGameOver });

const emptyBugItem = document.createElement("li");
emptyBugItem.className = "bug-item";
emptyBugItem.setAttribute("data-empty-bugs", "true");
emptyBugItem.textContent = "No active bugs";
elements.bugList.append(emptyBugItem);

const emptyEventItem = document.createElement("li");
emptyEventItem.className = "event-item";
emptyEventItem.setAttribute("data-empty-events", "true");
emptyEventItem.textContent = "No active events";
elements.eventList.append(emptyEventItem);

function applyAction(action) {
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
  performManualWrite();
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
  performManualWrite();
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

  const modeId = modeButton.getAttribute("data-mode-id");
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
  resetCodeBackground();
  resetManualFeedback();
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
  resetCodeBackground();
  resetManualFeedback();
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
      units: row.querySelector(".team-units"),
      count: row.querySelector(".team-count"),
    });

    elements.teamVisual.append(row);
  });
}

function initCodeBackground() {
  if (!elements.codeBackground) {
    return;
  }

  resetCodeBackground();
  codeBackgroundState.lastFrameMs = performance.now();
  codeBackgroundState.rafId = window.requestAnimationFrame(stepCodeBackground);
}

function createTypingCodeBackgroundLine() {
  const line = document.createElement("div");
  line.className = "code-background-line";
  elements.codeBackground.append(line);

  while (
    elements.codeBackground.children.length > codeBackgroundState.maxLines
  ) {
    elements.codeBackground.firstElementChild?.remove();
  }

  return {
    node: line,
    text: CODE_BACKGROUND_SNIPPETS[
      Math.floor(Math.random() * CODE_BACKGROUND_SNIPPETS.length)
    ],
    cursor: 0,
  };
}

function setCodeBackgroundSpeed(locPerSecond) {
  const locSpeed = Math.max(0, Number(locPerSecond) || 0);
  codeBackgroundState.targetCharsPerSecond = Math.min(300, locSpeed);
}

function resetCodeBackground() {
  if (!elements.codeBackground) {
    return;
  }

  elements.codeBackground.replaceChildren();
  codeBackgroundState.currentLine = null;
  codeBackgroundState.speedCharsPerSecond = 0;
  codeBackgroundState.targetCharsPerSecond = 0;
  codeBackgroundState.lastFrameMs = performance.now();
}

function stepCodeBackground(nowMs) {
  const elapsedMs = Math.min(
    120,
    Math.max(0, nowMs - codeBackgroundState.lastFrameMs),
  );
  codeBackgroundState.lastFrameMs = nowMs;

  const smoothing = 0.12;
  codeBackgroundState.speedCharsPerSecond +=
    (codeBackgroundState.targetCharsPerSecond -
      codeBackgroundState.speedCharsPerSecond) *
    smoothing;

  if (
    !codeBackgroundState.currentLine &&
    codeBackgroundState.speedCharsPerSecond > 0.05
  ) {
    codeBackgroundState.currentLine = createTypingCodeBackgroundLine();
  }

  const current = codeBackgroundState.currentLine;
  if (current) {
    current.cursor +=
      (elapsedMs / 1000) * codeBackgroundState.speedCharsPerSecond;

    const visibleChars = Math.max(
      0,
      Math.min(current.text.length, Math.floor(current.cursor)),
    );
    const isComplete = visibleChars >= current.text.length;
    const suffix = !isComplete && Math.floor(nowMs / 160) % 2 === 0 ? "|" : "";
    current.node.textContent = `${current.text.slice(0, visibleChars)}${suffix}`;

    if (isComplete && current.cursor >= current.text.length + 6) {
      current.node.textContent = current.text;
      codeBackgroundState.currentLine = createTypingCodeBackgroundLine();
    }
  }

  codeBackgroundState.rafId = window.requestAnimationFrame(stepCodeBackground);
}

function spawnLocBurst(amount) {
  const burst = document.createElement("span");
  burst.className = "loc-burst";
  burst.textContent = `+${amount.toFixed(1)} LOC`;

  const offsetX = Math.round((Math.random() - 0.5) * 120);
  burst.style.setProperty("--x", `${offsetX}px`);

  elements.locBursts.append(burst);
  window.setTimeout(() => burst.remove(), 850);
}

function performManualWrite() {
  if (isGameOver(state)) {
    return;
  }
  audio.ensureStarted();
  audio.setMusicRunning(true);
  const nowMs = Date.now();
  const flowMultiplier = getFlowMultiplierForNextWrite(nowMs);
  const gain = getClickLocGain(state) * flowMultiplier;
  applyAction({ type: "CLICK", bonusMultiplier: flowMultiplier });
  triggerClickButtonFx();
  spawnLocBurst(gain);
  registerManualWriteFeedback(nowMs, flowMultiplier);
}

function triggerClickButtonFx() {
  buttons.click.classList.remove("is-firing");
  void buttons.click.offsetWidth;
  buttons.click.classList.add("is-firing");
  window.setTimeout(() => {
    buttons.click.classList.remove("is-firing");
  }, 280);
}

function registerManualWriteFeedback(nowMs, flowMultiplier) {
  if (nowMs - comboState.lastHitAt > COMBO_TIMEOUT_MS) {
    comboState.count = 0;
  }
  comboState.count += 1;
  comboState.lastHitAt = nowMs;

  const callout =
    COMBO_CALLOUTS[Math.floor(Math.random() * COMBO_CALLOUTS.length)];
  elements.comboMeter.textContent =
    comboState.count > 1 ? `Flow x${comboState.count} - ${callout}` : "Flow x1";
  elements.comboMeter.classList.toggle("is-hot", comboState.count >= 6);

  if (
    comboState.count >= 8 &&
    (comboState.count % 8 === 0 || Math.random() < 0.04)
  ) {
    spawnComboBurst(callout);
  }
}

function spawnComboBurst(text) {
  const burst = document.createElement("span");
  burst.className = "combo-burst";
  burst.textContent = text;
  burst.style.setProperty("--x", "0px");
  elements.comboBursts.append(burst);
  window.setTimeout(() => burst.remove(), 1000);
}

function resetManualFeedback() {
  comboState.count = 0;
  comboState.lastHitAt = 0;
  elements.comboMeter.textContent = "Flow x0";
  elements.comboMeter.classList.remove("is-hot");
  elements.comboBursts.replaceChildren();
  elements.shell?.classList.remove("focus-tunnel");
  elements.shell?.style.removeProperty("--focus-intensity");
}

function getFlowMultiplierForNextWrite(nowMs) {
  const nextCombo = comboState.count + 1;
  const cappedCombo = Math.min(nextCombo, 12);
  return 1 + Math.max(0, cappedCombo - 1) * 0.05;
}

function initDeveloperRows() {
  const aiRow = document.createElement("div");
  aiRow.className = "developer-row";
  aiRow.innerHTML = `
      <div>
        <strong>AI Agent</strong>
        <p>${AI_AGENT_LOC_PER_SECOND.toFixed(1)} LOC/s<br/>High bug chance</p>
      </div>
      <div class="developer-controls">
        <button data-hire-role="ai" data-cy="buy-token-btn">Hire</button>
      </div>
    `;
  teamHireRows.ai = {
    button: aiRow.querySelector('[data-cy="buy-token-btn"]'),
  };
  elements.developers.append(aiRow);

  for (const [level, config] of Object.entries(DEVELOPER_LEVELS)) {
    const wrapper = document.createElement("div");
    wrapper.className = "developer-row";
    const architectNote =
      level === "architect" ? "<br/>Reduces bug chance" : "";
    wrapper.innerHTML = `
          <div>
            <strong>${config.label}</strong>
            <p>${config.locPerSecond} LOC/s${architectNote}</p>
          </div>
          <div class="developer-controls">
            <button data-level="${level}" data-cy="hire-${level}-btn">Hire</button>
          </div>
        `;

    developerRows[level] = {
      button: wrapper.querySelector(`[data-cy="hire-${level}-btn"]`),
    };

    elements.developers.append(wrapper);
  }

  const productRow = document.createElement("div");
  productRow.className = "developer-row";
  productRow.innerHTML = `
      <div>
        <strong>${PRODUCT_TEAM_ROLES.product.label}</strong>
        <p>Improves LOC to $</p>
      </div>
      <div class="developer-controls">
        <button data-support-role="product" data-cy="hire-product-btn">Hire</button>
      </div>
    `;
  teamHireRows.product = {
    button: productRow.querySelector('[data-cy="hire-product-btn"]'),
  };
  elements.developers.append(productRow);

  const uxRow = document.createElement("div");
  uxRow.className = "developer-row";
  uxRow.innerHTML = `
      <div>
        <strong>${PRODUCT_TEAM_ROLES.ux.label}</strong>
        <p>Improves LOC to $</p>
      </div>
      <div class="developer-controls">
        <button data-support-role="ux" data-cy="hire-ux-btn">Hire</button>
      </div>
    `;
  teamHireRows.ux = {
    button: uxRow.querySelector('[data-cy="hire-ux-btn"]'),
  };
  elements.developers.append(uxRow);

  const sreRow = document.createElement("div");
  sreRow.className = "developer-row";
  sreRow.innerHTML = `
      <div>
        <strong>${PRODUCT_TEAM_ROLES.sre.label}</strong>
        <p>Reduces bug chance</p>
      </div>
      <div class="developer-controls">
        <button data-support-role="sre" data-cy="hire-sre-btn">Hire</button>
      </div>
    `;
  teamHireRows.sre = {
    button: sreRow.querySelector('[data-cy="hire-sre-btn"]'),
  };
  elements.developers.append(sreRow);

  elements.developers.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const hireButton = target.closest(
      "button[data-level], button[data-hire-role], button[data-support-role]",
    );
    if (!hireButton) {
      return;
    }

    const hireRole = hireButton.getAttribute("data-hire-role");
    if (hireRole === "ai") {
      if (state.unlocks.aiTokens) {
        applyAction({ type: "BUY_AI_TOKEN" });
        return;
      }

      const unlockCost = getUpgradeCost(state, "unlock_ai_tokens");
      const unlockUpgrade = UPGRADE_BY_ID.get("unlock_ai_tokens");
      const requirementsMet = (unlockUpgrade?.requires || []).every(
        (requiredId) => getUpgradeLevel(state, requiredId) > 0,
      );
      if (requirementsMet && Number.isFinite(unlockCost)) {
        applyAction({
          type: "BUY_UPGRADE",
          upgradeId: "unlock_ai_tokens",
        });
      }
      return;
    }

    const supportRole = hireButton.getAttribute("data-support-role");
    if (
      supportRole === "product" ||
      supportRole === "ux" ||
      supportRole === "sre"
    ) {
      applyAction({ type: "HIRE_SUPPORT", role: supportRole });
      return;
    }

    const level = hireButton.getAttribute("data-level");
    if (!level || !DEVELOPER_LEVELS[level]) {
      return;
    }

    const actionType = hireButton.getAttribute("data-action");
    if (actionType === "unlock") {
      const upgradeId = hireButton.getAttribute("data-upgrade-id");
      if (upgradeId) {
        applyAction({ type: "BUY_UPGRADE", upgradeId });
      }
      return;
    }

    applyAction({ type: "HIRE", level });
  });
}

function initUpgradeRows() {
  ACTIVE_UPGRADE_CATALOG.forEach((upgrade) => {
    const item = document.createElement("div");
    item.className = "upgrade-item";
    item.setAttribute("data-upgrade-id", upgrade.id);
    item.innerHTML = `
          <div>
            <strong>${upgrade.name}</strong>
            <p>${upgrade.description}</p>
            <small data-role="meta">${upgrade.category}</small>
          </div>
          <button data-upgrade-id="${upgrade.id}">Buy</button>
        `;

    upgradeRows.set(upgrade.id, {
      item,
      meta: item.querySelector('[data-role="meta"]'),
      button: item.querySelector("button"),
      maxLevel: upgrade.maxLevel,
      requires: upgrade.requires || [],
      category: upgrade.category,
    });
  });

  const handleBuyClick = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const button = target.closest("button[data-upgrade-id]");
    if (!button) {
      return;
    }

    const upgradeId = button.getAttribute("data-upgrade-id");
    if (!upgradeId) {
      return;
    }

    applyAction({ type: "BUY_UPGRADE", upgradeId });
  };

  elements.upgradeShop.addEventListener("click", handleBuyClick);
  elements.upgradeOwned.addEventListener("click", handleBuyClick);
  elements.upgradeLocked.addEventListener("click", handleBuyClick);
}

function initPrestigeRows() {
  PRESTIGE_UPGRADES.forEach((upgrade) => {
    const item = document.createElement("div");
    item.className = "upgrade-item";
    item.innerHTML = `
          <div>
            <strong>${upgrade.name}</strong>
            <p>${upgrade.description}</p>
            <small data-role="level">Lv 0/${upgrade.maxLevel}</small>
          </div>
          <button data-prestige-upgrade-id="${upgrade.id}">Buy (Rep)</button>
        `;

    prestigeRows.set(upgrade.id, {
      item,
      level: item.querySelector('[data-role="level"]'),
      button: item.querySelector("button"),
      maxLevel: upgrade.maxLevel,
    });

    elements.prestigeUpgradeList.append(item);
  });

  elements.prestigeUpgradeList.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const button = target.closest("button[data-prestige-upgrade-id]");
    if (!button) {
      return;
    }

    const upgradeId = button.getAttribute("data-prestige-upgrade-id");
    if (!upgradeId) {
      return;
    }

    applyAction({ type: "BUY_PRESTIGE_UPGRADE", upgradeId });
  });
}

function initAchievementRows() {
  ACHIEVEMENTS.forEach((achievement) => {
    const item = document.createElement("li");
    item.className = "achievement-item is-locked";
    item.innerHTML = `
          <div>
            <strong>${achievement.title}</strong>
            <p>${achievement.description}</p>
          </div>
          <small data-role="progress"></small>
        `;

    achievementRows.set(achievement.id, {
      item,
      progress: item.querySelector('[data-role="progress"]'),
    });
    elements.achievements.append(item);
  });
}

function renderDevelopers() {
  for (const [level, row] of Object.entries(developerRows)) {
    const canHireLevel =
      level === "junior" ||
      (level === "mid" && state.unlocks.mid) ||
      (level === "senior" && state.unlocks.senior) ||
      (level === "architect" && state.unlocks.architect);

    const hireCost = getHireCost(state, level);
    if (canHireLevel) {
      row.button.textContent = `Hire ($${hireCost})`;
      row.button.disabled = state.dollars < hireCost;
      row.button.setAttribute("data-action", "hire");
      row.button.removeAttribute("data-upgrade-id");
      continue;
    }

    const unlockUpgradeId =
      level === "mid"
        ? "unlock_mid_developers"
        : level === "senior"
          ? "unlock_senior_developers"
          : "unlock_architect";
    const unlockUpgrade = UPGRADE_BY_ID.get(unlockUpgradeId);
    const unlockRequirementsMet = (unlockUpgrade?.requires || []).every(
      (requiredId) => getUpgradeLevel(state, requiredId) > 0,
    );
    const unlockCost = getUpgradeCost(state, unlockUpgradeId);

    if (unlockRequirementsMet && Number.isFinite(unlockCost)) {
      row.button.textContent = `Unlock ($${unlockCost})`;
      row.button.disabled = state.dollars < unlockCost;
      row.button.setAttribute("data-action", "unlock");
      row.button.setAttribute("data-upgrade-id", unlockUpgradeId);
    } else {
      row.button.textContent = "Locked";
      row.button.disabled = true;
      row.button.setAttribute("data-action", "locked");
      row.button.removeAttribute("data-upgrade-id");
    }
  }

  const gameOver = isGameOver(state);
  const tokenCost = getAiTokenCost(state);
  if (state.unlocks.aiTokens) {
    teamHireRows.ai.button.textContent = `Hire ($${tokenCost})`;
    teamHireRows.ai.button.disabled = state.dollars < tokenCost || gameOver;
  } else {
    const unlockCost = getUpgradeCost(state, "unlock_ai_tokens");
    const unlockUpgrade = UPGRADE_BY_ID.get("unlock_ai_tokens");
    const requirementsMet = (unlockUpgrade?.requires || []).every(
      (requiredId) => getUpgradeLevel(state, requiredId) > 0,
    );

    if (requirementsMet && Number.isFinite(unlockCost)) {
      teamHireRows.ai.button.textContent = `Unlock ($${unlockCost})`;
      teamHireRows.ai.button.disabled = state.dollars < unlockCost || gameOver;
    } else {
      teamHireRows.ai.button.textContent = "Locked";
      teamHireRows.ai.button.disabled = true;
    }
  }

  const productCost = getSupportHireCost(state, "product");
  const uxCost = getSupportHireCost(state, "ux");
  const sreCost = getSupportHireCost(state, "sre");
  teamHireRows.product.button.textContent = `Hire ($${productCost})`;
  teamHireRows.ux.button.textContent = `Hire ($${uxCost})`;
  teamHireRows.sre.button.textContent = `Hire ($${sreCost})`;
  teamHireRows.product.button.disabled =
    state.dollars < productCost || gameOver;
  teamHireRows.ux.button.disabled = state.dollars < uxCost || gameOver;
  teamHireRows.sre.button.disabled = state.dollars < sreCost || gameOver;
}

function getUpgradeRenderState(upgradeId) {
  const row = upgradeRows.get(upgradeId);
  const level = getUpgradeLevel(state, upgradeId);
  const cost = getUpgradeCost(state, upgradeId);
  const isMaxed = !Number.isFinite(cost);

  const requirementsMet = row.requires.every((requiredId) => {
    return getUpgradeLevel(state, requiredId) > 0;
  });

  const affordableWithDollars = Number.isFinite(cost) && state.dollars >= cost;

  return {
    level,
    cost,
    isMaxed,
    requirementsMet,
    affordable: affordableWithDollars,
    isOwned: level > 0,
  };
}

function renderUpgrades() {
  const shopNodes = [];
  const ownedEntries = [];
  const lockedNodes = [];

  upgradeRows.forEach((row, upgradeId) => {
    const upgradeState = getUpgradeRenderState(upgradeId);

    if (upgradeState.isOwned) {
      const costLabel = Number.isFinite(upgradeState.cost)
        ? `Next: $${upgradeState.cost}`
        : "Maxed";
      row.meta.textContent = `Lv ${upgradeState.level}/${row.maxLevel} - ${costLabel}`;

      if (upgradeState.isMaxed) {
        row.button.textContent = "Maxed";
        row.button.disabled = true;
      } else {
        row.button.textContent = `Upgrade ($${upgradeState.cost})`;
        row.button.disabled = state.dollars < upgradeState.cost;
      }

      ownedEntries.push({
        item: row.item,
        isBuyable: !upgradeState.isMaxed && state.dollars >= upgradeState.cost,
        isUpgradable: !upgradeState.isMaxed,
        cost: Number.isFinite(upgradeState.cost) ? upgradeState.cost : Infinity,
      });
      return;
    }

    if (upgradeState.requirementsMet && upgradeState.affordable) {
      row.meta.textContent = `${row.category} - $${upgradeState.cost}`;
      row.button.textContent = `Buy ($${upgradeState.cost})`;
      row.button.disabled = false;
      shopNodes.push(row.item);
      return;
    }

    const reason = !upgradeState.requirementsMet
      ? "Locked by prerequisite"
      : `Need $${upgradeState.cost}`;
    row.meta.textContent = `${row.category} - ${reason}`;
    row.button.textContent = Number.isFinite(upgradeState.cost)
      ? `Buy ($${upgradeState.cost})`
      : "Maxed";
    row.button.disabled = true;
    lockedNodes.push(row.item);
  });

  replaceChildrenIfChanged(elements.upgradeShop, shopNodes, "shop");

  ownedEntries.sort((a, b) => {
    if (a.isBuyable !== b.isBuyable) {
      return a.isBuyable ? -1 : 1;
    }
    if (a.isUpgradable !== b.isUpgradable) {
      return a.isUpgradable ? -1 : 1;
    }
    return a.cost - b.cost;
  });
  const ownedNodes = ownedEntries.map((entry) => entry.item);

  replaceChildrenIfChanged(
    elements.upgradeOwned,
    ownedNodes.length > 0
      ? ownedNodes
      : [createPlaceholder("No purchased upgrades yet")],
    "owned",
  );
  replaceChildrenIfChanged(
    elements.upgradeLocked,
    lockedNodes.length > 0
      ? lockedNodes
      : [createPlaceholder("Everything is currently buyable or owned")],
    "locked",
  );

  elements.lockedSummary.textContent = `Show locked/not-yet-buyable upgrades (${lockedNodes.length})`;

  if (shopNodes.length === 0) {
    replaceChildrenIfChanged(
      elements.upgradeShop,
      [createPlaceholder("No upgrades are currently buyable.")],
      "shop",
    );
  }
}

function replaceChildrenIfChanged(container, nodes, key) {
  const signature = nodes
    .map((node) => {
      if (node instanceof HTMLElement) {
        const upgradeId = node.getAttribute("data-upgrade-id");
        if (upgradeId) {
          return `u:${upgradeId}`;
        }
        if (node.classList.contains("placeholder")) {
          return `p:${node.textContent || ""}`;
        }
      }
      return `n:${node.textContent || ""}`;
    })
    .join("|");

  if (upgradeListDomCache[key] === signature) {
    return;
  }

  container.replaceChildren(...nodes);
  upgradeListDomCache[key] = signature;
}

function renderAchievements() {
  ACHIEVEMENTS.forEach((achievement) => {
    const row = achievementRows.get(achievement.id);
    if (!row) {
      return;
    }

    const achievementStatus = getAchievementStatus(achievement, state);

    row.item.classList.toggle("is-unlocked", achievementStatus.unlocked);
    row.item.classList.toggle("is-locked", !achievementStatus.unlocked);
    row.progress.textContent = achievementStatus.unlocked
      ? "Unlocked"
      : `${achievementStatus.label} ${achievement.unit}`;
  });
}

function createPlaceholder(text) {
  const placeholder = document.createElement("p");
  placeholder.className = "placeholder";
  placeholder.textContent = text;
  return placeholder;
}

function renderBugs() {
  const activeBugIds = new Set(state.bugs.map((bug) => String(bug.id)));

  for (const [bugId, row] of bugRows.entries()) {
    if (!activeBugIds.has(bugId)) {
      row.item.remove();
      bugRows.delete(bugId);
    }
  }

  for (const bug of state.bugs) {
    const bugId = String(bug.id);
    let row = bugRows.get(bugId);

    if (!row) {
      const item = document.createElement("li");
      item.className = "bug-item";
      item.setAttribute("data-bug-id", bugId);

      const label = document.createElement("span");
      const button = document.createElement("button");
      button.setAttribute("data-bug-id", bugId);
      button.setAttribute("data-cy", `fix-bug-${bug.id}`);
      button.textContent = "Fix";

      item.append(label, button);
      elements.bugList.append(item);

      row = { item, label };
      bugRows.set(bugId, row);
    }

    row.label.textContent = `${bug.title || "Runtime Glitch"} (-${Math.round(bug.severity * 100)}%)`;
  }

  if (state.bugs.length === 0) {
    if (!emptyBugItem.isConnected) {
      elements.bugList.append(emptyBugItem);
    }
  } else if (emptyBugItem.isConnected) {
    emptyBugItem.remove();
  }
}

function renderEvents(nowMs) {
  const activeEventIds = new Set(
    state.activeEvents.map((event) => `${event.id}:${event.expiresAt}`),
  );

  for (const [eventId, row] of eventRows.entries()) {
    if (!activeEventIds.has(eventId)) {
      row.item.remove();
      eventRows.delete(eventId);
    }
  }

  state.activeEvents.forEach((event) => {
    const eventKey = `${event.id}:${event.expiresAt}`;
    let row = eventRows.get(eventKey);

    if (!row) {
      const item = document.createElement("li");
      item.className = "event-item";
      const label = document.createElement("span");
      item.append(label);
      elements.eventList.append(item);
      row = { item, label };
      eventRows.set(eventKey, row);
    }

    const secondsLeft = Math.max(
      0,
      Math.ceil((event.expiresAt - nowMs) / 1000),
    );
    row.label.textContent = `${event.name}: ${event.description} (${secondsLeft}s)`;
  });

  if (state.activeEvents.length === 0) {
    if (!emptyEventItem.isConnected) {
      elements.eventList.append(emptyEventItem);
    }
  } else if (emptyEventItem.isConnected) {
    emptyEventItem.remove();
  }
}

function renderPrestige() {
  const releaseVersion = getReleaseVersion(state);
  const releaseLocTarget = getPrestigeLocThreshold(state);
  const gain = getPrestigeGain(state);
  const goalProgress = clamp01(state.lifetimeLoc / releaseLocTarget);
  elements.goalTarget.textContent = `Release Version ${releaseVersion}.0 at ${releaseLocTarget.toLocaleString()} lifetime LOC.`;
  elements.prestigeReset.textContent =
    gain > 0
      ? `Release Version ${releaseVersion}.0 (+${gain} Reputation)`
      : `Release Version ${releaseVersion}.0 (Not Ready)`;
  elements.prestigeReset.disabled = gain <= 0;
  elements.goalProgress.textContent = `Progress: ${(goalProgress * 100).toFixed(1)}% (${Math.floor(state.lifetimeLoc).toLocaleString()} / ${releaseLocTarget.toLocaleString()} LOC)`;
  elements.goalReward.textContent = `Reputation on release v${releaseVersion}.0: +${gain}`;

  prestigeRows.forEach((row, upgradeId) => {
    const level = getPrestigeUpgradeLevel(state, upgradeId);
    const cost = getPrestigeUpgradeCost(state, upgradeId);

    row.level.textContent = `Lv ${level}/${row.maxLevel}`;

    if (!Number.isFinite(cost)) {
      row.button.textContent = "Maxed";
      row.button.disabled = true;
      return;
    }

    row.button.textContent = `Buy (${cost} Rep)`;
    row.button.disabled = state.reputation < cost;
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

function renderComboMeter(nowMs) {
  expireFlowIfNeeded(nowMs);
}

function renderFocusTunnel(nowMs) {
  const comboAgeMs = nowMs - comboState.lastHitAt;
  const isActive = comboState.count >= 4 && comboAgeMs <= COMBO_TIMEOUT_MS;
  if (!isActive) {
    elements.shell?.classList.remove("focus-tunnel");
    elements.shell?.style.removeProperty("--focus-intensity");
    return;
  }

  const intensity = clamp01((comboState.count - 3) / 9);
  elements.shell?.classList.add("focus-tunnel");
  elements.shell?.style.setProperty("--focus-intensity", intensity.toFixed(3));
}

function expireFlowIfNeeded(nowMs) {
  if (comboState.count <= 0) {
    return;
  }

  if (nowMs - comboState.lastHitAt > COMBO_TIMEOUT_MS) {
    comboState.count = 0;
    elements.comboMeter.textContent = "Flow x0";
    elements.comboMeter.classList.remove("is-hot");
  }
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
    const total = Math.max(0, Math.floor(counts[key] || 0));
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

elements.bugList.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const bugButton = target.closest("button[data-bug-id]");
  if (!bugButton) {
    return;
  }

  const bugId = Number(bugButton.getAttribute("data-bug-id"));
  if (!Number.isFinite(bugId)) {
    return;
  }

  applyAction({ type: "FIX_BUG", bugId });
});

function render() {
  const nowMs = Date.now();
  audio.setMusicRunning(!isGameOver(state));
  expireFlowIfNeeded(nowMs);
  const baseLocPerSecond = getBaseLocPerSecond(state, nowMs);
  const bugPenalty = getBugPenaltyMultiplier(state);
  const effectiveLocPerSecond = baseLocPerSecond * bugPenalty;

  elements.dollars.textContent = `$${state.dollars.toFixed(2)}`;
  const conversionRate = getLocDollarConversionRate(state);
  elements.conversion.textContent = `$${conversionRate.toFixed(2)}`;
  elements.locps.textContent = effectiveLocPerSecond.toFixed(2);
  setCodeBackgroundSpeed(effectiveLocPerSecond);
  elements.tokens.textContent = String(state.aiTokens);
  elements.bugs.textContent = String(state.bugs.length);
  elements.reputation.textContent = String(state.reputation);
  elements.lifetime.textContent = Math.floor(
    state.lifetimeLoc,
  ).toLocaleString();
  const boughtUpgrades = getBoughtUpgradeCount(state);
  const totalUpgrades = ACTIVE_UPGRADE_CATALOG.length;
  elements.upgrades.textContent = `${boughtUpgrades} / ${totalUpgrades}`;
  renderCompanyEvolution();

  const clickGain =
    getClickLocGain(state) * getFlowMultiplierForNextWrite(nowMs);
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

  renderDevelopers();
  renderUpgrades();
  renderAchievements();
  renderBugs();
  renderEvents(nowMs);
  renderPrestige();
  renderLocVisual();
  renderTeamVisual();
  renderGameOver();
  audio.maybePlayGameOverSfx(state);
  renderComboMeter(nowMs);
  renderFocusTunnel(nowMs);

  if (hasPlayerProgress(state, nowMs)) {
    store.persist();
  }
}

function renderStrategicDebt(nowMs) {
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

  elements.gameOverOverlay.hidden = false;
  elements.gameOverTitle.textContent = state.gameOver.title || "Game Over";
  elements.gameOverMessage.textContent =
    state.gameOver.message || "Your run has ended.";
}

initTradeoffSelect();
initLocVisual();
initTeamVisual();
initCodeBackground();
initDeveloperRows();
initUpgradeRows();
initPrestigeRows();
initAchievementRows();

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

function setStatCardFill(card, ratio) {
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
}) {
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
