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

    public sealed class AdaptiveProjectionCheckpointFeedback
    {
        private const double TrendWeight = 0.25d;
        private double _errorTrend;
        private int _observationCount;

        public double GrowthAdjustment { get; private set; } = 1d;
        public double LastError { get; private set; }
        public double ErrorTrend => _errorTrend;

        public void Observe(
            double expectedDurationSeconds,
            long expectedReward,
            double observedDurationSeconds,
            long observedReward,
            double tolerance)
        {
            double durationError = SymmetricRelativeError(
                expectedDurationSeconds,
                observedDurationSeconds);
            double rewardError = SymmetricRelativeError(
                expectedReward,
                observedReward);
            LastError = Math.Max(durationError, rewardError);

            _errorTrend =
                _observationCount == 0
                    ? LastError * TrendWeight
                    : _errorTrend * (1d - TrendWeight) +
                      LastError * TrendWeight;
            _observationCount++;

            double safeTolerance =
                NumericSafety.IsFinite(tolerance) &&
                tolerance > 0d
                    ? tolerance
                    : 0.01d;
            double shrinkThreshold = Math.Max(
                0.15d,
                safeTolerance * 4d);
            if (_errorTrend > shrinkThreshold)
            {
                GrowthAdjustment = Math.Max(
                    0.25d,
                    GrowthAdjustment * 0.5d);
            }
            else if (_errorTrend <= shrinkThreshold * 0.25d)
            {
                GrowthAdjustment = Math.Min(
                    1d,
                    GrowthAdjustment * 1.25d);
            }
        }

        private static double SymmetricRelativeError(
            double expected,
            double observed)
        {
            if (!NumericSafety.IsFinite(expected) ||
                !NumericSafety.IsFinite(observed))
            {
                return double.MaxValue;
            }

            return Math.Abs(expected - observed) /
                   Math.Max(
                       1e-12d,
                       Math.Max(
                           Math.Abs(expected),
                           Math.Abs(observed)));
        }
    }

    public static class AdaptiveInfinityCycleSimulation
    {
        public static string LastStableProjectionDiagnostic
        {
            get;
            private set;
        }

        private const int CoarseIntegrationSegments = 128;
        private const int RefinedIntegrationSegments = 256;
        private const int EvaluatedCoarseIntegrationSegments = 128;
        private const int EvaluatedRefinedIntegrationSegments = 256;
        private const int MaximumEvaluatedSearchIterations = 16;
        private const long MinimumProjectedCycles = 8L;
        private const double MaximumValidationError =
            SimulationAccuracyContract.MaximumAggregateRelativeError;

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
            return TryProjectSecondsWithGrowthLimit(
                first,
                second,
                third,
                currentInfinityPoints,
                availableSeconds,
                minimumCycleSeconds,
                maximumRelativeIpGrowth: 0.25d,
                maximumValidationError: MaximumValidationError,
                enforceMonotoneIpPower: false,
                out projection);
        }

        public static bool TryProjectSampledSeconds(
            InfinityCycleSample first,
            InfinityCycleSample second,
            InfinityCycleSample third,
            long currentInfinityPoints,
            double availableSeconds,
            double minimumCycleSeconds,
            double maximumRelativeIpGrowth,
            out InfinityCycleProjection projection)
        {
            return TryProjectSecondsWithGrowthLimit(
                first,
                second,
                third,
                currentInfinityPoints,
                availableSeconds,
                minimumCycleSeconds,
                maximumRelativeIpGrowth,
                maximumValidationError: MaximumValidationError,
                enforceMonotoneIpPower: true,
                out projection);
        }

        public static bool TryProjectSampledSeconds(
            InfinityCycleSample first,
            InfinityCycleSample second,
            InfinityCycleSample third,
            long currentInfinityPoints,
            double availableSeconds,
            double minimumCycleSeconds,
            double maximumRelativeIpGrowth,
            double maximumValidationError,
            out InfinityCycleProjection projection)
        {
            return TryProjectSecondsWithGrowthLimit(
                first,
                second,
                third,
                currentInfinityPoints,
                availableSeconds,
                minimumCycleSeconds,
                maximumRelativeIpGrowth,
                maximumValidationError,
                enforceMonotoneIpPower: true,
                out projection);
        }

        private static bool TryProjectSecondsWithGrowthLimit(
            InfinityCycleSample first,
            InfinityCycleSample second,
            InfinityCycleSample third,
            long currentInfinityPoints,
            double availableSeconds,
            double minimumCycleSeconds,
            double maximumRelativeIpGrowth,
            double maximumValidationError,
            bool enforceMonotoneIpPower,
            out InfinityCycleProjection projection)
        {
            projection = default;
            if (currentInfinityPoints < 0L ||
                !NumericSafety.IsFinite(availableSeconds) ||
                !NumericSafety.IsFinite(minimumCycleSeconds) ||
                !NumericSafety.IsFinite(maximumRelativeIpGrowth) ||
                !NumericSafety.IsFinite(maximumValidationError) ||
                availableSeconds <= 0d ||
                minimumCycleSeconds <= 0d ||
                maximumRelativeIpGrowth <= 0d ||
                maximumValidationError <= 0d ||
                maximumValidationError >
                    SimulationAccuracyContract
                        .MaximumLongDurationRelativeError)
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
            if (durationError > maximumValidationError ||
                rewardError > maximumValidationError)
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
                third.DurationSeconds,
                maximumExponent:
                    enforceMonotoneIpPower ? 0d : 1d);
            double rewardExponent = FitExponent(
                second.StartingInfinityPoints,
                second.Reward,
                third.StartingInfinityPoints,
                third.Reward,
                minimumExponent:
                    enforceMonotoneIpPower ? 0d : -1d,
                maximumExponent: 4d);
            bool locallyConstant =
                Math.Abs(durationExponent) <= 1e-12d &&
                Math.Abs(rewardExponent) <= 1e-12d;
            long maximumProjectedInfinityPoints;
            if (locallyConstant && !enforceMonotoneIpPower)
            {
                maximumProjectedInfinityPoints = long.MaxValue;
            }
            else
            {
                long growth = Math.Max(
                    1L,
                    NumericSafety.ToLongFloor(
                        Math.Floor(
                            NumericSafety.Multiply(
                                currentInfinityPoints,
                                maximumRelativeIpGrowth).Value))
                        .Value);
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
            if (validationError > maximumValidationError)
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
        /// Uses the adaptive varying-IP projection only when the observed
        /// samples and the projected endpoint agree with an isolated
        /// candidate-state cycle evaluator. The projection remains bounded by
        /// the approved aggregate coarse/refined contract as
        /// <see cref="TryProjectSeconds"/>.
        /// </summary>
        public static bool TryProjectValidatedCycles(
            InfinityCycleSample first,
            InfinityCycleSample second,
            InfinityCycleSample third,
            long currentInfinityPoints,
            double availableSeconds,
            double minimumCycleSeconds,
            Func<long, InfinityCycleEvaluation> evaluateCycle,
            out InfinityCycleProjection projection)
        {
            projection = default;
            LastStableProjectionDiagnostic = null;
            if (evaluateCycle == null)
            {
                LastStableProjectionDiagnostic =
                    "missing_evaluator";
                return false;
            }

            InfinityCycleEvaluation firstEvaluation =
                evaluateCycle(first.StartingInfinityPoints);
            InfinityCycleEvaluation secondEvaluation =
                evaluateCycle(second.StartingInfinityPoints);
            InfinityCycleEvaluation thirdEvaluation =
                evaluateCycle(third.StartingInfinityPoints);
            if (!EvaluationApproximatelyMatchesObservedSample(
                    firstEvaluation,
                    first,
                    minimumCycleSeconds) ||
                !EvaluationApproximatelyMatchesObservedSample(
                    secondEvaluation,
                    second,
                    minimumCycleSeconds) ||
                !EvaluationApproximatelyMatchesObservedSample(
                    thirdEvaluation,
                    third,
                    minimumCycleSeconds))
            {
                LastStableProjectionDiagnostic =
                    "adaptive_sample_mismatch:" +
                    $"first={first.Reward}/" +
                    $"{first.DurationSeconds:R}->" +
                    $"{firstEvaluation.Reward}/" +
                    $"{firstEvaluation.DurationSeconds:R};" +
                    $"second={second.Reward}/" +
                    $"{second.DurationSeconds:R}->" +
                    $"{secondEvaluation.Reward}/" +
                    $"{secondEvaluation.DurationSeconds:R};" +
                    $"third={third.Reward}/" +
                    $"{third.DurationSeconds:R}->" +
                    $"{thirdEvaluation.Reward}/" +
                    $"{thirdEvaluation.DurationSeconds:R}";
                return false;
            }

            var normalizedFirst = new InfinityCycleSample(
                first.StartingInfinityPoints,
                firstEvaluation.Reward,
                first.DurationTicks,
                firstEvaluation.DurationSeconds);
            var normalizedSecond = new InfinityCycleSample(
                second.StartingInfinityPoints,
                secondEvaluation.Reward,
                second.DurationTicks,
                secondEvaluation.DurationSeconds);
            var normalizedThird = new InfinityCycleSample(
                third.StartingInfinityPoints,
                thirdEvaluation.Reward,
                third.DurationTicks,
                thirdEvaluation.DurationSeconds);
            if (!TryProjectEvaluatedCycles(
                    normalizedThird,
                    currentInfinityPoints,
                    availableSeconds,
                    minimumCycleSeconds,
                    evaluateCycle,
                    reserveEndpointCorrection: true,
                    minimumProjectedCycles: MinimumProjectedCycles,
                    out InfinityCycleProjection candidate))
            {
                if (string.IsNullOrEmpty(
                        LastStableProjectionDiagnostic))
                {
                    LastStableProjectionDiagnostic =
                        "evaluated_model_rejected";
                }
                return false;
            }

            // The direct integrator has already evaluated the actual candidate
            // graph at every exact cycle (for short blocks) or at every
            // deterministic midpoint (for compressed blocks), and compared
            // coarse/refined outcomes. Evaluating FinalInfinityPoints here
            // would describe the *next* cycle rather than the last projected
            // cycle and would incorrectly reject any genuinely changing
            // recurrence.
            projection = candidate;
            LastStableProjectionDiagnostic =
                "accepted_evaluated";
            return true;
        }

        /// <summary>
        /// Projects directly from an isolated evaluator whose structural
        /// signature has already been proven by its creator. This is used for
        /// durable post-reset bot-only states so a resumed stored-time job does
        /// not need to rediscover three empirical cycles before it can batch.
        /// Unsupported or changing graphs never create this evaluator.
        /// </summary>
        public static bool TryProjectValidatedState(
            long currentInfinityPoints,
            double availableSeconds,
            double minimumCycleSeconds,
            Func<long, InfinityCycleEvaluation> evaluateCycle,
            out InfinityCycleProjection projection)
        {
            projection = default;
            LastStableProjectionDiagnostic = null;
            if (evaluateCycle == null ||
                currentInfinityPoints < 0L)
            {
                LastStableProjectionDiagnostic =
                    "invalid_state_evaluator";
                return false;
            }

            InfinityCycleEvaluation current =
                evaluateCycle(currentInfinityPoints);
            if (!IsValidEvaluation(
                    current,
                    minimumCycleSeconds))
            {
                LastStableProjectionDiagnostic =
                    "invalid_state_evaluation";
                return false;
            }

            // Once the discrete IP balance is saturated, the multiplier and
            // therefore this structurally proven cycle are constant. Resets
            // still occur and must be counted, but their granted IP is zero.
            if (currentInfinityPoints == long.MaxValue)
            {
                long cappedCycles = ToLongSaturating(
                    Math.Floor(
                        (availableSeconds + 1e-12d) /
                        current.DurationSeconds));
                if (cappedCycles < 1L)
                {
                    LastStableProjectionDiagnostic =
                        "capped_state_too_short";
                    return false;
                }
                double cappedSeconds = NumericSafety.Multiply(
                    current.DurationSeconds,
                    cappedCycles).Value;
                if (!NumericSafety.IsFinite(cappedSeconds) ||
                    cappedSeconds <= 0d ||
                    cappedSeconds > availableSeconds + 1e-12d)
                {
                    LastStableProjectionDiagnostic =
                        "capped_state_invalid_duration";
                    return false;
                }

                projection = new InfinityCycleProjection(
                    cappedCycles,
                    cappedSeconds,
                    long.MaxValue,
                    0L,
                    current.DurationSeconds,
                    0d);
                LastStableProjectionDiagnostic =
                    "accepted_capped_state";
                return true;
            }

            // At the minimum cadence, increasing IP cannot shorten a cycle
            // further. The current monotone reward is therefore a lower bound
            // for every following grant. If even that lower bound reaches the
            // long cap before the final projected cycle, the observable result
            // is exact: all requested cycles occur, IP is capped, and the last
            // cycle grants zero.
            if (current.DurationSeconds <=
                    minimumCycleSeconds + 1e-12d &&
                current.Reward > 0L)
            {
                long availableCycles = ToLongSaturating(
                    Math.Floor(
                        (availableSeconds + 1e-12d) /
                        minimumCycleSeconds));
                long remainingPoints =
                    long.MaxValue - currentInfinityPoints;
                long cyclesToCapUpperBound =
                    remainingPoints / current.Reward +
                    (remainingPoints % current.Reward == 0L
                        ? 0L
                        : 1L);
                if (availableCycles > cyclesToCapUpperBound)
                {
                    double saturatedSeconds = NumericSafety.Multiply(
                        minimumCycleSeconds,
                        availableCycles).Value;
                    if (NumericSafety.IsFinite(saturatedSeconds) &&
                        saturatedSeconds > 0d &&
                        saturatedSeconds <=
                            availableSeconds + 1e-12d)
                    {
                        projection = new InfinityCycleProjection(
                            availableCycles,
                            saturatedSeconds,
                            long.MaxValue,
                            0L,
                            minimumCycleSeconds,
                            0d);
                        LastStableProjectionDiagnostic =
                            "accepted_proven_saturation";
                        return true;
                    }
                }
            }

            var anchor = new InfinityCycleSample(
                currentInfinityPoints,
                current.Reward,
                Math.Max(
                    1L,
                    ToLongSaturating(
                        Math.Ceiling(
                            current.DurationSeconds / 0.1d -
                            1e-9d))),
                current.DurationSeconds);
            if (!TryProjectEvaluatedCycles(
                    anchor,
                    currentInfinityPoints,
                    availableSeconds,
                    minimumCycleSeconds,
                    evaluateCycle,
                    reserveEndpointCorrection: false,
                    minimumProjectedCycles: 1L,
                    out projection))
            {
                if (string.IsNullOrEmpty(
                        LastStableProjectionDiagnostic))
                {
                    LastStableProjectionDiagnostic =
                        "state_model_rejected";
                }
                return false;
            }

            LastStableProjectionDiagnostic =
                "accepted_state";
            return true;
        }

        /// <summary>
        /// Projects a varying-IP recurrence by sampling the real isolated
        /// candidate evaluator rather than assuming that duration and reward
        /// follow one global power curve. Short projections are evaluated
        /// cycle-by-cycle; larger projections compare two deterministic
        /// midpoint integrations and are accepted only inside the configured
        /// validation tolerance.
        /// </summary>
        private static bool TryProjectEvaluatedCycles(
            InfinityCycleSample anchor,
            long currentInfinityPoints,
            double availableSeconds,
            double minimumCycleSeconds,
            Func<long, InfinityCycleEvaluation> evaluateCycle,
            bool reserveEndpointCorrection,
            long minimumProjectedCycles,
            out InfinityCycleProjection projection)
        {
            projection = default;
            double correctionReserve =
                reserveEndpointCorrection
                    ? Math.Max(
                        1d,
                        NumericSafety.Multiply(
                            anchor.DurationSeconds,
                            2d).Value)
                    : 0d;
            double projectionBudget =
                availableSeconds - correctionReserve;
            if (projectionBudget <
                minimumProjectedCycles * minimumCycleSeconds)
            {
                LastStableProjectionDiagnostic =
                    $"evaluated_budget:{projectionBudget:R}";
                return false;
            }

            InfinityCycleEvaluation startingEvaluation =
                evaluateCycle(currentInfinityPoints);
            if (!IsValidEvaluation(
                    startingEvaluation,
                    minimumCycleSeconds))
            {
                LastStableProjectionDiagnostic =
                    "evaluated_invalid_start";
                return false;
            }

            long low = 0L;
            long high = 0L;
            long candidate = Math.Max(
                minimumProjectedCycles,
                ToLongSaturating(
                    Math.Floor(
                        projectionBudget /
                        startingEvaluation.DurationSeconds)));
            EvaluatedProjectionEstimate best = default;
            for (int iteration = 0;
                 iteration < MaximumEvaluatedSearchIterations;
                 iteration++)
            {
                EvaluatedProjectionEstimate estimate =
                    EstimateWithEvaluator(
                        currentInfinityPoints,
                        candidate,
                        EvaluatedRefinedIntegrationSegments,
                        minimumCycleSeconds,
                        evaluateCycle);
                if (!estimate.IsValid)
                {
                    LastStableProjectionDiagnostic =
                        "evaluated_search_invalid";
                    return false;
                }

                if (estimate.ConsumedSeconds >
                    projectionBudget + 1e-12d)
                {
                    high = candidate;
                    break;
                }

                low = candidate;
                best = estimate;
                double remaining =
                    projectionBudget -
                    estimate.ConsumedSeconds;
                long step = ToLongSaturating(
                    Math.Floor(
                        remaining /
                        Math.Max(
                            minimumCycleSeconds,
                            estimate.LastDurationSeconds)));
                if (step <= 0L)
                {
                    high = candidate == long.MaxValue
                        ? long.MaxValue
                        : candidate + 1L;
                    break;
                }
                if (candidate > long.MaxValue - step)
                {
                    high = long.MaxValue;
                    break;
                }
                candidate += step;
            }

            if (high == 0L)
            {
                // The bounded fit did not form a bracket. A conservative
                // fallback preserves correctness without returning to a
                // full-range binary search.
                LastStableProjectionDiagnostic =
                    "evaluated_unbracketed";
                return false;
            }

            while (low + 1L < high)
            {
                long middle =
                    low + (high - low) / 2L;
                EvaluatedProjectionEstimate estimate =
                    EstimateWithEvaluator(
                        currentInfinityPoints,
                        middle,
                        EvaluatedRefinedIntegrationSegments,
                        minimumCycleSeconds,
                        evaluateCycle);
                if (!estimate.IsValid)
                    return false;
                if (estimate.ConsumedSeconds <=
                    projectionBudget + 1e-12d)
                {
                    low = middle;
                    best = estimate;
                }
                else
                {
                    high = middle;
                }
            }

            if (low < minimumProjectedCycles)
            {
                LastStableProjectionDiagnostic =
                    $"evaluated_too_few:{low}";
                return false;
            }
            if (!best.IsValid ||
                best.CycleCount != low)
            {
                best = EstimateWithEvaluator(
                    currentInfinityPoints,
                    low,
                    EvaluatedRefinedIntegrationSegments,
                    minimumCycleSeconds,
                    evaluateCycle);
            }
            if (!best.IsValid ||
                best.ConsumedSeconds <= 0d ||
                best.ConsumedSeconds >
                    projectionBudget + 1e-12d)
            {
                LastStableProjectionDiagnostic =
                    $"evaluated_best_invalid:" +
                    $"{best.IsValid}/{best.ConsumedSeconds:R}/" +
                    $"{projectionBudget:R}";
                return false;
            }

            EvaluatedProjectionEstimate coarse =
                EstimateWithEvaluator(
                    currentInfinityPoints,
                    low,
                    EvaluatedCoarseIntegrationSegments,
                    minimumCycleSeconds,
                    evaluateCycle);
            if (!coarse.IsValid)
            {
                LastStableProjectionDiagnostic =
                    "evaluated_coarse_invalid";
                return false;
            }

            double validationError = Math.Max(
                RelativeError(
                    coarse.ConsumedSeconds,
                    best.ConsumedSeconds),
                RelativeError(
                    coarse.FinalInfinityPoints,
                    best.FinalInfinityPoints));
            validationError = Math.Max(
                validationError,
                Math.Max(
                    RelativeError(
                        coarse.LastReward,
                        best.LastReward),
                    RelativeError(
                        coarse.LastDurationSeconds,
                        best.LastDurationSeconds)));
            if (validationError > MaximumValidationError)
            {
                LastStableProjectionDiagnostic =
                    $"evaluated_divergence:{validationError:R}";
                return false;
            }

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
            LastStableProjectionDiagnostic = null;
            if (evaluateCycle == null ||
                currentInfinityPoints < 0L ||
                !NumericSafety.IsFinite(availableSeconds) ||
                !NumericSafety.IsFinite(minimumCycleSeconds) ||
                availableSeconds <= 0d ||
                minimumCycleSeconds <= 0d ||
                minimumProjectedCycles <= 0L ||
                !SamplesAreOrdered(first, second, third))
            {
                LastStableProjectionDiagnostic =
                    "invalid_contract";
                return false;
            }

            InfinityCycleEvaluation firstEvaluation =
                evaluateCycle(first.StartingInfinityPoints);
            InfinityCycleEvaluation secondEvaluation =
                evaluateCycle(second.StartingInfinityPoints);
            InfinityCycleEvaluation thirdEvaluation =
                evaluateCycle(third.StartingInfinityPoints);
            if (!EvaluationMatchesSample(
                    firstEvaluation,
                    first,
                    minimumCycleSeconds) ||
                !EvaluationMatchesSample(
                    secondEvaluation,
                    second,
                    minimumCycleSeconds) ||
                !EvaluationMatchesSample(
                    thirdEvaluation,
                    third,
                    minimumCycleSeconds))
            {
                LastStableProjectionDiagnostic =
                    "sample_mismatch:" +
                    $"first={first.StartingInfinityPoints}/" +
                    $"{first.Reward}/{first.DurationSeconds:R}->" +
                    $"{firstEvaluation.Reward}/" +
                    $"{firstEvaluation.DurationSeconds:R};" +
                    $"second={second.StartingInfinityPoints}/" +
                    $"{second.Reward}/{second.DurationSeconds:R}->" +
                    $"{secondEvaluation.Reward}/" +
                    $"{secondEvaluation.DurationSeconds:R};" +
                    $"third={third.StartingInfinityPoints}/" +
                    $"{third.Reward}/{third.DurationSeconds:R}->" +
                    $"{thirdEvaluation.Reward}/" +
                    $"{thirdEvaluation.DurationSeconds:R}";
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
                    LastStableProjectionDiagnostic =
                        "invalid_evaluation";
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
                LastStableProjectionDiagnostic =
                    "insufficient_projection";
                return false;
            }

            projection = new InfinityCycleProjection(
                cycleCount,
                consumedSeconds,
                infinityPoints,
                lastReward,
                lastDuration,
                0d);
            LastStableProjectionDiagnostic = "accepted";
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

        private static bool EvaluationApproximatelyMatchesObservedSample(
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
                       sample.DurationSeconds) <=
                   minimumCycleSeconds + 1e-9d;
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

        private static EvaluatedProjectionEstimate EstimateWithEvaluator(
            long startingInfinityPoints,
            long cycleCount,
            int requestedSegments,
            double minimumCycleSeconds,
            Func<long, InfinityCycleEvaluation> evaluateCycle)
        {
            if (cycleCount <= 0L)
            {
                InfinityCycleEvaluation current =
                    evaluateCycle(startingInfinityPoints);
                return IsValidEvaluation(
                           current,
                           minimumCycleSeconds)
                    ? new EvaluatedProjectionEstimate(
                        true,
                        0L,
                        0d,
                        startingInfinityPoints,
                        current.Reward,
                        current.DurationSeconds)
                    : default;
            }

            int segments = (int)Math.Min(
                Math.Max(1, requestedSegments),
                cycleCount);
            long baseCycles = cycleCount / segments;
            long extraCycles = cycleCount % segments;
            long infinityPoints = startingInfinityPoints;
            double totalSeconds = 0d;
            long lastReward = 0L;
            double lastDuration = 0d;

            for (int segment = 0;
                 segment < segments;
                 segment++)
            {
                long segmentCycles =
                    baseCycles +
                    (segment < extraCycles ? 1L : 0L);
                InfinityCycleEvaluation start =
                    evaluateCycle(infinityPoints);
                if (!IsValidEvaluation(
                        start,
                        minimumCycleSeconds))
                {
                    return default;
                }

                // When the requested segment contains a single cycle this is
                // the exact recurrence. Larger segments sample the evaluator
                // at the discrete midpoint cycle, matching x_0...x_(n-1).
                InfinityCycleEvaluation midpoint = start;
                if (segmentCycles > 1L)
                {
                    double midpointGain =
                        SaturatingMultiplyDouble(
                            start.Reward,
                            (segmentCycles - 1d) * 0.5d);
                    double midpointPoints =
                        SaturatingAddDouble(
                            infinityPoints,
                            midpointGain);
                    if (!NumericSafety.IsFinite(midpointPoints) ||
                        midpointPoints >= long.MaxValue)
                    {
                        return default;
                    }
                    midpoint = evaluateCycle(
                        ToLongSaturating(
                            Math.Round(midpointPoints)));
                    if (!IsValidEvaluation(
                            midpoint,
                            minimumCycleSeconds) ||
                        midpoint.Reward < start.Reward ||
                        midpoint.DurationSeconds >
                            start.DurationSeconds + 1e-12d)
                    {
                        return default;
                    }
                }

                long segmentGain = SaturatingMultiplyLong(
                    midpoint.Reward,
                    segmentCycles);
                if (segmentGain == long.MaxValue ||
                    infinityPoints >
                        long.MaxValue - segmentGain)
                {
                    return default;
                }
                double segmentSeconds =
                    NumericSafety.Multiply(
                        midpoint.DurationSeconds,
                        segmentCycles).Value;
                if (!NumericSafety.IsFinite(segmentSeconds) ||
                    segmentSeconds <= 0d)
                {
                    return default;
                }
                double nextTotal = NumericSafety.Add(
                    totalSeconds,
                    segmentSeconds).Value;
                if (!NumericSafety.IsFinite(nextTotal))
                    return default;

                infinityPoints += segmentGain;
                totalSeconds = nextTotal;
                lastReward = midpoint.Reward;
                lastDuration = midpoint.DurationSeconds;
            }

            return new EvaluatedProjectionEstimate(
                true,
                cycleCount,
                totalSeconds,
                infinityPoints,
                lastReward,
                lastDuration);
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
            double secondDurationSeconds,
            double maximumExponent = 1d)
        {
            return FitExponent(
                firstInfinityPoints,
                firstDurationSeconds,
                secondInfinityPoints,
                secondDurationSeconds,
                minimumExponent: -4d,
                maximumExponent);
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

        private readonly struct EvaluatedProjectionEstimate
        {
            public EvaluatedProjectionEstimate(
                bool isValid,
                long cycleCount,
                double consumedSeconds,
                long finalInfinityPoints,
                long lastReward,
                double lastDurationSeconds)
            {
                IsValid = isValid;
                CycleCount = cycleCount;
                ConsumedSeconds = consumedSeconds;
                FinalInfinityPoints = finalInfinityPoints;
                LastReward = lastReward;
                LastDurationSeconds = lastDurationSeconds;
            }

            public bool IsValid { get; }
            public long CycleCount { get; }
            public double ConsumedSeconds { get; }
            public long FinalInfinityPoints { get; }
            public long LastReward { get; }
            public double LastDurationSeconds { get; }
        }
    }
}
