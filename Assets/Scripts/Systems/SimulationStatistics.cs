using System;
using Systems.Numeric;

namespace Systems.Simulation
{
    public enum DreamResetCause
    {
        Meteor,
        ArtificialIntelligence,
        GlobalWarming,
        BlackHole
    }

    [Serializable]
    public sealed class SimulationWindowBucket
    {
        public long sequence;
        public double simulatedSeconds;
        public long infinityCount;
        public long infinityPoints;
        public long dreamResetCount;
        public long strangeMatter;
        public long realityWorkers;
    }

    [Serializable]
    public sealed class SimulationStatisticsTotals
    {
        public long ordinaryInfinityCount;
        public long breakInfinityCount;
        public long ordinaryInfinityPoints;
        public long breakInfinityPoints;
        public long botCapInfinityPoints;
        public long botCapOverflowRewards;
        public long meteorDreamResets;
        public long aiDreamResets;
        public long globalWarmingDreamResets;
        public long blackHoleDreamResets;
        public long strangeMatter;
        public long realityWorkers;
        public long automaticInfluence;
        public long manualInfluence;
        public double realityCapacityStallSeconds;
        public double simulatedSeconds;

        public void Add(SimulationPresentationSummary summary, double seconds)
        {
            if (summary == null) return;
            ordinaryInfinityCount = NumericSafety.Add(
                ordinaryInfinityCount, summary.OrdinaryInfinityCount).Value;
            breakInfinityCount = NumericSafety.Add(
                breakInfinityCount, summary.BreakInfinityCount).Value;
            ordinaryInfinityPoints = NumericSafety.Add(
                ordinaryInfinityPoints, summary.OrdinaryInfinityPoints).Value;
            breakInfinityPoints = NumericSafety.Add(
                breakInfinityPoints, summary.BreakInfinityPoints).Value;
            botCapInfinityPoints = NumericSafety.Add(
                botCapInfinityPoints, summary.BotCapInfinityPoints).Value;
            botCapOverflowRewards = NumericSafety.Add(
                botCapOverflowRewards, summary.BotCapOverflowRewards).Value;
            meteorDreamResets = NumericSafety.Add(
                meteorDreamResets, summary.MeteorDreamResets).Value;
            aiDreamResets = NumericSafety.Add(
                aiDreamResets, summary.AiDreamResets).Value;
            globalWarmingDreamResets = NumericSafety.Add(
                globalWarmingDreamResets,
                summary.GlobalWarmingDreamResets).Value;
            blackHoleDreamResets = NumericSafety.Add(
                blackHoleDreamResets, summary.BlackHoleDreamResets).Value;
            strangeMatter = NumericSafety.Add(
                strangeMatter, summary.StrangeMatter).Value;
            realityWorkers = NumericSafety.Add(
                realityWorkers, summary.RealityWorkers).Value;
            automaticInfluence = NumericSafety.Add(
                automaticInfluence, summary.AutomaticInfluence).Value;
            manualInfluence = NumericSafety.Add(
                manualInfluence, summary.ManualInfluence).Value;
            realityCapacityStallSeconds = NumericSafety.Add(
                realityCapacityStallSeconds,
                summary.RealityCapacityStallSeconds).Value;
            simulatedSeconds = NumericSafety.Add(
                simulatedSeconds,
                NumericSafety.ClampContinuous(seconds)).Value;
        }

        public void Clear()
        {
            ordinaryInfinityCount = 0L;
            breakInfinityCount = 0L;
            ordinaryInfinityPoints = 0L;
            breakInfinityPoints = 0L;
            botCapInfinityPoints = 0L;
            botCapOverflowRewards = 0L;
            meteorDreamResets = 0L;
            aiDreamResets = 0L;
            globalWarmingDreamResets = 0L;
            blackHoleDreamResets = 0L;
            strangeMatter = 0L;
            realityWorkers = 0L;
            automaticInfluence = 0L;
            manualInfluence = 0L;
            realityCapacityStallSeconds = 0d;
            simulatedSeconds = 0d;
        }
    }

    [Serializable]
    public sealed class SimulationCycleSnapshot
    {
        public bool valid;
        public bool breakInfinity;
        public double durationSeconds;
        public long reward;
        public string dreamCause;
    }

    [Serializable]
    public sealed class SimulationStatistics
    {
        public bool trackedSinceUpdate;
        public string trackingStartedUtc;
        public double trackedSimulatedSeconds;
        public SimulationStatisticsTotals lifetime = new();
        public SimulationStatisticsTotals currentQuantumRun = new();
        public SimulationCycleSnapshot lastCompletedCycle = new();
        public SimulationStatisticsTotals recentProcessedSegment = new();
        public SimulationWindowBucket[] minuteWindows =
            CreateBuckets(60);
        public SimulationWindowBucket[] halfHourWindows =
            CreateBuckets(48);
        public SimulationWindowBucket[] dailyWindows =
            CreateBuckets(30);

        public void EnsureShape()
        {
            lifetime ??= new SimulationStatisticsTotals();
            currentQuantumRun ??= new SimulationStatisticsTotals();
            lastCompletedCycle ??= new SimulationCycleSnapshot();
            recentProcessedSegment ??= new SimulationStatisticsTotals();
            minuteWindows = EnsureBuckets(minuteWindows, 60);
            halfHourWindows = EnsureBuckets(halfHourWindows, 48);
            dailyWindows = EnsureBuckets(dailyWindows, 30);
            if (!trackedSinceUpdate)
            {
                trackedSinceUpdate = true;
                // Migration must be deterministic and must not invent a
                // historical wall-clock timestamp. The schema truthfully
                // records only that tracking began with this update.
                trackingStartedUtc = "tracked-since-update";
            }
        }

        public void RecordSegment(
            double seconds,
            SimulationPresentationSummary summary)
        {
            EnsureShape();
            double safeSeconds = NumericSafety.ClampContinuous(seconds);
            double segmentStart = trackedSimulatedSeconds;
            trackedSimulatedSeconds = NumericSafety.Add(
                trackedSimulatedSeconds,
                safeSeconds).Value;
            // A reset can be recorded at the boundary immediately before its
            // matching time/reality segment is finalized. Preserve such a
            // zero-duration event summary, while replacing an older completed
            // segment on the next advance.
            if (recentProcessedSegment.simulatedSeconds > 0d)
                recentProcessedSegment.Clear();
            recentProcessedSegment.Add(summary, safeSeconds);
            lifetime.Add(summary, safeSeconds);
            currentQuantumRun.Add(summary, safeSeconds);
            RecordWindow(
                minuteWindows,
                60L,
                segmentStart,
                trackedSimulatedSeconds,
                summary);
            RecordWindow(
                halfHourWindows,
                1800L,
                segmentStart,
                trackedSimulatedSeconds,
                summary);
            RecordWindow(
                dailyWindows,
                86400L,
                segmentStart,
                trackedSimulatedSeconds,
                summary);
        }

        public void StartNewQuantumRun()
        {
            EnsureShape();
            currentQuantumRun.Clear();
            recentProcessedSegment.Clear();
        }

        public void RecordInfinityCycle(
            bool breakInfinity,
            double durationSeconds,
            long reward,
            bool botCap)
        {
            EnsureShape();
            var summary = new SimulationPresentationSummary();
            if (breakInfinity)
            {
                summary.BreakInfinityCount = 1L;
                summary.BreakInfinityPoints = Math.Max(0L, reward);
            }
            else
            {
                summary.OrdinaryInfinityCount = 1L;
                summary.OrdinaryInfinityPoints = Math.Max(0L, reward);
            }
            if (botCap)
            {
                summary.BotCapInfinityPoints = 1000L;
                summary.BotCapOverflowRewards = 1L;
            }
            RecordEventAtCurrentTime(summary);
            lastCompletedCycle.valid = true;
            lastCompletedCycle.breakInfinity = breakInfinity;
            lastCompletedCycle.durationSeconds =
                NumericSafety.ClampContinuous(durationSeconds);
            lastCompletedCycle.reward = Math.Max(0L, reward);
            lastCompletedCycle.dreamCause = null;
        }

        public void RecordInfinityAggregate(
            bool breakInfinity,
            long cycleCount,
            long totalReward,
            double lastDurationSeconds,
            long lastReward)
        {
            EnsureShape();
            cycleCount = Math.Max(0L, cycleCount);
            totalReward = Math.Max(0L, totalReward);
            if (cycleCount == 0L) return;
            var summary = new SimulationPresentationSummary();
            if (breakInfinity)
            {
                summary.BreakInfinityCount = cycleCount;
                summary.BreakInfinityPoints = totalReward;
            }
            else
            {
                summary.OrdinaryInfinityCount = cycleCount;
                summary.OrdinaryInfinityPoints = totalReward;
            }
            RecordEventAtCurrentTime(summary);
            lastCompletedCycle.valid = true;
            lastCompletedCycle.breakInfinity = breakInfinity;
            lastCompletedCycle.durationSeconds =
                NumericSafety.ClampContinuous(lastDurationSeconds);
            lastCompletedCycle.reward = Math.Max(0L, lastReward);
            lastCompletedCycle.dreamCause = null;
        }

        public void RecordDreamReset(
            DreamResetCause cause,
            long strangeMatterReward)
        {
            EnsureShape();
            var summary = new SimulationPresentationSummary
            {
                StrangeMatter = Math.Max(0L, strangeMatterReward)
            };
            switch (cause)
            {
                case DreamResetCause.Meteor:
                    summary.MeteorDreamResets = 1L;
                    break;
                case DreamResetCause.ArtificialIntelligence:
                    summary.AiDreamResets = 1L;
                    break;
                case DreamResetCause.GlobalWarming:
                    summary.GlobalWarmingDreamResets = 1L;
                    break;
                case DreamResetCause.BlackHole:
                    summary.BlackHoleDreamResets = 1L;
                    break;
            }

            RecordEventAtCurrentTime(summary);
            lastCompletedCycle.valid = true;
            lastCompletedCycle.breakInfinity = false;
            lastCompletedCycle.durationSeconds = 0d;
            lastCompletedCycle.dreamCause = cause.ToString();
            lastCompletedCycle.reward = Math.Max(0L, strangeMatterReward);
        }

        public void RecordDreamAggregate(
            DreamResetCause cause,
            long cycleCount,
            long totalStrangeMatter,
            long lastReward)
        {
            EnsureShape();
            cycleCount = Math.Max(0L, cycleCount);
            if (cycleCount == 0L) return;
            var summary = new SimulationPresentationSummary
            {
                StrangeMatter = Math.Max(0L, totalStrangeMatter)
            };
            switch (cause)
            {
                case DreamResetCause.Meteor:
                    summary.MeteorDreamResets = cycleCount;
                    break;
                case DreamResetCause.ArtificialIntelligence:
                    summary.AiDreamResets = cycleCount;
                    break;
                case DreamResetCause.GlobalWarming:
                    summary.GlobalWarmingDreamResets = cycleCount;
                    break;
                case DreamResetCause.BlackHole:
                    summary.BlackHoleDreamResets = cycleCount;
                    break;
            }
            RecordEventAtCurrentTime(summary);
            lastCompletedCycle.valid = true;
            lastCompletedCycle.breakInfinity = false;
            lastCompletedCycle.durationSeconds = 0d;
            lastCompletedCycle.dreamCause = cause.ToString();
            lastCompletedCycle.reward = Math.Max(0L, lastReward);
        }

        private void RecordEventAtCurrentTime(
            SimulationPresentationSummary summary)
        {
            lifetime.Add(summary, 0d);
            currentQuantumRun.Add(summary, 0d);
            recentProcessedSegment.Add(summary, 0d);
            RecordWindow(
                minuteWindows,
                60L,
                trackedSimulatedSeconds,
                trackedSimulatedSeconds,
                summary);
            RecordWindow(
                halfHourWindows,
                1800L,
                trackedSimulatedSeconds,
                trackedSimulatedSeconds,
                summary);
            RecordWindow(
                dailyWindows,
                86400L,
                trackedSimulatedSeconds,
                trackedSimulatedSeconds,
                summary);
        }

        private static void RecordWindow(
            SimulationWindowBucket[] buckets,
            long widthSeconds,
            double segmentStartSeconds,
            double segmentEndSeconds,
            SimulationPresentationSummary summary)
        {
            if (buckets == null || buckets.Length == 0) return;
            double start = NumericSafety.ClampContinuous(
                segmentStartSeconds);
            double end = Math.Max(
                start,
                NumericSafety.ClampContinuous(segmentEndSeconds));
            if (end > start)
            {
                long firstSequence = ToWindowSequence(
                    start,
                    widthSeconds);
                double lastPoint = Math.Max(
                    start,
                    end - Math.Max(
                        1e-9d,
                        Math.Abs(end) * 1e-15d));
                long lastSequence = ToWindowSequence(
                    lastPoint,
                    widthSeconds);
                long retainedFirst = Math.Max(
                    firstSequence,
                    lastSequence - buckets.Length + 1L);
                for (long sequence = retainedFirst;
                     sequence <= lastSequence;
                     sequence++)
                {
                    SimulationWindowBucket timeBucket =
                        PrepareBucket(buckets, sequence);
                    double windowStart = sequence * (double)widthSeconds;
                    double windowEnd = NumericSafety.Add(
                        windowStart,
                        widthSeconds).Value;
                    double overlap = Math.Max(
                        0d,
                        Math.Min(end, windowEnd) -
                        Math.Max(start, windowStart));
                    timeBucket.simulatedSeconds = NumericSafety.Add(
                        timeBucket.simulatedSeconds,
                        overlap).Value;
                }
            }

            if (summary == null) return;
            long eventSequence = ToWindowSequence(
                end,
                widthSeconds);
            SimulationWindowBucket bucket =
                PrepareBucket(buckets, eventSequence);
            bucket.infinityCount = NumericSafety.Add(
                bucket.infinityCount,
                summary.CombinedInfinityCount).Value;
            bucket.infinityPoints = NumericSafety.Add(
                bucket.infinityPoints,
                summary.CombinedInfinityPoints).Value;
            bucket.dreamResetCount = NumericSafety.Add(
                bucket.dreamResetCount,
                summary.CombinedDreamResets).Value;
            bucket.strangeMatter = NumericSafety.Add(
                bucket.strangeMatter,
                summary.StrangeMatter).Value;
            bucket.realityWorkers = NumericSafety.Add(
                bucket.realityWorkers,
                summary.RealityWorkers).Value;
        }

        private static long ToWindowSequence(
            double seconds,
            long widthSeconds)
        {
            NumericResult<long> result = NumericSafety.ToLongFloor(
                Math.Floor(
                    Math.Max(0d, seconds) /
                    widthSeconds));
            return result.Value;
        }

        private static SimulationWindowBucket PrepareBucket(
            SimulationWindowBucket[] buckets,
            long sequence)
        {
            int index = (int)(sequence % buckets.Length);
            SimulationWindowBucket bucket =
                buckets[index] ??= new SimulationWindowBucket();
            if (bucket.sequence != sequence)
            {
                bucket.sequence = sequence;
                bucket.simulatedSeconds = 0d;
                bucket.infinityCount = 0L;
                bucket.infinityPoints = 0L;
                bucket.dreamResetCount = 0L;
                bucket.strangeMatter = 0L;
                bucket.realityWorkers = 0L;
            }
            return bucket;
        }

        private static SimulationWindowBucket[] CreateBuckets(int count)
        {
            var result = new SimulationWindowBucket[count];
            for (int i = 0; i < result.Length; i++)
                result[i] = new SimulationWindowBucket();
            return result;
        }

        private static SimulationWindowBucket[] EnsureBuckets(
            SimulationWindowBucket[] buckets,
            int count)
        {
            if (buckets == null || buckets.Length != count)
                return CreateBuckets(count);
            for (int i = 0; i < buckets.Length; i++)
                buckets[i] ??= new SimulationWindowBucket();
            return buckets;
        }
    }

    public readonly struct RealityAdvanceResult
    {
        public RealityAdvanceResult(
            double fractionalProgress,
            long workersReady,
            long influence,
            long workersGenerated,
            long automaticInfluence,
            double stalledSeconds)
        {
            FractionalProgress = fractionalProgress;
            WorkersReady = workersReady;
            Influence = influence;
            WorkersGenerated = workersGenerated;
            AutomaticInfluence = automaticInfluence;
            StalledSeconds = stalledSeconds;
        }

        public double FractionalProgress { get; }
        public long WorkersReady { get; }
        public long Influence { get; }
        public long WorkersGenerated { get; }
        public long AutomaticInfluence { get; }
        public double StalledSeconds { get; }
    }

    public static class RealitySimulation
    {
        public static RealityAdvanceResult Advance(
            double fractionalProgress,
            long workersReady,
            long influence,
            bool autoGather,
            double generationPerSecond,
            double seconds,
            long capacity)
        {
            fractionalProgress = NumericSafety.IsFinite(fractionalProgress) &&
                                 fractionalProgress >= 0d
                ? fractionalProgress % 1d
                : 0d;
            workersReady = Math.Max(0L, workersReady);
            influence = Math.Max(0L, influence);
            capacity = Math.Max(0L, capacity);
            if (!NumericSafety.IsFinite(generationPerSecond) ||
                generationPerSecond <= 0d ||
                !NumericSafety.IsFinite(seconds) ||
                seconds <= 0d)
            {
                return new RealityAdvanceResult(
                    fractionalProgress,
                    Math.Min(workersReady, capacity),
                    influence,
                    0L,
                    0L,
                    0d);
            }

            if (!autoGather && workersReady >= capacity)
            {
                return new RealityAdvanceResult(
                    fractionalProgress,
                    capacity,
                    influence,
                    0L,
                    0L,
                    seconds);
            }

            double generatedExact = NumericSafety.Add(
                fractionalProgress,
                NumericSafety.Multiply(
                    generationPerSecond,
                    seconds).Value).Value;
            long completed = NumericSafety.ToLongFloor(
                Math.Floor(generatedExact)).Value;
            double remainder = completed == long.MaxValue
                ? 0d
                : Math.Max(0d, generatedExact - completed);
            if (autoGather)
            {
                long finalInfluence =
                    NumericSafety.Add(influence, completed).Value;
                return new RealityAdvanceResult(
                    remainder,
                    0L,
                    finalInfluence,
                    completed,
                    completed,
                    0d);
            }

            long space = Math.Max(0L, capacity - workersReady);
            long accepted = Math.Min(space, completed);
            long finalWorkers =
                NumericSafety.Add(workersReady, accepted).Value;
            double stalled = completed > accepted
                ? Math.Max(0d, seconds -
                    accepted / Math.Max(double.Epsilon, generationPerSecond))
                : 0d;
            return new RealityAdvanceResult(
                finalWorkers >= capacity ? 0d : remainder,
                Math.Min(capacity, finalWorkers),
                influence,
                accepted,
                0L,
                stalled);
        }
    }
}
