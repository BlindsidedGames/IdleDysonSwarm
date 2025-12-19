export function buyXCost(
  numberToBuy: number,
  baseCost: number,
  exponent: number,
  currentLevel: number,
): number {
  const cost =
    baseCost *
    Math.pow(exponent, currentLevel) *
    ((Math.pow(exponent, numberToBuy) - 1) / (exponent - 1));
  return cost;
}

export function maxAffordable(
  currencyOwned: number,
  baseCost: number,
  exponent: number,
  currentLevel: number,
): number {
  const n = Math.floor(
    Math.log(currencyOwned * (exponent - 1) / (baseCost * Math.pow(exponent, currentLevel)) + 1) /
      Math.log(exponent),
  );
  return n;
}

export function buyMaxCost(
  currencyOwned: number,
  baseCost: number,
  exponent: number,
  currentLevel: number,
): number {
  const n = maxAffordable(currencyOwned, baseCost, exponent, currentLevel);
  return buyXCost(n, baseCost, exponent, currentLevel);
}

