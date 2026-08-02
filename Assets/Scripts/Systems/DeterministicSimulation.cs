/*
 * Purpose: Provides the shared fixed-step scheduler and canonical per-tick phase ordering.
 * Runs: Pure runtime/editor code; Unity lifecycle components supply elapsed time and phase callbacks.
 */

using System;
using Systems.Numeric;

namespace Systems.Simulation
{
    public readonly struct DreamDoubleTimeTick
    {
        public DreamDoubleTimeTick(bool active, double effectiveMultiplier, double bankConsumed)
        {
            Active = active;
            EffectiveMultiplier = effectiveMultiplier;
            BankConsumed = bankConsumed;
        }

        public bool Active { get; }
        public double EffectiveMultiplier { get; }
        public double BankConsumed { get; }
    }

    public static class DreamDoubleTimeMath
    {
        public static DreamDoubleTimeTick Prepare(
            bool owned,
            double bankSeconds,
            int rate,
            double tickSeconds)
        {
            if (!owned ||
                !NumericSafety.IsFinite(bankSeconds) ||
                bankSeconds <= 0d ||
                !NumericSafety.IsFinite(tickSeconds) ||
                tickSeconds <= 0d)
            {
                return new DreamDoubleTimeTick(false, 1d, 0d);
            }

            int safeRate = Math.Max(0, Math.Min(10, rate));
            if (safeRate == 0)
                return new DreamDoubleTimeTick(true, 1d, 0d);

            double fullTickConsumption =
                NumericSafety.Multiply(safeRate, tickSeconds).Value;
            double consumed = Math.Min(bankSeconds, fullTickConsumption);
            double effectiveMultiplier =
                NumericSafety.Add(1d, consumed / tickSeconds).Value;
            return new DreamDoubleTimeTick(true, effectiveMultiplier, consumed);
        }

        public static double RemainingBankAfterTicks(
            bool owned,
            double bankSeconds,
            int rate,
            long ticks,
            double tickSeconds)
        {
            double bank = NumericSafety.ClampContinuous(bankSeconds);
            if (!owned || bank <= 0d || ticks <= 0L ||
                !NumericSafety.IsFinite(tickSeconds) || tickSeconds <= 0d)
            {
                return bank;
            }

            int safeRate = Math.Max(0, Math.Min(10, rate));
            if (safeRate == 0) return bank;
            double elapsed = NumericSafety.Multiply(ticks, tickSeconds).Value;
            double requested = NumericSafety.Multiply(elapsed, safeRate).Value;
            return Math.Max(0d, bank - Math.Min(bank, requested));
        }
    }

}
