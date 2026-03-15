import { CODE_BACKGROUND_SNIPPETS } from "../game/codeBackgroundSnippets.js";

interface CodeBackgroundLine {
  node: HTMLDivElement;
  text: string;
  cursor: number;
}

interface CodeBackgroundControllerOptions {
  container: HTMLElement;
  windowObject?: Window & typeof globalThis;
}

export function createCodeBackgroundController({
  container,
  windowObject = window,
}: CodeBackgroundControllerOptions) {
  const state = {
    speedCharsPerSecond: 0,
    targetCharsPerSecond: 4,
    lastFrameMs: 0,
    rafId: 0,
    currentLine: null as CodeBackgroundLine | null,
    maxLines: 130,
  };

  function init(): void {
    reset();
    state.lastFrameMs = performance.now();
    state.rafId = windowObject.requestAnimationFrame(step);
  }

  function createTypingLine(): CodeBackgroundLine {
    const line = document.createElement("div");
    line.className = "code-background-line";
    container.append(line);

    while (container.children.length > state.maxLines) {
      container.firstElementChild?.remove();
    }

    return {
      node: line,
      text:
        CODE_BACKGROUND_SNIPPETS[
          Math.floor(Math.random() * CODE_BACKGROUND_SNIPPETS.length)
        ],
      cursor: 0,
    };
  }

  function setSpeed(locPerSecond: number): void {
    const locSpeed = Math.max(0, Number(locPerSecond) || 0);
    state.targetCharsPerSecond = Math.min(300, locSpeed);
  }

  function reset(): void {
    container.replaceChildren();
    state.currentLine = null;
    state.speedCharsPerSecond = 0;
    state.targetCharsPerSecond = 0;
    state.lastFrameMs = performance.now();
  }

  function step(nowMs: number): void {
    const elapsedMs = Math.min(120, Math.max(0, nowMs - state.lastFrameMs));
    state.lastFrameMs = nowMs;

    const smoothing = 0.12;
    state.speedCharsPerSecond +=
      (state.targetCharsPerSecond - state.speedCharsPerSecond) * smoothing;

    if (!state.currentLine && state.speedCharsPerSecond > 0.05) {
      state.currentLine = createTypingLine();
    }

    const current = state.currentLine;
    if (current) {
      current.cursor += (elapsedMs / 1000) * state.speedCharsPerSecond;

      const visibleChars = Math.max(
        0,
        Math.min(current.text.length, Math.floor(current.cursor)),
      );
      const isComplete = visibleChars >= current.text.length;
      const suffix =
        !isComplete && Math.floor(nowMs / 160) % 2 === 0 ? "|" : "";
      current.node.textContent = `${current.text.slice(0, visibleChars)}${suffix}`;

      if (isComplete && current.cursor >= current.text.length + 6) {
        current.node.textContent = current.text;
        state.currentLine = createTypingLine();
      }
    }

    state.rafId = windowObject.requestAnimationFrame(step);
  }

  return {
    init,
    setSpeed,
    reset,
  };
}
