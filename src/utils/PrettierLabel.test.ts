import { expect, test } from "vitest";
import { prettierLabel } from "./PrettierLabel";

test("Test prettier label", () => {
  expect(prettierLabel("line_example")).toBe("Line Example");
});
