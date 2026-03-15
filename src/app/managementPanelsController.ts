import {
  AI_AGENT_LOC_PER_SECOND,
  DEVELOPER_LEVELS,
  PRESTIGE_UPGRADES,
  PRODUCT_TEAM_ROLES,
  UPGRADE_CATALOG,
} from "../game/constants.js";
import {
  getAiTokenCost,
  getHireCost,
  getPrestigeUpgradeCost,
  getPrestigeUpgradeLevel,
  getSupportHireCost,
  getUpgradeCost,
  getUpgradeLevel,
  isGameOver,
} from "../game/engine.js";
import {
  ACHIEVEMENTS,
  ACTIVE_UPGRADE_CATALOG,
  getAchievementStatus,
} from "./progression.js";
import type {
  ActiveEvent,
  Bug,
  DeveloperLevel,
  GameAction,
  GameState,
  SupportRole,
} from "../game/types.js";
import { createPlaceholder } from "./domHelpers.js";

interface ButtonRow {
  button: HTMLButtonElement;
}

interface UpgradeRow {
  item: HTMLElement;
  meta: HTMLElement;
  button: HTMLButtonElement;
  maxLevel: number;
  requires: string[];
  category: string;
}

interface PrestigeRow {
  item: HTMLElement;
  level: HTMLElement;
  button: HTMLButtonElement;
  maxLevel: number;
}

interface AchievementRow {
  item: HTMLElement;
  progress: HTMLElement;
}

interface BugRow {
  item: HTMLElement;
  label: HTMLElement;
}

interface EventRow {
  item: HTMLElement;
  label: HTMLElement;
}

interface ManagementPanelsOptions {
  elements: {
    developers: HTMLElement;
    upgradeShop: HTMLElement;
    upgradeOwned: HTMLElement;
    achievements: HTMLElement;
    upgradeLocked: HTMLElement;
    lockedSummary: HTMLElement;
    bugList: HTMLElement;
    eventList: HTMLElement;
    prestigeUpgradeList: HTMLElement;
    goalTarget: HTMLElement;
    goalProgress: HTMLElement;
    goalReward: HTMLElement;
    prestigeReset: HTMLButtonElement;
  };
  requiredChild: <T extends Element>(root: ParentNode, selector: string) => T;
  getState: () => GameState;
  applyAction: (action: GameAction) => void;
  getPrestigeGain: (state: GameState) => number;
  getPrestigeLocThreshold: (state: GameState) => number;
  getReleaseVersion: (state: GameState) => number;
}

const DEVELOPER_LEVEL_KEYS = Object.keys(DEVELOPER_LEVELS) as DeveloperLevel[];

export function createManagementPanelsController({
  elements,
  requiredChild,
  getState,
  applyAction,
  getPrestigeGain,
  getPrestigeLocThreshold,
  getReleaseVersion,
}: ManagementPanelsOptions) {
  const UPGRADE_BY_ID = new Map(
    UPGRADE_CATALOG.map((upgrade) => [upgrade.id, upgrade]),
  );
  const developerRows: Partial<Record<DeveloperLevel, ButtonRow>> = {};
  const teamHireRows: Record<string, ButtonRow> = {};
  const upgradeRows = new Map<string, UpgradeRow>();
  const prestigeRows = new Map<string, PrestigeRow>();
  const achievementRows = new Map<string, AchievementRow>();
  const bugRows = new Map<string, BugRow>();
  const eventRows = new Map<string, EventRow>();
  const upgradeListDomCache = {
    shop: "",
    owned: "",
    locked: "",
  };

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

  function init(): void {
    initDeveloperRows();
    initUpgradeRows();
    initPrestigeRows();
    initAchievementRows();
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
  }

  function initDeveloperRows(): void {
    const aiRow = document.createElement("div");
    aiRow.className = "developer-row";
    aiRow.innerHTML = `
      <div>
        <strong>AI Agent</strong>
        <p>${AI_AGENT_LOC_PER_SECOND.toFixed(1)} LOC/s<br/>High bug chance</p>
      </div>
      <div class="developer-controls">
        <button data-hire-role="ai" data-ui="buy-token-btn">Hire</button>
      </div>
    `;
    teamHireRows.ai = {
      button: requiredChild(aiRow, '[data-ui="buy-token-btn"]'),
    };
    elements.developers.append(aiRow);

    for (const level of DEVELOPER_LEVEL_KEYS) {
      const config = DEVELOPER_LEVELS[level];
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
          <button data-level="${level}" data-ui="hire-${level}-btn">Hire</button>
        </div>
      `;
      developerRows[level] = {
        button: requiredChild(wrapper, `[data-ui="hire-${level}-btn"]`),
      };
      elements.developers.append(wrapper);
    }

    for (const role of ["product", "ux", "sre"] as SupportRole[]) {
      const row = document.createElement("div");
      row.className = "developer-row";
      row.innerHTML = `
        <div>
          <strong>${PRODUCT_TEAM_ROLES[role].label}</strong>
          <p>${role === "sre" ? "Reduces bug chance" : "Improves LOC to $"}</p>
        </div>
        <div class="developer-controls">
          <button data-support-role="${role}" data-ui="hire-${role}-btn">Hire</button>
        </div>
      `;
      teamHireRows[role] = {
        button: requiredChild(row, `[data-ui="hire-${role}-btn"]`),
      };
      elements.developers.append(row);
    }

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

      const state = getState();
      const hireRole = hireButton.getAttribute("data-hire-role");
      if (hireRole === "ai") {
        applyAction({ type: "BUY_AI_TOKEN" });
        return;
      }

      const supportRole = hireButton.getAttribute(
        "data-support-role",
      ) as SupportRole | null;
      if (
        supportRole === "product" ||
        supportRole === "ux" ||
        supportRole === "sre"
      ) {
        applyAction({ type: "HIRE_SUPPORT", role: supportRole });
        return;
      }

      const level = hireButton.getAttribute(
        "data-level",
      ) as DeveloperLevel | null;
      if (!level || !DEVELOPER_LEVELS[level]) {
        return;
      }

      if (hireButton.getAttribute("data-action") === "unlock") {
        const upgradeId = hireButton.getAttribute("data-upgrade-id");
        if (upgradeId) {
          applyAction({ type: "BUY_UPGRADE", upgradeId });
        }
        return;
      }

      applyAction({ type: "HIRE", level });
    });
  }

  function initUpgradeRows(): void {
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
        meta: requiredChild(item, '[data-role="meta"]'),
        button: requiredChild(item, "button"),
        maxLevel: upgrade.maxLevel,
        requires: upgrade.requires || [],
        category: upgrade.category,
      });
    });

    const handleBuyClick = (event: MouseEvent) => {
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

  function initPrestigeRows(): void {
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
        level: requiredChild(item, '[data-role="level"]'),
        button: requiredChild(item, "button"),
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

  function initAchievementRows(): void {
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
        progress: requiredChild(item, '[data-role="progress"]'),
      });
      elements.achievements.append(item);
    });
  }

  function render(state: GameState, nowMs: number): void {
    renderDevelopers(state);
    renderUpgrades(state);
    renderAchievements(state);
    renderBugs(state.bugs);
    renderEvents(state.activeEvents, nowMs);
    renderPrestige(state);
  }

  function renderDevelopers(state: GameState): void {
    for (const level of DEVELOPER_LEVEL_KEYS) {
      const row = developerRows[level];
      if (!row) continue;
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
    teamHireRows.ai.button.textContent = `Hire ($${tokenCost})`;
    teamHireRows.ai.button.disabled = state.dollars < tokenCost || gameOver;

    for (const role of ["product", "ux", "sre"] as SupportRole[]) {
      const cost = getSupportHireCost(state, role);
      teamHireRows[role].button.textContent = `Hire ($${cost})`;
      teamHireRows[role].button.disabled = state.dollars < cost || gameOver;
    }
  }

  function getUpgradeRenderState(state: GameState, upgradeId: string) {
    const row = upgradeRows.get(upgradeId);
    if (!row) {
      throw new Error(`Missing upgrade row: ${upgradeId}`);
    }
    const level = getUpgradeLevel(state, upgradeId);
    const cost = getUpgradeCost(state, upgradeId);
    const isMaxed = !Number.isFinite(cost);
    const requirementsMet = row.requires.every(
      (requiredId) => getUpgradeLevel(state, requiredId) > 0,
    );

    return {
      row,
      level,
      cost,
      isMaxed,
      requirementsMet,
      affordable: Number.isFinite(cost) && state.dollars >= cost,
      isOwned: level > 0,
    };
  }

  function renderUpgrades(state: GameState): void {
    const shopNodes: HTMLElement[] = [];
    const ownedEntries: Array<{
      item: HTMLElement;
      isBuyable: boolean;
      isUpgradable: boolean;
      cost: number;
    }> = [];
    const lockedNodes: HTMLElement[] = [];

    upgradeRows.forEach((_, upgradeId) => {
      const upgradeState = getUpgradeRenderState(state, upgradeId);
      const { row } = upgradeState;

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
          isBuyable:
            !upgradeState.isMaxed && state.dollars >= upgradeState.cost,
          isUpgradable: !upgradeState.isMaxed,
          cost: Number.isFinite(upgradeState.cost)
            ? upgradeState.cost
            : Infinity,
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
      if (a.isBuyable !== b.isBuyable) return a.isBuyable ? -1 : 1;
      if (a.isUpgradable !== b.isUpgradable) return a.isUpgradable ? -1 : 1;
      return a.cost - b.cost;
    });

    replaceChildrenIfChanged(
      elements.upgradeOwned,
      ownedEntries.length > 0
        ? ownedEntries.map((entry) => entry.item)
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

  function replaceChildrenIfChanged(
    container: HTMLElement,
    nodes: HTMLElement[],
    key: keyof typeof upgradeListDomCache,
  ): void {
    const signature = nodes
      .map((node) => {
        const upgradeId = node.getAttribute("data-upgrade-id");
        if (upgradeId) return `u:${upgradeId}`;
        if (node.classList.contains("placeholder")) {
          return `p:${node.textContent || ""}`;
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

  function renderAchievements(state: GameState): void {
    ACHIEVEMENTS.forEach((achievement) => {
      const row = achievementRows.get(achievement.id);
      if (!row) return;
      const achievementStatus = getAchievementStatus(achievement, state);
      row.item.classList.toggle("is-unlocked", achievementStatus.unlocked);
      row.item.classList.toggle("is-locked", !achievementStatus.unlocked);
      row.progress.textContent = achievementStatus.unlocked
        ? "Unlocked"
        : `${achievementStatus.label} ${achievement.unit}`;
    });
  }

  function renderBugs(bugs: Bug[]): void {
    const activeBugIds = new Set(bugs.map((bug) => String(bug.id)));
    for (const [bugId, row] of bugRows.entries()) {
      if (!activeBugIds.has(bugId)) {
        row.item.remove();
        bugRows.delete(bugId);
      }
    }

    for (const bug of bugs) {
      const bugId = String(bug.id);
      let row = bugRows.get(bugId);
      if (!row) {
        const item = document.createElement("li");
        item.className = "bug-item";
        item.setAttribute("data-bug-id", bugId);
        const label = document.createElement("span");
        const button = document.createElement("button");
        button.setAttribute("data-bug-id", bugId);
        button.setAttribute("data-ui", `fix-bug-${bug.id}`);
        button.textContent = "Fix";
        item.append(label, button);
        elements.bugList.append(item);
        row = { item, label };
        bugRows.set(bugId, row);
      }
      row.label.textContent = `${bug.title || "Runtime Glitch"} (-${Math.round(bug.severity * 100)}%)`;
    }

    if (bugs.length === 0) {
      if (!emptyBugItem.isConnected) elements.bugList.append(emptyBugItem);
    } else if (emptyBugItem.isConnected) {
      emptyBugItem.remove();
    }
  }

  function renderEvents(activeEvents: ActiveEvent[], nowMs: number): void {
    const activeEventIds = new Set(
      activeEvents.map((event) => `${event.id}:${event.expiresAt}`),
    );

    for (const [eventId, row] of eventRows.entries()) {
      if (!activeEventIds.has(eventId)) {
        row.item.remove();
        eventRows.delete(eventId);
      }
    }

    activeEvents.forEach((event) => {
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

    if (activeEvents.length === 0) {
      if (!emptyEventItem.isConnected)
        elements.eventList.append(emptyEventItem);
    } else if (emptyEventItem.isConnected) {
      emptyEventItem.remove();
    }
  }

  function renderPrestige(state: GameState): void {
    const releaseVersion = getReleaseVersion(state);
    const releaseLocTarget = getPrestigeLocThreshold(state);
    const gain = getPrestigeGain(state);
    const goalProgress = Math.max(
      0,
      Math.min(1, state.lifetimeLoc / releaseLocTarget),
    );

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

  return {
    init,
    getTotalUpgradeCount: () => ACTIVE_UPGRADE_CATALOG.length,
    render,
  };
}
