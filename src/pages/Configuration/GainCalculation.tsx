export function calcCurrentP(denominator: number, ls: number) {
  const wcc = 2.0 * Math.PI * (15000.0 / denominator);
  const p = wcc * ls;
  return p;
}

export function calcCurrentI(denominator: number, rs: number) {
  const wcc = 2.0 * Math.PI * (15000.0 / denominator);
  const i = wcc * rs;
  return i;
}

export function calcWcc(currentP: number, ls: number): number {
  const wcc = currentP / ls;
  return wcc;
}

export function calcVelocityP(
  denominator: number,
  wcc: number,
  pitch: number,
  mass: number,
  kf: number,
): number {
  const radius = pitch / (2.0 * Math.PI);
  const inertia = (mass / 100) * radius * radius;
  const torque_constant = kf * radius;

  const wsc = wcc / denominator;
  const p = (inertia * wsc) / torque_constant;

  return p;
}

export function calcVelocityI(
  denominator: number,
  denominator_pi: number,
  currentDenominator: number,
  p: number,
): number {
  const wcc = 2.0 * Math.PI * (15000.0 / currentDenominator);
  const wsc = wcc / denominator;
  const wpi = wsc / denominator_pi;

  const i = p * wpi;

  return i;
}

export function calcWsc(
  velocityP: number,
  pitch: number,
  mass: number,
  kf: number,
) {
  const radius = pitch / (2.0 * Math.PI);
  const inertia = (mass / 100) * radius * radius;
  const torque_constant = kf * radius;

  const inertiaWsc = velocityP * torque_constant;
  const wsc = inertiaWsc / inertia;
  return wsc;
}

export function calcPositionP(wsc: number, positionDenominator: number) {
  const wpc = wsc / positionDenominator;
  const p = wpc;
  return p;
}
