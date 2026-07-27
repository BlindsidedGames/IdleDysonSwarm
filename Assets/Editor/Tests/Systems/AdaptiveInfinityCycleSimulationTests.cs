using System;
using NUnit.Framework;
using Systems.Simulation;

namespace Tests.Systems
{
    [TestFixture]
    public sealed class AdaptiveInfinityCycleSimulationTests
    {
        [Test]
        public void ConstantCycleCadence_ProjectsAnySubTickMultipleAsOneBlock()
        {
            bool projected = AdaptiveInfinityCycleSimulation.TryProject(
                new InfinityCycleSample(100L, 10L, 12L),
                new InfinityCycleSample(110L, 10L, 12L),
                new InfinityCycleSample(120L, 10L, 12L),
                currentInfinityPoints: 130L,
                availableTicks: 12_000L,
                out InfinityCycleProjection result);

            Assert.IsTrue(projected);
            Assert.GreaterOrEqual(result.CycleCount, 8L);
            Assert.LessOrEqual(result.ConsumedTicks, 12_000L);
            Assert.AreEqual(
                130L + result.CycleCount * 10L,
                result.FinalInfinityPoints);
            Assert.GreaterOrEqual(result.LastDurationTicks, 1L);
            Assert.LessOrEqual(result.LastDurationTicks, 12L);
            Assert.LessOrEqual(result.ValidationError, 0.001d);
        }

        [Test]
        public void OneTickCadence_ProjectsWithoutExecutingEachReset()
        {
            bool projected = AdaptiveInfinityCycleSimulation.TryProject(
                new InfinityCycleSample(100L, 1L, 1L),
                new InfinityCycleSample(101L, 1L, 1L),
                new InfinityCycleSample(102L, 1L, 1L),
                currentInfinityPoints: 103L,
                availableTicks: 648_000L,
                out InfinityCycleProjection result);

            Assert.IsTrue(projected);
            Assert.Greater(result.CycleCount, 50L);
            Assert.AreEqual(result.CycleCount, result.ConsumedTicks);
            Assert.AreEqual(
                103L + result.CycleCount,
                result.FinalInfinityPoints);
            Assert.LessOrEqual(result.ValidationError, 0.001d);
        }

        [Test]
        public void SubAutomationTickCadence_ProjectsInContinuousSeconds()
        {
            bool projected =
                AdaptiveInfinityCycleSimulation.TryProjectSeconds(
                new InfinityCycleSample(100L, 1L, 1L, 1d / 60d),
                new InfinityCycleSample(101L, 1L, 1L, 1d / 60d),
                new InfinityCycleSample(102L, 1L, 1L, 1d / 60d),
                currentInfinityPoints: 103L,
                availableSeconds: 60d,
                minimumCycleSeconds: 1d / 60d,
                out InfinityCycleProjection result);

            Assert.IsTrue(projected);
            Assert.Greater(result.CycleCount, 50L);
            Assert.Greater(result.ConsumedSeconds, 0d);
            Assert.LessOrEqual(result.ConsumedSeconds, 60d);
            Assert.AreEqual(
                103L + result.CycleCount,
                result.FinalInfinityPoints);
        }

        [Test]
        public void NoisyCycles_AreRejectedForCanonicalResampling()
        {
            bool projected = AdaptiveInfinityCycleSimulation.TryProject(
                new InfinityCycleSample(0L, 10L, 100L),
                new InfinityCycleSample(10L, 100L, 10L),
                new InfinityCycleSample(110L, 1L, 1000L),
                currentInfinityPoints: 111L,
                availableTicks: 100_000L,
                out _);

            Assert.IsFalse(projected);
        }

        [Test]
        public void Projection_ReservesTicksForExactEndpointCorrection()
        {
            bool projected = AdaptiveInfinityCycleSimulation.TryProject(
                new InfinityCycleSample(100L, 10L, 20L),
                new InfinityCycleSample(110L, 10L, 20L),
                new InfinityCycleSample(120L, 10L, 20L),
                currentInfinityPoints: 130L,
                availableTicks: 1_000L,
                out InfinityCycleProjection result);

            Assert.IsTrue(projected);
            Assert.LessOrEqual(result.ConsumedTicks, 960L);
            Assert.GreaterOrEqual(
                1_000L - result.ConsumedTicks,
                40L);
        }

        [Test]
        public void StableCycleProjection_ComposesDurationAndRewardBoundariesExactly()
        {
            const double minimum = 1d / 60d;
            InfinityCycleEvaluation Evaluate(long points)
            {
                long reward = points < 200L ? 5L : 7L;
                double duration = points < 150L
                    ? 0.2d
                    : points < 250L
                        ? 0.1d
                        : minimum;
                return new InfinityCycleEvaluation(
                    reward,
                    duration);
            }

            const long startingPoints = 115L;
            const double availableSeconds = 10d;
            bool projected =
                AdaptiveInfinityCycleSimulation.TryProjectStableCycles(
                    new InfinityCycleSample(100L, 5L, 2L, 0.2d),
                    new InfinityCycleSample(105L, 5L, 2L, 0.2d),
                    new InfinityCycleSample(110L, 5L, 2L, 0.2d),
                    startingPoints,
                    availableSeconds,
                    minimum,
                    Evaluate,
                    minimumProjectedCycles: 8L,
                    out InfinityCycleProjection result);

            Assert.IsTrue(projected);
            long expectedPoints = startingPoints;
            long expectedCycles = 0L;
            double expectedSeconds = 0d;
            long expectedLastReward = 0L;
            double expectedLastDuration = 0d;
            while (true)
            {
                InfinityCycleEvaluation cycle =
                    Evaluate(expectedPoints);
                if (expectedSeconds + cycle.DurationSeconds >
                    availableSeconds + 1e-12d)
                {
                    break;
                }
                expectedSeconds += cycle.DurationSeconds;
                expectedPoints += cycle.Reward;
                expectedCycles++;
                expectedLastReward = cycle.Reward;
                expectedLastDuration = cycle.DurationSeconds;
            }

            Assert.AreEqual(expectedCycles, result.CycleCount);
            Assert.AreEqual(expectedPoints, result.FinalInfinityPoints);
            Assert.AreEqual(expectedLastReward, result.LastReward);
            Assert.AreEqual(
                expectedLastDuration,
                result.LastDurationSeconds,
                1e-12d);
            Assert.AreEqual(
                expectedSeconds,
                result.ConsumedSeconds,
                1e-9d);
            Assert.AreEqual(0d, result.ValidationError);
        }

        [Test]
        public void EvaluatedProjection_VaryingCyclesMatchExactRecurrence()
        {
            const double minimum = 1d / 60d;
            InfinityCycleEvaluation Evaluate(long points)
            {
                long reward = 5L + points / 100L;
                double duration = Math.Max(
                    minimum,
                    10d / Math.Sqrt(points + 1d));
                return new InfinityCycleEvaluation(
                    reward,
                    duration);
            }

            long firstStart = 100L;
            InfinityCycleEvaluation firstEvaluation =
                Evaluate(firstStart);
            long secondStart =
                firstStart + firstEvaluation.Reward;
            InfinityCycleEvaluation secondEvaluation =
                Evaluate(secondStart);
            long thirdStart =
                secondStart + secondEvaluation.Reward;
            InfinityCycleEvaluation thirdEvaluation =
                Evaluate(thirdStart);
            long currentPoints =
                thirdStart + thirdEvaluation.Reward;
            const double availableSeconds = 60d;

            bool projected =
                AdaptiveInfinityCycleSimulation
                    .TryProjectValidatedCycles(
                        new InfinityCycleSample(
                            firstStart,
                            firstEvaluation.Reward,
                            1L,
                            firstEvaluation.DurationSeconds),
                        new InfinityCycleSample(
                            secondStart,
                            secondEvaluation.Reward,
                            1L,
                            secondEvaluation.DurationSeconds),
                        new InfinityCycleSample(
                            thirdStart,
                            thirdEvaluation.Reward,
                            1L,
                            thirdEvaluation.DurationSeconds),
                        currentPoints,
                        availableSeconds,
                        minimum,
                        Evaluate,
                        out InfinityCycleProjection result);

            Assert.IsTrue(
                projected,
                AdaptiveInfinityCycleSimulation
                    .LastStableProjectionDiagnostic);
            double projectionBudget =
                availableSeconds -
                Math.Max(1d, thirdEvaluation.DurationSeconds * 2d);
            long expectedPoints = currentPoints;
            long expectedCycles = 0L;
            double expectedSeconds = 0d;
            long expectedLastReward = 0L;
            double expectedLastDuration = 0d;
            while (true)
            {
                InfinityCycleEvaluation cycle =
                    Evaluate(expectedPoints);
                if (expectedSeconds + cycle.DurationSeconds >
                    projectionBudget + 1e-12d)
                {
                    break;
                }
                expectedSeconds += cycle.DurationSeconds;
                expectedPoints += cycle.Reward;
                expectedCycles++;
                expectedLastReward = cycle.Reward;
                expectedLastDuration = cycle.DurationSeconds;
            }

            Assert.AreEqual(expectedCycles, result.CycleCount);
            Assert.AreEqual(expectedPoints, result.FinalInfinityPoints);
            Assert.AreEqual(expectedLastReward, result.LastReward);
            Assert.AreEqual(
                expectedLastDuration,
                result.LastDurationSeconds,
                1e-12d);
            Assert.AreEqual(
                expectedSeconds,
                result.ConsumedSeconds,
                1e-9d);
            Assert.LessOrEqual(
                result.ValidationError,
                0.001d);
        }

        [Test]
        public void StableCycleProjection_RejectsUnprovenCycleSignature()
        {
            bool projected =
                AdaptiveInfinityCycleSimulation.TryProjectStableCycles(
                    new InfinityCycleSample(100L, 5L, 2L, 0.2d),
                    new InfinityCycleSample(105L, 5L, 2L, 0.2d),
                    new InfinityCycleSample(110L, 5L, 2L, 0.2d),
                    currentInfinityPoints: 115L,
                    availableSeconds: 10d,
                    minimumCycleSeconds: 1d / 60d,
                    _ => new InfinityCycleEvaluation(6L, 0.2d),
                    minimumProjectedCycles: 8L,
                    out _);

            Assert.IsFalse(projected);
        }

        [Test]
        public void StableCycleProjection_RejectsUnrepresentableLongAggregate()
        {
            bool projected =
                AdaptiveInfinityCycleSimulation.TryProjectStableCycles(
                    new InfinityCycleSample(
                        long.MaxValue - 30L,
                        5L,
                        1L,
                        0.1d),
                    new InfinityCycleSample(
                        long.MaxValue - 25L,
                        5L,
                        1L,
                        0.1d),
                    new InfinityCycleSample(
                        long.MaxValue - 20L,
                        5L,
                        1L,
                        0.1d),
                    currentInfinityPoints: long.MaxValue - 15L,
                    availableSeconds: 10d,
                    minimumCycleSeconds: 1d / 60d,
                    _ => new InfinityCycleEvaluation(5L, 0.1d),
                    minimumProjectedCycles: 8L,
                    out _);

            Assert.IsFalse(projected);
        }
    }
}
