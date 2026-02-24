export function movingAvg(data: number[], wind: number) {
  const rolled: number[] = Array(data.length).fill(null);

  let sum = 0;
  let count = 0;

  for (let i = 0; i < data.length; i++) {
    const y = data[i];

    if (y == null) continue;

    sum += y;
    count++;

    if (i > wind - 1) {
      sum -= data[i - wind];
      count--;
    }

    rolled[i] = sum / count;
  }

  return rolled;
}

export function clamp(
  nRange: number,
  nMin: number,
  nMax: number,
  fRange: number,
  fMin: number,
  fMax: number,
) {
  if (nRange > fRange) {
    nMin = fMin;
    nMax = fMax;
  } else if (nMin < fMin) {
    nMin = fMin;
    nMax = fMin + nRange;
  } else if (nMax > fMax) {
    nMax = fMax;
    nMin = fMax - nRange;
  }

  return [nMin, nMax];
}
