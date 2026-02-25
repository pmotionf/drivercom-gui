import { expect, test } from "vitest";
import { getComputedCSSVariableValue } from "../../src/utils/GetComputedCssVariableValue";

test("Test get computed CSS variable value", () => {
  expect(getComputedCSSVariableValue("var(--bg-disabled)")).toBe("");
});
