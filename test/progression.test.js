import { expect, test } from "vitest";

import { createInitialState } from "../src/game/engine.js";
import {
  ACHIEVEMENTS,
  getAchievementStatus,
  getCompanyStagePresentation,
} from "../src/app/progression.js";

test("getCompanyStagePresentation returns next stage progress", () => {
  const presentation = getCompanyStagePresentation(3_300);

  expect(presentation.current.id).toBe("startup");
  expect(presentation.next.id).toBe("scaleup");
  expect(presentation.isMaxStage).toBe(false);
  expect(presentation.progress).toBe(0.5);
});

test("getCompanyStagePresentation clamps to max stage", () => {
  const presentation = getCompanyStagePresentation(80_000);

  expect(presentation.current.id).toBe("unicorn");
  expect(presentation.next.id).toBe("unicorn");
  expect(presentation.isMaxStage).toBe(true);
  expect(presentation.progress).toBe(1);
});

test("getAchievementStatus computes unlocked state and label", () => {
  const state = createInitialState();
  state.totalClicks = 17;
  const achievement = ACHIEVEMENTS.find(({ id }) => id === "click_hustle");

  const status = getAchievementStatus(achievement, state);

  expect(status.unlocked).toBe(false);
  expect(status.label).toBe("17/250");
  expect(status.currentValue).toBe(17);
});
