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

    public static class DeterministicSimulation
    {
        public static int Advance(
            ref double accumulator,
            double elapsedSeconds,
            double tickSeconds,
            int maximumTicks,
            Action tick)
        {
            if (!NumericSafety.IsFinite(accumulator) || accumulator < 0d)
                accumulator = 0d;
            if (!NumericSafety.IsFinite(elapsedSeconds) || elapsedSeconds < 0d ||
                !NumericSafety.IsFinite(tickSeconds) || tickSeconds <= 0d ||
                maximumTicks <= 0 || tick == null)
            {
                return 0;
            }

            accumulator = NumericSafety.Add(accumulator, elapsedSeconds).Value;
            double epsilon = tickSeconds * 1e-9d;
            int available = (int)Math.Min(
                int.MaxValue,
                Math.Floor((accumulator + epsilon) / tickSeconds));
            int executed = Math.Min(available, maximumTicks);

            for (int i = 0; i < executed; i++)
                tick();

            accumulator -= executed * tickSeconds;
            if (accumulator < epsilon)
                accumulator = 0d;
            return executed;
        }

        public static void RunOrderedTick(
            Action production,
            Action automation,
            Action recomputeDerivedState,
            Action evaluateTransitions)
        {
            production?.Invoke();
            automation?.Invoke();
            recomputeDerivedState?.Invoke();
            evaluateTransitions?.Invoke();
        }

        public static void RunWholeGameTick(
            Action dysonProduction,
            Action dreamProduction,
            Action dysonAutomation,
            Action dreamAutomation,
            Action recomputeDysonDerivedState,
            Action synchronizeDreamDurableState,
            Action consumeDreamDoubleTime,
            Action evaluateDreamReset,
            Action evaluateDysonReset)
        {
            dysonProduction?.Invoke();
            dreamProduction?.Invoke();
            dysonAutomation?.Invoke();
            dreamAutomation?.Invoke();
            recomputeDysonDerivedState?.Invoke();
            synchronizeDreamDurableState?.Invoke();
            consumeDreamDoubleTime?.Invoke();
            evaluateDreamReset?.Invoke();
            evaluateDysonReset?.Invoke();
        }

        public static void CompleteReset(
            Action wipeDurableState,
            Action resetRuntimeState,
            Action reapplyPersistentEffects)
        {
            wipeDurableState?.Invoke();
            resetRuntimeState?.Invoke();
            reapplyPersistentEffects?.Invoke();
        }

    }
}
