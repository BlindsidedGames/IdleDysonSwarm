/*
 * Purpose: Projects stable runs of repeated offline Infinity cycles without
 * executing every reset. The projection is deliberately conservative: it
 * requires three completed canonical cycles, validates the first two against
 * the third, compares coarse and subdivided projections, reserves time for
 * exact endpoint correction, and rejects noisy or structurally changing
 * sequences.
 */

using System;
using Systems.Numeric;

namespace Systems.Simulation
{
    public readonly struct InfinityCycleSample
    {
        public InfinityCycleSample(
            long startingInfinityPoints,
            long reward,
            long durationTicks,
            double durationSeconds = double.NaN)
        {
            StartingInfinityPoints = Math.Max(0L, startingInfinityPoints);
            Reward = Math.Max(1L, reward);
            DurationTicks = Math.Max(1L, durationTicks);
            DurationSeconds =
                NumericSafety.IsFinite(durationSeconds) &&
                durationSeconds > 0d
                    ? durationSeconds
                    : DurationTicks * 0.1d;
        }

        public long StartingInfinityPoints { get; }
        public long Reward { get; }
        public long DurationTicks { get; }
        public double DurationSeconds { get; }
    }

    public readonly struct InfinityCycleProjection
    {
        public InfinityCycleProjection(
            long cycleCount,
            double consumedSeconds,
            long finalInfinityPoints,
            long lastReward,
            double lastDurationSeconds,
            double validationError)
        {
            CycleCount = cycleCount;
            ConsumedSeconds = consumedSeconds;
            FinalInfinityPoints = finalInfinityPoints;
            LastReward = lastReward;
            LastDurationSeconds = lastDurationSeconds;
            ValidationError = validationError;
        }

        public long CycleCount { get; }
        public double ConsumedSeconds { get; }
        public long ConsumedTicks => Math.Max(
            1L,
            ToLongSaturating(
                Math.Ceiling(
                    ConsumedSeconds / 0.1d - 1e-9d)));
        public long FinalInfinityPoints { get; }
        public long LastReward { get; }
        public double LastDurationSeconds { get; }
        public long LastDurationTicks => Math.Max(
            1L,
            ToLongSaturating(
                Math.Ceiling(
                    LastDurationSeconds / 0.1d - 1e-9d)));
        public double ValidationError { get; }

        private static long ToLongSaturating(double value)
        {
            if (!NumericSafety.IsFinite(value) ||
                value >= long.MaxValue)
                return long.MaxValue;
            return value <= 0d ? 0L : (long)value;
        }
    }

    public readonly struct InfinityCycleEvaluation
    {
        public InfinityCycleEvaluation(
            long reward,
            double durationSeconds)
        {
            Reward = Math.Max(0L, reward);
            DurationSeconds = durationSeconds;
        }

        public long Reward { get; }
        public double DurationSeconds { get; }
    }

    public static class AdaptiveInfinityCycleSimulation
    {
        private const int CoarseIntegrationSegments = 128;
        private const int RefinedIntegrationSegments = 256;
        private const long MinimumProjectedCycles = 8L;
        private const double MaximumValidationError = 0.001d;

        public static bool TryProject(
            InfinityCycleSample first,
            InfinityCycleSample second,
            InfinityCycleSample third,
            long currentInfinityPoints,
            long availableTicks,
            out InfinityCycleProjection projection)
        {
            return TryProjectSeconds(
                first,
                second,
                third,
                currentInfinityPoints,
                NumericSafety.Multiply(
                    Math.Max(0L, availableTicks),
                    0.1d).Value,
                1d / 60d,
                out projection);
        }

        public static bool TryProjectSeconds(
            InfinityCycleSample first,
            InfinityCycleSample second,
            InfinityCycleSample third,
            long currentInfinityPoints,
            double availableSeconds,
            double minimumCycleSeconds,
            out InfinityCycleProjection projection)
        {
            projection = default;
            if (currentInfinityPoints < 0L ||
                !NumericSafety.IsFinite(availableSeconds) ||
                !NumericSafety.IsFinite(minimumCycleSeconds) ||
                availableSeconds <= 0d ||
                minimumCycleSeconds <= 0d)
                return false;
            if (!SamplesAreOrdered(first, second, third))
                return false;

            double validationDurationExponent = FitExponent(
                first.StartingInfinityPoints,
                first.DurationSeconds,
                second.StartingInfinityPoints,
                second.DurationSeconds,
                minimumExponent: -4d,
                maximumExponent: 1d);
            double validationRewardExponent = FitExponent(
                first.StartingInfinityPoints,
                first.Reward,
                second.StartingInfinityPoints,
                second.Reward,
                minimumExponent: -1d,
                maximumExponent: 4d);
            double predictedThirdDuration = EvaluatePowerModel(
                second.StartingInfinityPoints,
                second.DurationSeconds,
                validationDurationExponent,
                third.StartingInfinityPoints,
                minimumValue: minimumCycleSeconds);
            double predictedThirdReward = EvaluatePowerModel(
                second.StartingInfinityPoints,
                second.Reward,
                validationRewardExponent,
                third.StartingInfinityPoints,
                minimumValue: 1d);
            double durationError = RelativeError(
                predictedThirdDuration,
                third.DurationSeconds);
            double rewardError = RelativeError(
                predictedThirdReward,
                third.Reward);
            if (durationError > MaximumValidationError ||
                rewardError > MaximumValidationError)
            {
                return false;
            }

            double correctionReserve = Math.Max(
                1d,
                NumericSafety.Multiply(
                    third.DurationSeconds,
                    2d).Value);
            double projectionBudget =
                availableSeconds - correctionReserve;
            if (projectionBudget <
                MinimumProjectedCycles * minimumCycleSeconds)
                return false;

            double durationExponent = FitDurationExponent(
                second.StartingInfinityPoints,
                second.DurationSeconds,
                third.StartingInfinityPoints,
                third.DurationSeconds);
            double rewardExponent = FitExponent(
                second.StartingInfinityPoints,
                second.Reward,
                third.StartingInfinityPoints,
                third.Reward,
                minimumExponent: -1d,
                maximumExponent: 4d);
            bool locallyConstant =
                Math.Abs(durationExponent) <= 1e-12d &&
                Math.Abs(rewardExponent) <= 1e-12d;
            long maximumProjectedInfinityPoints;
            if (locallyConstant)
            {
                maximumProjectedInfinityPoints = long.MaxValue;
            }
            else
            {
                long growth = Math.Max(
                    1L,
                    currentInfinityPoints / 4L);
                maximumProjectedInfinityPoints =
                    currentInfinityPoints >
                    long.MaxValue - growth
                        ? long.MaxValue
                        : currentInfinityPoints + growth;
            }

            long low = 0L;
            long high = ToLongSaturating(
                Math.Floor(
                    projectionBudget /
                    minimumCycleSeconds));
            ProjectionEstimate best = default;
            while (low < high)
            {
                long distance = high - low;
                long candidate = low + distance / 2L + distance % 2L;
                ProjectionEstimate estimate = Estimate(
                    third,
                    currentInfinityPoints,
                    candidate,
                    durationExponent,
                    rewardExponent,
                    RefinedIntegrationSegments,
                    minimumCycleSeconds);
                if (estimate.ConsumedSeconds <=
                        projectionBudget + 1e-12d &&
                    estimate.FinalInfinityPoints <=
                    maximumProjectedInfinityPoints)
                {
                    low = candidate;
                    best = estimate;
                }
                else
                {
                    high = candidate - 1L;
                }
            }

            if (low < MinimumProjectedCycles)
                return false;
            if (best.CycleCount != low)
            {
                best = Estimate(
                    third,
                    currentInfinityPoints,
                    low,
                    durationExponent,
                    rewardExponent,
                    RefinedIntegrationSegments,
                    minimumCycleSeconds);
            }
            if (best.ConsumedSeconds <= 0d ||
                best.ConsumedSeconds >
                    projectionBudget + 1e-12d)
            {
                return false;
            }

            ProjectionEstimate coarse = Estimate(
                third,
                currentInfinityPoints,
                low,
                durationExponent,
                rewardExponent,
                CoarseIntegrationSegments,
                minimumCycleSeconds);
            double blockError = Math.Max(
                RelativeError(
                    coarse.ConsumedSeconds,
                    best.ConsumedSeconds),
                RelativeError(
                    coarse.FinalInfinityPoints,
                    best.FinalInfinityPoints));
            blockError = Math.Max(
                blockError,
                Math.Max(
                    RelativeError(
                        coarse.LastReward,
                        best.LastReward),
                    RelativeError(
                        coarse.LastDurationSeconds,
                        best.LastDurationSeconds)));
            double validationError = Math.Max(
                blockError,
                Math.Max(durationError, rewardError));
            if (validationError > MaximumValidationError)
                return false;

            projection = new InfinityCycleProjection(
                best.CycleCount,
                best.ConsumedSeconds,
                best.FinalInfinityPoints,
                best.LastReward,
                best.LastDurationSeconds,
                validationError);
            return true;
        }

        /// <summary>
        /// Exactly composes a stable reset recurrence whose integer reward and
        /// event-grid duration are monotone functions of starting IP. Rather
        /// than executing every cycle, it finds the next IP at which either
        /// discrete value changes and applies the entire constant run.
        /// </summary>
        public static bool TryProjectStableCycles(
            InfinityCycleSample first,
            InfinityCycleSample second,
            InfinityCycleSample third,
            long currentInfinityPoints,
            double availableSeconds,
            double minimumCycleSeconds,
            Func<long, InfinityCycleEvaluation> evaluateCycle,
            long minimumProjectedCycles,
            out InfinityCycleProjection projection)
        {
            projection = default;
            if (evaluateCycle == null ||
                currentInfinityPoints < 0L ||
                !NumericSafety.IsFinite(availableSeconds) ||
                !NumericSafety.IsFinite(minimumCycleSeconds) ||
                availableSeconds <= 0d ||
                minimumCycleSeconds <= 0d ||
                minimumProjectedCycles <= 0L ||
                !SamplesAreOrdered(first, second, third))
            {
                return false;
            }

            if (!EvaluationMatchesSample(
                    evaluateCycle(first.StartingInfinityPoints),
                    first,
                    minimumCycleSeconds) ||
                !EvaluationMatchesSample(
                    evaluateCycle(second.StartingInfinityPoints),
                    second,
                    minimumCycleSeconds) ||
                !EvaluationMatchesSample(
                    evaluateCycle(third.StartingInfinityPoints),
                    third,
                    minimumCycleSeconds))
            {
                return false;
            }

            double remainingSeconds = availableSeconds;
            double consumedSeconds = 0d;
            long infinityPoints = currentInfinityPoints;
            long cycleCount = 0L;
            long lastReward = 0L;
            double lastDuration = 0d;
            int groups = 0;
            const int maximumGroups = 4096;
            while (remainingSeconds + 1e-12d >=
                       minimumCycleSeconds &&
                   groups++ < maximumGroups)
            {
                InfinityCycleEvaluation evaluation =
                    evaluateCycle(infinityPoints);
                if (!IsValidEvaluation(
                        evaluation,
                        minimumCycleSeconds))
                {
                    return false;
                }

                long cyclesByTime = ToLongSaturating(
                    Math.Floor(
                        (remainingSeconds + 1e-12d) /
                        evaluation.DurationSeconds));
                if (cyclesByTime <= 0L)
                    break;

                long firstChange = FindFirstChangedCycleStart(
                    infinityPoints,
                    evaluation,
                    minimumCycleSeconds,
                    evaluateCycle);
                long groupCycles = cyclesByTime;
                if (firstChange != long.MaxValue)
                {
                    long distance =
                        firstChange - infinityPoints;
                    long cyclesToChange = Math.Max(
                        1L,
                        distance / evaluation.Reward +
                        (distance % evaluation.Reward == 0L
                            ? 0L
                            : 1L));
                    groupCycles = Math.Min(
                        groupCycles,
                        cyclesToChange);
                }

                long gain = SaturatingMultiplyLong(
                    evaluation.Reward,
                    groupCycles);
                if (gain == long.MaxValue ||
                    infinityPoints > long.MaxValue - gain ||
                    cycleCount > long.MaxValue - groupCycles)
                {
                    // The canonical long-backed counters cannot represent
                    // this aggregate exactly. Leave the boundary to the
                    // saturating canonical path instead of inventing cycles.
                    return false;
                }
                double groupSeconds = NumericSafety.Multiply(
                    evaluation.DurationSeconds,
                    groupCycles).Value;
                if (!NumericSafety.IsFinite(groupSeconds) ||
                    groupSeconds <= 0d ||
                    groupSeconds >
                    remainingSeconds + 1e-9d)
                {
                    return false;
                }
                infinityPoints += gain;
                consumedSeconds = NumericSafety.Add(
                    consumedSeconds,
                    groupSeconds).Value;
                remainingSeconds = Math.Max(
                    0d,
                    availableSeconds - consumedSeconds);
                cycleCount += groupCycles;
                lastReward = evaluation.Reward;
                lastDuration = evaluation.DurationSeconds;
            }

            if (cycleCount < minimumProjectedCycles ||
                groups > maximumGroups ||
                consumedSeconds <= 0d)
            {
                return false;
            }

            projection = new InfinityCycleProjection(
                cycleCount,
                consumedSeconds,
                infinityPoints,
                lastReward,
                lastDuration,
                0d);
            return true;
        }

        private static bool EvaluationMatchesSample(
            InfinityCycleEvaluation evaluation,
            InfinityCycleSample sample,
            double minimumCycleSeconds)
        {
            return IsValidEvaluation(
                       evaluation,
                       minimumCycleSeconds) &&
                   evaluation.Reward == sample.Reward &&
                   Math.Abs(
                       evaluation.DurationSeconds -
                       sample.DurationSeconds) <= 1e-9d;
        }

        private static bool IsValidEvaluation(
            InfinityCycleEvaluation evaluation,
            double minimumCycleSeconds)
        {
            return evaluation.Reward > 0L &&
                   NumericSafety.IsFinite(
                       evaluation.DurationSeconds) &&
                   evaluation.DurationSeconds + 1e-12d >=
                       minimumCycleSeconds;
        }

        private static long FindFirstChangedCycleStart(
            long startingInfinityPoints,
            InfinityCycleEvaluation current,
            double minimumCycleSeconds,
            Func<long, InfinityCycleEvaluation> evaluateCycle)
        {
            if (startingInfinityPoints >= long.MaxValue ||
                current.Reward >= long.MaxValue)
            {
                return long.MaxValue;
            }

            bool Changed(long points)
            {
                InfinityCycleEvaluation candidate =
                    evaluateCycle(points);
                return !IsValidEvaluation(
                           candidate,
                           minimumCycleSeconds) ||
                       candidate.Reward != current.Reward ||
                       Math.Abs(
                           candidate.DurationSeconds -
                           current.DurationSeconds) > 1e-12d;
            }

            long low = startingInfinityPoints;
            long distance = Math.Max(
                1L,
                startingInfinityPoints / 16L);
            long high;
            while (true)
            {
                high = low > long.MaxValue - distance
                    ? long.MaxValue
                    : low + distance;
                if (Changed(high))
                    break;
                if (high == long.MaxValue)
                    return long.MaxValue;
                low = high;
                distance = distance > long.MaxValue / 2L
                    ? long.MaxValue
                    : distance * 2L;
            }

            long left = low + 1L;
            long right = high;
            while (left < right)
            {
                long middle =
                    left + (right - left) / 2L;
                if (Changed(middle))
                    right = middle;
                else
                    left = middle + 1L;
            }
            return left;
        }

        private static long SaturatingMultiplyLong(
            long left,
            long right)
        {
            if (left <= 0L || right <= 0L)
                return 0L;
            return left > long.MaxValue / right
                ? long.MaxValue
                : left * right;
        }

        private static long SaturatingAddLong(
            long left,
            long right)
        {
            if (left <= 0L) return Math.Max(0L, right);
            if (right <= 0L) return left;
            return left > long.MaxValue - right
                ? long.MaxValue
                : left + right;
        }

        private static bool SamplesAreOrdered(
            InfinityCycleSample first,
            InfinityCycleSample second,
            InfinityCycleSample third)
        {
            return first.StartingInfinityPoints <
                   second.StartingInfinityPoints &&
                   second.StartingInfinityPoints <
                   third.StartingInfinityPoints;
        }

        private static ProjectionEstimate Estimate(
            InfinityCycleSample anchor,
            long startingInfinityPoints,
            long cycleCount,
            double durationExponent,
            double rewardExponent,
            int requestedSegments,
            double minimumCycleSeconds)
        {
            if (cycleCount <= 0L)
            {
                return new ProjectionEstimate(
                    0L,
                    0d,
                    startingInfinityPoints,
                    anchor.Reward,
                    anchor.DurationSeconds);
            }

            int segments = (int)Math.Min(
                Math.Max(1, requestedSegments),
                cycleCount);
            long baseCycles = cycleCount / segments;
            long extraCycles = cycleCount % segments;
            double infinityPoints = startingInfinityPoints;
            double totalSeconds = 0d;
            double lastReward = anchor.Reward;
            double lastDuration = anchor.DurationSeconds;

            for (int segment = 0; segment < segments; segment++)
            {
                long segmentCycles =
                    baseCycles + (segment < extraCycles ? 1L : 0L);
                double rewardAtStart = EvaluatePowerModel(
                    anchor.StartingInfinityPoints,
                    anchor.Reward,
                    rewardExponent,
                    infinityPoints,
                    minimumValue: 1d);
                // The recurrence samples each cycle at its starting IP:
                // x_0, x_1, ... x_(n-1).  Its discrete midpoint is therefore
                // (n - 1) / 2, not n / 2.  Using n / 2 evaluates even a
                // single-cycle segment half a reward into the future and
                // systematically underestimates decreasing cycle durations.
                double midpointInfinityPoints = SaturatingAddDouble(
                    infinityPoints,
                    SaturatingMultiplyDouble(
                        rewardAtStart,
                        (segmentCycles - 1d) * 0.5d));
                double rewardAtMidpoint = EvaluatePowerModel(
                    anchor.StartingInfinityPoints,
                    anchor.Reward,
                    rewardExponent,
                    midpointInfinityPoints,
                    minimumValue: 1d);
                double durationAtMidpoint = EvaluatePowerModel(
                    anchor.StartingInfinityPoints,
                    anchor.DurationSeconds,
                    durationExponent,
                    midpointInfinityPoints,
                    minimumValue: minimumCycleSeconds);

                infinityPoints = SaturatingAddDouble(
                    infinityPoints,
                    SaturatingMultiplyDouble(
                        rewardAtMidpoint,
                        segmentCycles));
                totalSeconds = SaturatingAddDouble(
                    totalSeconds,
                    SaturatingMultiplyDouble(
                        durationAtMidpoint,
                        segmentCycles));
                lastReward = rewardAtMidpoint;
                lastDuration = durationAtMidpoint;
            }

            double consumedSeconds = Math.Max(
                cycleCount * minimumCycleSeconds,
                totalSeconds);
            return new ProjectionEstimate(
                cycleCount,
                consumedSeconds,
                ToLongSaturating(Math.Round(infinityPoints)),
                Math.Max(1L, ToLongSaturating(Math.Round(lastReward))),
                Math.Max(minimumCycleSeconds, lastDuration));
        }

        private static double FitExponent(
            long firstInfinityPoints,
            double firstValue,
            long secondInfinityPoints,
            double secondValue,
            double minimumExponent,
            double maximumExponent)
        {
            double firstX = EffectiveInfinityPoints(firstInfinityPoints);
            double secondX = EffectiveInfinityPoints(secondInfinityPoints);
            if (secondX <= firstX ||
                firstValue <= 0d ||
                secondValue <= 0d)
            {
                return 0d;
            }

            double denominator = Math.Log(secondX / firstX);
            if (!NumericSafety.IsFinite(denominator) ||
                Math.Abs(denominator) <= 1e-12d)
            {
                return 0d;
            }

            double exponent =
                Math.Log(secondValue / firstValue) / denominator;
            if (!NumericSafety.IsFinite(exponent))
                return 0d;
            return Math.Max(
                minimumExponent,
                Math.Min(maximumExponent, exponent));
        }

        private static double FitDurationExponent(
            long firstInfinityPoints,
            double firstDurationSeconds,
            long secondInfinityPoints,
            double secondDurationSeconds)
        {
            return FitExponent(
                firstInfinityPoints,
                firstDurationSeconds,
                secondInfinityPoints,
                secondDurationSeconds,
                minimumExponent: -4d,
                maximumExponent: 1d);
        }

        private static double EvaluatePowerModel(
            long anchorInfinityPoints,
            double anchorValue,
            double exponent,
            long infinityPoints,
            double minimumValue)
        {
            return EvaluatePowerModel(
                anchorInfinityPoints,
                anchorValue,
                exponent,
                (double)infinityPoints,
                minimumValue);
        }

        private static double EvaluatePowerModel(
            long anchorInfinityPoints,
            double anchorValue,
            double exponent,
            double infinityPoints,
            double minimumValue)
        {
            if (anchorValue <= 0d)
                return minimumValue;
            double ratio =
                EffectiveInfinityPoints(infinityPoints) /
                EffectiveInfinityPoints(anchorInfinityPoints);
            double value = anchorValue * Math.Pow(ratio, exponent);
            if (!NumericSafety.IsFinite(value))
                return double.MaxValue;
            return Math.Max(minimumValue, value);
        }

        private static double EffectiveInfinityPoints(long infinityPoints) =>
            EffectiveInfinityPoints((double)infinityPoints);

        private static double EffectiveInfinityPoints(double infinityPoints)
        {
            if (!NumericSafety.IsFinite(infinityPoints) ||
                infinityPoints >= double.MaxValue - 1d)
            {
                return double.MaxValue;
            }
            return Math.Max(1d, infinityPoints + 1d);
        }

        private static double RelativeError(
            double predicted,
            double actual)
        {
            if (!NumericSafety.IsFinite(predicted) ||
                !NumericSafety.IsFinite(actual))
            {
                return double.MaxValue;
            }
            return Math.Abs(predicted - actual) /
                   Math.Max(1d, Math.Abs(actual));
        }

        private static long SaturatingMultiply(long first, long second)
        {
            if (first <= 0L || second <= 0L)
                return 0L;
            if (first > long.MaxValue / second)
                return long.MaxValue;
            return first * second;
        }

        private static double SaturatingMultiplyDouble(
            double first,
            double second)
        {
            if (first <= 0d || second <= 0d)
                return 0d;
            if (first >= double.MaxValue / second)
                return double.MaxValue;
            return first * second;
        }

        private static double SaturatingAddDouble(
            double first,
            double second)
        {
            if (first >= double.MaxValue - second)
                return double.MaxValue;
            return first + second;
        }

        private static long ToLongSaturating(double value)
        {
            if (!NumericSafety.IsFinite(value) ||
                value >= long.MaxValue)
            {
                return long.MaxValue;
            }
            if (value <= 0d)
                return 0L;
            return (long)value;
        }

        private readonly struct ProjectionEstimate
        {
            public ProjectionEstimate(
                long cycleCount,
                double consumedSeconds,
                long finalInfinityPoints,
                long lastReward,
                double lastDurationSeconds)
            {
                CycleCount = cycleCount;
                ConsumedSeconds = consumedSeconds;
                FinalInfinityPoints = finalInfinityPoints;
                LastReward = lastReward;
                LastDurationSeconds = lastDurationSeconds;
            }

            public long CycleCount { get; }
            public double ConsumedSeconds { get; }
            public long FinalInfinityPoints { get; }
            public long LastReward { get; }
            public double LastDurationSeconds { get; }
        }
    }
}
