import { expect, describe, it } from "vitest";
import { getComputedCSSVariableValue } from "../../src/utils/GetComputedCssVariableValue";

// @vitest-environment jsdom
describe("getComputedCSSVariableValue", () => {
  it("returns resolved css variable value", () => {
    document.documentElement.style.setProperty("--color", "red");
    const result = getComputedCSSVariableValue("--color");
    expect(result).toBe("red");
  });

  it("resolves nested var()", () => {
    document.documentElement.style.setProperty("--primary", "blue");
    document.documentElement.style.setProperty("--color", "var(--primary)");
    const result = getComputedCSSVariableValue("--color");
    expect(result).toBe("blue");
  });
});
