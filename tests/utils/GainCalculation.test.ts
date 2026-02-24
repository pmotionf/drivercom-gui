import { expect, test } from "vitest";
import {
  calcCurrentI,
  calcCurrentP,
  calcPositionP,
  calcVelocityI,
  calcVelocityP,
  calcWcc,
  calcWsc,
} from "../../src/utils/GainCalculation";

test("Calculate Current P", () => {
  expect(calcCurrentP(40, 0.011500000022351742)).toBe(27.096236689877017);
});

test("Calculate Current I", () => {
  expect(calcCurrentI(40, 0.011500000022351742)).toBe(27.096236689877017);
});

test("Calculate WCC", () => {
  expect(calcWcc(27, 3)).toBe(9);
});

test("Calculate Velocity P", () => {
  expect(calcVelocityP(40, 9, 0.029, 1290, 62)).toBe(0.00021607208786133161);
});

test("Calculate Velocity I", () => {
  expect(calcVelocityI(40, 40, 40, 0.00021607)).toBe(0.00031818933968491244);
});

test("Calculate WSC", () => {
  expect(calcWsc(0.000216, 0.029, 1290, 62)).toBe(0.22492493353047052);
});

test("Calculate Position P", () => {
  expect(calcPositionP(0.22492493353047052, 40)).toBe(0.005623123338261763);
});
