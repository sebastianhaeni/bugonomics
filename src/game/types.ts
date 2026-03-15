export type DeveloperLevel = "junior" | "mid" | "senior" | "architect";
export type SupportRole = "product" | "ux" | "sre";
export type TradeoffModeId =
  | "balanced"
  | "move_fast"
  | "enterprise"
  | "quality_sprint"
  | "rust_rewrite"
  | "js_rewrite";

export interface DeveloperConfig {
  label: string;
  hireCostLoc: number;
  locPerSecond: number;
}

export interface SupportRoleConfig {
  label: string;
  hireCostLoc: number;
}

export interface StrategicDebtItem {
  id: string;
  title: string;
  description: string;
  rewriteCostLoc: number;
  postponeDebtPenalty: number;
}

export interface UpgradeDefinition {
  id: string;
  name: string;
  category: string;
  costLoc: number;
  maxLevel: number;
  description: string;
  requires?: string[];
}

export interface PrestigeUpgradeDefinition {
  id: string;
  name: string;
  costReputation: number;
  maxLevel: number;
  description: string;
}

export interface RandomEventDefinition {
  id: string;
  name: string;
  description: string;
  durationMs: number;
  productionMultiplier?: number;
  lostDevCount?: number;
  triggerWeight?: number;
  minLifetimeLoc?: number;
  burstLoc?: number;
  locLossPercent?: number;
  locLossFlat?: number;
  debtDelta?: number;
  clearBugs?: number;
  addBugs?: number;
}

export interface TradeoffModeDefinition {
  id: TradeoffModeId;
  label: string;
  description: string;
}

export interface AbilityDefinition {
  id: string;
  label: string;
  description?: string;
  unlockUpgradeId: string;
  cooldownMs: number;
}

export interface ActiveBoost {
  expiresAt: number;
  multiplier: number;
  source: string;
}

export interface ClickAura {
  expiresAt: number;
  locPerSecond: number;
}

export interface ActiveEvent {
  id: string;
  name: string;
  description: string;
  expiresAt: number;
  productionMultiplier: number;
  lostDevCount: number;
}

export interface Bug {
  id: number;
  severity: number;
  title: string;
  createdAt: number;
}

export interface GameOverState {
  code: string;
  title: string;
  message: string;
  atMs: number;
}

export interface UnlockState {
  mid: boolean;
  senior: boolean;
  aiTokens: boolean;
  architect: boolean;
}

export type DeveloperRoster = Record<DeveloperLevel, number>;
export type SupportTeam = Record<SupportRole, number>;
export type NumericById = Record<string, number>;

export interface GameState {
  loc: number;
  lifetimeLoc: number;
  dollars: number;
  lifetimeDollars: number;
  aiAgents: number;
  aiTokens: number;
  developers: DeveloperRoster;
  supportTeam: SupportTeam;
  activeBoosts: ActiveBoost[];
  clickAuras: ClickAura[];
  activeEvents: ActiveEvent[];
  abilityCooldowns: NumericById;
  upgrades: NumericById;
  prestigeUpgrades: NumericById;
  unlocks: UnlockState;
  tradeoffMode: TradeoffModeId;
  reputation: number;
  gameOver: GameOverState | null;
  techDebtPoints: number;
  strategicDebt: StrategicDebtItem | null;
  strategicDebtProgressMs: number;
  bugs: Bug[];
  nextBugId: number;
  bugProgressMs: number;
  eventProgressMs: number;
  totalClicks: number;
  totalBugsFixed: number;
  totalHires: number;
  totalPrestiges: number;
  lastTickAt: number;
}

export type GameStateInput = Partial<GameState> & {
  developers?: Partial<DeveloperRoster>;
  supportTeam?: Partial<SupportTeam>;
  activeBoosts?: Partial<ActiveBoost>[];
  clickAuras?: Partial<ClickAura>[];
  activeEvents?: Partial<ActiveEvent>[];
  upgrades?: NumericById;
  prestigeUpgrades?: NumericById;
  abilityCooldowns?: NumericById;
  unlocks?: Partial<UnlockState>;
  gameOver?: Partial<GameOverState> | null;
  strategicDebt?: Partial<StrategicDebtItem> | null;
  bugs?: Partial<Bug>[];
};

export type GameAction =
  | { type: "CLICK"; bonusMultiplier?: number }
  | { type: "HIRE"; level: DeveloperLevel }
  | { type: "HIRE_SUPPORT"; role: SupportRole }
  | { type: "BUY_AI_TOKEN" }
  | { type: "ACTIVATE_AI_TOKEN" }
  | { type: "FIX_BUG"; bugId: number }
  | { type: "PAY_TECH_DEBT" }
  | { type: "RESOLVE_STRATEGIC_DEBT" }
  | { type: "POSTPONE_STRATEGIC_DEBT" }
  | { type: "BUY_UPGRADE"; upgradeId: string }
  | { type: "BUY_PRESTIGE_UPGRADE"; upgradeId: string }
  | { type: "USE_ABILITY"; abilityId: string }
  | { type: "SET_TRADEOFF_MODE"; modeId: TradeoffModeId }
  | { type: "PRESTIGE_RESET" };

export interface TickOptions {
  action?: GameAction | null;
  nowMs?: number;
  random?: () => number;
}

export interface BugRiskSummary {
  humanExpectedBugsPerMinute: number;
  aiExpectedBugsPerMinute: number;
  humanRandomChancePerSecond: number;
  aiRandomChancePerSecond: number;
}

export interface TechDebtStatus {
  bugCount: number;
  totalSeverity: number;
  bugPenalty: number;
  teamSize: number;
  progress: number;
  stage: string;
  willCollapse: boolean;
  techDebtPoints: number;
  structuralPenaltyMultiplier: number;
  hasStrategicDebt: boolean;
}

export type StorageLike = Pick<Storage, "getItem" | "setItem">;

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  target: number;
  value: (state: GameState) => number;
  unit: string;
}
