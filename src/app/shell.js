export function mountGameShell(appRoot) {
  appRoot.innerHTML = `
    <main class="game-shell">
      <section class="game-over-overlay" data-cy="game-over-overlay" hidden>
        <div class="game-over-card">
          <h2 data-cy="game-over-title">Game Over</h2>
          <p data-cy="game-over-message"></p>
          <button data-cy="game-over-restart-btn">Restart Run</button>
        </div>
      </section>
      <div class="code-background" data-cy="code-background" aria-hidden="true"></div>
      <div class="dashboard">
        <section class="main-column">
          <section class="hero tile-hero" data-cy="hero">
            <h1>Bugonomics</h1>
            <p class="subtitle">Click hard, automate harder, ship fastest.</p>
            <div class="company-evolution" data-cy="company-evolution">
              <div class="company-head">
                <span>Company</span>
                <strong data-cy="company-stage">Garage</strong>
              </div>
              <p data-cy="company-note">Two laptops, one dream.</p>
              <div class="company-progress" aria-hidden="true">
                <span data-cy="company-fill"></span>
              </div>
            </div>
            <div class="click-primary-wrap">
              <button class="click-primary" data-cy="click-btn">Write line of code</button>
              <div class="hint-popover" role="note">Tip: type on your keyboard to write LOC too.</div>
              <p class="combo-meter" data-cy="combo-meter">Flow x0</p>
              <div class="combo-bursts" data-cy="combo-bursts"></div>
            </div>
            <div class="loc-visual-wrap">
              <div class="loc-visual" data-cy="loc-visual"></div>
              <div class="loc-bursts" data-cy="loc-bursts"></div>
            </div>
            <div class="team-visual" data-cy="team-visual"></div>
          </section>

          <section class="actions panel tile-actions">
            <div class="strategy-picker">
              <h2>Strategy</h2>
              <div class="strategy-modes" data-cy="tradeoff-select" role="tablist" aria-label="Strategy"></div>
            </div>
            <div class="risk-readout">
              <p data-cy="dev-bug-risk">Developer bug risk: -</p>
              <p data-cy="ai-bug-risk">AI agent bug risk: -</p>
            </div>
          </section>

          <section class="panel tile-devs">
            <h2>Hiring</h2>
            <div class="developers" data-cy="developers"></div>
          </section>

          <section class="panel tile-shop">
            <h2>Upgrades To Buy</h2>
            <div class="upgrades" data-cy="upgrade-shop-list"></div>
            <details class="locked-upgrades" data-cy="locked-upgrades">
              <summary>Show locked/not-yet-buyable upgrades</summary>
              <div class="upgrades" data-cy="upgrade-locked-list"></div>
            </details>
          </section>

          <section class="panel tile-utility">
            <section class="strategic-debt" data-cy="strategic-debt-box" hidden>
              <h2>Strategic Tech Debt</h2>
              <p data-cy="strategic-debt-title">-</p>
              <p data-cy="strategic-debt-description">-</p>
              <div class="strategic-actions">
                <button data-cy="strategic-rewrite-btn">Rewrite Now</button>
                <button data-cy="strategic-postpone-btn">Postpone</button>
              </div>
            </section>

            <section class="goal-panel">
              <h2>Release Goal</h2>
              <p class="status-line" data-cy="release-goal-target">Release Version 1.0 at 0 lifetime LOC.</p>
              <p class="status-line" data-cy="release-goal-progress">Progress: 0%</p>
              <p class="status-line" data-cy="release-goal-reward">Reputation on release: +0</p>
              <div class="prestige-actions">
                <button data-cy="prestige-reset-btn">Release Version 1.0 (Reset for Reputation)</button>
                <button data-cy="restart-btn">Restart Run</button>
              </div>
            </section>
            <details class="collapsible">
              <summary>Reputation Upgrades</summary>
              <div class="prestige-upgrades" data-cy="prestige-upgrade-list"></div>
            </details>
            <details class="collapsible">
              <summary>Achievements</summary>
              <ul class="achievements" data-cy="achievement-list"></ul>
            </details>
          </section>
        </section>

        <aside class="side-column sticky-panel">
          <section class="panel stats tile-stats" data-cy="stats">
            <div data-cy="stat-card-dollars"><span>$</span><strong data-cy="dollars-value">0</strong></div>
            <div data-cy="stat-card-lifetime"><span>Lifetime LOC</span><strong data-cy="lifetime-value">0</strong></div>
            <div data-cy="stat-card-upgrades"><span>Upgrades</span><strong data-cy="upgrades-value">0 / 0</strong></div>
            <div data-cy="stat-card-locps"><span>LOC / sec</span><strong data-cy="locps-value">0</strong></div>
            <div data-cy="stat-card-conversion"><span>$ / LOC</span><strong data-cy="conversion-value">0</strong></div>
            <div data-cy="stat-card-output"><span>Output</span><strong data-cy="output-value">x1.00</strong></div>
            <div data-cy="stat-card-ai"><span>AI agents</span><strong data-cy="tokens-value">0</strong></div>
            <div data-cy="stat-card-bugs"><span>Active bugs</span><strong data-cy="bugs-value">0</strong></div>
            <div data-cy="stat-card-reputation"><span>Reputation</span><strong data-cy="reputation-value">0</strong></div>
          </section>

          <section class="panel tile-debt">
            <h2>Tech Debt Meter</h2>
            <div class="risk-readout risk-readout-prominent">
              <p data-cy="tech-debt-risk">Tech debt risk: -</p>
              <p data-cy="tech-debt-bugs">Bugs: -</p>
              <p data-cy="tech-debt-meta">Structural debt: -</p>
              <div class="debt-bar debt-bar-prominent" aria-hidden="true">
                <span data-cy="tech-debt-fill"></span>
              </div>
              <button data-cy="repair-tech-debt-btn">Refactor Debt</button>
            </div>
          </section>

          <section class="panel tile-bugs">
            <h2>Bugs</h2>
            <ul class="bugs" data-cy="bug-list"></ul>
          </section>

          <section class="panel tile-events">
            <h2>Random Events</h2>
            <ul class="events" data-cy="event-list"></ul>
          </section>

          <section class="panel tile-owned">
            <h2>Owned Upgrades</h2>
            <div class="upgrades" data-cy="upgrade-owned-list"></div>
          </section>
        </aside>
      </div>
    </main>
  `;

  const elements = {
    dollars: appRoot.querySelector('[data-cy="dollars-value"]'),
    conversion: appRoot.querySelector('[data-cy="conversion-value"]'),
    locps: appRoot.querySelector('[data-cy="locps-value"]'),
    output: appRoot.querySelector('[data-cy="output-value"]'),
    tokens: appRoot.querySelector('[data-cy="tokens-value"]'),
    bugs: appRoot.querySelector('[data-cy="bugs-value"]'),
    reputation: appRoot.querySelector('[data-cy="reputation-value"]'),
    lifetime: appRoot.querySelector('[data-cy="lifetime-value"]'),
    upgrades: appRoot.querySelector('[data-cy="upgrades-value"]'),
    companyEvolution: appRoot.querySelector('[data-cy="company-evolution"]'),
    companyStage: appRoot.querySelector('[data-cy="company-stage"]'),
    companyNote: appRoot.querySelector('[data-cy="company-note"]'),
    companyFill: appRoot.querySelector('[data-cy="company-fill"]'),
    comboMeter: appRoot.querySelector('[data-cy="combo-meter"]'),
    comboBursts: appRoot.querySelector('[data-cy="combo-bursts"]'),
    developers: appRoot.querySelector('[data-cy="developers"]'),
    upgradeShop: appRoot.querySelector('[data-cy="upgrade-shop-list"]'),
    upgradeOwned: appRoot.querySelector('[data-cy="upgrade-owned-list"]'),
    achievements: appRoot.querySelector('[data-cy="achievement-list"]'),
    upgradeLocked: appRoot.querySelector('[data-cy="upgrade-locked-list"]'),
    lockedSummary: appRoot.querySelector('[data-cy="locked-upgrades"] summary'),
    bugList: appRoot.querySelector('[data-cy="bug-list"]'),
    eventList: appRoot.querySelector('[data-cy="event-list"]'),
    prestigeReset: appRoot.querySelector('[data-cy="prestige-reset-btn"]'),
    restart: appRoot.querySelector('[data-cy="restart-btn"]'),
    goalProgress: appRoot.querySelector('[data-cy="release-goal-progress"]'),
    goalTarget: appRoot.querySelector('[data-cy="release-goal-target"]'),
    goalReward: appRoot.querySelector('[data-cy="release-goal-reward"]'),
    prestigeUpgradeList: appRoot.querySelector(
      '[data-cy="prestige-upgrade-list"]',
    ),
    tradeoffModes: appRoot.querySelector('[data-cy="tradeoff-select"]'),
    devBugRisk: appRoot.querySelector('[data-cy="dev-bug-risk"]'),
    aiBugRisk: appRoot.querySelector('[data-cy="ai-bug-risk"]'),
    techDebtRisk: appRoot.querySelector('[data-cy="tech-debt-risk"]'),
    techDebtBugs: appRoot.querySelector('[data-cy="tech-debt-bugs"]'),
    techDebtMeta: appRoot.querySelector('[data-cy="tech-debt-meta"]'),
    techDebtFill: appRoot.querySelector('[data-cy="tech-debt-fill"]'),
    repairTechDebt: appRoot.querySelector('[data-cy="repair-tech-debt-btn"]'),
    strategicDebtBox: appRoot.querySelector('[data-cy="strategic-debt-box"]'),
    strategicDebtTitle: appRoot.querySelector(
      '[data-cy="strategic-debt-title"]',
    ),
    strategicDebtDescription: appRoot.querySelector(
      '[data-cy="strategic-debt-description"]',
    ),
    locVisual: appRoot.querySelector('[data-cy="loc-visual"]'),
    locBursts: appRoot.querySelector('[data-cy="loc-bursts"]'),
    clickPrimaryWrap: appRoot.querySelector(".click-primary-wrap"),
    teamVisual: appRoot.querySelector('[data-cy="team-visual"]'),
    codeBackground: appRoot.querySelector('[data-cy="code-background"]'),
    gameOverOverlay: appRoot.querySelector('[data-cy="game-over-overlay"]'),
    gameOverTitle: appRoot.querySelector('[data-cy="game-over-title"]'),
    gameOverMessage: appRoot.querySelector('[data-cy="game-over-message"]'),
    shell: appRoot.querySelector(".game-shell"),
  };

  const buttons = {
    click: appRoot.querySelector('[data-cy="click-btn"]'),
    strategicRewrite: appRoot.querySelector(
      '[data-cy="strategic-rewrite-btn"]',
    ),
    strategicPostpone: appRoot.querySelector(
      '[data-cy="strategic-postpone-btn"]',
    ),
    gameOverRestart: appRoot.querySelector('[data-cy="game-over-restart-btn"]'),
  };

  const statCards = {
    dollars: appRoot.querySelector('[data-cy="stat-card-dollars"]'),
    conversion: appRoot.querySelector('[data-cy="stat-card-conversion"]'),
    locps: appRoot.querySelector('[data-cy="stat-card-locps"]'),
    output: appRoot.querySelector('[data-cy="stat-card-output"]'),
    upgrades: appRoot.querySelector('[data-cy="stat-card-upgrades"]'),
    ai: appRoot.querySelector('[data-cy="stat-card-ai"]'),
    bugs: appRoot.querySelector('[data-cy="stat-card-bugs"]'),
    reputation: appRoot.querySelector('[data-cy="stat-card-reputation"]'),
    lifetime: appRoot.querySelector('[data-cy="stat-card-lifetime"]'),
  };

  return { elements, buttons, statCards };
}
