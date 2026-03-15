const foundationalSnippets = [
  "// TODO: ship fast, regret slowly",
  "// Works on my machine (famous last words)",
  "// If this fails in prod, blame cosmic rays",
  "// Rubber duck approved this algorithm",
  "// We call this clean architecture-ish",
  'const featureFlag = isEnabled("new-billing-flow");',
  "if (apiResponse.ok) deployToProduction();",
  "const cacheHitRate = metrics.cache.hitRate();",
  "function ship(value) { return value * quality; }",
  'await queue.enqueue({ job: "reindex-search" });',
  "for (const ticket of backlog) fix(ticket.bugId);",
  'const release = await ci.runPipeline("frontend");',
  "state.loc += team.velocity * sprintMultiplier;",
  "const customerValue = loc * conversionRate;",
  "if (bugs.length > 0) triggerBugBash();",
  'const team = hire("senior-engineer");',
  'monitoring.alert("latency", percentile95);',
  "while (debt > threshold) refactor(module);",
  "const shippingScore = uxQuality + productClarity;",
  "const aiSuggestion = model.complete(contextWindow);",
  'deploy.canary("checkout-flow", { traffic: 0.2 });',
  'analytics.track("upgrade_purchased", { tier });',
  "const roadmap = prioritize(impact, effort);",
  'if (strategy === "quality") reduceBugChance();',
  'git commit -m "stabilize rendering pipeline";',
  "class FeatureToggleService { constructor(client) { this.client = client; } }",
  "class BuildCache { get(key) { return this.map.get(key); } }",
  "class IncidentCommander { page(team) { return pagerduty.notify(team); } }",
  "interface Deployable { id: string; version: string; rollback(): void; }",
  "interface BacklogItem { id: number; impact: number; effort: number; }",
  'type TicketStatus = "todo" | "doing" | "done";',
  'type ServiceLevel = "gold" | "silver" | "bronze";',
  'enum Runtime { Browser = "browser", Node = "node" }',
  'const strategyMatrix = new Map([["move_fast", 1.5], ["quality", 0.9]]);',
  "const debtMeter = Math.min(1, techDebtPoints / collapseThreshold);",
  "if (debtMeter > 0.85) ui.flashAlarmBorder();",
  'const rollbackPlan = ["disable-feature", "revert-db", "restore-cache"];',
  "document.body.dataset.release = currentRelease;",
  "const releaseTrain = releases.filter((r) => r.ready && !r.blocked);",
  "const authHeader = `Bearer ${sessionToken}`;",
  "const dto = { id, title, severity, createdAt: Date.now() };",
  "Promise.all(tasks.map((task) => task.run())).catch(reportError);",
  'const lazyChunk = () => import("./dashboard/chunk.js");',
  "const schemaVersion = 7;",
  'const persisted = JSON.parse(localStorage.getItem("loc-factory") || "{}");',
  "requestAnimationFrame(() => renderHud(nextState));",
  "const now = performance.now();",
  "const fps = Math.round(1000 / Math.max(frameMs, 1));",
  'const color = debt > 0.8 ? "danger" : "safe";',
  "const supportsWebGL = Boolean(window.WebGL2RenderingContext);",
  "const offline = navigator.onLine === false;",
  "const payload = new URLSearchParams({ runId, score: String(score) });",
  'throw new Error("Unexpected null in release pipeline");',
];

const domainObjects = [
  "RepoStats",
  "BugTicket",
  "SprintPlan",
  "RoadmapItem",
  "DeployWindow",
  "ErrorBudget",
  "FeatureSpec",
  "ReleaseNote",
  "TechDebtCard",
  "ConversionReport",
];

const verbs = [
  "calculate",
  "hydrate",
  "serialize",
  "normalize",
  "reconcile",
  "schedule",
  "throttle",
  "debounce",
  "aggregate",
  "prioritize",
];

const resources = [
  "bugs",
  "developers",
  "aiAgents",
  "conversionRate",
  "deployments",
  "alerts",
  "events",
  "upgrades",
  "abilities",
  "backlog",
];

const funnyComments = [
  "// This is fine. Totally fine.",
  "// Legacy code: written by us, feared by us",
  "// TODO: replace magic number 42 with business logic",
  "// Never mutate state... unless the deadline says so",
  '// QA says "cannot reproduce" and we choose peace',
  "// Please do not run on Friday after 16:00",
  "// If you read this in prod logs, good luck",
  "// Architect approved this with a long sigh",
  "// This branch has seen things",
  "// Here be dragons, and one flaky test",
];

const generatedFunctionSnippets = [];
for (const verb of verbs) {
  for (const resource of resources) {
    generatedFunctionSnippets.push(
      `const ${verb}${resource[0].toUpperCase()}${resource.slice(1)} = (input) => pipeline.${verb}(input, "${resource}");`,
    );
  }
}

const generatedTypeSnippets = [];
for (const object of domainObjects) {
  generatedTypeSnippets.push(
    `interface ${object} { id: string; createdAt: number; updatedAt: number; }`,
  );
  generatedTypeSnippets.push(
    `class ${object}Service { constructor(api) { this.api = api; } }`,
  );
  generatedTypeSnippets.push(
    `type ${object}State = { status: "idle" | "loading" | "error" | "ready" };`,
  );
}

const generatedFlowSnippets = [
  "for (const sprint of quarters) planningBoard.push(planSprint(sprint));",
  "if (errorBudget.remaining < 0) freezeNonCriticalReleases();",
  "const locDelta = currentLoc - previousLoc;",
  "const dollarsDelta = currentDollars - previousDollars;",
  "const valuePerLoc = dollarsDelta / Math.max(locDelta, 1);",
  "const impactScore = (revenueLift * confidence) / Math.max(effort, 1);",
  "const sorted = backlog.slice().sort((a, b) => b.impact - a.impact);",
  "const retries = Math.min(5, attempt + 1);",
  "const timeoutMs = 800 + retries * 120;",
  'if (strategy === "move_fast") bugChance *= 2;',
  'if (strategy === "quality_sprint") conversionRate *= 1.15;',
  "const uiState = { loc, dollars, debt, bugs: bugs.length };",
  "const gameSnapshot = compress(JSON.stringify(state));",
  "const parsed = Number(input || 0);",
  'const formatter = new Intl.NumberFormat("en-US");',
  "queueMicrotask(() => flushTelemetry(batch));",
  "setInterval(() => heartbeat.send(), 5000);",
  "const observer = new MutationObserver(handleMutations);",
  'window.addEventListener("visibilitychange", persistRun);',
  "const randomId = Math.random().toString(36).slice(2, 10);",
];

export const CODE_BACKGROUND_SNIPPETS = [
  ...foundationalSnippets,
  ...generatedFunctionSnippets,
  ...generatedTypeSnippets,
  ...generatedFlowSnippets,
  ...funnyComments,
];
