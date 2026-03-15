import { expect, test } from "vitest";

import {
  createInitialState,
  getBaseLocPerSecond,
  getBugPenaltyMultiplier,
  getBugRiskSummary,
  getClickLocGain,
  getDeveloperCount,
  getLocDollarConversionRate,
  getPrestigeGain,
  getPrestigeLocThreshold,
  getTechDebtRepairCost,
  getTechDebtStatus,
  getUpgradeCost,
  getVisibleDeveloperCount,
  normalizeState,
  tick,
} from "../src/game/engine.js";
import type { GameStateInput } from "../src/game/types.js";

function createState(overrides: Partial<GameStateInput> = {}, nowMs = 10_000) {
  return normalizeState(
    {
      ...createInitialState(nowMs),
      ...overrides,
    },
    nowMs,
  );
}

test("normalizeState sanitizes collections, numbers, and unlocks", () => {
  const nowMs = 5_000;
  const state = normalizeState(
    {
      dollars: -8,
      lifetimeLoc: -50,
      aiTokens: 3,
      developers: { junior: 1.9, mid: -3, senior: 0, architect: 0 },
      supportTeam: { product: 2.8, ux: 0, sre: 0 },
      upgrades: {
        unlock_mid_developers: 1,
        unlock_senior_developers: 99,
      },
      activeBoosts: [
        { expiresAt: nowMs - 1, multiplier: 2, source: "expired" },
        { expiresAt: nowMs + 200, multiplier: 1.5, source: "active" },
      ],
      activeEvents: [
        {
          id: "late",
          name: "Late",
          description: "later",
          expiresAt: nowMs + 500,
          productionMultiplier: 1,
          lostDevCount: 0,
        },
        {
          id: "soon",
          name: "Soon",
          description: "sooner",
          expiresAt: nowMs + 100,
          productionMultiplier: 1,
          lostDevCount: 1.8,
        },
      ],
      bugs: [
        { id: 7, severity: 0.99, title: "", createdAt: nowMs - 100 },
        { id: 2, severity: 0.001, title: "tiny", createdAt: nowMs - 200 },
      ],
      nextBugId: 1,
    },
    nowMs,
  );

  expect(state.dollars).toBe(0);
  expect(state.lifetimeLoc).toBe(0);
  expect(state.aiAgents).toBe(0);
  expect(state.aiTokens).toBe(3);
  expect(state.developers.junior).toBe(1);
  expect(state.developers.mid).toBe(0);
  expect(state.supportTeam.product).toBe(2);
  expect(state.unlocks.mid).toBe(true);
  expect(state.unlocks.senior).toBe(true);
  expect(state.activeBoosts).toHaveLength(1);
  expect(state.activeBoosts[0].source).toBe("active");
  expect(state.activeEvents.map((event) => event.id)).toEqual(["soon", "late"]);
  expect(state.bugs.map((bug) => bug.id)).toEqual([2, 7]);
  expect(state.bugs[0].severity).toBeGreaterThanOrEqual(0.01);
  expect(state.bugs[1].severity).toBeLessThanOrEqual(0.95);
  expect(state.nextBugId).toBe(8);
});

test("developer counts include AI agents and event effects in visible count", () => {
  const nowMs = 20_000;
  const state = createState(
    {
      developers: { junior: 3, mid: 2, senior: 1, architect: 0 },
      aiAgents: 4,
      activeEvents: [
        {
          id: "outage",
          name: "Outage",
          description: "people firefighting",
          expiresAt: nowMs + 1_000,
          productionMultiplier: 1,
          lostDevCount: 2,
        },
        {
          id: "hackathon",
          name: "Hackathon Running",
          description: "temporary devs",
          expiresAt: nowMs + 1_000,
          productionMultiplier: 1,
          lostDevCount: 0,
        },
      ],
    },
    nowMs,
  );

  expect(getDeveloperCount(state)).toBe(6);
  expect(getVisibleDeveloperCount(state, nowMs)).toBeGreaterThan(8);
});

test("base production increases with contributors and temporary boosts", () => {
  const nowMs = 30_000;
  const idle = createState({}, nowMs);
  const active = createState(
    {
      developers: { junior: 2, mid: 1, senior: 1, architect: 0 },
      aiAgents: 2,
      clickAuras: [{ expiresAt: nowMs + 1_000, locPerSecond: 4 }],
      activeEvents: [
        {
          id: "hackathon",
          name: "Hackathon Running",
          description: "temporary devs",
          expiresAt: nowMs + 1_000,
          productionMultiplier: 1.1,
          lostDevCount: 0,
        },
      ],
      upgrades: {
        better_coffee: 1,
        agile_transformation: 1,
      },
    },
    nowMs,
  );

  expect(getBaseLocPerSecond(idle, nowMs)).toBe(0);
  expect(getBaseLocPerSecond(active, nowMs)).toBeGreaterThan(20);
});

test("bug penalty and value conversion respond to tradeoff modes", () => {
  const balanced = createState({
    developers: { junior: 2, mid: 2, senior: 1, architect: 1 },
    supportTeam: { product: 2, ux: 1, sre: 1 },
    bugs: [{ id: 1, severity: 0.4, title: "Large bug", createdAt: 1 }],
  });
  const moveFast = createState({ ...balanced, tradeoffMode: "move_fast" });
  const enterprise = createState({ ...balanced, tradeoffMode: "enterprise" });

  expect(getBugPenaltyMultiplier(moveFast)).toBeLessThan(
    getBugPenaltyMultiplier(balanced),
  );
  expect(getBugPenaltyMultiplier(enterprise)).toBeGreaterThan(
    getBugPenaltyMultiplier(balanced),
  );
  expect(getLocDollarConversionRate(moveFast)).toBeLessThan(
    getLocDollarConversionRate(balanced),
  );
  expect(getLocDollarConversionRate(enterprise)).toBeGreaterThan(
    getLocDollarConversionRate(balanced),
  );
});

test("upgrade costs scale, discount, and max out", () => {
  const baseline = createState({ dollars: 10_000 });
  const discounted = createState({
    dollars: 10_000,
    upgrades: {
      wardley_map_session: 1,
      buy_vs_build_matrix: 1,
    },
    prestigeUpgrades: {
      open_source_fame: 1,
    },
  });

  expect(getUpgradeCost(baseline, "code_snippets")).toBeGreaterThan(0);
  expect(getUpgradeCost(discounted, "code_snippets")).toBeLessThan(
    getUpgradeCost(baseline, "code_snippets"),
  );
  expect(getUpgradeCost(discounted, "does_not_exist")).toBe(Infinity);
  expect(getUpgradeCost(createState({ upgrades: { better_keyboard: 1 } }), "better_keyboard")).toBe(
    Infinity,
  );
});

test("prestige thresholds and gains scale with progress and upgrades", () => {
  const fresh = createState();
  const threshold = getPrestigeLocThreshold(fresh);
  const releasing = createState({
    lifetimeLoc: threshold * 4,
    prestigeUpgrades: {
      release_multiplier: 1,
      momentum_bootstrap: 2,
    },
  });

  expect(getPrestigeGain(fresh)).toBe(0);
  expect(getPrestigeGain(releasing)).toBeGreaterThan(20);
});

test("tech debt status escalates and repair cost scales with debt", () => {
  const state = createState({
    developers: { junior: 5, mid: 3, senior: 2, architect: 1 },
    bugs: Array.from({ length: 14 }, (_, index) => ({
      id: index + 1,
      severity: 0.25,
      title: `Bug ${index + 1}`,
      createdAt: 1,
    })),
    techDebtPoints: 2_500,
    strategicDebt: {
      id: "rewrite",
      title: "Rewrite",
      description: "Big rewrite",
      rewriteCostLoc: 600,
      postponeDebtPenalty: 250,
    },
  });

  const debt = getTechDebtStatus(state);
  expect(debt.progress).toBe(1);
  expect(debt.willCollapse).toBe(true);
  expect(debt.hasStrategicDebt).toBe(true);
  expect(getTechDebtRepairCost(state)).toBeGreaterThan(
    getTechDebtRepairCost(createState()),
  );
});

test("click action applies gain, aura creation, and refactoring bug reduction", () => {
  const state = createState({
    upgrades: {
      ai_pair_programmer: 2,
      refactoring_tools: 1,
    },
    bugs: [
      { id: 1, severity: 0.015, title: "Small", createdAt: 1 },
      { id: 2, severity: 0.09, title: "Big", createdAt: 1 },
    ],
  });

  const next = tick(state, {
    action: { type: "CLICK", bonusMultiplier: 1.2 },
    nowMs: state.lastTickAt,
  });

  expect(next.totalClicks).toBe(1);
  expect(next.loc).toBeGreaterThan(0);
  expect(next.dollars).toBeGreaterThan(35);
  expect(next.clickAuras).toHaveLength(1);
  expect(next.bugs).toHaveLength(1);
  expect(next.bugs[0].id).toBe(2);
});

test("locked hires fail until unlock upgrade is purchased", () => {
  const nowMs = 40_000;
  const locked = createState({ dollars: 10_000 }, nowMs);
  const failedHire = tick(locked, {
    action: { type: "HIRE", level: "mid" },
    nowMs,
  });

  expect(failedHire.developers.mid).toBe(0);

  const unlocked = tick(locked, {
    action: { type: "BUY_UPGRADE", upgradeId: "unlock_mid_developers" },
    nowMs,
  });
  const hired = tick(unlocked, {
    action: { type: "HIRE", level: "mid" },
    nowMs,
  });

  expect(unlocked.unlocks.mid).toBe(true);
  expect(hired.developers.mid).toBe(1);
  expect(hired.totalHires).toBe(1);
});

test("ability use enforces unlocks and applies ability effects", () => {
  const nowMs = 50_000;
  const locked = createState({
    bugs: [{ id: 1, severity: 0.2, title: "Bug", createdAt: 1 }],
  });

  const ignored = tick(locked, {
    action: { type: "USE_ABILITY", abilityId: "bug_bash" },
    nowMs,
  });
  expect(ignored.bugs).toHaveLength(1);

  const unlocked = createState({
    upgrades: { unlock_bug_bash: 1, unlock_crunch_time: 1 },
    bugs: [{ id: 1, severity: 0.2, title: "Bug", createdAt: 1 }],
  });
  const bashed = tick(unlocked, {
    action: { type: "USE_ABILITY", abilityId: "bug_bash" },
    nowMs,
  });
  const crunched = tick(unlocked, {
    action: { type: "USE_ABILITY", abilityId: "crunch_time" },
    nowMs,
  });

  expect(bashed.bugs).toHaveLength(0);
  expect(bashed.abilityCooldowns.bug_bash).toBeGreaterThan(nowMs);
  expect(crunched.activeBoosts.some((boost) => boost.source === "ability-crunch-time")).toBe(
    true,
  );
});

test("prestige reset carries prestige state and bootstrap bonuses forward", () => {
  const nowMs = 60_000;
  const thresholdState = createState({ totalPrestiges: 2 }, nowMs);
  const ready = createState(
    {
      lifetimeLoc: getPrestigeLocThreshold(thresholdState) * 2,
      reputation: 4,
      tradeoffMode: "move_fast",
      prestigeUpgrades: {
        momentum_bootstrap: 4,
      },
      developers: {
        junior: 3,
        mid: 2,
        senior: 1,
        architect: 1,
      },
      totalPrestiges: 2,
    },
    nowMs,
  );

  const next = tick(ready, {
    action: { type: "PRESTIGE_RESET" },
    nowMs,
  });

  expect(next.totalPrestiges).toBe(3);
  expect(next.reputation).toBeGreaterThan(4);
  expect(next.prestigeUpgrades.momentum_bootstrap).toBe(4);
  expect(next.tradeoffMode).toBe("balanced");
  expect(next.developers.junior).toBe(2);
  expect(next.dollars).toBeGreaterThan(35);
});

test("risk summary reflects AI-heavy teams", () => {
  const humanTeam = createState({
    developers: { junior: 4, mid: 2, senior: 1, architect: 1 },
  });
  const aiTeam = createState({
    developers: { junior: 4, mid: 2, senior: 1, architect: 1 },
    aiAgents: 8,
    activeBoosts: [{ expiresAt: 80_000, multiplier: 2, source: "surge" }],
  });

  const humanRisk = getBugRiskSummary(humanTeam, 70_000);
  const aiRisk = getBugRiskSummary(aiTeam, 70_000);

  expect(aiRisk.aiExpectedBugsPerMinute).toBeGreaterThan(
    humanRisk.aiExpectedBugsPerMinute,
  );
  expect(getClickLocGain(aiTeam)).toBeGreaterThan(0);
});
