// @vitest-environment jsdom

import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { createCodeBackgroundController } from "../src/app/codeBackgroundController.js";
import { requiredChild, createPlaceholder } from "../src/app/domHelpers.js";
import { createGameRenderer } from "../src/app/gameRenderer.js";
import { createManagementPanelsController } from "../src/app/managementPanelsController.js";
import { createManualWriteController } from "../src/app/manualWriteController.js";
import { registerServiceWorker } from "../src/app/registerServiceWorker.js";
import { mountGameShell } from "../src/app/shell.js";
import {
  createInitialState,
  getPrestigeGain,
  getPrestigeLocThreshold,
  getReleaseVersion,
  normalizeState,
} from "../src/game/engine.js";
import type { GameAction, GameState } from "../src/game/types.js";

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

function mount() {
  const app = document.querySelector("#app");
  if (!(app instanceof HTMLElement)) {
    throw new Error("Missing app root");
  }
  return mountGameShell(app);
}

function createState(overrides: Partial<GameState> = {}, nowMs = 10_000): GameState {
  return normalizeState(
    {
      ...createInitialState(nowMs),
      ...overrides,
    },
    nowMs,
  );
}

test("dom helpers find required elements and create placeholders", () => {
  const root = document.createElement("div");
  root.innerHTML = '<span class="target">ok</span>';

  expect(requiredChild(root, ".target").textContent).toBe("ok");
  expect(() => requiredChild(root, ".missing")).toThrow(
    "Missing required child: .missing",
  );

  const placeholder = createPlaceholder("Nothing here");
  expect(placeholder.className).toBe("placeholder");
  expect(placeholder.textContent).toBe("Nothing here");
});

test("mountGameShell builds the expected UI hooks", () => {
  const { elements, buttons, statCards } = mount();

  expect(elements.companyStage.textContent).toBe("Garage");
  expect(buttons.click.textContent).toContain("Write line of code");
  expect(statCards.dollars.getAttribute("data-ui")).toBe("stat-card-dollars");
  expect(document.querySelectorAll("[data-ui]").length).toBeGreaterThan(30);
});

test("mountGameShell throws when the root is missing required nodes", () => {
  const root = document.createElement("div");

  expect(() => mountGameShell(root)).not.toThrow();
});

test("manual write controller dispatches clicks, renders combo state, and resets", () => {
  vi.useFakeTimers();
  vi.spyOn(Date, "now").mockReturnValue(1_000);
  vi.spyOn(Math, "random").mockReturnValue(0.5);
  const dispatchAction = vi.fn<(action: GameAction) => void>();
  const ensureAudioStarted = vi.fn();
  const startMusic = vi.fn();
  const clickButton = document.createElement("button");
  const comboMeter = document.createElement("p");
  const comboBursts = document.createElement("div");
  const locBursts = document.createElement("div");
  const shell = document.createElement("div");
  const controller = createManualWriteController({
    clickButton,
    comboMeter,
    comboBursts,
    locBursts,
    shell,
    ensureAudioStarted,
    startMusic,
    isGameOver: () => false,
    getState: () => createInitialState(1_000),
    getClickLocGain: () => 10,
    dispatchAction,
  });

  controller.performManualWrite(["Combo"]);

  expect(ensureAudioStarted).toHaveBeenCalled();
  expect(startMusic).toHaveBeenCalled();
  expect(dispatchAction).toHaveBeenCalledWith({
    type: "CLICK",
    bonusMultiplier: 1,
  });
  expect(comboMeter.textContent).toBe("Flow x1");
  expect(locBursts.textContent).toContain("+10.0 LOC");

  for (let index = 0; index < 7; index += 1) {
    vi.spyOn(Date, "now").mockReturnValue(1_000 + index + 1);
    controller.performManualWrite(["Combo"]);
  }

  expect(comboMeter.classList.contains("is-hot")).toBe(true);
  expect(controller.getFlowMultiplierForNextWrite()).toBeGreaterThan(1);
  controller.renderFocusTunnel(1_008);
  expect(shell.classList.contains("focus-tunnel")).toBe(true);

  controller.expireFlowIfNeeded(4_000);
  expect(comboMeter.textContent).toBe("Flow x0");

  controller.reset();
  expect(comboBursts.childElementCount).toBe(0);
  expect(shell.classList.contains("focus-tunnel")).toBe(false);
});

test("manual write controller ignores writes after game over", () => {
  const dispatchAction = vi.fn();
  const controller = createManualWriteController({
    clickButton: document.createElement("button"),
    comboMeter: document.createElement("p"),
    comboBursts: document.createElement("div"),
    locBursts: document.createElement("div"),
    shell: document.createElement("div"),
    ensureAudioStarted: vi.fn(),
    startMusic: vi.fn(),
    isGameOver: () => true,
    getState: () => createInitialState(),
    getClickLocGain: () => 5,
    dispatchAction,
  });

  controller.performManualWrite(["Ignored"]);

  expect(dispatchAction).not.toHaveBeenCalled();
});

test("code background controller animates text and resets cleanly", () => {
  vi.spyOn(Math, "random").mockReturnValue(0);
  const container = document.createElement("div");
  let frameCallback: FrameRequestCallback | null = null;
  const controller = createCodeBackgroundController({
    container,
    windowObject: {
      requestAnimationFrame(callback: FrameRequestCallback) {
        frameCallback = callback;
        return 1;
      },
    } as Window & typeof globalThis,
  });

  controller.init();
  controller.setSpeed(200);
  const firstFrame = frameCallback as FrameRequestCallback | null;
  if (firstFrame) {
    firstFrame(100);
  }
  const secondFrame = frameCallback as FrameRequestCallback | null;
  if (secondFrame) {
    secondFrame(220);
  }

  expect(container.querySelector(".code-background-line")).not.toBeNull();
  expect(container.textContent).not.toBe("");

  controller.reset();
  expect(container.childElementCount).toBe(0);
});

test("management panels controller initializes panels, renders data, and dispatches clicks", () => {
  const { elements } = mount();
  const actions: GameAction[] = [];
  let state = createState({
    dollars: 100_000,
    lifetimeLoc: 15_000,
    totalClicks: 250,
    developers: { junior: 1, mid: 1, senior: 0, architect: 0 },
    supportTeam: { product: 1, ux: 1, sre: 1 },
    upgrades: {
      better_keyboard: 1,
      unlock_mid_developers: 1,
      unlock_bug_bash: 1,
    },
    prestigeUpgrades: {
      engineering_culture: 1,
    },
    reputation: 50,
    bugs: [{ id: 1, severity: 0.2, title: "Bug", createdAt: 1 }],
    activeEvents: [
      {
        id: "sale",
        name: "Sale",
        description: "Revenue spike",
        expiresAt: 11_000,
        productionMultiplier: 1,
        lostDevCount: 0,
      },
    ],
  });

  const controller = createManagementPanelsController({
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
    applyAction: (action) => {
      actions.push(action);
    },
    getPrestigeGain,
    getPrestigeLocThreshold,
    getReleaseVersion,
  });

  controller.init();
  controller.render(state, 10_500);

  expect(elements.developers.children.length).toBeGreaterThan(5);
  expect(elements.achievements.children.length).toBeGreaterThan(5);
  expect(elements.goalTarget.textContent).toContain("Release Version");
  expect(elements.bugList.textContent).toContain("Bug");
  expect(elements.eventList.textContent).toContain("Sale");
  expect(elements.upgradeOwned.textContent).toContain("Better Keyboard");

  requiredChild<HTMLButtonElement>(elements.developers, '[data-ui="hire-junior-btn"]').click();
  requiredChild<HTMLButtonElement>(elements.developers, '[data-ui="buy-token-btn"]').click();
  requiredChild<HTMLButtonElement>(elements.developers, '[data-ui="hire-product-btn"]').click();
  requiredChild<HTMLButtonElement>(elements.bugList, '[data-ui="fix-bug-1"]').click();

  const shopUpgradeButton = elements.upgradeShop.querySelector<HTMLButtonElement>(
    "button[data-upgrade-id]",
  );
  shopUpgradeButton?.click();
  const prestigeButton = elements.prestigeUpgradeList.querySelector<HTMLButtonElement>(
    "button[data-prestige-upgrade-id]",
  );
  prestigeButton?.click();

  expect(actions).toContainEqual({ type: "HIRE", level: "junior" });
  expect(actions).toContainEqual({ type: "BUY_AI_TOKEN" });
  expect(actions).toContainEqual({ type: "HIRE_SUPPORT", role: "product" });
  expect(actions).toContainEqual({ type: "FIX_BUG", bugId: 1 });
  expect(actions.some((action) => action.type === "BUY_UPGRADE")).toBe(true);
  expect(actions.some((action) => action.type === "BUY_PRESTIGE_UPGRADE")).toBe(
    true,
  );

  state = createState();
  controller.render(state, 12_000);
  expect(elements.bugList.textContent).toContain("No active bugs");
  expect(elements.eventList.textContent).toContain("No active events");
});

test("game renderer initializes visuals and renders strategic debt and game over states", () => {
  vi.spyOn(Date, "now").mockReturnValue(20_000);
  const { elements, buttons, statCards } = mount();
  const audio = {
    maybePlayGameOverSfx: vi.fn(),
    setMusicRunning: vi.fn(),
    setThreatLevel: vi.fn(),
  };
  const codeBackground = {
    init: vi.fn(),
    setSpeed: vi.fn(),
  };
  const manualWrite = {
    expireFlowIfNeeded: vi.fn(),
    getFlowMultiplierForNextWrite: vi.fn(() => 1.2),
    renderCombo: vi.fn(),
    renderFocusTunnel: vi.fn(),
  };
  const managementPanels = {
    init: vi.fn(),
    render: vi.fn(),
    getTotalUpgradeCount: vi.fn(() => 10),
  };
  const applyAction = vi.fn();
  const renderer = createGameRenderer({
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

  renderer.init();
  expect(codeBackground.init).toHaveBeenCalled();
  expect(managementPanels.init).toHaveBeenCalled();
  expect(elements.tradeoffModes.children.length).toBeGreaterThan(1);
  expect(elements.locVisual.children.length).toBe(84);
  expect(elements.teamVisual.children.length).toBe(8);

  const state = createState({
    dollars: 500,
    lifetimeDollars: 1_000,
    lifetimeLoc: 2_500,
    aiAgents: 3,
    aiTokens: 3,
    developers: { junior: 2, mid: 1, senior: 1, architect: 0 },
    supportTeam: { product: 1, ux: 1, sre: 1 },
    totalClicks: 3,
    bugs: [{ id: 1, severity: 0.3, title: "Bug", createdAt: 1 }],
    techDebtPoints: 800,
    strategicDebt: {
      id: "rewrite",
      title: "Rewrite Decision",
      description: "Choose now",
      rewriteCostLoc: 120,
      postponeDebtPenalty: 60,
    },
    gameOver: {
      code: "oops",
      title: "Collapse",
      message: "Everything broke",
      atMs: 10,
    },
  });

  renderer.render(state);

  expect(audio.setMusicRunning).toHaveBeenCalledWith(false);
  expect(codeBackground.setSpeed).toHaveBeenCalled();
  expect(buttons.click.textContent).toContain("Write line of code");
  expect(elements.companyStage.textContent).not.toBe("");
  expect(elements.strategicDebtBox.hidden).toBe(false);
  expect(elements.gameOverOverlay.hidden).toBe(false);
  expect(elements.gameOverMessage.textContent).toBe("Everything broke");
  expect(managementPanels.render).toHaveBeenCalledWith(state, 20_000);
  expect(audio.maybePlayGameOverSfx).toHaveBeenCalledWith(state);

  renderer.render({
    ...state,
    gameOver: null,
    strategicDebt: null,
  });
  expect(elements.strategicDebtBox.hidden).toBe(true);
});

test("game renderer auto-postpones strategic debt after urgency timeout", () => {
  const { elements, buttons, statCards } = mount();
  const applyAction = vi.fn();
  const renderer = createGameRenderer({
    buttons,
    elements,
    statCards,
    audio: {
      maybePlayGameOverSfx: vi.fn(),
      setMusicRunning: vi.fn(),
      setThreatLevel: vi.fn(),
    },
    codeBackground: { init: vi.fn(), setSpeed: vi.fn() },
    manualWrite: {
      expireFlowIfNeeded: vi.fn(),
      getFlowMultiplierForNextWrite: vi.fn(() => 1),
      renderCombo: vi.fn(),
      renderFocusTunnel: vi.fn(),
    },
    managementPanels: {
      init: vi.fn(),
      render: vi.fn(),
      getTotalUpgradeCount: vi.fn(() => 1),
    },
    applyAction,
    requiredChild,
  });

  renderer.init();
  vi.spyOn(Date, "now").mockReturnValue(40_000);
  renderer.render(
    createState({
      strategicDebt: {
        id: "rewrite",
        title: "Rewrite",
        description: "Do it",
        rewriteCostLoc: 200,
        postponeDebtPenalty: 80,
      },
    }),
  );
  vi.spyOn(Date, "now").mockReturnValue(56_000);
  renderer.render(
    createState({
      strategicDebt: {
        id: "rewrite",
        title: "Rewrite",
        description: "Do it",
        rewriteCostLoc: 200,
        postponeDebtPenalty: 80,
      },
    }),
  );

  expect(applyAction).toHaveBeenCalledWith({ type: "POSTPONE_STRATEGIC_DEBT" });
});

test("registerServiceWorker exits quietly when not supported", () => {
  const addEventListener = vi.fn();

  registerServiceWorker({
    navigator: {},
    addEventListener,
  } as unknown as Window & typeof globalThis);

  expect(addEventListener).not.toHaveBeenCalled();
});

test("registerServiceWorker registers the service worker in production", async () => {
  vi.stubEnv("PROD", true);
  const register = vi.fn().mockResolvedValue(undefined);
  let loadHandler: (() => void) | undefined;

  registerServiceWorker({
    navigator: {
      serviceWorker: { register },
    },
    addEventListener(event: string, handler: () => void) {
      if (event === "load") {
        loadHandler = handler;
      }
    },
  } as unknown as Window & typeof globalThis);

  expect(loadHandler).toBeDefined();
  loadHandler?.();
  await Promise.resolve();

  expect(register).toHaveBeenCalledTimes(1);
});

test("registerServiceWorker logs registration failures", async () => {
  vi.stubEnv("PROD", true);
  const error = new Error("nope");
  const register = vi.fn().mockRejectedValue(error);
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  let loadHandler: (() => void) | undefined;

  registerServiceWorker({
    navigator: {
      serviceWorker: { register },
    },
    addEventListener(event: string, handler: () => void) {
      if (event === "load") {
        loadHandler = handler;
      }
    },
  } as unknown as Window & typeof globalThis);

  loadHandler?.();
  await Promise.resolve();

  expect(consoleError).toHaveBeenCalledWith(
    "Service worker registration failed",
    error,
  );
});
