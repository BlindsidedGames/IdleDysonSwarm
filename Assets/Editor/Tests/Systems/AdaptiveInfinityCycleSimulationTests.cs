using System;
using NUnit.Framework;
using Systems.Simulation;

namespace Tests.Systems
{
    [TestFixture]
    public sealed class AdaptiveInfinityCycleSimulationTests
    {
        [Test]
        public void SampledProjection_GrowthLimitBoundsEachCalibrationBlock()
        {
            InfinityCycleSample first =
                new(997L, 1L, 1L, 0.050d);
            InfinityCycleSample second =
                new(998L, 1L, 1L, 0.0499d);
            InfinityCycleSample third =
                new(999L, 1L, 1L, 0.0498d);

            bool projected =
                AdaptiveInfinityCycleSimulation
                    .TryProjectSampledSeconds(
                        first,
                        second,
                        third,
                        currentInfinityPoints: 1_000L,
                        availableSeconds: 60d,
                        minimumCycleSeconds: 1d / 60d,
                        maximumRelativeIpGrowth: 0.01d,
                        out InfinityCycleProjection conservative);

            Assert.IsTrue(projected);
            Assert.GreaterOrEqual(conservative.CycleCount, 8L);
            Assert.LessOrEqual(
                conservative.FinalInfinityPoints,
                1_010L);

            Assert.IsTrue(
                AdaptiveInfinityCycleSimulation
                    .TryProjectSampledSeconds(
                        first,
                        second,
                        third,
                        currentInfinityPoints: 1_000L,
                        availableSeconds: 60d,
                        minimumCycleSeconds: 1d / 60d,
                        maximumRelativeIpGrowth: 0.25d,
                        out InfinityCycleProjection aggressive));
            Assert.Greater(
                aggressive.CycleCount,
                conservative.CycleCount);
        }

        [Test]
        public void SampledProjection_DoesNotExtrapolatePhaseNoiseAsSlowerIpPower()
        {
            bool projected =
                AdaptiveInfinityCycleSimulation
                    .TryProjectSampledSeconds(
                        new InfinityCycleSample(
                            970L,
                            10L,
                            1L,
                            0.050d),
                        new InfinityCycleSample(
                            980L,
                            10L,
                            1L,
                            0.051d),
                        new InfinityCycleSample(
                            990L,
                            10L,
                            1L,
                            0.052d),
                        currentInfinityPoints: 1_000L,
                        availableSeconds: 60d,
                        minimumCycleSeconds: 1d / 60d,
                        maximumRelativeIpGrowth: 0.10d,
                        out InfinityCycleProjection result);

            Assert.IsTrue(projected);
            Assert.LessOrEqual(
                result.LastDurationSeconds,
                0.052d + 1e-12d);
            Assert.GreaterOrEqual(
                result.LastReward,
                10L);
        }

        [Test]
        public void CheckpointFeedback_DoesNotShrinkForOneAutomationPhaseSpike()
        {
            var feedback = new AdaptiveProjectionCheckpointFeedback();

            feedback.Observe(
                expectedDurationSeconds: 0.05d,
                expectedReward: 200L,
                observedDurationSeconds: 0.06d,
                observedReward: 200L,
                tolerance: 0.01d);

            Assert.AreEqual(1d / 6d, feedback.LastError, 1e-12d);
            Assert.AreEqual(1d / 24d, feedback.ErrorTrend, 1e-12d);
            Assert.AreEqual(1d, feedback.GrowthAdjustment);
        }

        [Test]
        public void CheckpointFeedback_SustainedLargeDriftContractsFutureBlocks()
        {
            var feedback = new AdaptiveProjectionCheckpointFeedback();

            for (int observation = 0; observation < 8; observation++)
            {
                feedback.Observe(
                    expectedDurationSeconds: 0.05d,
                    expectedReward: 200L,
                    observedDurationSeconds: 0.10d,
                    observedReward: 100L,
                    tolerance: 0.01d);
            }

            Assert.Greater(feedback.ErrorTrend, 0.15d);
            Assert.Less(feedback.GrowthAdjustment, 1d);
            Assert.GreaterOrEqual(
                feedback.GrowthAdjustment,
                0.25d);
        }

        [Test]
        public void CheckpointFeedback_StableObservationsRecoverTowardDefault()
        {
            var feedback = new AdaptiveProjectionCheckpointFeedback();
            for (int observation = 0; observation < 8; observation++)
            {
                feedback.Observe(
                    0.05d,
                    200L,
                    0.10d,
                    100L,
                    0.01d);
            }
            double contracted = feedback.GrowthAdjustment;

            for (int observation = 0; observation < 32; observation++)
            {
                feedback.Observe(
                    0.05d,
                    200L,
                    0.05d,
                    200L,
                    0.01d);
            }

            Assert.Greater(
                feedback.GrowthAdjustment,
                contracted);
            Assert.LessOrEqual(
                feedback.GrowthAdjustment,
                1d);
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
        public void ValidatedState_AtLongMaximumCountsZeroGrantCycles()
        {
            const double minimum = 1d / 60d;

            bool projected =
                AdaptiveInfinityCycleSimulation.TryProjectValidatedState(
                    long.MaxValue,
                    availableSeconds: 10d,
                    minimumCycleSeconds: minimum,
                    _ => new InfinityCycleEvaluation(
                        long.MaxValue,
                        minimum),
                    out InfinityCycleProjection result);

            Assert.IsTrue(
                projected,
                AdaptiveInfinityCycleSimulation
                    .LastStableProjectionDiagnostic);
            Assert.AreEqual(600L, result.CycleCount);
            Assert.AreEqual(10d, result.ConsumedSeconds, 1e-9d);
            Assert.AreEqual(long.MaxValue, result.FinalInfinityPoints);
            Assert.AreEqual(
                0L,
                result.LastReward,
                "A saturated balance grants no additional IP.");
            Assert.AreEqual(0d, result.ValidationError);
        }

        [Test]
        public void ValidatedState_MinimumCadenceProvesEarlySaturation()
        {
            const double minimum = 1d / 60d;
            long startingPoints = long.MaxValue - 100L;

            bool projected =
                AdaptiveInfinityCycleSimulation.TryProjectValidatedState(
                    startingPoints,
                    availableSeconds: 1d,
                    minimumCycleSeconds: minimum,
                    _ => new InfinityCycleEvaluation(
                        10L,
                        minimum),
                    out InfinityCycleProjection result);

            Assert.IsTrue(
                projected,
                AdaptiveInfinityCycleSimulation
                    .LastStableProjectionDiagnostic);
            Assert.AreEqual(60L, result.CycleCount);
            Assert.AreEqual(1d, result.ConsumedSeconds, 1e-9d);
            Assert.AreEqual(long.MaxValue, result.FinalInfinityPoints);
            Assert.AreEqual(0L, result.LastReward);
            Assert.AreEqual(0d, result.ValidationError);
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
