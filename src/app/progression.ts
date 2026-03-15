import { UPGRADE_CATALOG } from "../game/constants.js";
import { getUpgradeLevel } from "../game/engine.js";
import type { AchievementDefinition, GameState } from "../game/types.js";

const DISABLED_ABILITY_UPGRADE_IDS = new Set([
  "unlock_crunch_time",
  "unlock_hackathon",
  "unlock_coffee_break",
  "unlock_bug_bash",
]);

export const ACTIVE_UPGRADE_CATALOG = UPGRADE_CATALOG.filter(
  (upgrade) => !DISABLED_ABILITY_UPGRADE_IDS.has(upgrade.id),
);

const COMPANY_STAGES = [
  {
    id: "garage",
    label: "Garage",
    minDollars: 0,
    note: "Two laptops, one dream.",
  },
  {
    id: "startup",
    label: "Startup",
    minDollars: 600,
    note: "You now have standups and a coffee budget.",
  },
  {
    id: "scaleup",
    label: "Scale-up",
    minDollars: 6_000,
    note: "Teams emerge, dashboards multiply.",
  },
  {
    id: "unicorn",
    label: "Unicorn",
    minDollars: 55_000,
    note: "Congrats. Your infra bill has commas.",
  },
];

export const COMBO_CALLOUTS = [
  "Clean Commit",
  "No Merge Conflicts",
  "Refactor Rampage",
  "Zero-Lint Streak",
  "Rubber Duck Approved",
  "It Works In Prod",
  "CI Is Green",
  "Bug-Free-ish",
  "Legendary Pairing",
  "Velocity Unlocked",
  "Hot Reload Hero",
  "Stack Trace Slayer",
  "Semicolon Samurai",
  "Console Log Whisperer",
  "Merge Train Conductor",
  "Feature Flag Ninja",
  "Unit Test Wizard",
  "API Contract Keeper",
  "Frontend Fury",
  "Backend Blessing",
  "Latency Hunter",
  "Ship It Energy",
  "Deploy Day Confidence",
  "Caffeine Optimized",
  "Type Safety Aura",
  "No Flaky Tests Today",
  "One More Refactor",
  "Green Pipeline Groove",
  "Pull Request Poetry",
  "Keyboard Katana",
  "Debugging Clairvoyance",
  "Small Commit Supremacy",
  "Cache Hit Celebration",
  "SLO Defender",
  "Incident Dodger",
  "Scope Creep Blocked",
  "Design Doc Enjoyer",
  "Architecture Brain",
  "Pairing Power-Up",
  "Async Mastery",
  "Promise Fulfilled",
  "Null Check Champion",
  "Git Rebase Acrobat",
  "No TODO Left Behind",
  "Legacy Tamer",
  "Monorepo Marathon",
  "Canary Whisperer",
  "Build Cache Blessing",
  "Memory Leak Hunter",
  "UX Polisher",
  "Product Sense +10",
  "Dark Mode Productivity",
  "No Pager Tonight",
  "Deadline Defused",
  "Tech Debt Dodged",
  "Regex Sorcery",
  "Bug Bash Berserk",
  "Commit Message Art",
  "Observability Online",
  "Telemetry Titan",
  "Rollback-Proof",
  "Refactor Without Fear",
  "Production Zen",
  "Localhost Legend",
  "Lint Rules Obeyed",
  "Code Review Charmer",
  "Coffee-Fueled Throughput",
  "No More Hotfixes",
  "Flame Graph Tamed",
  "A11y Ace",
  "Edge Case Exorcist",
  "Sprint Burndown Destroyer",
  "Feature Complete-ish",
  "One More Tiny Improvement",
  "No Regression Detected",
];

export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: "first_keystroke",
    title: "Hello, World",
    description: "Write your first line of code.",
    target: 1,
    value: (state) => state.totalClicks,
    unit: "clicks",
  },
  {
    id: "click_hustle",
    title: "Keyboard Warrior",
    description: "Reach 250 manual writes.",
    target: 250,
    value: (state) => state.totalClicks,
    unit: "clicks",
  },
  {
    id: "first_hire",
    title: "First Teammate",
    description: "Hire your first contributor.",
    target: 1,
    value: (state) => state.totalHires,
    unit: "hires",
  },
  {
    id: "team_builder",
    title: "Org Chart Growing",
    description: "Hire 20 contributors.",
    target: 20,
    value: (state) => state.totalHires,
    unit: "hires",
  },
  {
    id: "first_bugfix",
    title: "Bug Exorcist",
    description: "Fix 1 active bug.",
    target: 1,
    value: (state) => state.totalBugsFixed,
    unit: "bugs fixed",
  },
  {
    id: "bug_crusher",
    title: "Incident Commander",
    description: "Fix 40 bugs in one run.",
    target: 40,
    value: (state) => state.totalBugsFixed,
    unit: "bugs fixed",
  },
  {
    id: "revenue_first",
    title: "First Paying User",
    description: "Reach $500 lifetime revenue.",
    target: 500,
    value: (state) => state.lifetimeDollars,
    unit: "$",
  },
  {
    id: "revenue_scale",
    title: "PMF-ish",
    description: "Reach $50,000 lifetime revenue.",
    target: 50_000,
    value: (state) => state.lifetimeDollars,
    unit: "$",
  },
  {
    id: "upgrade_collector",
    title: "Tooling Addict",
    description: "Buy 15 different upgrades.",
    target: 15,
    value: (state) => getBoughtUpgradeCount(state),
    unit: "upgrades",
  },
  {
    id: "agent_org",
    title: "Agentic Org",
    description: "Hire 5 AI agents.",
    target: 5,
    value: (state) => state.aiAgents,
    unit: "agents",
  },
  {
    id: "ship_v1",
    title: "Ship v1.0",
    description: "Prestige once by releasing v1.0.",
    target: 1,
    value: (state) => state.totalPrestiges,
    unit: "releases",
  },
  {
    id: "rep_grind",
    title: "Known in the Industry",
    description: "Reach 25 reputation.",
    target: 25,
    value: (state) => state.reputation,
    unit: "rep",
  },
];

export function getBoughtUpgradeCount(state: GameState): number {
  return ACTIVE_UPGRADE_CATALOG.reduce((count, upgrade) => {
    return count + (getUpgradeLevel(state, upgrade.id) > 0 ? 1 : 0);
  }, 0);
}

function formatAchievementProgress(
  currentValue: number,
  targetValue: number,
): string {
  return `${Math.floor(currentValue).toLocaleString()}/${Math.floor(targetValue).toLocaleString()}`;
}

export function getAchievementStatus(
  achievement: (typeof ACHIEVEMENTS)[number],
  state: GameState,
) {
  const currentValue = Math.max(0, Number(achievement.value(state)) || 0);
  const progressValue = Math.min(achievement.target, currentValue);
  return {
    currentValue,
    progressValue,
    unlocked: currentValue >= achievement.target,
    label: formatAchievementProgress(progressValue, achievement.target),
  };
}

export function getCompanyStagePresentation(lifetimeDollars: number) {
  const safeDollars = Math.max(0, Number(lifetimeDollars) || 0);
  let currentIndex = 0;

  for (let index = 0; index < COMPANY_STAGES.length; index += 1) {
    if (safeDollars >= COMPANY_STAGES[index].minDollars) {
      currentIndex = index;
    }
  }

  const current = COMPANY_STAGES[currentIndex];
  const next =
    COMPANY_STAGES[Math.min(COMPANY_STAGES.length - 1, currentIndex + 1)];
  const range = Math.max(1, next.minDollars - current.minDollars);
  const progress =
    currentIndex >= COMPANY_STAGES.length - 1
      ? 1
      : Math.max(0, Math.min(1, (safeDollars - current.minDollars) / range));

  return {
    current,
    next,
    isMaxStage: currentIndex >= COMPANY_STAGES.length - 1,
    progress,
  };
}
