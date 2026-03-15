import {
  ABILITIES,
  AI_AGENT_BUG_PRESSURE_WEIGHT,
  AI_AGENT_LOC_PER_SECOND,
  AI_BOOST_BUG_RISK_BONUS,
  AI_BOOST_DURATION_MS,
  AI_BOOST_MULTIPLIER,
  AI_TOKEN_LOC_COST,
  BASE_RANDOM_BUG_CHANCE_PER_DEV_SECOND,
  BUG_INTERVAL_PER_DEV_MS,
  BUG_SEVERITY_MAX,
  BUG_SEVERITY_MIN,
  BUG_TITLES,
  DEVELOPER_LEVELS,
  MIN_PRODUCTION_MULTIPLIER,
  PRESTIGE_LOC_THRESHOLD,
  PRESTIGE_LOC_SCALING,
  PRESTIGE_UPGRADES,
  PRODUCT_TEAM_ROLES,
  RANDOM_EVENTS,
  STRATEGIC_TECH_DEBT_ITEMS,
  TECH_DEBT_REPAIR_BASE_COST,
  TECH_DEBT_REPAIR_LOC_TO_DEBT_FACTOR,
  TECH_DEBT_STRATEGIC_CHECK_INTERVAL_MS,
  TRADEOFF_MODES,
  UPGRADE_CATALOG,
} from "./constants.js";
import type {
  BugRiskSummary,
  DeveloperLevel,
  GameAction,
  GameState,
  GameStateInput,
  SupportRole,
  TechDebtStatus,
  TickOptions,
} from "./types.js";

const LEVEL_KEYS = Object.keys(DEVELOPER_LEVELS) as DeveloperLevel[];
const SUPPORT_ROLE_KEYS = Object.keys(PRODUCT_TEAM_ROLES) as SupportRole[];
const UPGRADE_BY_ID = new Map(
  UPGRADE_CATALOG.map((upgrade) => [upgrade.id, upgrade]),
);
const PRESTIGE_UPGRADE_BY_ID = new Map(
  PRESTIGE_UPGRADES.map((upgrade) => [upgrade.id, upgrade]),
);
const ABILITY_BY_ID = new Map(
  ABILITIES.map((ability) => [ability.id, ability]),
);

export function createInitialState(nowMs = Date.now()): GameState {
  return {
    loc: 0,
    lifetimeLoc: 0,
    dollars: 35,
    lifetimeDollars: 0,
    aiAgents: 0,
    aiTokens: 0,
    developers: {
      junior: 0,
      mid: 0,
      senior: 0,
      architect: 0,
    },
    supportTeam: {
      product: 0,
      ux: 0,
      sre: 0,
    },
    activeBoosts: [],
    clickAuras: [],
    activeEvents: [],
    abilityCooldowns: {},
    upgrades: {},
    prestigeUpgrades: {},
    unlocks: {
      mid: false,
      senior: false,
      aiTokens: true,
      architect: false,
    },
    tradeoffMode: "balanced",
    reputation: 0,
    gameOver: null,
    techDebtPoints: 0,
    strategicDebt: null,
    strategicDebtProgressMs: 0,
    bugs: [],
    nextBugId: 1,
    bugProgressMs: 0,
    eventProgressMs: 0,
    totalClicks: 0,
    totalBugsFixed: 0,
    totalHires: 0,
    totalPrestiges: 0,
    lastTickAt: nowMs,
  };
}

export function normalizeState(
  inputState: GameStateInput | null | undefined,
  nowMs = Date.now(),
): GameState {
  const defaultState = createInitialState(nowMs);
  const source = inputState && typeof inputState === "object" ? inputState : {};

  const normalized = {
    ...defaultState,
    ...source,
    developers: {
      ...defaultState.developers,
      ...(source.developers || {}),
    },
    supportTeam: {
      ...defaultState.supportTeam,
      ...(source.supportTeam || {}),
    },
    unlocks: {
      ...defaultState.unlocks,
      ...(source.unlocks || {}),
    },
    abilityCooldowns:
      source.abilityCooldowns && typeof source.abilityCooldowns === "object"
        ? source.abilityCooldowns
        : {},
    upgrades:
      source.upgrades && typeof source.upgrades === "object"
        ? source.upgrades
        : {},
    prestigeUpgrades:
      source.prestigeUpgrades && typeof source.prestigeUpgrades === "object"
        ? source.prestigeUpgrades
        : {},
    activeBoosts: Array.isArray(source.activeBoosts) ? source.activeBoosts : [],
    clickAuras: Array.isArray(source.clickAuras) ? source.clickAuras : [],
    activeEvents: Array.isArray(source.activeEvents) ? source.activeEvents : [],
    gameOver:
      source.gameOver && typeof source.gameOver === "object"
        ? source.gameOver
        : null,
    strategicDebt:
      source.strategicDebt && typeof source.strategicDebt === "object"
        ? source.strategicDebt
        : null,
    bugs: Array.isArray(source.bugs) ? source.bugs : [],
  };

  normalized.loc = toNumber(normalized.loc, 0);
  normalized.lifetimeLoc = Math.max(0, toNumber(normalized.lifetimeLoc, 0));
  normalized.dollars = Math.max(0, toNumber(normalized.dollars, 0));
  normalized.lifetimeDollars = Math.max(
    0,
    toNumber(normalized.lifetimeDollars, 0),
  );
  normalized.aiAgents = Math.max(
    0,
    Math.floor(toNumber(normalized.aiAgents, toNumber(normalized.aiTokens, 0))),
  );
  normalized.aiTokens = Math.max(
    0,
    Math.floor(toNumber(normalized.aiTokens, normalized.aiAgents)),
  );
  normalized.reputation = Math.max(
    0,
    Math.floor(toNumber(normalized.reputation, 0)),
  );
  normalized.totalClicks = Math.max(
    0,
    Math.floor(toNumber(normalized.totalClicks, 0)),
  );
  normalized.totalBugsFixed = Math.max(
    0,
    Math.floor(toNumber(normalized.totalBugsFixed, 0)),
  );
  normalized.totalHires = Math.max(
    0,
    Math.floor(toNumber(normalized.totalHires, 0)),
  );
  normalized.totalPrestiges = Math.max(
    0,
    Math.floor(toNumber(normalized.totalPrestiges, 0)),
  );
  normalized.nextBugId = Math.max(
    1,
    Math.floor(toNumber(normalized.nextBugId, 1)),
  );
  normalized.bugProgressMs = Math.max(0, toNumber(normalized.bugProgressMs, 0));
  normalized.eventProgressMs = Math.max(
    0,
    toNumber(normalized.eventProgressMs, 0),
  );
  normalized.lastTickAt = toNumber(normalized.lastTickAt, nowMs);
  normalized.techDebtPoints = Math.max(
    0,
    toNumber(normalized.techDebtPoints, 0),
  );
  normalized.strategicDebtProgressMs = Math.max(
    0,
    toNumber(normalized.strategicDebtProgressMs, 0),
  );
  if (normalized.strategicDebt) {
    normalized.strategicDebt = {
      id: String(normalized.strategicDebt.id || "strategic"),
      title: String(normalized.strategicDebt.title || "Strategic Tech Debt"),
      description: String(
        normalized.strategicDebt.description ||
          "A major rewrite decision is pending.",
      ),
      rewriteCostLoc: Math.max(
        1,
        toNumber(normalized.strategicDebt.rewriteCostLoc, 400),
      ),
      postponeDebtPenalty: Math.max(
        1,
        toNumber(normalized.strategicDebt.postponeDebtPenalty, 180),
      ),
    };
  }
  if (normalized.gameOver) {
    normalized.gameOver = {
      code: String(normalized.gameOver.code || "unknown"),
      title: String(normalized.gameOver.title || "Game Over"),
      message: String(normalized.gameOver.message || "Run ended."),
      atMs: toNumber(normalized.gameOver.atMs, nowMs),
    };
  }

  for (const level of LEVEL_KEYS) {
    normalized.developers[level] = Math.max(
      0,
      Math.floor(toNumber(normalized.developers[level], 0)),
    );
  }
  for (const role of SUPPORT_ROLE_KEYS) {
    normalized.supportTeam[role] = Math.max(
      0,
      Math.floor(toNumber(normalized.supportTeam[role], 0)),
    );
  }

  normalized.activeBoosts = normalized.activeBoosts
    .map((boost) => ({
      expiresAt: toNumber(boost?.expiresAt, 0),
      multiplier: toNumber(boost?.multiplier, 1),
      source: String(boost?.source || "boost"),
    }))
    .filter((boost) => boost.expiresAt > nowMs && boost.multiplier > 0)
    .sort((a, b) => a.expiresAt - b.expiresAt);

  normalized.clickAuras = normalized.clickAuras
    .map((aura) => ({
      expiresAt: toNumber(aura?.expiresAt, 0),
      locPerSecond: Math.max(0, toNumber(aura?.locPerSecond, 0)),
    }))
    .filter((aura) => aura.expiresAt > nowMs && aura.locPerSecond > 0)
    .sort((a, b) => a.expiresAt - b.expiresAt);

  normalized.activeEvents = normalized.activeEvents
    .map((event) => ({
      id: String(event?.id || ""),
      name: String(event?.name || ""),
      description: String(event?.description || ""),
      expiresAt: toNumber(event?.expiresAt, nowMs),
      productionMultiplier: toNumber(event?.productionMultiplier, 1),
      lostDevCount: Math.max(0, Math.floor(toNumber(event?.lostDevCount, 0))),
    }))
    .filter((event) => event.expiresAt > nowMs)
    .sort((a, b) => a.expiresAt - b.expiresAt);

  normalized.bugs = normalized.bugs
    .map((bug) => ({
      id: Math.max(1, Math.floor(toNumber(bug?.id, 0))),
      severity: clamp(toNumber(bug?.severity, BUG_SEVERITY_MIN), 0.01, 0.95),
      title: normalizeBugTitle(bug?.title),
      createdAt: toNumber(bug?.createdAt, nowMs),
    }))
    .sort((a, b) => a.id - b.id);

  if (normalized.bugs.length > 0) {
    const maxBugId = Math.max(...normalized.bugs.map((bug) => bug.id));
    normalized.nextBugId = Math.max(normalized.nextBugId, maxBugId + 1);
  }

  for (const [upgradeId, upgrade] of UPGRADE_BY_ID.entries()) {
    const maxLevel = Math.max(0, upgrade.maxLevel || 1);
    normalized.upgrades[upgradeId] = clampInt(
      normalized.upgrades[upgradeId],
      0,
      maxLevel,
    );
  }

  for (const [upgradeId, upgrade] of PRESTIGE_UPGRADE_BY_ID.entries()) {
    const maxLevel = Math.max(0, upgrade.maxLevel || 1);
    normalized.prestigeUpgrades[upgradeId] = clampInt(
      normalized.prestigeUpgrades[upgradeId],
      0,
      maxLevel,
    );
  }

  for (const ability of ABILITIES) {
    normalized.abilityCooldowns[ability.id] = Math.max(
      0,
      toNumber(normalized.abilityCooldowns[ability.id], 0),
    );
  }

  if (!TRADEOFF_MODES.some((mode) => mode.id === normalized.tradeoffMode)) {
    normalized.tradeoffMode = "balanced";
  }

  normalized.unlocks.mid =
    Boolean(normalized.unlocks.mid) ||
    getUpgradeLevel(normalized, "unlock_mid_developers") > 0;
  normalized.unlocks.senior =
    Boolean(normalized.unlocks.senior) ||
    getUpgradeLevel(normalized, "unlock_senior_developers") > 0;
  normalized.unlocks.aiTokens = true;
  normalized.unlocks.architect =
    Boolean(normalized.unlocks.architect) ||
    getUpgradeLevel(normalized, "unlock_architect") > 0;

  return normalized;
}

export function tick(
  state: GameState,
  { action = null, nowMs = Date.now(), random = Math.random }: TickOptions = {},
): GameState {
  const nextState = normalizeState(state, nowMs);
  const safeRandom = typeof random === "function" ? random : Math.random;

  if (nextState.gameOver) {
    nextState.lastTickAt = nowMs;
    return nextState;
  }

  applyAction(nextState, action, nowMs, safeRandom);

  const tickStartMs = Math.min(nextState.lastTickAt, nowMs);
  const elapsedMs = Math.max(0, nowMs - tickStartMs);

  if (elapsedMs > 0) {
    accrueStructuralTechDebt(nextState, elapsedMs, nowMs);

    const passiveLocPerSecond =
      getBaseLocPerSecond(nextState, nowMs) +
      getClickAuraLocPerSecond(nextState, nowMs);
    const productionMultiplier =
      getActiveBoostMultiplierAt(nextState, nowMs) *
      getEventProductionMultiplier(nextState, nowMs) *
      getGlobalProductionMultiplier(nextState);
    const bugPenalty = getBugPenaltyMultiplier(nextState);

    const gain =
      passiveLocPerSecond *
      productionMultiplier *
      bugPenalty *
      (elapsedMs / 1000);
    if (gain > 0) {
      nextState.loc += gain;
      nextState.lifetimeLoc += gain;
      const passiveDollarGain = gain * getLocDollarConversionRate(nextState);
      nextState.dollars += passiveDollarGain;
      nextState.lifetimeDollars += passiveDollarGain;
    }

    decayBugs(nextState, elapsedMs);
    autoFixMinorBugs(nextState);

    spawnScheduledBugs(nextState, elapsedMs, nowMs, safeRandom);
    spawnRandomBugs(nextState, tickStartMs, nowMs, safeRandom);

    maybeTriggerRandomEvent(nextState, elapsedMs, nowMs, safeRandom);
    maybeTriggerStrategicDebt(nextState, elapsedMs, safeRandom);
    maybeTriggerGameOver(nextState, nowMs);
  }

  nextState.activeBoosts = nextState.activeBoosts.filter(
    (boost) => boost.expiresAt > nowMs,
  );
  nextState.clickAuras = nextState.clickAuras.filter(
    (aura) => aura.expiresAt > nowMs,
  );
  nextState.activeEvents = nextState.activeEvents.filter(
    (event) => event.expiresAt > nowMs,
  );

  nextState.aiTokens = nextState.aiAgents;
  nextState.lastTickAt = nowMs;
  nextState.loc = roundTo3(nextState.loc);
  nextState.lifetimeLoc = roundTo3(nextState.lifetimeLoc);
  nextState.dollars = roundTo3(nextState.dollars);
  nextState.lifetimeDollars = roundTo3(nextState.lifetimeDollars);

  return nextState;
}

export function getDeveloperCount(state: GameState): number {
  return LEVEL_KEYS.reduce(
    (sum, level) => sum + Math.max(0, state.developers[level] || 0),
    0,
  );
}

export function getVisibleDeveloperCount(
  state: GameState,
  nowMs = Date.now(),
): number {
  const total = getDeveloperCount(state);
  const lost = getLostDeveloperCountFromEvents(state, nowMs);
  return (
    Math.max(0, total - lost) +
    getHackathonTemporaryDevelopers(state, nowMs) +
    getAiAgentCount(state)
  );
}

export function getBaseLocPerSecond(
  state: GameState,
  nowMs = Date.now(),
): number {
  const visibleDevs = getVisibleDeveloperCount(state, nowMs);
  if (visibleDevs <= 0) {
    return getFlatLocPerSecondBonus(state);
  }

  const junior = state.developers.junior * DEVELOPER_LEVELS.junior.locPerSecond;
  const mid = state.developers.mid * DEVELOPER_LEVELS.mid.locPerSecond;
  const senior = state.developers.senior * DEVELOPER_LEVELS.senior.locPerSecond;
  const architect =
    state.developers.architect * DEVELOPER_LEVELS.architect.locPerSecond;

  const hackathonDevBonus = getHackathonTemporaryLocPerSecond(state, nowMs);
  const aiAgentBonus =
    getAiAgentCount(state) *
    AI_AGENT_LOC_PER_SECOND *
    (1 + 0.22 * getUpgradeLevel(state, "agent_swarm"));

  let totalDevProduction =
    junior + mid + senior + architect + hackathonDevBonus + aiAgentBonus;

  totalDevProduction +=
    junior * 0.2 * getUpgradeLevel(state, "junior_training_program");
  totalDevProduction *=
    1 + 0.1 * getUpgradeLevel(state, "senior_architecture_review");
  totalDevProduction *= 1 + 0.15 * getUpgradeLevel(state, "better_coffee");
  totalDevProduction *= 1 + 0.02 * getUpgradeLevel(state, "standing_desk");
  totalDevProduction *=
    1 + 0.04 * getPrestigeUpgradeLevel(state, "better_hiring_brand");
  totalDevProduction *=
    1 + 0.06 * getPrestigeUpgradeLevel(state, "platform_flywheel");

  const activeDevTypes = [
    state.developers.junior > 0,
    state.developers.mid > 0,
    state.developers.senior > 0,
    state.developers.architect > 0,
  ].filter(Boolean).length;

  totalDevProduction *=
    1 + 0.05 * getUpgradeLevel(state, "agile_transformation") * activeDevTypes;

  totalDevProduction *=
    1 + 0.06 * getUpgradeLevel(state, "microservices") * activeDevTypes;

  totalDevProduction *=
    1 + 0.01 * getUpgradeLevel(state, "department_structure") * visibleDevs;

  totalDevProduction *=
    1 + 0.005 * getUpgradeLevel(state, "kubernetes") * visibleDevs;

  const leadCount = getUpgradeLevel(state, "team_leads");
  if (leadCount > 0) {
    const covered = Math.min(visibleDevs, leadCount * 5);
    totalDevProduction *= 1 + (covered / Math.max(1, visibleDevs)) * 0.25;
  }

  totalDevProduction *= 1 + 0.08 * getUpgradeLevel(state, "bigger_servers");
  totalDevProduction *=
    1 + 0.02 * getUpgradeLevel(state, "golden_path_templates");

  return totalDevProduction + getFlatLocPerSecondBonus(state);
}

export function getBugPenaltyMultiplier(state: GameState): number {
  const totalSeverity = state.bugs.reduce(
    (sum, bug) => sum + clamp(toNumber(bug.severity, 0), 0, 1),
    0,
  );

  let penalty = Math.max(MIN_PRODUCTION_MULTIPLIER, 1 - totalSeverity);

  if (state.tradeoffMode === "move_fast") {
    penalty *= 0.95;
  } else if (state.tradeoffMode === "enterprise") {
    penalty *= 1.05;
  } else if (state.tradeoffMode === "quality_sprint") {
    penalty *= 1.04;
  }

  return clamp(penalty, MIN_PRODUCTION_MULTIPLIER, 1.2);
}

function getActiveBoostMultiplierAt(state: GameState, atMs: number): number {
  return state.activeBoosts.reduce((multiplier, boost) => {
    if (boost.expiresAt > atMs) {
      return multiplier * Math.max(0.1, boost.multiplier);
    }
    return multiplier;
  }, 1);
}

export function getClickLocGain(state: GameState): number {
  let clickLoc = 1;
  clickLoc += getUpgradeLevel(state, "better_keyboard") * 1;
  clickLoc += getUpgradeLevel(state, "mechanical_keyboard") * 5;
  clickLoc += getUpgradeLevel(state, "ide_autocomplete") * 10;
  clickLoc += getUpgradeLevel(state, "stackoverflow_subscription") * 2;

  clickLoc *= 1 + 0.12 * getUpgradeLevel(state, "code_snippets");

  let globalClickMultiplier = 1;
  if (getUpgradeLevel(state, "dark_mode") > 0) {
    globalClickMultiplier *= 1.05;
  }
  globalClickMultiplier *= 1 + 0.01 * getUpgradeLevel(state, "ping_pong_table");
  globalClickMultiplier *=
    1 + 0.05 * getPrestigeUpgradeLevel(state, "engineering_culture");
  globalClickMultiplier *=
    1 + 0.04 * getPrestigeUpgradeLevel(state, "platform_flywheel");

  return clickLoc * globalClickMultiplier;
}

export function getLocDollarConversionRate(state: GameState): number {
  const developers = state.developers;
  const support = state.supportTeam;
  const aiAgents = getAiAgentCount(state);

  const weightedQuality =
    developers.junior * 0.34 +
    developers.mid * 0.58 +
    developers.senior * 0.8 +
    developers.architect *
      (0.93 + 0.03 * getUpgradeLevel(state, "value_engineering")) +
    aiAgents * 0.18;
  const contributorCount =
    developers.junior +
    developers.mid +
    developers.senior +
    developers.architect +
    aiAgents;
  const baseQuality =
    contributorCount > 0 ? weightedQuality / contributorCount : 0.45;

  let conversion =
    0.35 +
    baseQuality * 0.95 +
    support.product *
      (0.03 + 0.01 * getUpgradeLevel(state, "product_discovery_framework")) +
    support.ux * (0.03 + 0.01 * getUpgradeLevel(state, "ux_research_lab")) +
    support.sre * 0.01 +
    0.02 * getUpgradeLevel(state, "customer_feedback_loop") +
    0.02 * getUpgradeLevel(state, "platform_teams") +
    0.015 * getUpgradeLevel(state, "enabling_teams") +
    0.02 * getUpgradeLevel(state, "flow_efficiency_dashboard") +
    0.015 * getUpgradeLevel(state, "stream_aligned_teams") +
    0.02 * getUpgradeLevel(state, "wardley_map_session") +
    0.015 * getUpgradeLevel(state, "option_value_portfolio") +
    0.05 * getPrestigeUpgradeLevel(state, "premium_contracts");
  const aiPenaltyPerAgent = Math.max(
    0.01,
    0.03 - 0.004 * getUpgradeLevel(state, "promptops_playbook"),
  );
  const aiPenaltyMultiplier = 1 - Math.min(0.5, aiAgents * aiPenaltyPerAgent);
  conversion *= aiPenaltyMultiplier;

  if (state.tradeoffMode === "move_fast") {
    conversion *= 0.88;
  } else if (state.tradeoffMode === "enterprise") {
    conversion *= 1.1;
  } else if (state.tradeoffMode === "quality_sprint") {
    conversion *= 1.15;
  }

  return clamp(conversion, 0.08, 1.85);
}

export function getUpgradeLevel(
  state: Partial<GameState> | null | undefined,
  upgradeId: string,
): number {
  return clampInt(state?.upgrades?.[upgradeId], 0, 10_000);
}

function getAiAgentCount(state: Partial<GameState> | null | undefined): number {
  return Math.max(0, Math.floor(toNumber(state?.aiAgents, 0)));
}

export function getPrestigeUpgradeLevel(
  state: Partial<GameState> | null | undefined,
  upgradeId: string,
): number {
  return clampInt(state?.prestigeUpgrades?.[upgradeId], 0, 10_000);
}

export function getUpgradeCost(state: GameState, upgradeId: string): number {
  const upgrade = UPGRADE_BY_ID.get(upgradeId);
  if (!upgrade) {
    return Infinity;
  }

  const level = getUpgradeLevel(state, upgradeId);
  if (level >= (upgrade.maxLevel || 1)) {
    return Infinity;
  }

  const scaling = 1 + level * 0.45;
  const discount = getUpgradeDiscountMultiplier(state);
  return Math.ceil((upgrade.costLoc || 0) * scaling * discount);
}

export function getHireCost(state: GameState, level: DeveloperLevel): number {
  if (!DEVELOPER_LEVELS[level]) {
    return Infinity;
  }
  return Math.ceil(
    DEVELOPER_LEVELS[level].hireCostLoc * getDeveloperCostMultiplier(state),
  );
}

export function getAiTokenCost(state: GameState): number {
  return Math.ceil(AI_TOKEN_LOC_COST * getAiTokenCostMultiplier(state));
}

export function getSupportHireCost(
  state: GameState,
  role: SupportRole,
): number {
  if (!PRODUCT_TEAM_ROLES[role]) {
    return Infinity;
  }
  let multiplier = 1;
  multiplier *= 1 - 0.04 * getUpgradeLevel(state, "enabling_teams");
  multiplier *= 1 - 0.03 * getPrestigeUpgradeLevel(state, "open_source_fame");
  return Math.ceil(
    PRODUCT_TEAM_ROLES[role].hireCostLoc * clamp(multiplier, 0.5, 2),
  );
}

export function getPrestigeUpgradeCost(
  state: GameState,
  upgradeId: string,
): number {
  const upgrade = PRESTIGE_UPGRADE_BY_ID.get(upgradeId);
  if (!upgrade) {
    return Infinity;
  }

  const level = getPrestigeUpgradeLevel(state, upgradeId);
  if (level >= (upgrade.maxLevel || 1)) {
    return Infinity;
  }

  return Math.ceil((upgrade.costReputation || 0) * (1 + level * 0.5));
}

export function getPrestigeGain(state: GameState): number {
  const threshold = getPrestigeLocThreshold(state);
  if (state.lifetimeLoc < threshold) {
    return 0;
  }
  const progressRatio = state.lifetimeLoc / threshold;
  let gain = Math.sqrt(progressRatio) * 10;
  gain *= 1 + 0.2 * getPrestigeUpgradeLevel(state, "release_multiplier");
  gain += 0.5 * getPrestigeUpgradeLevel(state, "momentum_bootstrap");
  return Math.max(1, Math.floor(gain));
}

export function getReleaseVersion(
  state: Partial<GameState> | null | undefined,
): number {
  return Math.max(1, Math.floor(toNumber(state?.totalPrestiges, 0)) + 1);
}

export function getPrestigeLocThreshold(
  state: Partial<GameState> | null | undefined,
): number {
  const releaseVersion = getReleaseVersion(state);
  const threshold =
    PRESTIGE_LOC_THRESHOLD * Math.pow(PRESTIGE_LOC_SCALING, releaseVersion - 1);
  return Math.max(PRESTIGE_LOC_THRESHOLD, Math.floor(threshold));
}

export function getBugRiskSummary(
  state: GameState,
  nowMs = Date.now(),
): BugRiskSummary {
  const bugChanceMultiplier = getBugChanceMultiplier(state, nowMs);
  const activeBoostCount = state.activeBoosts.filter(
    (boost) => boost.expiresAt > nowMs,
  ).length;
  const boostRiskFactor = 1 + activeBoostCount * AI_BOOST_BUG_RISK_BONUS;

  const randomPerUnitPerSecond =
    BASE_RANDOM_BUG_CHANCE_PER_DEV_SECOND *
    bugChanceMultiplier *
    boostRiskFactor;
  const scheduledPerHumanPerMinute = bugChanceMultiplier;
  const scheduledPerAiPerMinute =
    bugChanceMultiplier * AI_AGENT_BUG_PRESSURE_WEIGHT;

  const randomPerHumanPerMinute = randomPerUnitPerSecond * 60;
  const randomPerAiPerMinute =
    randomPerUnitPerSecond * 60 * AI_AGENT_BUG_PRESSURE_WEIGHT;

  return {
    humanExpectedBugsPerMinute:
      scheduledPerHumanPerMinute + randomPerHumanPerMinute,
    aiExpectedBugsPerMinute: scheduledPerAiPerMinute + randomPerAiPerMinute,
    humanRandomChancePerSecond: randomPerUnitPerSecond,
    aiRandomChancePerSecond:
      randomPerUnitPerSecond * AI_AGENT_BUG_PRESSURE_WEIGHT,
  };
}

export function isGameOver(
  state: Partial<GameState> | null | undefined,
): boolean {
  return Boolean(state?.gameOver);
}

export function getTechDebtStatus(
  state: GameState,
  nowMs = Date.now(),
): TechDebtStatus {
  const bugCount = state.bugs.length;
  const totalSeverity = state.bugs.reduce((sum, bug) => sum + bug.severity, 0);
  const bugPenalty = getBugPenaltyMultiplier(state);
  const teamSize = getVisibleDeveloperCount(state, nowMs);

  const backlogBugThreshold = Math.max(18, teamSize * 3);
  const backlogSeverityThreshold = 2.2;
  const freezePenaltyThreshold = 0.18;
  const freezeBugThreshold = 12;

  const backlogScore = Math.max(
    bugCount / Math.max(1, backlogBugThreshold),
    totalSeverity / backlogSeverityThreshold,
  );
  const freezeScore = Math.max(
    bugCount / freezeBugThreshold,
    freezePenaltyThreshold / Math.max(0.01, bugPenalty),
  );
  const structuralDebtThreshold = 2200;
  const structuralScore = state.techDebtPoints / structuralDebtThreshold;
  const progress = clamp(
    Math.max(backlogScore, freezeScore * 0.85, structuralScore),
    0,
    1,
  );

  const willCollapse =
    (bugCount >= backlogBugThreshold &&
      totalSeverity >= backlogSeverityThreshold) ||
    (bugPenalty <= freezePenaltyThreshold && bugCount >= freezeBugThreshold) ||
    state.techDebtPoints >= structuralDebtThreshold;

  let stage = "Stable";
  if (progress >= 0.9) {
    stage = "Near Collapse";
  } else if (progress >= 0.7) {
    stage = "Critical";
  } else if (progress >= 0.4) {
    stage = "Warning";
  }

  return {
    bugCount,
    totalSeverity,
    bugPenalty,
    teamSize,
    progress,
    stage,
    willCollapse,
    techDebtPoints: state.techDebtPoints,
    structuralPenaltyMultiplier: getStructuralDebtPenaltyMultiplier(state),
    hasStrategicDebt: Boolean(state.strategicDebt),
  };
}

export function getTechDebtRepairCost(state: GameState): number {
  const pressure = Math.min(1.8, 1 + state.techDebtPoints / 3000);
  return Math.ceil(TECH_DEBT_REPAIR_BASE_COST * pressure);
}

function applyAction(
  state: GameState,
  action: GameAction | null | undefined,
  nowMs: number,
  random: () => number,
): void {
  if (!action || typeof action !== "object") {
    return;
  }

  if (action.type === "CLICK") {
    const bonusMultiplier = clamp(toNumber(action.bonusMultiplier, 1), 1, 1.55);
    const gain = getClickLocGain(state) * bonusMultiplier;
    state.loc += gain;
    state.lifetimeLoc += gain;
    const clickDollarGain = gain * getLocDollarConversionRate(state) * 1.1;
    state.dollars += clickDollarGain;
    state.lifetimeDollars += clickDollarGain;
    state.totalClicks += 1;

    const pairLevel = getUpgradeLevel(state, "ai_pair_programmer");
    if (pairLevel > 0) {
      state.clickAuras.push({
        expiresAt: nowMs + 5_000,
        locPerSecond: 1.5 * pairLevel,
      });
    }

    const refactoringLevel = getUpgradeLevel(state, "refactoring_tools");
    if (refactoringLevel > 0 && state.bugs.length > 0) {
      const reduction = 0.01 * refactoringLevel;
      state.bugs = state.bugs
        .map((bug) => ({
          ...bug,
          severity: roundTo3(Math.max(0.005, bug.severity - reduction)),
        }))
        .filter((bug) => bug.severity > 0.01);
    }

    return;
  }

  if (action.type === "HIRE") {
    const level = action.level;
    if (!DEVELOPER_LEVELS[level]) {
      return;
    }

    if (level === "mid" && !state.unlocks.mid) {
      return;
    }
    if (level === "senior" && !state.unlocks.senior) {
      return;
    }
    if (level === "architect" && !state.unlocks.architect) {
      return;
    }

    const cost = getHireCost(state, level);
    if (state.dollars >= cost) {
      state.dollars -= cost;
      state.developers[level] += 1;
      state.totalHires += 1;
    }
    return;
  }

  if (action.type === "HIRE_SUPPORT") {
    const role = action.role;
    const cost = getSupportHireCost(state, role);
    if (state.dollars >= cost) {
      state.dollars -= cost;
      state.supportTeam[role] += 1;
      state.totalHires += 1;
    }
    return;
  }

  if (action.type === "BUY_AI_TOKEN") {
    const tokenCost = Math.ceil(
      AI_TOKEN_LOC_COST * getAiTokenCostMultiplier(state),
    );
    if (state.dollars >= tokenCost) {
      state.dollars -= tokenCost;
      state.aiAgents += 1;
      state.aiTokens = state.aiAgents;
      state.totalHires += 1;
    }
    return;
  }

  if (action.type === "ACTIVATE_AI_TOKEN") {
    if (state.aiAgents > 0) {
      state.activeBoosts.push({
        expiresAt: nowMs + getAiBoostDurationMs(state),
        multiplier: getAiBoostMultiplier(state),
        source: "ai-agent-surge",
      });
      state.activeBoosts.sort((a, b) => a.expiresAt - b.expiresAt);
    }
    return;
  }

  if (action.type === "FIX_BUG") {
    const bugId = Math.floor(toNumber(action.bugId, -1));
    if (!Number.isFinite(bugId)) {
      return;
    }

    const bugCountBefore = state.bugs.length;
    state.bugs = state.bugs.filter((bug) => bug.id !== bugId);

    const reviewLevel = getUpgradeLevel(state, "code_reviews");
    if (reviewLevel > 0 && state.bugs.length > 0) {
      state.bugs.splice(0, reviewLevel);
    }
    const bugCountAfter = state.bugs.length;
    state.totalBugsFixed += Math.max(0, bugCountBefore - bugCountAfter);
    return;
  }

  if (action.type === "PAY_TECH_DEBT") {
    if (state.techDebtPoints <= 0) {
      return;
    }
    const repairCost = getTechDebtRepairCost(state);
    if (state.dollars < repairCost) {
      return;
    }

    state.dollars -= repairCost;
    state.techDebtPoints = Math.max(
      0,
      state.techDebtPoints - repairCost * TECH_DEBT_REPAIR_LOC_TO_DEBT_FACTOR,
    );
    return;
  }

  if (action.type === "RESOLVE_STRATEGIC_DEBT") {
    if (!state.strategicDebt) {
      return;
    }

    const rewriteCostMultiplier = clamp(
      1 -
        0.08 * getUpgradeLevel(state, "reversible_decisions") -
        0.05 * getUpgradeLevel(state, "option_value_portfolio"),
      0.55,
      1,
    );
    const rewriteCost = Math.ceil(
      state.strategicDebt.rewriteCostLoc * rewriteCostMultiplier,
    );
    if (state.dollars < rewriteCost) {
      return;
    }

    state.dollars -= rewriteCost;
    state.techDebtPoints = Math.max(
      0,
      state.techDebtPoints - rewriteCost * 0.9,
    );
    state.strategicDebt = null;
    state.strategicDebtProgressMs = 0;
    return;
  }

  if (action.type === "POSTPONE_STRATEGIC_DEBT") {
    if (!state.strategicDebt) {
      return;
    }

    const postponePenaltyMultiplier = clamp(
      1 - 0.1 * getUpgradeLevel(state, "reversible_decisions"),
      0.5,
      1,
    );
    const postponeDebtPenalty =
      state.strategicDebt.postponeDebtPenalty * postponePenaltyMultiplier;
    state.techDebtPoints += postponeDebtPenalty;
    state.activeEvents.push({
      id: `strategic-debt-postponed-${nowMs}`,
      name: "Strategic Debt Postponed",
      description: `+${Math.floor(postponeDebtPenalty)} tech debt`,
      expiresAt: nowMs + 14_000,
      productionMultiplier: 1,
      lostDevCount: 0,
    });
    state.strategicDebt = null;
    state.strategicDebtProgressMs = 0;
    return;
  }

  if (action.type === "BUY_UPGRADE") {
    const upgradeId = String(action.upgradeId || "");
    const upgrade = UPGRADE_BY_ID.get(upgradeId);
    if (!upgrade) {
      return;
    }

    const currentLevel = getUpgradeLevel(state, upgradeId);
    if (currentLevel >= (upgrade.maxLevel || 1)) {
      return;
    }

    if (!hasRequiredUpgrades(state, upgrade.requires || [])) {
      return;
    }

    const cost = getUpgradeCost(state, upgradeId);
    if (state.dollars < cost) {
      return;
    }

    state.dollars -= cost;
    state.upgrades[upgradeId] = currentLevel + 1;

    if (upgradeId === "unlock_mid_developers") {
      state.unlocks.mid = true;
    }
    if (upgradeId === "unlock_senior_developers") {
      state.unlocks.senior = true;
    }
    if (upgradeId === "unlock_architect") {
      state.unlocks.architect = true;
    }
    return;
  }

  if (action.type === "BUY_PRESTIGE_UPGRADE") {
    const upgradeId = String(action.upgradeId || "");
    const upgrade = PRESTIGE_UPGRADE_BY_ID.get(upgradeId);
    if (!upgrade) {
      return;
    }

    const currentLevel = getPrestigeUpgradeLevel(state, upgradeId);
    if (currentLevel >= (upgrade.maxLevel || 1)) {
      return;
    }

    const cost = getPrestigeUpgradeCost(state, upgradeId);
    if (state.reputation < cost) {
      return;
    }

    state.reputation -= cost;
    state.prestigeUpgrades[upgradeId] = currentLevel + 1;
    return;
  }

  if (action.type === "USE_ABILITY") {
    const abilityId = String(action.abilityId || "");
    const ability = ABILITY_BY_ID.get(abilityId);
    if (!ability) {
      return;
    }

    if (getUpgradeLevel(state, ability.unlockUpgradeId) <= 0) {
      return;
    }

    const cooldownUntil = toNumber(state.abilityCooldowns[abilityId], 0);
    if (cooldownUntil > nowMs) {
      return;
    }

    state.abilityCooldowns[abilityId] = nowMs + ability.cooldownMs;

    if (abilityId === "crunch_time") {
      state.activeBoosts.push({
        expiresAt: nowMs + 30_000,
        multiplier: 3,
        source: "ability-crunch-time",
      });
    } else if (abilityId === "coffee_break") {
      state.activeBoosts.push({
        expiresAt: nowMs + 20_000,
        multiplier: 1.6,
        source: "ability-coffee-break",
      });
    } else if (abilityId === "hackathon") {
      state.activeEvents.push({
        id: "hackathon",
        name: "Hackathon Running",
        description: "Temporary developers are helping out",
        expiresAt: nowMs + 30_000,
        productionMultiplier: 1,
        lostDevCount: 0,
      });
    } else if (abilityId === "bug_bash") {
      state.bugs = [];
    }
    return;
  }

  if (action.type === "SET_TRADEOFF_MODE") {
    const modeId = action.modeId;
    if (TRADEOFF_MODES.some((mode) => mode.id === modeId)) {
      state.tradeoffMode = modeId;
    }
    return;
  }

  if (action.type === "PRESTIGE_RESET") {
    const gained = getPrestigeGain(state);
    if (gained <= 0) {
      return;
    }

    const oldPrestigeUpgrades = { ...state.prestigeUpgrades };
    const oldReputation = state.reputation;
    const oldPrestigeCount = state.totalPrestiges;
    const bootstrapLevel = clampInt(
      oldPrestigeUpgrades.momentum_bootstrap,
      0,
      10_000,
    );

    const resetState = createInitialState(nowMs);
    resetState.reputation = oldReputation + gained;
    resetState.prestigeUpgrades = oldPrestigeUpgrades;
    resetState.tradeoffMode = "balanced";
    resetState.totalPrestiges = oldPrestigeCount + 1;
    const bootstrapDollars = bootstrapLevel * 180 + oldPrestigeCount * 35;
    resetState.dollars += bootstrapDollars;
    resetState.lifetimeDollars += bootstrapDollars;
    resetState.developers.junior = Math.min(4, Math.floor(bootstrapLevel / 2));

    Object.assign(state, resetState);
  }

  void random;
}

function hasRequiredUpgrades(state: GameState, requiredIds: string[]): boolean {
  return requiredIds.every(
    (upgradeId) => getUpgradeLevel(state, upgradeId) > 0,
  );
}

function getClickAuraLocPerSecond(state: GameState, nowMs: number): number {
  return state.clickAuras.reduce((sum, aura) => {
    if (aura.expiresAt > nowMs) {
      return sum + aura.locPerSecond;
    }
    return sum;
  }, 0);
}

function getGlobalProductionMultiplier(state: GameState): number {
  let multiplier = 1;

  multiplier *= 1 + 0.1 * getUpgradeLevel(state, "tech_debt_cleanup");
  multiplier *= 1 + 0.01 * getUpgradeLevel(state, "ping_pong_table");
  multiplier *=
    1 + 0.05 * getPrestigeUpgradeLevel(state, "engineering_culture");

  if (getUpgradeLevel(state, "dark_mode") > 0) {
    multiplier *= 1.05;
  }

  if (state.tradeoffMode === "move_fast") {
    multiplier *= 1.5;
  } else if (state.tradeoffMode === "enterprise") {
    multiplier *= 0.8;
  } else if (state.tradeoffMode === "rust_rewrite") {
    multiplier *= 0.95;
  } else if (state.tradeoffMode === "js_rewrite") {
    multiplier *= 1.2;
  } else if (state.tradeoffMode === "quality_sprint") {
    multiplier *= 0.9;
  }

  if (getUpgradeLevel(state, "monorepo") > 0) {
    multiplier *= 1 + 0.06 * getUpgradeLevel(state, "monorepo");
  }
  multiplier *= 1 + 0.02 * getUpgradeLevel(state, "platform_teams");
  multiplier *= 1 + 0.03 * getUpgradeLevel(state, "internal_dev_portal");
  multiplier *= 1 + 0.025 * getUpgradeLevel(state, "self_service_environments");
  multiplier *= 1 + 0.03 * getUpgradeLevel(state, "flow_efficiency_dashboard");
  multiplier *= 1 + 0.02 * getUpgradeLevel(state, "stream_aligned_teams");
  multiplier *= 1 + 0.015 * getUpgradeLevel(state, "platform_grouping");
  multiplier *= 1 + 0.02 * getUpgradeLevel(state, "commodity_migration");

  multiplier *= getStructuralDebtPenaltyMultiplier(state);

  return multiplier;
}

function getFlatLocPerSecondBonus(state: GameState): number {
  return (
    getUpgradeLevel(state, "build_cache") * 3 +
    getUpgradeLevel(state, "faster_ci") * 4
  );
}

function getDeveloperCostMultiplier(state: GameState): number {
  let multiplier = 1;

  multiplier *= 1 - 0.08 * getUpgradeLevel(state, "hiring_pipeline");
  multiplier *= 1 - 0.05 * getUpgradeLevel(state, "golden_path_templates");
  multiplier *= 1 - 0.04 * getUpgradeLevel(state, "self_service_environments");
  multiplier *= 1 - 0.03 * getPrestigeUpgradeLevel(state, "open_source_fame");

  if (state.tradeoffMode === "rust_rewrite") {
    multiplier *= 1.25;
  }

  return clamp(multiplier, 0.4, 2.5);
}

function getUpgradeDiscountMultiplier(state: GameState): number {
  const fameDiscount =
    0.06 * getPrestigeUpgradeLevel(state, "open_source_fame");
  const wardleyDiscount = 0.03 * getUpgradeLevel(state, "wardley_map_session");
  const buyVsBuildDiscount =
    0.025 * getUpgradeLevel(state, "buy_vs_build_matrix");
  return clamp(
    1 - fameDiscount - wardleyDiscount - buyVsBuildDiscount,
    0.35,
    1,
  );
}

function getAiTokenCostMultiplier(state: GameState): number {
  const templateDiscount = 0.1 * getUpgradeLevel(state, "prompt_templates");
  const promptopsDiscount = 0.08 * getUpgradeLevel(state, "promptops_playbook");
  return clamp(1 - templateDiscount - promptopsDiscount, 0.35, 1);
}

function getAiBoostDurationMs(state: GameState): number {
  return (
    AI_BOOST_DURATION_MS +
    getUpgradeLevel(state, "larger_context_window") * 5_000
  );
}

function getAiBoostMultiplier(state: GameState): number {
  return AI_BOOST_MULTIPLIER + getUpgradeLevel(state, "better_models") * 0.5;
}

function getEventProductionMultiplier(state: GameState, nowMs: number): number {
  return state.activeEvents.reduce((multiplier, event) => {
    if (event.expiresAt > nowMs) {
      return multiplier * Math.max(0.1, event.productionMultiplier || 1);
    }
    return multiplier;
  }, 1);
}

function getLostDeveloperCountFromEvents(
  state: GameState,
  nowMs: number,
): number {
  return state.activeEvents.reduce((lost, event) => {
    if (event.expiresAt > nowMs && event.lostDevCount > 0) {
      return lost + event.lostDevCount;
    }
    return lost;
  }, 0);
}

function getHackathonTemporaryDevelopers(
  state: GameState,
  nowMs: number,
): number {
  return state.activeEvents.reduce((sum, event) => {
    if (event.id === "hackathon" && event.expiresAt > nowMs) {
      return sum + 3;
    }
    return sum;
  }, 0);
}

function getHackathonTemporaryLocPerSecond(
  state: GameState,
  nowMs: number,
): number {
  if (getHackathonTemporaryDevelopers(state, nowMs) <= 0) {
    return 0;
  }

  return (
    2 * DEVELOPER_LEVELS.junior.locPerSecond + DEVELOPER_LEVELS.mid.locPerSecond
  );
}

function getBugChanceMultiplier(state: GameState, nowMs: number): number {
  let multiplier = 1;

  multiplier *= 1 - 0.2 * getUpgradeLevel(state, "unit_tests");
  multiplier *= 1 - 0.15 * getUpgradeLevel(state, "type_system");
  multiplier *= 1 - 0.08 * getUpgradeLevel(state, "observability");

  const aiDebuggingLevel = getUpgradeLevel(state, "ai_debugging");
  if (aiDebuggingLevel > 0 && getActiveBoostMultiplierAt(state, nowMs) > 1) {
    multiplier *= 1 - 0.18 * aiDebuggingLevel;
  }
  multiplier *= 1 - 0.08 * getUpgradeLevel(state, "eval_harness");
  multiplier *= 1 - 0.06 * getUpgradeLevel(state, "wip_limits");
  multiplier *= 1 - 0.05 * getUpgradeLevel(state, "team_topologies_enabling");
  multiplier *= 1 - 0.05 * getUpgradeLevel(state, "lead_time_alerts");
  multiplier *= 1 - 0.06 * getUpgradeLevel(state, "kill_switches");
  multiplier *= 1 - 0.12 * getPrestigeUpgradeLevel(state, "reliability_guild");

  const architectCount = Math.max(
    0,
    Math.floor(toNumber(state?.developers?.architect, 0)),
  );
  if (architectCount > 0) {
    // Architects reduce bug creation pressure across the team.
    multiplier *= Math.max(0.35, 1 - architectCount * 0.08);
  }

  const sreCount = Math.max(
    0,
    Math.floor(toNumber(state?.supportTeam?.sre, 0)),
  );
  if (sreCount > 0) {
    multiplier *= Math.max(0.45, 1 - sreCount * 0.07);
  }

  if (state.tradeoffMode === "move_fast") {
    multiplier *= 2;
  } else if (state.tradeoffMode === "enterprise") {
    multiplier *= 0.3;
  } else if (state.tradeoffMode === "rust_rewrite") {
    multiplier *= 0.45;
  } else if (state.tradeoffMode === "js_rewrite") {
    multiplier *= 1.6;
  } else if (state.tradeoffMode === "quality_sprint") {
    multiplier *= 0.65;
  }

  const aiAgentRiskPerAgent =
    0.12 +
    0.03 * getUpgradeLevel(state, "agent_swarm") -
    0.015 * getUpgradeLevel(state, "promptops_playbook");
  multiplier *=
    1 + getAiAgentCount(state) * Math.max(0.04, aiAgentRiskPerAgent);

  return clamp(multiplier, 0.05, 4);
}

function getBugSeverityMultiplier(state: GameState): number {
  let multiplier = 1;
  multiplier *= 1 - 0.1 * getUpgradeLevel(state, "static_analysis");
  multiplier *= 1 - 0.08 * getUpgradeLevel(state, "monitoring");

  if (state.tradeoffMode === "enterprise") {
    multiplier *= 0.7;
  } else if (state.tradeoffMode === "rust_rewrite") {
    multiplier *= 0.65;
  } else if (state.tradeoffMode === "js_rewrite") {
    multiplier *= 1.2;
  } else if (state.tradeoffMode === "quality_sprint") {
    multiplier *= 0.82;
  }

  const sreCount = Math.max(
    0,
    Math.floor(toNumber(state?.supportTeam?.sre, 0)),
  );
  if (sreCount > 0) {
    multiplier *= Math.max(0.65, 1 - sreCount * 0.05);
  }
  multiplier *= 1 - 0.06 * getUpgradeLevel(state, "lead_time_alerts");
  multiplier *= 1 - 0.05 * getUpgradeLevel(state, "kill_switches");
  multiplier *= 1 - 0.08 * getPrestigeUpgradeLevel(state, "reliability_guild");

  return clamp(multiplier, 0.25, 2);
}

function decayBugs(state: GameState, elapsedMs: number): void {
  const decayLevel =
    getUpgradeLevel(state, "sre_team") +
    getUpgradeLevel(state, "rubber_duck_debugging");

  if (decayLevel <= 0 || state.bugs.length === 0) {
    return;
  }

  const decayAmount = (elapsedMs / 1000) * decayLevel * 0.002;
  state.bugs = state.bugs
    .map((bug) => ({
      ...bug,
      severity: roundTo3(Math.max(0, bug.severity - decayAmount)),
    }))
    .filter((bug) => bug.severity > 0.01);
}

function autoFixMinorBugs(state: GameState): void {
  const ciLevel = getUpgradeLevel(state, "ci_pipeline");
  if (ciLevel <= 0 || state.bugs.length === 0) {
    return;
  }

  const threshold = 0.06 + ciLevel * 0.02;
  state.bugs = state.bugs.filter((bug) => bug.severity > threshold);
}

function spawnScheduledBugs(
  state: GameState,
  elapsedMs: number,
  nowMs: number,
  random: () => number,
): void {
  const bugPressureUnits = getBugPressureUnits(state, nowMs);
  if (bugPressureUnits === 0) {
    return;
  }

  const bugChanceMultiplier = getBugChanceMultiplier(state, nowMs);
  state.bugProgressMs += elapsedMs * bugPressureUnits * bugChanceMultiplier;

  while (state.bugProgressMs >= BUG_INTERVAL_PER_DEV_MS) {
    state.bugProgressMs -= BUG_INTERVAL_PER_DEV_MS;
    addBug(state, nowMs, random);
  }
}

function spawnRandomBugs(
  state: GameState,
  tickStartMs: number,
  nowMs: number,
  random: () => number,
): void {
  const bugPressureUnits = getBugPressureUnits(state, nowMs);
  if (bugPressureUnits === 0) {
    return;
  }

  const boostRiskSeconds = integrateBoostRisk(state, tickStartMs, nowMs);
  const spawnPotential =
    BASE_RANDOM_BUG_CHANCE_PER_DEV_SECOND *
    bugPressureUnits *
    boostRiskSeconds *
    getBugChanceMultiplier(state, nowMs);

  const guaranteedBugs = Math.floor(spawnPotential);
  for (let i = 0; i < guaranteedBugs; i++) {
    addBug(state, nowMs, random);
  }

  const fractionalChance = spawnPotential - guaranteedBugs;
  if (random() < fractionalChance) {
    addBug(state, nowMs, random);
  }
}

function integrateBoostRisk(
  state: GameState,
  fromMs: number,
  toMs: number,
): number {
  if (toMs <= fromMs) {
    return 0;
  }

  const checkpoints = state.activeBoosts
    .map((boost) => boost.expiresAt)
    .filter((expiresAt) => expiresAt > fromMs && expiresAt < toMs)
    .sort((a, b) => a - b);

  let riskSeconds = 0;
  let cursor = fromMs;

  for (const checkpoint of checkpoints) {
    const activeCount = state.activeBoosts.filter(
      (boost) => boost.expiresAt > cursor,
    ).length;
    const riskFactor = 1 + activeCount * AI_BOOST_BUG_RISK_BONUS;
    riskSeconds += ((checkpoint - cursor) / 1000) * riskFactor;
    cursor = checkpoint;
  }

  const tailActiveCount = state.activeBoosts.filter(
    (boost) => boost.expiresAt > cursor,
  ).length;
  const tailRiskFactor = 1 + tailActiveCount * AI_BOOST_BUG_RISK_BONUS;
  riskSeconds += ((toMs - cursor) / 1000) * tailRiskFactor;

  return riskSeconds;
}

function maybeTriggerRandomEvent(
  state: GameState,
  elapsedMs: number,
  nowMs: number,
  random: () => number,
): void {
  state.eventProgressMs += elapsedMs;
  if (state.eventProgressMs < 15_000) {
    return;
  }

  state.eventProgressMs = 0;

  if (
    getAiAgentCount(state) > 0 &&
    random() < Math.min(0.35, getAiAgentCount(state) * 0.03)
  ) {
    const deletedLoc = Math.min(
      state.loc,
      Math.max(15, state.loc * (0.03 + getAiAgentCount(state) * 0.005)),
    );

    state.loc = Math.max(0, state.loc - deletedLoc);
    state.activeEvents.push({
      id: "ai_agent_deleted_code",
      name: "AI Agent Deleted Code",
      description: `-${Math.floor(deletedLoc)} LOC`,
      expiresAt: nowMs + 10_000,
      productionMultiplier: 1,
      lostDevCount: 0,
    });
  }

  const eventChance = clamp(
    0.16 *
      (1 - 0.08 * getUpgradeLevel(state, "lead_time_alerts")) *
      (1 - 0.06 * getUpgradeLevel(state, "buy_vs_build_matrix")),
    0.06,
    0.3,
  );
  if (random() > eventChance) {
    return;
  }

  const event = RANDOM_EVENTS[Math.floor(random() * RANDOM_EVENTS.length)];
  if (!event) {
    return;
  }

  const downsideMitigation = clamp(
    1 -
      0.08 * getUpgradeLevel(state, "option_value_portfolio") -
      0.06 * getUpgradeLevel(state, "kill_switches") -
      0.05 * getUpgradeLevel(state, "reversible_decisions"),
    0.45,
    1,
  );

  if (event.burstLoc) {
    const burstMultiplier =
      1 + 0.12 * getPrestigeUpgradeLevel(state, "premium_contracts");
    const burst =
      (event.burstLoc + getVisibleDeveloperCount(state, nowMs) * 20) *
      burstMultiplier;
    state.loc += burst;
    state.lifetimeLoc += burst;
    const burstDollarGain =
      burst *
      getLocDollarConversionRate(state) *
      (0.28 + 0.08 * getPrestigeUpgradeLevel(state, "premium_contracts"));
    state.dollars += burstDollarGain;
    state.lifetimeDollars += burstDollarGain;
  }

  if (event.locLossPercent || event.locLossFlat) {
    const lossByPercent = state.loc * (event.locLossPercent || 0);
    const loss =
      Math.max(event.locLossFlat || 0, lossByPercent) * downsideMitigation;
    state.loc = Math.max(0, state.loc - loss);
  }

  if (event.debtDelta) {
    const adjustedDebtDelta =
      event.debtDelta > 0
        ? event.debtDelta * downsideMitigation
        : event.debtDelta;
    state.techDebtPoints = Math.max(
      0,
      state.techDebtPoints + adjustedDebtDelta,
    );
  }

  if (event.addBugs) {
    const reducedBugs = Math.max(
      0,
      Math.floor(
        event.addBugs *
          (1 -
            0.1 * getUpgradeLevel(state, "lead_time_alerts") -
            0.1 * getUpgradeLevel(state, "kill_switches")),
      ),
    );
    for (let i = 0; i < reducedBugs; i++) {
      addBug(state, nowMs, random);
    }
  }

  if (event.clearBugs) {
    const toClear = Math.max(0, Math.floor(event.clearBugs));
    if (toClear > 0) {
      state.bugs.splice(0, toClear);
    }
  }

  const hasTimedEffect =
    (event.durationMs || 0) > 0 ||
    (event.productionMultiplier && event.productionMultiplier !== 1) ||
    (event.lostDevCount && event.lostDevCount > 0);

  if (!hasTimedEffect) {
    return;
  }

  state.activeEvents.push({
    id: event.id,
    name: event.name,
    description: event.description,
    expiresAt: nowMs + event.durationMs,
    productionMultiplier:
      (event.productionMultiplier || 1) < 1
        ? 1 - (1 - (event.productionMultiplier || 1)) * downsideMitigation
        : event.productionMultiplier || 1,
    lostDevCount: event.lostDevCount || 0,
  });
}

function maybeTriggerStrategicDebt(
  state: GameState,
  elapsedMs: number,
  random: () => number,
): void {
  if (state.strategicDebt) {
    return;
  }

  state.strategicDebtProgressMs += elapsedMs;
  if (state.strategicDebtProgressMs < TECH_DEBT_STRATEGIC_CHECK_INTERVAL_MS) {
    return;
  }

  state.strategicDebtProgressMs = 0;
  const chance = clamp(
    0.1 *
      (1 - 0.08 * getUpgradeLevel(state, "reversible_decisions")) *
      (1 - 0.06 * getUpgradeLevel(state, "wardley_map_session")),
    0.03,
    0.2,
  );
  if (random() > chance) {
    return;
  }

  const item =
    STRATEGIC_TECH_DEBT_ITEMS[
      Math.floor(random() * STRATEGIC_TECH_DEBT_ITEMS.length)
    ];
  if (!item) {
    return;
  }

  state.strategicDebt = {
    id: item.id,
    title: item.title,
    description: item.description,
    rewriteCostLoc: item.rewriteCostLoc,
    postponeDebtPenalty: item.postponeDebtPenalty,
  };
}

function maybeTriggerGameOver(state: GameState, nowMs: number): void {
  if (state.gameOver) {
    return;
  }

  const debtStatus = getTechDebtStatus(state, nowMs);
  if (debtStatus.willCollapse) {
    state.gameOver = {
      code: "tech_debt_collapse",
      title: "Tech Debt Collapse",
      message:
        "The bug backlog overwhelmed the team. A full rewrite is now required.",
      atMs: nowMs,
    };
  }
}

function accrueStructuralTechDebt(
  state: GameState,
  elapsedMs: number,
  nowMs: number,
): void {
  const seconds = elapsedMs / 1000;
  const bugFactor = state.bugs.length * 0.11;
  const severityFactor =
    state.bugs.reduce((sum, bug) => sum + bug.severity, 0) * 0.38;
  const aiFactor = getAiAgentCount(state) * 0.16;
  const strategicFactor = state.strategicDebt ? 0.25 : 0;

  let debtPerSecond =
    0.18 + bugFactor + severityFactor + aiFactor + strategicFactor;

  const cleanupLevel = getUpgradeLevel(state, "tech_debt_cleanup");
  debtPerSecond *= Math.max(0.35, 1 - cleanupLevel * 0.08);
  debtPerSecond *= Math.max(
    0.65,
    1 - getUpgradeLevel(state, "enabling_teams") * 0.06,
  );
  debtPerSecond *= Math.max(
    0.6,
    1 - Math.max(0, Math.floor(toNumber(state?.supportTeam?.sre, 0))) * 0.05,
  );
  debtPerSecond *= Math.max(
    0.65,
    1 - getUpgradeLevel(state, "wip_limits") * 0.05,
  );
  debtPerSecond *= Math.max(
    0.65,
    1 - getUpgradeLevel(state, "stream_aligned_teams") * 0.05,
  );
  debtPerSecond *= Math.max(
    0.7,
    1 - getUpgradeLevel(state, "team_topologies_enabling") * 0.04,
  );
  debtPerSecond *= Math.max(
    0.75,
    1 - getUpgradeLevel(state, "commodity_migration") * 0.05,
  );
  debtPerSecond *= 1 + 0.04 * getUpgradeLevel(state, "agent_swarm");

  if (state.tradeoffMode === "move_fast") {
    debtPerSecond *= 1.35;
  } else if (state.tradeoffMode === "enterprise") {
    debtPerSecond *= 0.75;
  } else if (state.tradeoffMode === "rust_rewrite") {
    debtPerSecond *= 0.7;
  } else if (state.tradeoffMode === "js_rewrite") {
    debtPerSecond *= 1.25;
  } else if (state.tradeoffMode === "quality_sprint") {
    debtPerSecond *= 0.82;
  }

  if (getActiveBoostMultiplierAt(state, nowMs) > 1) {
    debtPerSecond *= 1.12;
  }

  state.techDebtPoints += debtPerSecond * seconds;
}

function addBug(state: GameState, nowMs: number, random: () => number): void {
  let severity =
    BUG_SEVERITY_MIN + random() * (BUG_SEVERITY_MAX - BUG_SEVERITY_MIN);
  severity *= getBugSeverityMultiplier(state);
  severity = clamp(severity, 0.01, 0.95);
  const title = pickBugTitle(state, random);

  state.bugs.push({
    id: state.nextBugId,
    title,
    severity: roundTo3(severity),
    createdAt: nowMs,
  });
  state.nextBugId += 1;
}

function toNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clampInt(value: unknown, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.floor(toNumber(value, 0))));
}

function roundTo3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function getBugPressureUnits(state: GameState, nowMs: number): number {
  const aiAgents = getAiAgentCount(state);
  const humanAndTempDevelopers = Math.max(
    0,
    getVisibleDeveloperCount(state, nowMs) - aiAgents,
  );
  return humanAndTempDevelopers + aiAgents * AI_AGENT_BUG_PRESSURE_WEIGHT;
}

function getStructuralDebtPenaltyMultiplier(state: GameState): number {
  return clamp(1 - state.techDebtPoints / 5000, 0.55, 1);
}

function normalizeBugTitle(value: unknown): string {
  const title = String(value || "").trim();
  if (title.length > 0) {
    return title;
  }
  return "Unclassified Runtime Glitch";
}

function pickBugTitle(state: GameState, random: () => number): string {
  const activeTitles = new Set(
    state.bugs.map((bug) => normalizeBugTitle(bug.title)),
  );
  const availableTitles = BUG_TITLES.filter(
    (title) => !activeTitles.has(title),
  );

  const pool = availableTitles.length > 0 ? availableTitles : BUG_TITLES;
  if (pool.length === 0) {
    return "Unclassified Runtime Glitch";
  }

  const index = Math.floor(random() * pool.length);
  return pool[index] || pool[0];
}
