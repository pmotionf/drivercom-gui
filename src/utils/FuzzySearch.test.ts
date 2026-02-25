import { expect, test } from "vitest";
import { fuzzySearch } from "../../src/utils/FuzzySearch";

test("Test fuzzy search", () => {
  expect(
    fuzzySearch("axis", ["2.axis.test.series", "2.sensor.test.series"]),
  ).toStrictEqual(["2.axis.test.series"]);
});
