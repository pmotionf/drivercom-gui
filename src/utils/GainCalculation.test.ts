import { expect, test } from "vitest";
import {
  calcCurrentI,
  calcCurrentP,
  calcPositionP,
  calcVelocityI,
  calcVelocityP,
  calcWcc,
  calcWsc,
} from "./GainCalculation";

test("Test current p calculation", () => {
  expect(calcCurrentP(40, 0.011500000022351742)).toBe(27.096236689877017);
});

test("Test current i calculation", () => {
  expect(calcCurrentI(40, 0.011500000022351742)).toBe(27.096236689877017);
});

test("Test wcc calculation", () => {
  expect(calcWcc(27, 3)).toBe(9);
});

test("Test velocity p calculation", () => {
  expect(calcVelocityP(40, 9, 0.029, 1290, 62)).toBe(0.00021607208786133161);
});

test("Test velocity i calculation", () => {
  expect(calcVelocityI(40, 40, 40, 0.00021607)).toBe(0.00031818933968491244);
});

test("Test wsc calculation", () => {
  expect(calcWsc(0.000216, 0.029, 1290, 62)).toBe(0.22492493353047052);
});

test("Test position p calculation", () => {
  expect(calcPositionP(0.22492493353047052, 40)).toBe(0.005623123338261763);
});
