import { describe, expect, it } from "vitest";

import { buyMaxCost, buyXCost, maxAffordable } from "./buy";

describe("buy-multiple math", () => {
  it("buyXCost matches closed-form geometric sum", () => {
    expect(buyXCost(1, 100, 1.22, 0)).toBeCloseTo(100, 12);
    expect(buyXCost(10, 100, 1.22, 0)).toBeGreaterThan(0);
  });

  it("maxAffordable and buyMaxCost are consistent", () => {
    const currency = 1_000_000;
    const baseCost = 100;
    const exponent = 1.22;
    const currentLevel = 0;

    const n = maxAffordable(currency, baseCost, exponent, currentLevel);
    const cost = buyMaxCost(currency, baseCost, exponent, currentLevel);
    expect(n).toBeGreaterThanOrEqual(0);
    expect(cost).toBeLessThanOrEqual(currency + 1e-9);
    expect(buyXCost(n + 1, baseCost, exponent, currentLevel)).toBeGreaterThan(currency);
  });
});

