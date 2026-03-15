import { clamp01 } from "./math.js";

export function createAudioController({ windowObject = window, isGameOver }) {
  const AUDIO_LOOKAHEAD_MS = 120;
  const AUDIO_SCHEDULE_AHEAD_SEC = 0.35;

  const state = {
    context: null,
    masterGain: null,
    limiter: null,
    started: false,
    schedulerId: 0,
    nextNoteTime: 0,
    step: 0,
    threatLevel: 0,
    gameOverAtMsPlayed: null,
  };

  function getAudioContext() {
    const Ctor = windowObject.AudioContext || windowObject.webkitAudioContext;
    if (!Ctor) {
      return null;
    }
    return new Ctor();
  }

  function ensureStarted() {
    if (state.started) {
      return;
    }

    const context = getAudioContext();
    if (!context) {
      return;
    }

    const masterGain = context.createGain();
    masterGain.gain.value = 0.52;
    const limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -16;
    limiter.knee.value = 12;
    limiter.ratio.value = 8;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.2;
    masterGain.connect(limiter);
    limiter.connect(context.destination);

    state.context = context;
    state.masterGain = masterGain;
    state.limiter = limiter;
    state.nextNoteTime = context.currentTime + 0.05;
    state.step = 0;
    state.schedulerId = windowObject.setInterval(
      scheduleChiptuneLoop,
      AUDIO_LOOKAHEAD_MS,
    );
    state.started = true;
  }

  function scheduleChiptuneLoop() {
    const context = state.context;
    if (!context) {
      return;
    }

    while (
      state.nextNoteTime <
      context.currentTime + AUDIO_SCHEDULE_AHEAD_SEC
    ) {
      scheduleChiptuneStep(state.step, state.nextNoteTime);
      state.nextNoteTime += getMusicStepDurationSec();
      state.step = (state.step + 1) % 64;
    }
  }

  function getMusicStepDurationSec() {
    return 0.2 - state.threatLevel * 0.06;
  }

  function setMusicRunning(shouldRun) {
    if (!state.started || !state.context) {
      return;
    }

    if (shouldRun) {
      if (state.schedulerId) {
        return;
      }
      state.nextNoteTime = state.context.currentTime + 0.05;
      state.schedulerId = windowObject.setInterval(
        scheduleChiptuneLoop,
        AUDIO_LOOKAHEAD_MS,
      );
      return;
    }

    if (state.schedulerId) {
      windowObject.clearInterval(state.schedulerId);
      state.schedulerId = 0;
    }
  }

  function scheduleChiptuneStep(step, atTime) {
    const melody = [
      523.25, 587.33, 659.25, 783.99, 659.25, 587.33, 523.25, 440, 493.88,
      523.25, 659.25, 783.99, 880, 783.99, 659.25, 523.25, 587.33, 659.25,
      739.99, 880, 739.99, 659.25, 587.33, 493.88, 523.25, 659.25, 783.99,
      987.77, 880, 783.99, 659.25, 587.33,
    ];
    const bass = [
      130.81, 130.81, 146.83, 146.83, 164.81, 164.81, 146.83, 130.81, 123.47,
      123.47, 146.83, 146.83, 164.81, 164.81, 174.61, 146.83,
    ];
    const arp = [
      1046.5, 1318.51, 1567.98, 1318.51, 1174.66, 1396.91, 1567.98, 1396.91,
    ];

    if (step % 2 === 0) {
      playTone({
        frequency: melody[(step / 2) % melody.length],
        duration: 0.12,
        gain: 0.075,
        type: "square",
        atTime,
      });
    }
    if (step % 4 === 0) {
      playTone({
        frequency: bass[(step / 4) % bass.length],
        duration: 0.18,
        gain: 0.06,
        type: "square",
        atTime,
      });
    }

    if (step % 2 === 1 && state.threatLevel >= 0.4) {
      playTone({
        frequency: arp[step % arp.length],
        duration: 0.08,
        gain: 0.03 + state.threatLevel * 0.02,
        type: "triangle",
        atTime,
      });
    }

    if (state.threatLevel >= 0.72 && step % 4 === 2) {
      playTone({
        frequency: 98,
        duration: 0.045,
        gain: 0.06 + (state.threatLevel - 0.72) * 0.1,
        type: "sawtooth",
        atTime,
      });
    }
  }

  function playTone({
    frequency,
    duration,
    gain,
    type = "square",
    atTime = null,
  }) {
    const context = state.context;
    const masterGain = state.masterGain;
    if (!context || !masterGain) {
      return;
    }

    const startTime =
      typeof atTime === "number"
        ? Math.max(context.currentTime, atTime)
        : context.currentTime;
    const endTime = startTime + duration;

    const osc = context.createOscillator();
    const amp = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, startTime);

    amp.gain.setValueAtTime(0.0001, startTime);
    amp.gain.exponentialRampToValueAtTime(
      Math.max(0.0001, gain),
      startTime + 0.01,
    );
    amp.gain.exponentialRampToValueAtTime(0.0001, endTime);

    osc.connect(amp);
    amp.connect(masterGain);
    osc.start(startTime);
    osc.stop(endTime + 0.01);
  }

  function playSfx(type) {
    ensureStarted();
    const nowTime = state.context ? state.context.currentTime : 0;
    switch (type) {
      case "click":
        playTone({ frequency: 880, duration: 0.06, gain: 0.18 });
        break;
      case "buy":
        playTone({ frequency: 523.25, duration: 0.07, gain: 0.16 });
        playTone({
          frequency: 783.99,
          duration: 0.09,
          gain: 0.14,
          atTime: nowTime + 0.05,
        });
        break;
      case "fix":
        playTone({ frequency: 392, duration: 0.06, gain: 0.16 });
        playTone({
          frequency: 587.33,
          duration: 0.08,
          gain: 0.14,
          atTime: nowTime + 0.04,
        });
        break;
      case "error":
        playTone({
          frequency: 196,
          duration: 0.08,
          gain: 0.14,
          type: "sawtooth",
        });
        break;
      default:
        break;
    }
  }

  function setThreatLevel(level) {
    state.threatLevel = clamp01(level);
  }

  function maybePlayGameOverSfx(gameState) {
    if (!isGameOver(gameState) || !gameState.gameOver) {
      state.gameOverAtMsPlayed = null;
      return;
    }
    if (state.gameOverAtMsPlayed === gameState.gameOver.atMs) {
      return;
    }

    ensureStarted();
    const nowTime = state.context ? state.context.currentTime : 0;
    const notes = [392, 329.63, 261.63, 196, 130.81];
    notes.forEach((frequency, index) => {
      playTone({
        frequency,
        duration: 0.2,
        gain: 0.2 - index * 0.02,
        type: "sawtooth",
        atTime: nowTime + index * 0.11,
      });
    });
    state.gameOverAtMsPlayed = gameState.gameOver.atMs;
  }

  function playActionSfx(previousState, nextState, action) {
    if (!action || typeof action !== "object") {
      return;
    }

    const type = String(action.type || "");
    if (type === "CLICK") {
      playSfx("click");
      return;
    }
    if (type === "HIRE") {
      const level = String(action.level || "");
      playSfx(
        (nextState.developers[level] || 0) >
          (previousState.developers[level] || 0)
          ? "buy"
          : "error",
      );
      return;
    }
    if (type === "HIRE_SUPPORT") {
      const role = String(action.role || "");
      playSfx(
        (nextState.supportTeam[role] || 0) >
          (previousState.supportTeam[role] || 0)
          ? "buy"
          : "error",
      );
      return;
    }
    if (type === "BUY_AI_TOKEN") {
      playSfx(nextState.aiAgents > previousState.aiAgents ? "buy" : "error");
      return;
    }
    if (type === "BUY_UPGRADE" || type === "BUY_PRESTIGE_UPGRADE") {
      playSfx(
        nextState.dollars < previousState.dollars ||
          nextState.reputation < previousState.reputation
          ? "buy"
          : "error",
      );
      return;
    }
    if (type === "FIX_BUG") {
      playSfx(
        nextState.bugs.length < previousState.bugs.length ? "fix" : "error",
      );
    }
  }

  return {
    ensureStarted,
    setMusicRunning,
    setThreatLevel,
    maybePlayGameOverSfx,
    playActionSfx,
  };
}
