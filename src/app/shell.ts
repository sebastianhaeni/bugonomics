export interface ShellElements {
  dollars: HTMLElement;
  conversion: HTMLElement;
  locps: HTMLElement;
  output: HTMLElement;
  tokens: HTMLElement;
  bugs: HTMLElement;
  reputation: HTMLElement;
  lifetime: HTMLElement;
  upgrades: HTMLElement;
  companyEvolution: HTMLElement;
  companyStage: HTMLElement;
  companyNote: HTMLElement;
  companyFill: HTMLElement;
  comboMeter: HTMLElement;
  comboBursts: HTMLElement;
  developers: HTMLElement;
  upgradeShop: HTMLElement;
  upgradeOwned: HTMLElement;
  achievements: HTMLElement;
  upgradeLocked: HTMLElement;
  lockedSummary: HTMLElement;
  bugList: HTMLElement;
  eventList: HTMLElement;
  prestigeReset: HTMLButtonElement;
  restart: HTMLButtonElement;
  goalTarget: HTMLElement;
  goalProgress: HTMLElement;
  goalProgressFill: HTMLElement;
  goalReward: HTMLElement;
  prestigeUpgradeList: HTMLElement;
  tradeoffModes: HTMLElement;
  devBugRisk: HTMLElement;
  aiBugRisk: HTMLElement;
  techDebtRisk: HTMLElement;
  techDebtBugs: HTMLElement;
  techDebtMeta: HTMLElement;
  techDebtFill: HTMLElement;
  repairTechDebt: HTMLButtonElement;
  strategicDebtBox: HTMLElement;
  strategicDebtTitle: HTMLElement;
  strategicDebtDescription: HTMLElement;
  locVisual: HTMLElement;
  locBursts: HTMLElement;
  clickPrimaryWrap: HTMLElement;
  teamVisual: HTMLElement;
  codeBackground: HTMLElement;
  gameOverOverlay: HTMLElement;
  gameOverTitle: HTMLElement;
  gameOverMessage: HTMLElement;
  mobileNav: HTMLElement;
  mobileNavPlayBadge: HTMLElement;
  mobileNavOpsBadge: HTMLElement;
  mobileNavTeamBadge: HTMLElement;
  mobileNavShopBadge: HTMLElement;
  mobileNavReleaseBadge: HTMLElement;
  shell: HTMLElement;
}

export interface ShellButtons {
  click: HTMLButtonElement;
  strategicRewrite: HTMLButtonElement;
  strategicPostpone: HTMLButtonElement;
  gameOverRestart: HTMLButtonElement;
}

export interface StatCards {
  dollars: HTMLElement;
  conversion: HTMLElement;
  locps: HTMLElement;
  output: HTMLElement;
  upgrades: HTMLElement;
  ai: HTMLElement;
  bugs: HTMLElement;
  reputation: HTMLElement;
  lifetime: HTMLElement;
}

function mustQuery<T extends Element>(root: ParentNode, selector: string): T {
  const node = root.querySelector<T>(selector);
  if (!node) {
    throw new Error(`Missing required node: ${selector}`);
  }
  return node;
}

export function mountGameShell(appRoot: Element): {
  elements: ShellElements;
  buttons: ShellButtons;
  statCards: StatCards;
} {
  appRoot.innerHTML = `
    <main class="game-shell">
      <section class="game-over-overlay" data-ui="game-over-overlay" hidden>
        <div class="game-over-card">
          <h2 data-ui="game-over-title">Game Over</h2>
          <p data-ui="game-over-message"></p>
          <button data-ui="game-over-restart-btn">Restart Run</button>
        </div>
      </section>
      <div class="code-background" data-ui="code-background" aria-hidden="true"></div>
      <div class="dashboard">
        <section class="main-column">
          <section class="hero tile-hero" data-ui="hero">
            <h1>Bugonomics</h1>
            <p class="subtitle">Click hard, automate harder, ship fastest.</p>
            <div class="company-evolution" data-ui="company-evolution">
              <div class="company-head">
                <span>Company</span>
                <strong data-ui="company-stage">Garage</strong>
              </div>
              <p data-ui="company-note">Two laptops, one dream.</p>
              <div class="company-progress" aria-hidden="true">
                <span data-ui="company-fill"></span>
              </div>
            </div>
            <div class="click-primary-wrap">
              <button class="click-primary" data-ui="click-btn">Write line of code</button>
              <div class="hint-popover" role="note">Tip: type on your keyboard to write LOC too.</div>
              <p class="combo-meter" data-ui="combo-meter">Flow x0</p>
              <div class="combo-bursts" data-ui="combo-bursts"></div>
            </div>
            <div class="loc-visual-wrap">
              <div class="loc-visual" data-ui="loc-visual"></div>
              <div class="loc-bursts" data-ui="loc-bursts"></div>
            </div>
            <div class="team-visual" data-ui="team-visual"></div>
          </section>

          <section class="actions panel tile-actions">
            <div class="strategy-picker">
              <h2>Strategy</h2>
              <div class="strategy-modes" data-ui="tradeoff-select" role="tablist" aria-label="Strategy"></div>
            </div>
            <div class="risk-readout">
              <p data-ui="dev-bug-risk">Developer bug risk: -</p>
              <p data-ui="ai-bug-risk">AI agent bug risk: -</p>
            </div>
          </section>

          <section class="panel tile-devs">
            <h2>Hiring</h2>
            <div class="developers" data-ui="developers"></div>
          </section>

          <section class="panel tile-shop">
            <h2>Upgrades To Buy</h2>
            <div class="upgrades" data-ui="upgrade-shop-list"></div>
            <details class="locked-upgrades" data-ui="locked-upgrades">
              <summary>Show locked/not-yet-buyable upgrades</summary>
              <div class="upgrades" data-ui="upgrade-locked-list"></div>
            </details>
          </section>

          <section class="panel tile-utility">
            <section class="strategic-debt" data-ui="strategic-debt-box" hidden>
              <h2>Strategic Tech Debt</h2>
              <p data-ui="strategic-debt-title">-</p>
              <p data-ui="strategic-debt-description">-</p>
              <div class="strategic-actions">
                <button data-ui="strategic-rewrite-btn">Rewrite Now</button>
                <button data-ui="strategic-postpone-btn">Postpone</button>
              </div>
            </section>

            <section class="goal-panel">
              <h2>Release Goal</h2>
              <p class="status-line" data-ui="release-goal-target">Release Version 1.0 at 0 lifetime LOC.</p>
              <div class="goal-progress" aria-hidden="true">
                <span data-ui="release-goal-progress-fill"></span>
              </div>
              <p class="status-line" data-ui="release-goal-progress">0 / 0 LOC</p>
              <p class="status-line" data-ui="release-goal-reward">Reputation on release: +0</p>
              <div class="prestige-actions">
                <button data-ui="prestige-reset-btn">Release Version 1.0 (Reset for Reputation)</button>
                <button data-ui="restart-btn">Restart Run</button>
              </div>
            </section>
            <details class="collapsible">
              <summary>Reputation Upgrades</summary>
              <div class="prestige-upgrades" data-ui="prestige-upgrade-list"></div>
            </details>
            <details class="collapsible">
              <summary>Achievements</summary>
              <ul class="achievements" data-ui="achievement-list"></ul>
            </details>
          </section>
        </section>

        <aside class="side-column sticky-panel">
          <section class="panel stats tile-stats" data-ui="stats">
            <div data-ui="stat-card-dollars"><span>$</span><strong data-ui="dollars-value">0</strong></div>
            <div data-ui="stat-card-lifetime"><span>Lifetime LOC</span><strong data-ui="lifetime-value">0</strong></div>
            <div data-ui="stat-card-upgrades"><span>Upgrades</span><strong data-ui="upgrades-value">0 / 0</strong></div>
            <div data-ui="stat-card-locps"><span>LOC / sec</span><strong data-ui="locps-value">0</strong></div>
            <div data-ui="stat-card-conversion"><span>$ / LOC</span><strong data-ui="conversion-value">0</strong></div>
            <div data-ui="stat-card-output"><span>Output</span><strong data-ui="output-value">x1.00</strong></div>
            <div data-ui="stat-card-ai"><span>AI agents</span><strong data-ui="tokens-value">0</strong></div>
            <div data-ui="stat-card-bugs"><span>Active bugs</span><strong data-ui="bugs-value">0</strong></div>
            <div data-ui="stat-card-reputation"><span>Reputation</span><strong data-ui="reputation-value">0</strong></div>
          </section>

          <section class="panel tile-debt">
            <h2>Tech Debt Meter</h2>
            <div class="risk-readout risk-readout-prominent">
              <p data-ui="tech-debt-risk">Tech debt risk: -</p>
              <p data-ui="tech-debt-bugs">Bugs: -</p>
              <p data-ui="tech-debt-meta">Structural debt: -</p>
              <div class="debt-bar debt-bar-prominent" aria-hidden="true">
                <span data-ui="tech-debt-fill"></span>
              </div>
              <button data-ui="repair-tech-debt-btn">Refactor Debt</button>
            </div>
          </section>

          <section class="panel tile-bugs">
            <h2>Bugs</h2>
            <ul class="bugs" data-ui="bug-list"></ul>
          </section>

          <section class="panel tile-events">
            <h2>Random Events</h2>
            <ul class="events" data-ui="event-list"></ul>
          </section>

          <section class="panel tile-owned">
            <h2>Owned Upgrades</h2>
            <div class="upgrades" data-ui="upgrade-owned-list"></div>
          </section>
        </aside>
      </div>
      <nav class="mobile-nav" data-ui="mobile-nav" aria-label="Game sections">
        <button type="button" class="mobile-nav-btn is-active" data-screen-id="play" data-ui="mobile-nav-play">
          <span class="mobile-nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path d="M4 7l5 5-5 5" />
              <path d="M13 17h7" />
            </svg>
          </span>
          <span class="mobile-nav-label">Code</span>
          <span class="mobile-nav-badge" data-ui="mobile-nav-play-badge" hidden>0</span>
        </button>
        <button type="button" class="mobile-nav-btn" data-screen-id="ops" data-ui="mobile-nav-ops">
          <span class="mobile-nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path d="M12 3l7 3v5c0 5-3.1 8.4-7 10-3.9-1.6-7-5-7-10V6l7-3z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </span>
          <span class="mobile-nav-label">Ops</span>
          <span class="mobile-nav-badge" data-ui="mobile-nav-ops-badge" hidden>0</span>
        </button>
        <button type="button" class="mobile-nav-btn" data-screen-id="team" data-ui="mobile-nav-team">
          <span class="mobile-nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path d="M16 11a3 3 0 100-6 3 3 0 000 6z" />
              <path d="M8 12a4 4 0 100-8 4 4 0 000 8z" />
              <path d="M2.5 19a5.5 5.5 0 0111 0" />
              <path d="M13 18a4.5 4.5 0 018.5 1" />
            </svg>
          </span>
          <span class="mobile-nav-label">Team</span>
          <span class="mobile-nav-badge" data-ui="mobile-nav-team-badge" hidden>0</span>
        </button>
        <button type="button" class="mobile-nav-btn" data-screen-id="shop" data-ui="mobile-nav-shop">
          <span class="mobile-nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path d="M4 6h15l-1.5 8.5H7L4 6z" />
              <path d="M9 6l1-2h4l1 2" />
              <path d="M9 18a1.25 1.25 0 100 2.5A1.25 1.25 0 009 18z" />
              <path d="M16 18a1.25 1.25 0 100 2.5A1.25 1.25 0 0016 18z" />
            </svg>
          </span>
          <span class="mobile-nav-label">Shop</span>
          <span class="mobile-nav-badge" data-ui="mobile-nav-shop-badge" hidden>0</span>
        </button>
        <button type="button" class="mobile-nav-btn" data-screen-id="release" data-ui="mobile-nav-release">
          <span class="mobile-nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path d="M12 3c4.5 0 7 4.1 7 8.5-3.4 0-5.8.9-8 3.1-1.4 1.4-2.2 3-2.8 5.4L6 18c.8-3.6 1.4-5.2 3-6.8 2.2-2.2 4.6-3.1 10-3.2" />
              <path d="M9 15l-3 3" />
              <path d="M13 11l3-3" />
            </svg>
          </span>
          <span class="mobile-nav-label">Release</span>
          <span class="mobile-nav-badge" data-ui="mobile-nav-release-badge" hidden>0</span>
        </button>
      </nav>
    </main>
  `;

  const elements: ShellElements = {
    dollars: mustQuery(appRoot, '[data-ui="dollars-value"]'),
    conversion: mustQuery(appRoot, '[data-ui="conversion-value"]'),
    locps: mustQuery(appRoot, '[data-ui="locps-value"]'),
    output: mustQuery(appRoot, '[data-ui="output-value"]'),
    tokens: mustQuery(appRoot, '[data-ui="tokens-value"]'),
    bugs: mustQuery(appRoot, '[data-ui="bugs-value"]'),
    reputation: mustQuery(appRoot, '[data-ui="reputation-value"]'),
    lifetime: mustQuery(appRoot, '[data-ui="lifetime-value"]'),
    upgrades: mustQuery(appRoot, '[data-ui="upgrades-value"]'),
    companyEvolution: mustQuery(appRoot, '[data-ui="company-evolution"]'),
    companyStage: mustQuery(appRoot, '[data-ui="company-stage"]'),
    companyNote: mustQuery(appRoot, '[data-ui="company-note"]'),
    companyFill: mustQuery(appRoot, '[data-ui="company-fill"]'),
    comboMeter: mustQuery(appRoot, '[data-ui="combo-meter"]'),
    comboBursts: mustQuery(appRoot, '[data-ui="combo-bursts"]'),
    developers: mustQuery(appRoot, '[data-ui="developers"]'),
    upgradeShop: mustQuery(appRoot, '[data-ui="upgrade-shop-list"]'),
    upgradeOwned: mustQuery(appRoot, '[data-ui="upgrade-owned-list"]'),
    achievements: mustQuery(appRoot, '[data-ui="achievement-list"]'),
    upgradeLocked: mustQuery(appRoot, '[data-ui="upgrade-locked-list"]'),
    lockedSummary: mustQuery(appRoot, '[data-ui="locked-upgrades"] summary'),
    bugList: mustQuery(appRoot, '[data-ui="bug-list"]'),
    eventList: mustQuery(appRoot, '[data-ui="event-list"]'),
    prestigeReset: mustQuery(appRoot, '[data-ui="prestige-reset-btn"]'),
    restart: mustQuery(appRoot, '[data-ui="restart-btn"]'),
    goalTarget: mustQuery(appRoot, '[data-ui="release-goal-target"]'),
    goalProgress: mustQuery(appRoot, '[data-ui="release-goal-progress"]'),
    goalProgressFill: mustQuery(
      appRoot,
      '[data-ui="release-goal-progress-fill"]',
    ),
    goalReward: mustQuery(appRoot, '[data-ui="release-goal-reward"]'),
    prestigeUpgradeList: mustQuery(
      appRoot,
      '[data-ui="prestige-upgrade-list"]',
    ),
    tradeoffModes: mustQuery(appRoot, '[data-ui="tradeoff-select"]'),
    devBugRisk: mustQuery(appRoot, '[data-ui="dev-bug-risk"]'),
    aiBugRisk: mustQuery(appRoot, '[data-ui="ai-bug-risk"]'),
    techDebtRisk: mustQuery(appRoot, '[data-ui="tech-debt-risk"]'),
    techDebtBugs: mustQuery(appRoot, '[data-ui="tech-debt-bugs"]'),
    techDebtMeta: mustQuery(appRoot, '[data-ui="tech-debt-meta"]'),
    techDebtFill: mustQuery(appRoot, '[data-ui="tech-debt-fill"]'),
    repairTechDebt: mustQuery(appRoot, '[data-ui="repair-tech-debt-btn"]'),
    strategicDebtBox: mustQuery(appRoot, '[data-ui="strategic-debt-box"]'),
    strategicDebtTitle: mustQuery(appRoot, '[data-ui="strategic-debt-title"]'),
    strategicDebtDescription: mustQuery(
      appRoot,
      '[data-ui="strategic-debt-description"]',
    ),
    locVisual: mustQuery(appRoot, '[data-ui="loc-visual"]'),
    locBursts: mustQuery(appRoot, '[data-ui="loc-bursts"]'),
    clickPrimaryWrap: mustQuery(appRoot, ".click-primary-wrap"),
    teamVisual: mustQuery(appRoot, '[data-ui="team-visual"]'),
    codeBackground: mustQuery(appRoot, '[data-ui="code-background"]'),
    gameOverOverlay: mustQuery(appRoot, '[data-ui="game-over-overlay"]'),
    gameOverTitle: mustQuery(appRoot, '[data-ui="game-over-title"]'),
    gameOverMessage: mustQuery(appRoot, '[data-ui="game-over-message"]'),
    mobileNav: mustQuery(appRoot, '[data-ui="mobile-nav"]'),
    mobileNavPlayBadge: mustQuery(appRoot, '[data-ui="mobile-nav-play-badge"]'),
    mobileNavOpsBadge: mustQuery(appRoot, '[data-ui="mobile-nav-ops-badge"]'),
    mobileNavTeamBadge: mustQuery(appRoot, '[data-ui="mobile-nav-team-badge"]'),
    mobileNavShopBadge: mustQuery(appRoot, '[data-ui="mobile-nav-shop-badge"]'),
    mobileNavReleaseBadge: mustQuery(
      appRoot,
      '[data-ui="mobile-nav-release-badge"]',
    ),
    shell: mustQuery(appRoot, ".game-shell"),
  };

  const buttons: ShellButtons = {
    click: mustQuery(appRoot, '[data-ui="click-btn"]'),
    strategicRewrite: mustQuery(appRoot, '[data-ui="strategic-rewrite-btn"]'),
    strategicPostpone: mustQuery(appRoot, '[data-ui="strategic-postpone-btn"]'),
    gameOverRestart: mustQuery(appRoot, '[data-ui="game-over-restart-btn"]'),
  };

  const statCards: StatCards = {
    dollars: mustQuery(appRoot, '[data-ui="stat-card-dollars"]'),
    conversion: mustQuery(appRoot, '[data-ui="stat-card-conversion"]'),
    locps: mustQuery(appRoot, '[data-ui="stat-card-locps"]'),
    output: mustQuery(appRoot, '[data-ui="stat-card-output"]'),
    upgrades: mustQuery(appRoot, '[data-ui="stat-card-upgrades"]'),
    ai: mustQuery(appRoot, '[data-ui="stat-card-ai"]'),
    bugs: mustQuery(appRoot, '[data-ui="stat-card-bugs"]'),
    reputation: mustQuery(appRoot, '[data-ui="stat-card-reputation"]'),
    lifetime: mustQuery(appRoot, '[data-ui="stat-card-lifetime"]'),
  };

  return { elements, buttons, statCards };
}
