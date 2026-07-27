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
    }
}
