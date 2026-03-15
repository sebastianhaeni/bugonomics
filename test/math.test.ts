import { expect, test } from "vitest";

import { clamp01, ratioByLog } from "../src/app/math.js";

test("clamp01 constrains values to the unit interval", () => {
  expect(clamp01(-3)).toBe(0);
  expect(clamp01(0.4)).toBe(0.4);
  expect(clamp01(9)).toBe(1);
});

test("ratioByLog handles invalid inputs safely", () => {
  expect(ratioByLog(-1, 100)).toBe(0);
  expect(ratioByLog(0, 100)).toBe(0);
  expect(ratioByLog(100, 100)).toBe(1);
  expect(ratioByLog(10, 100)).toBeGreaterThan(0);
});
