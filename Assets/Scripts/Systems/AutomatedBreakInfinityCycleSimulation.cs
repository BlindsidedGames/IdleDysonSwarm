/*
 * Purpose: Pure bounded reference accelerator for Break Infinity cycles whose
 * duration is still long enough to contain Dyson automation events.
 * Scope: An isolated save candidate, captured model-only automation rules, and
 * post-reset states without persistent skill side effects.
 */

using System;
using System.Collections;
using System.Collections.Generic;
using System.Reflection;
using Systems.Skills;
using Systems.Numeric;
using static Expansion.Oracle;

namespace Systems.Simulation
{
    public readonly struct AutomatedBreakInfinityProjection
    {
        public AutomatedBreakInfinityProjection(
            SaveDataSettings candidate,
            long cycleCount,
            double consumedSeconds,
            long totalReward,
            long lastReward,
            double lastDurationSeconds,
            long automationEvents,
            double automationTimeUntilNextEvent,
            double validationError = 0d)
        {
            Candidate = candidate;
            CycleCount = cycleCount;
            ConsumedSeconds = consumedSeconds;
            TotalReward = totalReward;
            LastReward = lastReward;
            LastDurationSeconds = lastDurationSeconds;
            AutomationEvents = automationEvents;
            AutomationTimeUntilNextEvent =
                automationTimeUntilNextEvent;
            ValidationError = validationError;
        }

        public SaveDataSettings Candidate { get; }
        public long CycleCount { get; }
        public double ConsumedSeconds { get; }
        public long TotalReward { get; }
        public long LastReward { get; }
        public double LastDurationSeconds { get; }
        public long AutomationEvents { get; }
        public double AutomationTimeUntilNextEvent { get; }
        public double ValidationError { get; }
    }

    public static class AutomatedBreakInfinityCycleSimulation
    {
        private const double TimeEpsilon = 1e-12d;
        private const long MinimumAdaptiveCycles = 8L;
        private const long MaximumExactVariableCyclesPerBlock = 1L;
        private const int CoarseProjectionSegments = 4;
        private const int RefinedProjectionSegments = 8;
        private const int MaximumRefinedProjectionSegments = 128;
        private const long MaximumCycleBoundaries = 1_000_000L;
        private const int MaximumCycleBoundariesPerProjectionStep = 16;
        private const long MinimumAnalyticalAutomationBatchTicks = 2L;
        private const long MaximumAnalyticalAutomationTicksPerStep =
            1_000_000_000L;
        public static string LastDiagnostic { get; private set; }
        public static string LastAdaptiveDiagnostic { get; private set; }
        public static string LastAcceptedAdaptiveDiagnostic {
            get;
            private set;
        }
        public static long LastSuggestedMaximumCycles {
            get;
            private set;
        }
        public static long MaximumAcceptedAdaptiveCycleCount {
            get;
            private set;
        }
        public static long DiagnosticCycleEvaluations {
            get;
            private set;
        }
        public static long DiagnosticCycleBoundaries {
            get;
            private set;
        }
        public static long DiagnosticAutomationEvents {
            get;
            private set;
        }
        public static long DiagnosticProductionTicks {
            get;
            private set;
        }
        public static long DiagnosticAutomationTicks {
            get;
            private set;
        }
        public static long DiagnosticDerivedTicks {
            get;
            private set;
        }
        public static long DiagnosticResetTicks {
            get;
            private set;
        }
        public static string DiagnosticBlockTrace {
            get;
            private set;
        }

        public sealed class ProjectionWork
        {
            internal ProjectionWork(
                SaveDataSettings startingSettings,
                DysonFacilityAutomationRule[] facilityRules,
                ResearchAutomationRule[] researchRules,
                InfinityResetPolicy resetPolicy,
                Func<double, long> calculateReward,
                long rewardTarget,
                double resetBotThreshold,
                double minimumCycleSeconds,
                double automationIntervalSeconds,
                double automationTimeUntilNextEvent,
                double availableSeconds,
                long maximumCycles,
                SimulationAutomationPolicy automationPolicy)
            {
                StartingSettings = startingSettings;
                FacilityRules = facilityRules;
                ResearchRules = researchRules;
                ResetPolicy = resetPolicy;
                CalculateReward = calculateReward;
                RewardTarget = rewardTarget;
                ResetBotThreshold = resetBotThreshold;
                MinimumCycleSeconds = minimumCycleSeconds;
                AutomationIntervalSeconds = automationIntervalSeconds;
                AutomationTimeUntilNextEvent =
                    automationTimeUntilNextEvent;
                AvailableSeconds = availableSeconds;
                MaximumCycles = maximumCycles;
                AutomationPolicy = automationPolicy;
            }

            internal SaveDataSettings StartingSettings { get; }
            internal DysonFacilityAutomationRule[] FacilityRules {
                get;
            }
            internal ResearchAutomationRule[] ResearchRules { get; }
            internal InfinityResetPolicy ResetPolicy { get; }
            internal Func<double, long> CalculateReward { get; }
            internal long RewardTarget { get; }
            internal double ResetBotThreshold { get; }
            internal double MinimumCycleSeconds { get; }
            internal double AutomationIntervalSeconds { get; }
            internal double AutomationTimeUntilNextEvent { get; }
            internal double AvailableSeconds { get; }
            internal long MaximumCycles { get; }
            internal SimulationAutomationPolicy AutomationPolicy {
                get;
            }
            internal SaveDataSettings Committed { get; set; }
            internal ProjectionEstimator Coarse { get; set; }
            internal ProjectionEstimator Refined { get; set; }
            internal ProjectionEstimate CoarseResult { get; set; }
            internal ProjectionEstimate RefinedResult { get; set; }
            internal CycleExecution ProbeCycle { get; set; }
            internal CycleExecution CoarseEndpointCycle { get; set; }
            internal CycleExecution RefinedEndpointCycle { get; set; }
            internal EndpointCycleEvaluation CoarseEndpoint {
                get;
                set;
            }
            internal double EstimateError { get; set; }
            internal string EstimateReason { get; set; }
            internal double ProbeDuration { get; set; }
            internal long ProbeReward { get; set; }
            internal long CandidateCycles { get; set; }
            internal int SegmentMultiplier { get; set; } = 1;
            internal int Stage { get; set; }

            public bool IsCompleted { get; internal set; }
            public bool Accepted { get; internal set; }
            public AutomatedBreakInfinityProjection Projection {
                get;
                internal set;
            }
            public string Diagnostic { get; internal set; }
            public long RequestedCycleLimit => MaximumCycles;
        }

        public static ProjectionWork CreateProjectionWork(
            SaveDataSettings startingSettings,
            DysonFacilityAutomationRule[] facilityRules,
            ResearchAutomationRule[] researchRules,
            InfinityResetPolicy resetPolicy,
            Func<double, long> calculateReward,
            long rewardTarget,
            double resetBotThreshold,
            double minimumCycleSeconds,
            double automationIntervalSeconds,
            double automationTimeUntilNextEvent,
            double availableSeconds,
            long maximumCycles,
            SimulationAutomationPolicy automationPolicy)
        {
            return new ProjectionWork(
                startingSettings,
                facilityRules,
                researchRules,
                resetPolicy,
                calculateReward,
                rewardTarget,
                resetBotThreshold,
                minimumCycleSeconds,
                automationIntervalSeconds,
                automationTimeUntilNextEvent,
                availableSeconds,
                maximumCycles,
                automationPolicy);
        }

        public static void StepProjectionWork(ProjectionWork work)
        {
            if (work == null || work.IsCompleted)
                return;

            switch (work.Stage)
            {
                case 0:
                    InitializeProjectionWork(work);
                    return;
                case 1:
                    ProbeProjectionWork(work);
                    return;
                case 2:
                    StepCoarseProjection(work);
                    return;
                case 3:
                    StepRefinedProjection(work);
                    return;
                case 4:
                    StepCoarseEndpointProjection(work);
                    return;
                case 5:
                    StepRefinedEndpointProjection(work);
                    return;
                default:
                    RejectProjectionWork(
                        work,
                        "invalid_work_stage");
                    return;
            }
        }

        public static void ResetWorkDiagnostics()
        {
#if UNITY_EDITOR
            DiagnosticCycleEvaluations = 0L;
            DiagnosticCycleBoundaries = 0L;
            DiagnosticAutomationEvents = 0L;
            DiagnosticProductionTicks = 0L;
            DiagnosticAutomationTicks = 0L;
            DiagnosticDerivedTicks = 0L;
            DiagnosticResetTicks = 0L;
            LastAcceptedAdaptiveDiagnostic = null;
            MaximumAcceptedAdaptiveCycleCount = 0L;
            DiagnosticBlockTrace = null;
#endif
        }

        public static void RecordBlockDiagnostic(
            bool accepted,
            long projectedCycles)
        {
#if UNITY_EDITOR
            string item =
                $"{(accepted ? "ok" : "reject")}:" +
                $"{projectedCycles}:" +
                $"{LastDiagnostic ?? "-"}:" +
                $"{LastAdaptiveDiagnostic ?? "-"}";
            DiagnosticBlockTrace =
                string.IsNullOrEmpty(DiagnosticBlockTrace)
                    ? item
                    : DiagnosticBlockTrace + "|" + item;
#endif
        }

        private static void InitializeProjectionWork(
            ProjectionWork work)
        {
            LastDiagnostic = null;
            LastAdaptiveDiagnostic = null;
            LastSuggestedMaximumCycles = 0L;
            if (work.StartingSettings == null ||
                work.ResetPolicy == null ||
                work.CalculateReward == null ||
                work.RewardTarget <= 0L ||
                !NumericSafety.IsFinite(work.ResetBotThreshold) ||
                work.ResetBotThreshold <= 0d ||
                !NumericSafety.IsFinite(work.MinimumCycleSeconds) ||
                work.MinimumCycleSeconds <= 0d ||
                !NumericSafety.IsFinite(work.AutomationIntervalSeconds) ||
                work.AutomationIntervalSeconds <= 0d ||
                !NumericSafety.IsFinite(work.AvailableSeconds) ||
                work.AvailableSeconds <= 0d ||
                work.MaximumCycles < MinimumAdaptiveCycles)
            {
                RejectProjectionWork(work, "invalid_request");
                return;
            }

            try
            {
                work.Committed = CloneSimulationCandidate(
                    work.StartingSettings);
            }
            catch
            {
                RejectProjectionWork(work, "clone_failed");
                return;
            }
            if (!HasState(work.Committed))
            {
                RejectProjectionWork(work, "missing_state");
                return;
            }
            work.Committed.simulationStatistics = null;
            work.Stage = 1;
        }

        private static void ProbeProjectionWork(
            ProjectionWork work)
        {
            if (work.ProbeCycle == null)
            {
                SaveDataSettings probe;
                try
                {
                    probe = CloneSimulationCandidate(
                        work.Committed);
                }
                catch
                {
                    RejectProjectionWork(
                        work,
                        "probe_clone_failed");
                    return;
                }
                work.ProbeCycle = CreateCycleExecution(
                    probe,
                    work.FacilityRules,
                    work.ResearchRules,
                    work.ResetPolicy,
                    work.CalculateReward,
                    work.RewardTarget,
                    work.ResetBotThreshold,
                    work.MinimumCycleSeconds,
                    work.AutomationIntervalSeconds,
                    NormalizeAutomationRemaining(
                        work.AutomationTimeUntilNextEvent,
                        work.AutomationIntervalSeconds),
                    work.AutomationPolicy,
                    work.AvailableSeconds);
            }

            StepCycleExecution(
                work.ProbeCycle,
                MaximumCycleBoundariesPerProjectionStep);
            if (!work.ProbeCycle.IsCompleted)
            {
                return;
            }
            if (work.ProbeCycle.HorizonReached)
            {
                RejectProjectionWork(
                    work,
                    work.ProbeCycle.Diagnostic ??
                    "cycle_exceeds_available_time");
                return;
            }
            if (!work.ProbeCycle.Accepted)
            {
                RejectProjectionWork(
                    work,
                    work.ProbeCycle.Diagnostic ??
                    LastDiagnostic ??
                    "probe_rejected");
                return;
            }
            if (!ResetOwnedStateMatches(
                    work.Committed,
                    // The cycle mutates only its isolated probe. Its reset
                    // signature must still match the committed start state.
                    work.ProbeCycle.Candidate))
            {
                RejectProjectionWork(
                    work,
                    "reset_signature_changed");
                return;
            }
            double probeDuration =
                work.ProbeCycle.Duration;
            long probeReward =
                work.ProbeCycle.RewardGranted;
            long endpointCycleLimit =
                NumericSafety.ToLongFloor(
                    Math.Floor(
                        work.AvailableSeconds /
                        Math.Max(
                            work.MinimumCycleSeconds,
                            probeDuration))).Value;
            work.CandidateCycles = Math.Min(
                work.MaximumCycles,
                endpointCycleLimit);
            work.ProbeDuration = probeDuration;
            work.ProbeReward = probeReward;
            if (work.CandidateCycles < MinimumAdaptiveCycles)
            {
                RejectProjectionWork(work, "no_candidate");
                return;
            }
            BeginProjectionAttempt(work);
        }

        private static void BeginProjectionAttempt(
            ProjectionWork work)
        {
            int coarseSegments =
                (int)Math.Min(
                    work.CandidateCycles,
                    (long)CoarseProjectionSegments *
                    work.SegmentMultiplier);
            work.Coarse = new ProjectionEstimator(
                work.Committed,
                work.FacilityRules,
                work.ResearchRules,
                work.ResetPolicy,
                work.CalculateReward,
                work.RewardTarget,
                work.ResetBotThreshold,
                work.MinimumCycleSeconds,
                work.AutomationIntervalSeconds,
                NormalizeAutomationRemaining(
                    work.AutomationTimeUntilNextEvent,
                    work.AutomationIntervalSeconds),
                work.CandidateCycles,
                coarseSegments,
                work.AutomationPolicy,
                work.ProbeDuration,
                work.ProbeReward,
                work.AvailableSeconds);
            work.Refined = null;
            work.Stage = 2;
        }

        private static void StepCoarseProjection(
            ProjectionWork work)
        {
            work.Coarse.Step();
            if (!work.Coarse.IsCompleted)
                return;
            work.CoarseResult = work.Coarse.Result;
            int refinedSegments = (int)Math.Min(
                work.CandidateCycles,
                (long)RefinedProjectionSegments *
                work.SegmentMultiplier);
            work.Refined = new ProjectionEstimator(
                work.Committed,
                work.FacilityRules,
                work.ResearchRules,
                work.ResetPolicy,
                work.CalculateReward,
                work.RewardTarget,
                work.ResetBotThreshold,
                work.MinimumCycleSeconds,
                work.AutomationIntervalSeconds,
                NormalizeAutomationRemaining(
                    work.AutomationTimeUntilNextEvent,
                    work.AutomationIntervalSeconds),
                work.CandidateCycles,
                refinedSegments,
                work.AutomationPolicy,
                work.ProbeDuration,
                work.ProbeReward,
                work.AvailableSeconds);
            work.Stage = 3;
        }

        private static void StepRefinedProjection(
            ProjectionWork work)
        {
            work.Refined.Step();
            if (!work.Refined.IsCompleted)
                return;

            work.RefinedResult = work.Refined.Result;
            bool sampledSignatureChanged =
                work.Coarse.SignatureChanged ||
                work.Refined.SignatureChanged;
            double error = double.MaxValue;
            string reason = null;
            bool estimatesValidated =
                !sampledSignatureChanged &&
                TryValidateProjectionEstimates(
                    work.CoarseResult,
                    work.RefinedResult,
                    work.MinimumCycleSeconds,
                    work.AutomationIntervalSeconds,
                    work.AvailableSeconds,
                    work.AutomationPolicy,
                    work.CandidateCycles,
                    out error,
                    out reason);
            if (!estimatesValidated)
            {
                if (sampledSignatureChanged)
                    reason =
                        "sampled_reset_signature_changed";
                HandleProjectionAttemptFailure(
                    work,
                    sampledSignatureChanged,
                    endpointStable: true,
                    reason);
                return;
            }

            work.EstimateError = error;
            work.EstimateReason = reason;
            if (!TryCreateEndpointCycle(
                    work.CoarseResult,
                    work,
                    out CycleExecution coarseEndpoint))
            {
                HandleProjectionAttemptFailure(
                    work,
                    sampledSignatureChanged: false,
                    endpointStable: false,
                    "endpoint_projection_rejected");
                return;
            }
            work.CoarseEndpointCycle = coarseEndpoint;
            work.Stage = 4;
        }

        private static void StepCoarseEndpointProjection(
            ProjectionWork work)
        {
            StepCycleExecution(
                work.CoarseEndpointCycle,
                MaximumCycleBoundariesPerProjectionStep);
            if (!work.CoarseEndpointCycle.IsCompleted)
                return;
            if (!TryCreateEndpointEvaluation(
                    work.CoarseResult,
                    work.CoarseEndpointCycle,
                    out EndpointCycleEvaluation evaluation) ||
                !TryCreateEndpointCycle(
                    work.RefinedResult,
                    work,
                    out CycleExecution refinedEndpoint))
            {
                HandleProjectionAttemptFailure(
                    work,
                    sampledSignatureChanged: false,
                    endpointStable: false,
                    "endpoint_projection_rejected");
                return;
            }
            work.CoarseEndpoint = evaluation;
            work.RefinedEndpointCycle = refinedEndpoint;
            work.Stage = 5;
        }

        private static void StepRefinedEndpointProjection(
            ProjectionWork work)
        {
            StepCycleExecution(
                work.RefinedEndpointCycle,
                MaximumCycleBoundariesPerProjectionStep);
            if (!work.RefinedEndpointCycle.IsCompleted)
                return;
            double endpointError = double.MaxValue;
            bool endpointStable =
                TryCreateEndpointEvaluation(
                    work.RefinedResult,
                    work.RefinedEndpointCycle,
                    out EndpointCycleEvaluation refinedEndpoint) &&
                TryValidateEndpointEvaluations(
                    work.CoarseResult,
                    work.RefinedResult,
                    work.CoarseEndpoint,
                    refinedEndpoint,
                    out endpointError);
            if (!endpointStable)
            {
                HandleProjectionAttemptFailure(
                    work,
                    sampledSignatureChanged: false,
                    endpointStable: false,
                    "endpoint_projection_diverged");
                return;
            }

            double error = Math.Max(
                work.EstimateError,
                endpointError);
            work.Projection = CreateProjection(
                work.StartingSettings,
                work.RefinedResult,
                work.CandidateCycles,
                error);
            work.Accepted = true;
            work.IsCompleted = true;
            work.Diagnostic =
                $"accepted:{work.CandidateCycles}/" +
                $"{error:R}/{work.EstimateReason}";
            LastAdaptiveDiagnostic = work.Diagnostic;
            LastAcceptedAdaptiveDiagnostic =
                work.Diagnostic;
            MaximumAcceptedAdaptiveCycleCount = Math.Max(
                MaximumAcceptedAdaptiveCycleCount,
                work.CandidateCycles);
            LastDiagnostic = "accepted_adaptive";
        }

        private static bool TryCreateEndpointCycle(
            ProjectionEstimate estimate,
            ProjectionWork work,
            out CycleExecution execution)
        {
            execution = null;
            if (!estimate.Valid ||
                !HasState(estimate.Candidate))
            {
                return false;
            }
            SaveDataSettings endpoint;
            try
            {
                endpoint = CloneSimulationCandidate(
                    estimate.Candidate);
            }
            catch
            {
                return false;
            }
            execution = CreateCycleExecution(
                endpoint,
                work.FacilityRules,
                work.ResearchRules,
                work.ResetPolicy,
                work.CalculateReward,
                work.RewardTarget,
                work.ResetBotThreshold,
                work.MinimumCycleSeconds,
                work.AutomationIntervalSeconds,
                estimate.AutomationRemaining,
                work.AutomationPolicy,
                Math.Max(
                    0d,
                    work.AvailableSeconds -
                    estimate.ConsumedSeconds));
            return true;
        }

        private static bool TryCreateEndpointEvaluation(
            ProjectionEstimate estimate,
            CycleExecution execution,
            out EndpointCycleEvaluation evaluation)
        {
            evaluation = default;
            if (execution == null ||
                (!execution.Accepted &&
                 !execution.HorizonReached) ||
                execution.Accepted &&
                !ResetOwnedStateMatches(
                    estimate.Candidate,
                    execution.Candidate))
            {
                return false;
            }
            evaluation = new EndpointCycleEvaluation(
                execution.Candidate,
                execution.Duration,
                execution.RewardGranted,
                execution.AutomationEvents,
                execution.NextAutomationRemaining,
                execution.Accepted);
            return true;
        }

        private static bool TryValidateEndpointEvaluations(
            ProjectionEstimate coarse,
            ProjectionEstimate refined,
            EndpointCycleEvaluation coarseEndpoint,
            EndpointCycleEvaluation refinedEndpoint,
            out double error)
        {
            error = double.MaxValue;
            if (coarseEndpoint.ResetOccurred !=
                    refinedEndpoint.ResetOccurred ||
                coarseEndpoint.AutomationEvents !=
                    refinedEndpoint.AutomationEvents ||
                Math.Abs(
                    coarseEndpoint.AutomationRemaining -
                    refinedEndpoint.AutomationRemaining) >
                    TimeEpsilon ||
                !ResetOwnedStateMatches(
                    coarseEndpoint.Candidate,
                    refinedEndpoint.Candidate))
            {
                return false;
            }
            if (!coarseEndpoint.ResetOccurred)
            {
                double coarseTotal = NumericSafety.Add(
                    coarse.ConsumedSeconds,
                    coarseEndpoint.Duration).Value;
                double refinedTotal = NumericSafety.Add(
                    refined.ConsumedSeconds,
                    refinedEndpoint.Duration).Value;
                error = Math.Max(
                    RelativeError(
                        coarseTotal,
                        refinedTotal),
                    ContinuousStateError(
                        coarseEndpoint.Candidate,
                        refinedEndpoint.Candidate));
                return error <=
                       SimulationAccuracyContract
                           .MaximumAggregateRelativeError;
            }
            error = Math.Max(
                Math.Max(
                    RelativeError(
                        coarseEndpoint.Duration,
                        refinedEndpoint.Duration),
                    RelativeError(
                        coarseEndpoint.Reward,
                        refinedEndpoint.Reward)),
                Math.Max(
                    Math.Max(
                        RelativeError(
                            coarse.LastDuration,
                            coarseEndpoint.Duration),
                        RelativeError(
                            coarse.LastReward,
                            coarseEndpoint.Reward)),
                    Math.Max(
                        RelativeError(
                            refined.LastDuration,
                            refinedEndpoint.Duration),
                        RelativeError(
                            refined.LastReward,
                            refinedEndpoint.Reward))));
            return error <=
                   SimulationAccuracyContract
                       .MaximumAggregateRelativeError;
        }

        private static void HandleProjectionAttemptFailure(
            ProjectionWork work,
            bool sampledSignatureChanged,
            bool endpointStable,
            string reason)
        {
            LastAdaptiveDiagnostic = reason;
            int attemptedRefinedSegments =
                (int)Math.Min(
                    work.CandidateCycles,
                    (long)RefinedProjectionSegments *
                    work.SegmentMultiplier);
            if (!sampledSignatureChanged &&
                endpointStable &&
                attemptedRefinedSegments <
                    MaximumRefinedProjectionSegments &&
                attemptedRefinedSegments <
                    work.CandidateCycles)
            {
                work.SegmentMultiplier = Math.Min(
                    work.SegmentMultiplier * 2,
                    MaximumRefinedProjectionSegments /
                    RefinedProjectionSegments);
                BeginProjectionAttempt(work);
                return;
            }

            work.CandidateCycles /= 2L;
            work.SegmentMultiplier = 1;
            LastSuggestedMaximumCycles =
                work.CandidateCycles;
            if (work.CandidateCycles < MinimumAdaptiveCycles)
            {
                RejectProjectionWork(work, reason);
                return;
            }
            BeginProjectionAttempt(work);
        }

        private static void RejectProjectionWork(
            ProjectionWork work,
            string diagnostic)
        {
            work.Accepted = false;
            work.IsCompleted = true;
            work.Diagnostic = diagnostic;
            LastAdaptiveDiagnostic = diagnostic;
            LastDiagnostic = "adaptive_not_validated";
        }

        public static bool TryAdvance(
            SaveDataSettings startingSettings,
            DysonFacilityAutomationRule[] facilityRules,
            ResearchAutomationRule[] researchRules,
            InfinityResetPolicy resetPolicy,
            Func<double, long> calculateReward,
            long rewardTarget,
            double resetBotThreshold,
            double minimumCycleSeconds,
            double automationIntervalSeconds,
            double automationTimeUntilNextEvent,
            double availableSeconds,
            long maximumCycles,
            SimulationAutomationPolicy automationPolicy,
            out AutomatedBreakInfinityProjection projection)
        {
            projection = default;
            LastDiagnostic = null;
            LastAdaptiveDiagnostic = null;
            LastSuggestedMaximumCycles = 0L;
            if (startingSettings == null ||
                resetPolicy == null ||
                calculateReward == null ||
                rewardTarget <= 0L ||
                !NumericSafety.IsFinite(resetBotThreshold) ||
                resetBotThreshold <= 0d ||
                !NumericSafety.IsFinite(minimumCycleSeconds) ||
                minimumCycleSeconds <= 0d ||
                !NumericSafety.IsFinite(automationIntervalSeconds) ||
                automationIntervalSeconds <= 0d ||
                !NumericSafety.IsFinite(availableSeconds) ||
                availableSeconds <= 0d ||
                maximumCycles <= 0L)
            {
                LastDiagnostic = "invalid_request";
                return false;
            }

            SaveDataSettings committed;
            try
            {
                committed = CloneSimulationCandidate(
                    startingSettings);
            }
            catch
            {
                LastDiagnostic = "clone_failed";
                return false;
            }
            if (!HasState(committed))
            {
                LastDiagnostic = "missing_state";
                return false;
            }

            committed.simulationStatistics = null;
            double automationRemaining =
                NormalizeAutomationRemaining(
                    automationTimeUntilNextEvent,
                    automationIntervalSeconds);
            long cycles = 0L;
            long automationEvents = 0L;
            double consumed = 0d;
            long totalReward = 0L;
            long lastReward = 0L;
            double lastDuration = 0d;

            bool preferExact =
                maximumCycles < MinimumAdaptiveCycles;
            if (!preferExact)
            {
                ProjectionWork work = CreateProjectionWork(
                    startingSettings,
                    facilityRules,
                    researchRules,
                    resetPolicy,
                    calculateReward,
                    rewardTarget,
                    resetBotThreshold,
                    minimumCycleSeconds,
                    automationIntervalSeconds,
                    automationRemaining,
                    availableSeconds,
                    maximumCycles,
                    automationPolicy);
                while (!work.IsCompleted)
                {
                    StepProjectionWork(work);
                }
                if (work.Accepted)
                {
                    projection = work.Projection;
                    LastDiagnostic = "accepted_adaptive";
                    return true;
                }
                LastAdaptiveDiagnostic = work.Diagnostic;
                LastDiagnostic = "adaptive_not_validated";
                return false;
            }
            long exactCycleLimit = Math.Min(
                maximumCycles,
                MaximumExactVariableCyclesPerBlock);
            while (cycles < exactCycleLimit &&
                   consumed + minimumCycleSeconds <=
                       availableSeconds + TimeEpsilon)
            {
                if (lastDuration > 0d &&
                    consumed + lastDuration >
                        availableSeconds + TimeEpsilon)
                {
                    break;
                }
                if (!TryRunOneCycle(
                        committed,
                        facilityRules,
                        researchRules,
                        resetPolicy,
                        calculateReward,
                        rewardTarget,
                        resetBotThreshold,
                        minimumCycleSeconds,
                        automationIntervalSeconds,
                        automationRemaining,
                        automationPolicy,
                        out double duration,
                        out long reward,
                        out long cycleAutomationEvents,
                        out double nextAutomationRemaining,
                        maximumDurationSeconds:
                            Math.Max(
                                0d,
                                availableSeconds - consumed)))
                {
                    LastDiagnostic = "cycle_rejected";
                    break;
                }
                if (consumed + duration >
                    availableSeconds + TimeEpsilon)
                {
                    LastDiagnostic = "cycle_beyond_endpoint";
                    return false;
                }

                consumed = NumericSafety.Add(
                    consumed,
                    duration).Value;
                totalReward = NumericSafety.Add(
                    totalReward,
                    reward).Value;
                automationEvents = NumericSafety.Add(
                    automationEvents,
                    cycleAutomationEvents).Value;
                lastReward = reward;
                lastDuration = duration;
                automationRemaining = nextAutomationRemaining;
                cycles++;

                if (IsMinimumCycleDuration(
                        duration,
                        minimumCycleSeconds))
                    break;
            }

            if (cycles < 1L ||
                !NumericSafety.IsFinite(consumed) ||
                consumed <= 0d)
            {
                LastDiagnostic ??= "no_completed_cycles";
                return false;
            }

            projection = new AutomatedBreakInfinityProjection(
                committed,
                cycles,
                consumed,
                totalReward,
                lastReward,
                lastDuration,
                automationEvents,
                automationRemaining);
            LastDiagnostic = "accepted";
            return true;
        }

        private static bool TryProjectAdaptive(
            SaveDataSettings starting,
            DysonFacilityAutomationRule[] facilityRules,
            ResearchAutomationRule[] researchRules,
            InfinityResetPolicy resetPolicy,
            Func<double, long> calculateReward,
            long rewardTarget,
            double resetBotThreshold,
            double minimumCycleSeconds,
            double automationIntervalSeconds,
            double automationRemaining,
            double availableSeconds,
            long maximumCycles,
            SimulationAutomationPolicy automationPolicy,
            out AutomatedBreakInfinityProjection projection)
        {
            projection = default;
            SaveDataSettings probe;
            try
            {
                probe = CloneSimulationCandidate(starting);
            }
            catch
            {
                return false;
            }
            if (!TryRunOneCycle(
                    probe,
                    facilityRules,
                    researchRules,
                    resetPolicy,
                    calculateReward,
                    rewardTarget,
                    resetBotThreshold,
                    minimumCycleSeconds,
                    automationIntervalSeconds,
                    automationRemaining,
                    automationPolicy,
                    out double probeDuration,
                    out long probeReward,
                    out _,
                    out _,
                    maximumDurationSeconds:
                        availableSeconds))
            {
                return false;
            }
            if (!ResetOwnedStateMatches(
                    starting,
                    probe))
            {
                LastAdaptiveDiagnostic =
                    "reset_signature_changed";
                return false;
            }
            long endpointCycleLimit =
                NumericSafety.ToLongFloor(
                    Math.Floor(
                        availableSeconds /
                        Math.Max(
                            minimumCycleSeconds,
                            probeDuration))).Value;
            long cycles = Math.Min(
                maximumCycles,
                endpointCycleLimit);
            if (cycles >= MinimumAdaptiveCycles)
            {
                if (!TryValidateProjection(
                        starting,
                        facilityRules,
                        researchRules,
                        resetPolicy,
                        calculateReward,
                        rewardTarget,
                        resetBotThreshold,
                        minimumCycleSeconds,
                        automationIntervalSeconds,
                        automationRemaining,
                        availableSeconds,
                        cycles,
                        automationPolicy,
                        probeDuration,
                        probeReward,
                        out ProjectionEstimate refined,
                        out double error,
                        out string reason))
                {
                    LastAdaptiveDiagnostic = reason;
                    LastSuggestedMaximumCycles =
                        cycles / 2L;
                    return false;
                }

                projection = CreateProjection(
                    starting,
                    refined,
                    cycles,
                    error);
                LastAdaptiveDiagnostic =
                    $"accepted:{cycles}/{error:R}/{reason}";
                LastAcceptedAdaptiveDiagnostic =
                    LastAdaptiveDiagnostic;
                MaximumAcceptedAdaptiveCycleCount = Math.Max(
                    MaximumAcceptedAdaptiveCycleCount,
                    cycles);
                return true;
            }
            LastAdaptiveDiagnostic ??= "no_candidate";
            return false;
        }

        private static bool TryValidateProjection(
            SaveDataSettings starting,
            DysonFacilityAutomationRule[] facilityRules,
            ResearchAutomationRule[] researchRules,
            InfinityResetPolicy resetPolicy,
            Func<double, long> calculateReward,
            long rewardTarget,
            double resetBotThreshold,
            double minimumCycleSeconds,
            double automationIntervalSeconds,
            double automationRemaining,
            double availableSeconds,
            long cycles,
            SimulationAutomationPolicy automationPolicy,
            double probeDuration,
            long probeReward,
            out ProjectionEstimate refined,
            out double error,
            out string reason)
        {
            int coarseSegments =
                (int)Math.Min(
                    cycles,
                    CoarseProjectionSegments);
            int refinedSegments =
                (int)Math.Min(
                    cycles,
                    RefinedProjectionSegments);
            ProjectionEstimate coarse = EstimateProjection(
                starting,
                facilityRules,
                researchRules,
                resetPolicy,
                calculateReward,
                rewardTarget,
                resetBotThreshold,
                minimumCycleSeconds,
                automationIntervalSeconds,
                automationRemaining,
                cycles,
                coarseSegments,
                automationPolicy,
                probeDuration,
                probeReward);
            refined = EstimateProjection(
                starting,
                facilityRules,
                researchRules,
                resetPolicy,
                calculateReward,
                rewardTarget,
                resetBotThreshold,
                minimumCycleSeconds,
                automationIntervalSeconds,
                automationRemaining,
                cycles,
                refinedSegments,
                automationPolicy,
                probeDuration,
                probeReward);
            if (!TryValidateProjectionEstimates(
                coarse,
                refined,
                minimumCycleSeconds,
                automationIntervalSeconds,
                availableSeconds,
                automationPolicy,
                cycles,
                out error,
                out reason))
            {
                return false;
            }
            if (!TryValidateProjectionEndpoints(
                    coarse,
                    refined,
                    facilityRules,
                    researchRules,
                    resetPolicy,
                    calculateReward,
                    rewardTarget,
                    resetBotThreshold,
                    minimumCycleSeconds,
                    automationIntervalSeconds,
                    automationPolicy,
                    out double endpointError))
            {
                reason = "endpoint_projection_diverged";
                return false;
            }
            error = Math.Max(error, endpointError);
            return true;
        }

        private static bool TryValidateProjectionEstimates(
            ProjectionEstimate coarse,
            ProjectionEstimate refined,
            double minimumCycleSeconds,
            double automationIntervalSeconds,
            double availableSeconds,
            SimulationAutomationPolicy automationPolicy,
            long cycles,
            out double error,
            out string reason)
        {
            error = double.MaxValue;
            if (!coarse.Valid || !refined.Valid ||
                refined.ConsumedSeconds >
                    availableSeconds + TimeEpsilon)
            {
                reason =
                    $"invalid_or_long:{cycles}/" +
                    $"{coarse.Valid}/{refined.Valid}/" +
                    $"{refined.ConsumedSeconds:R}";
                return false;
            }
            if (!ProjectionDiscreteStateMatches(
                    coarse,
                    refined))
            {
                reason =
                    $"discrete_divergence:{cycles}/" +
                    $"{coarse.AutomationEvents}/" +
                    $"{refined.AutomationEvents}";
                return false;
            }
            if (Math.Abs(
                    coarse.ConsumedSeconds -
                    refined.ConsumedSeconds) >
                automationIntervalSeconds + TimeEpsilon ||
                Math.Abs(
                    coarse.LastDuration -
                    refined.LastDuration) >
                automationIntervalSeconds + TimeEpsilon)
            {
                reason =
                    $"timer_divergence:{cycles}/" +
                    $"{coarse.ConsumedSeconds:R}/" +
                    $"{refined.ConsumedSeconds:R}/" +
                    $"{coarse.LastDuration:R}/" +
                    $"{refined.LastDuration:R}";
                return false;
            }
            error = ProjectionError(coarse, refined);
            if (error >
                SimulationAccuracyContract.MaximumAggregateRelativeError)
            {
                reason =
                    $"divergence:{cycles}/{error:R}";
                return false;
            }
            reason =
                $"time:{coarse.ConsumedSeconds:R}/" +
                $"{refined.ConsumedSeconds:R}";
            return true;
        }

        private static AutomatedBreakInfinityProjection
            CreateProjection(
                SaveDataSettings starting,
                ProjectionEstimate estimate,
                long cycles,
                double error)
        {
            return new AutomatedBreakInfinityProjection(
                estimate.Candidate,
                cycles,
                estimate.ConsumedSeconds,
                Math.Max(
                    0L,
                    estimate.FinalInfinityPoints -
                    starting.dysonVerseSaveData
                        .dysonVersePrestigeData
                        .infinityPoints),
                estimate.LastReward,
                estimate.LastDuration,
                estimate.AutomationEvents,
                estimate.AutomationRemaining,
                error);
        }

        private static double ProjectionError(
            ProjectionEstimate left,
            ProjectionEstimate right)
        {
            return Math.Max(
                Math.Max(
                    Math.Max(
                        RelativeError(
                            left.ConsumedSeconds,
                            right.ConsumedSeconds),
                        RelativeError(
                            left.FinalInfinityPoints,
                            right.FinalInfinityPoints)),
                    RelativeError(
                        left.LastReward,
                        right.LastReward)),
                ContinuousStateError(
                    left.Candidate,
                    right.Candidate));
        }

        private static bool TryValidateProjectionEndpoints(
            ProjectionEstimate coarse,
            ProjectionEstimate refined,
            DysonFacilityAutomationRule[] facilityRules,
            ResearchAutomationRule[] researchRules,
            InfinityResetPolicy resetPolicy,
            Func<double, long> calculateReward,
            long rewardTarget,
            double resetBotThreshold,
            double minimumCycleSeconds,
            double automationIntervalSeconds,
            SimulationAutomationPolicy automationPolicy,
            out double error)
        {
            error = double.MaxValue;
            if (!TryEvaluateProjectionEndpoint(
                    coarse,
                    facilityRules,
                    researchRules,
                    resetPolicy,
                    calculateReward,
                    rewardTarget,
                    resetBotThreshold,
                    minimumCycleSeconds,
                    automationIntervalSeconds,
                    automationPolicy,
                    out EndpointCycleEvaluation coarseEndpoint) ||
                !TryEvaluateProjectionEndpoint(
                    refined,
                    facilityRules,
                    researchRules,
                    resetPolicy,
                    calculateReward,
                    rewardTarget,
                    resetBotThreshold,
                    minimumCycleSeconds,
                    automationIntervalSeconds,
                    automationPolicy,
                    out EndpointCycleEvaluation refinedEndpoint))
            {
                return false;
            }

            if (coarseEndpoint.AutomationEvents !=
                    refinedEndpoint.AutomationEvents ||
                Math.Abs(
                    coarseEndpoint.AutomationRemaining -
                    refinedEndpoint.AutomationRemaining) >
                    TimeEpsilon ||
                !ResetOwnedStateMatches(
                    coarseEndpoint.Candidate,
                    refinedEndpoint.Candidate))
            {
                return false;
            }

            error = Math.Max(
                Math.Max(
                    RelativeError(
                        coarseEndpoint.Duration,
                        refinedEndpoint.Duration),
                    RelativeError(
                        coarseEndpoint.Reward,
                        refinedEndpoint.Reward)),
                Math.Max(
                    Math.Max(
                        RelativeError(
                            coarse.LastDuration,
                            coarseEndpoint.Duration),
                        RelativeError(
                            coarse.LastReward,
                            coarseEndpoint.Reward)),
                    Math.Max(
                        RelativeError(
                            refined.LastDuration,
                            refinedEndpoint.Duration),
                        RelativeError(
                            refined.LastReward,
                            refinedEndpoint.Reward))));
            return error <=
                   SimulationAccuracyContract
                       .MaximumAggregateRelativeError;
        }

        private static bool TryEvaluateProjectionEndpoint(
            ProjectionEstimate estimate,
            DysonFacilityAutomationRule[] facilityRules,
            ResearchAutomationRule[] researchRules,
            InfinityResetPolicy resetPolicy,
            Func<double, long> calculateReward,
            long rewardTarget,
            double resetBotThreshold,
            double minimumCycleSeconds,
            double automationIntervalSeconds,
            SimulationAutomationPolicy automationPolicy,
            out EndpointCycleEvaluation evaluation)
        {
            evaluation = default;
            if (!estimate.Valid ||
                !HasState(estimate.Candidate))
            {
                return false;
            }
            SaveDataSettings endpoint;
            try
            {
                endpoint =
                    CloneSimulationCandidate(
                        estimate.Candidate);
            }
            catch
            {
                return false;
            }
            if (!TryRunOneCycle(
                    endpoint,
                    facilityRules,
                    researchRules,
                    resetPolicy,
                    calculateReward,
                    rewardTarget,
                    resetBotThreshold,
                    minimumCycleSeconds,
                    automationIntervalSeconds,
                    estimate.AutomationRemaining,
                    automationPolicy,
                    out double duration,
                    out long reward,
                    out long automationEvents,
                    out double automationRemaining))
            {
                return false;
            }
            if (!ResetOwnedStateMatches(
                    estimate.Candidate,
                    endpoint))
            {
                return false;
            }
            evaluation = new EndpointCycleEvaluation(
                endpoint,
                duration,
                reward,
                automationEvents,
                automationRemaining);
            return true;
        }

        private static double ContinuousStateError(
            SaveDataSettings left,
            SaveDataSettings right)
        {
            if (!HasState(left) || !HasState(right))
                return double.MaxValue;

            double error = 0d;
            error = Math.Max(
                error,
                ContinuousFieldError(
                    left.dysonVerseSaveData
                        .dysonVerseInfinityData,
                    right.dysonVerseSaveData
                        .dysonVerseInfinityData));
            error = Math.Max(
                error,
                ContinuousFieldError(
                    left.dysonVerseSaveData
                        .dysonVersePrestigeData,
                    right.dysonVerseSaveData
                        .dysonVersePrestigeData));
            error = Math.Max(
                error,
                RelativeError(
                    left.timeLastInfinity,
                    right.timeLastInfinity));
            error = Math.Max(
                error,
                RelativeError(
                    left.offlineTimeUsedThisInfinity,
                    right.offlineTimeUsedThisInfinity));
            error = Math.Max(
                error,
                RelativeError(
                    left.offlineTimeUsedPreviousInfinity,
                    right.offlineTimeUsedPreviousInfinity));
            return error;
        }

        private static double ContinuousFieldError(
            object left,
            object right)
        {
            if (ReferenceEquals(left, right))
                return 0d;
            if (left == null || right == null ||
                left.GetType() != right.GetType())
            {
                return double.MaxValue;
            }

            double error = 0d;
            foreach (FieldInfo field in
                     left.GetType().GetFields(
                         BindingFlags.Instance |
                         BindingFlags.Public))
            {
                if (field.FieldType == typeof(double))
                {
                    error = Math.Max(
                        error,
                        RelativeError(
                            (double)field.GetValue(left),
                            (double)field.GetValue(right)));
                    continue;
                }
                if (field.FieldType == typeof(double[]))
                {
                    var leftValues =
                        (double[])field.GetValue(left);
                    var rightValues =
                        (double[])field.GetValue(right);
                    if (leftValues == null ||
                        rightValues == null ||
                        leftValues.Length != rightValues.Length)
                    {
                        return double.MaxValue;
                    }
                    for (int i = 0;
                         i < leftValues.Length;
                         i++)
                    {
                        error = Math.Max(
                            error,
                            RelativeError(
                                leftValues[i],
                                rightValues[i]));
                    }
                }
            }
            return error;
        }

        private static bool ProjectionDiscreteStateMatches(
            ProjectionEstimate left,
            ProjectionEstimate right)
        {
            // Automation phase and both rotating priorities are durable.
            // Require the same pulse count too: even an unaffordable extra
            // pulse changes which target receives priority next.
            return left.DysonRotation ==
                       right.DysonRotation &&
                    left.ResearchRotation ==
                        right.ResearchRotation &&
                    left.AutomationEvents ==
                        right.AutomationEvents &&
                    Math.Abs(
                        left.AutomationRemaining -
                        right.AutomationRemaining) <=
                    TimeEpsilon &&
                   ResetOwnedStateMatches(
                       left.Candidate,
                       right.Candidate);
        }

        private static ProjectionEstimate EstimateProjection(
            SaveDataSettings starting,
            DysonFacilityAutomationRule[] facilityRules,
            ResearchAutomationRule[] researchRules,
            InfinityResetPolicy resetPolicy,
            Func<double, long> calculateReward,
            long rewardTarget,
            double resetBotThreshold,
            double minimumCycleSeconds,
            double automationIntervalSeconds,
            double automationRemaining,
            long cycleCount,
            int requestedSegments,
            SimulationAutomationPolicy automationPolicy,
            double initialDuration,
            long initialReward)
        {
            SaveDataSettings state;
            try
            {
                state = CloneSimulationCandidate(starting);
            }
            catch
            {
                return default;
            }
            state.simulationStatistics = null;
            int segments = (int)Math.Min(
                requestedSegments,
                cycleCount);
            long baseCycles = cycleCount / segments;
            long extraCycles = cycleCount % segments;
            double totalSeconds = 0d;
            long totalAutomationEvents = 0L;
            long lastReward = 0L;
            double lastDuration = 0d;
            double predictorDuration = initialDuration;
            long predictorReward = initialReward;

            for (int segment = 0; segment < segments; segment++)
            {
                long segmentCycles =
                    baseCycles +
                    (segment < extraCycles ? 1L : 0L);
                SaveDataSettings cycleStart;
                try
                {
                    cycleStart =
                        CloneSimulationCandidate(state);
                }
                catch
                {
                    return default;
                }
                int dysonRotation =
                    state.dysonAutomationTargetIndex;
                int researchRotation =
                    state.researchAutomationTargetIndex;
                long startingPoints = state.dysonVerseSaveData
                    .dysonVersePrestigeData.infinityPoints;
                double startingAutomationRemaining =
                    automationRemaining;
                if (!NumericSafety.IsFinite(
                        predictorDuration) ||
                    predictorDuration <= 0d ||
                    predictorReward <= 0L)
                {
                    return default;
                }

                double midpointCycles =
                    (segmentCycles - 1d) * 0.5d;
                long midpointGain =
                    NumericSafety.ToLongFloor(
                        Math.Round(
                            NumericSafety.Multiply(
                                predictorReward,
                                midpointCycles).Value)).Value;
                long midpointPoints = NumericSafety.Add(
                    startingPoints,
                    midpointGain).Value;
                double midpointSeconds =
                    NumericSafety.Multiply(
                        predictorDuration,
                        midpointCycles).Value;
                AdvanceAutomationClock(
                    startingAutomationRemaining,
                    midpointSeconds,
                    automationIntervalSeconds,
                    out long midpointEvents,
                    out double midpointAutomationRemaining);
                state.dysonVerseSaveData.dysonVersePrestigeData
                    .infinityPoints = midpointPoints;
                state.dysonAutomationTargetIndex =
                    AutomationRotation.Advance(
                        dysonRotation,
                        facilityRules?.Length ?? 0,
                        midpointEvents);
                state.researchAutomationTargetIndex =
                    AutomationRotation.Advance(
                        researchRotation,
                        researchRules?.Length ?? 0,
                        midpointEvents);
                InfinityResetModel.RebuildDerivedState(
                    state);
                if (!TryRunOneCycle(
                        state,
                        facilityRules,
                        researchRules,
                        resetPolicy,
                        calculateReward,
                        rewardTarget,
                        resetBotThreshold,
                        minimumCycleSeconds,
                        automationIntervalSeconds,
                        midpointAutomationRemaining,
                        automationPolicy,
                        out double duration,
                        out long reward,
                        out _,
                        out _))
                {
                    return default;
                }
                if (!ResetOwnedStateMatches(
                        cycleStart,
                        state))
                {
                    return default;
                }

                long segmentGain = NumericSafety.Multiply(
                    reward,
                    segmentCycles).Value;
                long finalPoints = NumericSafety.Add(
                    startingPoints,
                    segmentGain).Value;
                double segmentSeconds = NumericSafety.Multiply(
                    duration,
                    segmentCycles).Value;
                if (!NumericSafety.IsFinite(segmentSeconds) ||
                    segmentSeconds <= 0d)
                {
                    return default;
                }
                AdvanceAutomationClock(
                    startingAutomationRemaining,
                    segmentSeconds,
                    automationIntervalSeconds,
                    out long events,
                    out automationRemaining);
                state.dysonVerseSaveData.dysonVersePrestigeData
                    .infinityPoints = finalPoints;
                state.dysonAutomationTargetIndex =
                    AutomationRotation.Advance(
                        dysonRotation,
                        facilityRules?.Length ?? 0,
                        events);
                state.researchAutomationTargetIndex =
                    AutomationRotation.Advance(
                        researchRotation,
                        researchRules?.Length ?? 0,
                        events);
                InfinityResetModel.RebuildDerivedState(
                    state);
                totalSeconds = NumericSafety.Add(
                    totalSeconds,
                    segmentSeconds).Value;
                totalAutomationEvents = NumericSafety.Add(
                    totalAutomationEvents,
                    events).Value;
                lastReward = finalPoints == long.MaxValue
                    ? 0L
                    : reward;
                lastDuration = duration;
                predictorDuration = duration;
                predictorReward = reward;
            }

            return new ProjectionEstimate(
                true,
                state,
                totalSeconds,
                state.dysonVerseSaveData.dysonVersePrestigeData
                    .infinityPoints,
                lastReward,
                lastDuration,
                totalAutomationEvents,
                automationRemaining);
        }

        private static void AdvanceAutomationClock(
            double startingRemaining,
            double seconds,
            double interval,
            out long events,
            out double remaining)
        {
            if (seconds + TimeEpsilon < startingRemaining)
            {
                events = 0L;
                remaining = startingRemaining - seconds;
                return;
            }
            events = NumericSafety.Add(
                1L,
                NumericSafety.ToLongFloor(
                    Math.Floor(
                        (seconds - startingRemaining + TimeEpsilon) /
                        interval)).Value).Value;
            remaining = startingRemaining - seconds +
                        events * interval;
            if (remaining <= TimeEpsilon)
                remaining = interval;
        }

        private static double RelativeError(double left, double right)
        {
            if (!NumericSafety.IsFinite(left) ||
                !NumericSafety.IsFinite(right))
            {
                return double.MaxValue;
            }
            if (left == right) return 0d;
            double scale = Math.Max(
                1d,
                Math.Max(Math.Abs(left), Math.Abs(right)));
            return Math.Abs(left - right) / scale;
        }

        private static bool ResetOwnedStateMatches(
            SaveDataSettings left,
            SaveDataSettings right)
        {
            if (!HasState(left) || !HasState(right))
                return false;
            if (left.tutorial != right.tutorial ||
                left.firstInfinityDone !=
                    right.firstInfinityDone ||
                left.infinityInProgress !=
                    right.infinityInProgress ||
                left.botCapTransitionPending !=
                    right.botCapTransitionPending ||
                left.botCapRewardsGranted !=
                    right.botCapRewardsGranted ||
                left.autoAssignNonRefundableSkills !=
                    right.autoAssignNonRefundableSkills)
            {
                return false;
            }

            DysonVerseSaveData leftDyson =
                left.dysonVerseSaveData;
            DysonVerseSaveData rightDyson =
                right.dysonVerseSaveData;
            if (!PublicFieldsEqual(
                    leftDyson.dysonVersePrestigeData,
                    rightDyson.dysonVersePrestigeData,
                    nameof(DysonVersePrestigeData
                        .infinityPoints)) ||
                !PublicFieldsEqual(
                    leftDyson.dysonVerseSkillTreeData,
                    rightDyson.dysonVerseSkillTreeData) ||
                !InfinityDiscreteStateMatches(
                    leftDyson.dysonVerseInfinityData,
                    rightDyson.dysonVerseInfinityData))
            {
                return false;
            }

            return StringListEquals(
                       leftDyson.skillAutoAssignmentIds,
                       rightDyson.skillAutoAssignmentIds) &&
                   ByteArrayEquals(
                       leftDyson.skillAutoAssignmentBits,
                       rightDyson.skillAutoAssignmentBits);
        }

        private static bool InfinityDiscreteStateMatches(
            DysonVerseInfinityData left,
            DysonVerseInfinityData right)
        {
            if (left == null || right == null)
                return left == right;
            if (!DictionaryEquals(
                    left.SkillTreeSaveData,
                    right.SkillTreeSaveData) ||
                !DictionaryEquals(
                    left.skillOwnedById,
                    right.skillOwnedById) ||
                !SkillStateDictionaryEquals(
                    left.skillStateById,
                    right.skillStateById) ||
                !ByteArrayEquals(
                    left.skillOwnedBits,
                    right.skillOwnedBits) ||
                !DictionaryEquals(
                    left.researchLevelsById,
                    right.researchLevelsById) ||
                !DictionaryEquals(
                    left.researchProgressById,
                    right.researchProgressById))
            {
                return false;
            }

            foreach (FieldInfo field in
                     typeof(DysonVerseInfinityData).GetFields(
                         BindingFlags.Instance |
                         BindingFlags.Public))
            {
                Type type = field.FieldType;
                if (type == typeof(bool) ||
                    type == typeof(int) ||
                    type == typeof(long) ||
                    type == typeof(string) ||
                    type == typeof(byte[]) ||
                    type == typeof(double[]) ||
                    type == typeof(List<int>) ||
                    type == typeof(List<double>))
                {
                    if (!ValuesEqual(
                            field.GetValue(left),
                            field.GetValue(right)))
                    {
                        return false;
                    }
                }
            }

            return true;
        }

        private static bool PublicFieldsEqual(
            object left,
            object right,
            params string[] excluded)
        {
            if (left == null || right == null)
                return left == right;
            var exclusions =
                new HashSet<string>(
                    excluded ?? Array.Empty<string>(),
                    StringComparer.Ordinal);
            foreach (FieldInfo field in
                     left.GetType().GetFields(
                         BindingFlags.Instance |
                         BindingFlags.Public))
            {
                if (exclusions.Contains(field.Name))
                    continue;
                if (!ValuesEqual(
                        field.GetValue(left),
                        field.GetValue(right)))
                {
                    return false;
                }
            }
            return true;
        }

        private static bool ValuesEqual(
            object left,
            object right)
        {
            if (ReferenceEquals(left, right))
                return true;
            if (left == null || right == null)
                return false;
            if (left is byte[] leftBytes &&
                right is byte[] rightBytes)
            {
                return ByteArrayEquals(
                    leftBytes,
                    rightBytes);
            }
            if (left is double[] leftDoubles &&
                right is double[] rightDoubles)
            {
                return ArrayEquals(
                    leftDoubles,
                    rightDoubles);
            }
            if (left is List<int> leftInts &&
                right is List<int> rightInts)
            {
                return ListEquals(
                    leftInts,
                    rightInts);
            }
            if (left is List<double> leftDoubleList &&
                right is List<double> rightDoubleList)
            {
                return ListEquals(
                    leftDoubleList,
                    rightDoubleList);
            }
            return left.Equals(right);
        }

        private static bool DictionaryEquals<TKey, TValue>(
            IDictionary<TKey, TValue> left,
            IDictionary<TKey, TValue> right)
        {
            if (ReferenceEquals(left, right))
                return true;
            if (left == null || right == null ||
                left.Count != right.Count)
            {
                return false;
            }
            foreach (KeyValuePair<TKey, TValue> pair in left)
            {
                if (!right.TryGetValue(
                        pair.Key,
                        out TValue value) ||
                    !EqualityComparer<TValue>.Default.Equals(
                        pair.Value,
                        value))
                {
                    return false;
                }
            }
            return true;
        }

        private static bool SkillStateDictionaryEquals(
            IDictionary<string, SkillState> left,
            IDictionary<string, SkillState> right)
        {
            if (ReferenceEquals(left, right))
                return true;
            if (left == null || right == null ||
                left.Count != right.Count)
            {
                return false;
            }
            foreach (KeyValuePair<string, SkillState> pair
                     in left)
            {
                if (!right.TryGetValue(
                        pair.Key,
                        out SkillState value))
                {
                    return false;
                }
                SkillState expected = pair.Value;
                if (expected == null || value == null)
                {
                    if (expected != value)
                        return false;
                    continue;
                }
                if (expected.owned != value.owned ||
                    expected.level != value.level ||
                    expected.timerSeconds !=
                        value.timerSeconds ||
                    expected.secondaryTimerSeconds !=
                        value.secondaryTimerSeconds)
                {
                    return false;
                }
            }
            return true;
        }

        private static bool ByteArrayEquals(
            byte[] left,
            byte[] right)
        {
            if (ReferenceEquals(left, right))
                return true;
            if (left == null || right == null ||
                left.Length != right.Length)
            {
                return false;
            }
            for (int index = 0;
                 index < left.Length;
                 index++)
            {
                if (left[index] != right[index])
                    return false;
            }
            return true;
        }

        private static bool ArrayEquals(
            double[] left,
            double[] right)
        {
            if (ReferenceEquals(left, right))
                return true;
            if (left == null || right == null ||
                left.Length != right.Length)
            {
                return false;
            }
            for (int index = 0;
                 index < left.Length;
                 index++)
            {
                if (left[index] != right[index])
                    return false;
            }
            return true;
        }

        private static bool ListEquals<T>(
            IList<T> left,
            IList<T> right)
        {
            if (ReferenceEquals(left, right))
                return true;
            if (left == null || right == null ||
                left.Count != right.Count)
            {
                return false;
            }
            for (int index = 0;
                 index < left.Count;
                 index++)
            {
                if (!EqualityComparer<T>.Default.Equals(
                        left[index],
                        right[index]))
                {
                    return false;
                }
            }
            return true;
        }

        private static bool StringListEquals(
            IList<string> left,
            IList<string> right)
        {
            return ListEquals(left, right);
        }

        internal sealed class CycleExecution
        {
            public SaveDataSettings Candidate {
                get;
                internal set;
            }
            public IEnumerator<bool> Steps { get; internal set; }
            public bool IsCompleted { get; internal set; }
            public bool Accepted { get; internal set; }
            public bool HorizonReached { get; internal set; }
            public double Duration { get; internal set; }
            public long RewardGranted { get; internal set; }
            public long AutomationEvents { get; internal set; }
            public double NextAutomationRemaining {
                get;
                internal set;
            }
            public string Diagnostic { get; internal set; }
        }

        private static CycleExecution CreateCycleExecution(
            SaveDataSettings starting,
            DysonFacilityAutomationRule[] facilityRules,
            ResearchAutomationRule[] researchRules,
            InfinityResetPolicy resetPolicy,
            Func<double, long> calculateReward,
            long rewardTarget,
            double resetBotThreshold,
            double minimumCycleSeconds,
            double automationIntervalSeconds,
            double automationTimeUntilNextEvent,
            SimulationAutomationPolicy automationPolicy,
            double maximumDurationSeconds = double.MaxValue)
        {
            var execution = new CycleExecution
            {
                Candidate = starting,
                NextAutomationRemaining =
                    automationTimeUntilNextEvent
            };
            execution.Steps = RunOneCycleSteps(
                    execution,
                    starting,
                    facilityRules,
                    researchRules,
                    resetPolicy,
                    calculateReward,
                    rewardTarget,
                    resetBotThreshold,
                    minimumCycleSeconds,
                    automationIntervalSeconds,
                    automationTimeUntilNextEvent,
                    automationPolicy,
                    maximumDurationSeconds)
                .GetEnumerator();
            return execution;
        }

        private static void StepCycleExecution(
            CycleExecution execution,
            int maximumBoundaries)
        {
            if (execution == null || execution.IsCompleted)
                return;
            int limit = Math.Max(1, maximumBoundaries);
            for (int boundary = 0;
                 boundary < limit;
                 boundary++)
            {
                if (execution.Steps.MoveNext())
                    continue;
                execution.IsCompleted = true;
                execution.Diagnostic ??=
                    execution.Accepted
                        ? "accepted"
                        : LastDiagnostic ?? "cycle_rejected";
                execution.Steps.Dispose();
                return;
            }
        }

        private static void AcceptCycleExecution(
            CycleExecution execution,
            double duration,
            long rewardGranted,
            long automationEvents,
            double nextAutomationRemaining)
        {
            execution.Accepted = true;
            execution.Duration = duration;
            execution.RewardGranted = rewardGranted;
            execution.AutomationEvents = automationEvents;
            execution.NextAutomationRemaining =
                nextAutomationRemaining;
            execution.Diagnostic = "accepted";
        }

        private static void CompleteCycleAtHorizon(
            CycleExecution execution,
            double duration,
            long automationEvents,
            double nextAutomationRemaining)
        {
            execution.HorizonReached = true;
            execution.Duration = duration;
            execution.AutomationEvents = automationEvents;
            execution.NextAutomationRemaining =
                nextAutomationRemaining;
            execution.Diagnostic =
                "cycle_exceeds_available_time";
        }

        private static bool TryRunOneCycle(
            SaveDataSettings starting,
            DysonFacilityAutomationRule[] facilityRules,
            ResearchAutomationRule[] researchRules,
            InfinityResetPolicy resetPolicy,
            Func<double, long> calculateReward,
            long rewardTarget,
            double resetBotThreshold,
            double minimumCycleSeconds,
            double automationIntervalSeconds,
            double automationTimeUntilNextEvent,
            SimulationAutomationPolicy automationPolicy,
            out double duration,
            out long rewardGranted,
            out long automationEvents,
            out double nextAutomationRemaining,
            double maximumDurationSeconds = double.MaxValue)
        {
            CycleExecution execution = CreateCycleExecution(
                starting,
                facilityRules,
                researchRules,
                resetPolicy,
                calculateReward,
                rewardTarget,
                resetBotThreshold,
                minimumCycleSeconds,
                automationIntervalSeconds,
                automationTimeUntilNextEvent,
                automationPolicy,
                maximumDurationSeconds);
            while (!execution.IsCompleted)
            {
                StepCycleExecution(
                    execution,
                    int.MaxValue);
            }
            duration = execution.Duration;
            rewardGranted = execution.RewardGranted;
            automationEvents = execution.AutomationEvents;
            nextAutomationRemaining =
                execution.NextAutomationRemaining;
            return execution.Accepted;
        }

        private static IEnumerable<bool> RunOneCycleSteps(
            CycleExecution execution,
            SaveDataSettings starting,
            DysonFacilityAutomationRule[] facilityRules,
            ResearchAutomationRule[] researchRules,
            InfinityResetPolicy resetPolicy,
            Func<double, long> calculateReward,
            long rewardTarget,
            double resetBotThreshold,
            double minimumCycleSeconds,
            double automationIntervalSeconds,
            double automationTimeUntilNextEvent,
            SimulationAutomationPolicy automationPolicy,
            double maximumDurationSeconds)
        {
#if UNITY_EDITOR
            DiagnosticCycleEvaluations =
                NumericSafety.Add(
                    DiagnosticCycleEvaluations,
                    1L).Value;
#endif
            double duration = 0d;
            long rewardGranted = 0L;
            long automationEvents = 0L;
            double nextAutomationRemaining =
                automationTimeUntilNextEvent;

            double maximumDuration =
                NumericSafety.IsFinite(maximumDurationSeconds)
                    ? Math.Max(0d, maximumDurationSeconds)
                    : double.MaxValue;

            SaveDataSettings candidate = starting;
            if (!HasState(candidate))
            {
                LastDiagnostic = "missing_state";
                yield break;
            }
            candidate.simulationStatistics = null;

            DysonVerseSaveData dyson =
                candidate.dysonVerseSaveData;
            DysonVerseInfinityData data =
                dyson.dysonVerseInfinityData;
            DysonVerseSkillTreeData skills =
                dyson.dysonVerseSkillTreeData;
            DysonVersePrestigeData prestige =
                dyson.dysonVersePrestigeData;
            PrestigePlus prestigePlus =
                candidate.prestigePlus;
            ProductionSystem.SetBotDistribution(
                data,
                prestige,
                prestigePlus);
            ProductionSystem.RecalculateDerivedState(
                data,
                skills,
                prestige,
                prestigePlus);

            double automationRemaining =
                NormalizeAutomationRemaining(
                    automationTimeUntilNextEvent,
                    automationIntervalSeconds);
            long events = 0L;
            while (events < MaximumCycleBoundaries)
            {
                double maximumRemaining =
                    Math.Max(0d, maximumDuration - duration);
                if (maximumRemaining <= TimeEpsilon)
                {
                    CompleteCycleAtHorizon(
                        execution,
                        duration,
                        automationEvents,
                        automationRemaining);
                    yield break;
                }
#if UNITY_EDITOR
                DiagnosticCycleBoundaries =
                    NumericSafety.Add(
                        DiagnosticCycleBoundaries,
                        1L).Value;
#endif
                double minimumRemaining = Math.Max(
                    0d,
                    minimumCycleSeconds - duration);
                bool thresholdReached =
                    data.bots >= resetBotThreshold;
                double thresholdRemaining = Math.Max(
                    0d,
                    resetBotThreshold - data.bots);
                double productionRemaining =
                    thresholdReached
                        ? 0d
                        : data.botProduction > 0d
                        ? thresholdRemaining /
                          data.botProduction
                        : double.MaxValue;
                double resetRemaining = Math.Max(
                    minimumRemaining,
                    productionRemaining);

                if (automationRemaining >=
                        automationIntervalSeconds -
                        TimeEpsilon &&
                    TryBatchNoOpAutomationTicks(
                        candidate,
                        facilityRules,
                        researchRules,
                        resetBotThreshold,
                        Math.Min(
                            resetRemaining,
                            maximumRemaining),
                        automationIntervalSeconds,
                        MaximumAnalyticalAutomationTicksPerStep,
                        out long batchedTicks))
                {
                    dyson = candidate.dysonVerseSaveData;
                    data = dyson.dysonVerseInfinityData;
                    skills = dyson.dysonVerseSkillTreeData;
                    prestige = dyson.dysonVersePrestigeData;
                    prestigePlus = candidate.prestigePlus;
                    double batchedSeconds =
                        NumericSafety.Multiply(
                            batchedTicks,
                            automationIntervalSeconds).Value;
                    duration = NumericSafety.Add(
                        duration,
                        batchedSeconds).Value;
                    automationEvents = NumericSafety.Add(
                        automationEvents,
                        batchedTicks).Value;
                    candidate.dysonAutomationTargetIndex =
                        AutomationRotation.Advance(
                            candidate
                                .dysonAutomationTargetIndex,
                            facilityRules?.Length ?? 0,
                            batchedTicks);
                    candidate.researchAutomationTargetIndex =
                        AutomationRotation.Advance(
                            candidate
                                .researchAutomationTargetIndex,
                            researchRules?.Length ?? 0,
                            batchedTicks);
                    ProductionSystem.RecalculateDerivedState(
                        data,
                        skills,
                        prestige,
                        prestigePlus);
                    if (duration + TimeEpsilon >=
                            minimumCycleSeconds &&
                        data.bots + TimeEpsilon >=
                            resetBotThreshold)
                    {
                        long requestedReward =
                            calculateReward(data.bots);
                        if (requestedReward < rewardTarget)
                        {
                            data.bots = NumericSafety.BitIncrement(
                                data.bots);
                            requestedReward =
                                calculateReward(data.bots);
                        }
                        if (requestedReward < rewardTarget)
                        {
                            LastDiagnostic =
                                "threshold_rounding";
                            yield break;
                        }
                        candidate.timeLastInfinity = duration;
#if UNITY_EDITOR
                        long batchedResetStarted =
                            System.Diagnostics.Stopwatch
                                .GetTimestamp();
#endif
                        if (!InfinityResetModel.TryApply(
                                candidate,
                                breakInfinity: true,
                                requestedReward,
                                botCapTransition: false,
                                resetPolicy,
                                out InfinityResetOutcome outcome))
                        {
                            LastDiagnostic =
                                "reset_rejected";
                            yield break;
                        }
#if UNITY_EDITOR
                        DiagnosticResetTicks +=
                            System.Diagnostics.Stopwatch
                                .GetTimestamp() -
                            batchedResetStarted;
#endif
                        rewardGranted = outcome.RewardGranted;
                        nextAutomationRemaining =
                            automationIntervalSeconds;
                        AcceptCycleExecution(
                            execution,
                            duration,
                            rewardGranted,
                            automationEvents,
                            nextAutomationRemaining);
                        yield break;
                    }
                    events++;
                    yield return true;
                    continue;
                }

                double step = Math.Min(
                    Math.Min(
                        resetRemaining,
                        automationRemaining),
                    maximumRemaining);
                if (!NumericSafety.IsFinite(step) ||
                    step <= TimeEpsilon)
                {
                    LastDiagnostic = "invalid_cycle_step";
                    yield break;
                }

                ProductionSystem.SetBotDistribution(
                    data,
                    prestige,
                    prestigePlus);
#if UNITY_EDITOR
                long productionStarted =
                    System.Diagnostics.Stopwatch.GetTimestamp();
#endif
                ProductionSystem.CalculateProduction(
                    data,
                    skills,
                    prestige,
                    prestigePlus,
                    step,
                    recomputeDerivedState: false);
#if UNITY_EDITOR
                DiagnosticProductionTicks +=
                    System.Diagnostics.Stopwatch.GetTimestamp() -
                    productionStarted;
#endif
                duration = NumericSafety.Add(duration, step).Value;
                automationRemaining = Math.Max(
                    0d,
                    automationRemaining - step);

                if (automationRemaining <= TimeEpsilon)
                {
#if UNITY_EDITOR
                    long automationStarted =
                        System.Diagnostics.Stopwatch.GetTimestamp();
#endif
                    bool researchChanged = RunAutomation(
                        candidate,
                        facilityRules,
                        researchRules,
                        automationPolicy);
#if UNITY_EDITOR
                    DiagnosticAutomationTicks +=
                        System.Diagnostics.Stopwatch.GetTimestamp() -
                        automationStarted;
#endif
                    if (researchChanged)
                    {
                        InfinityResetModel.RebuildDerivedState(
                            candidate);
                    }
                    automationEvents = NumericSafety.Add(
                        automationEvents,
                        1L).Value;
#if UNITY_EDITOR
                    DiagnosticAutomationEvents =
                        NumericSafety.Add(
                            DiagnosticAutomationEvents,
                            1L).Value;
#endif
                    automationRemaining = automationIntervalSeconds;
                }

#if UNITY_EDITOR
                long derivedStarted =
                    System.Diagnostics.Stopwatch.GetTimestamp();
#endif
                ProductionSystem.RecalculateDerivedState(
                    data,
                    skills,
                    prestige,
                    prestigePlus);
#if UNITY_EDITOR
                DiagnosticDerivedTicks +=
                    System.Diagnostics.Stopwatch.GetTimestamp() -
                    derivedStarted;
#endif
                events++;
                if (resetRemaining <= step + TimeEpsilon)
                {
                    long requestedReward =
                        calculateReward(data.bots);
                    if (requestedReward < rewardTarget)
                    {
                        data.bots = NumericSafety.BitIncrement(
                            data.bots);
                        requestedReward =
                            calculateReward(data.bots);
                        if (requestedReward < rewardTarget)
                        {
                            LastDiagnostic =
                                "threshold_rounding";
                            yield break;
                        }
                    }

                    candidate.timeLastInfinity = duration;
#if UNITY_EDITOR
                    long resetStarted =
                        System.Diagnostics.Stopwatch.GetTimestamp();
#endif
                    if (!InfinityResetModel.TryApply(
                            candidate,
                            breakInfinity: true,
                            requestedReward,
                            botCapTransition: false,
                            resetPolicy,
                            out InfinityResetOutcome outcome))
                    {
                        LastDiagnostic = "reset_rejected";
                        yield break;
                    }
#if UNITY_EDITOR
                    DiagnosticResetTicks +=
                        System.Diagnostics.Stopwatch.GetTimestamp() -
                        resetStarted;
#endif
                    rewardGranted = outcome.RewardGranted;
                    nextAutomationRemaining =
                        automationRemaining;
                    AcceptCycleExecution(
                        execution,
                        duration,
                        rewardGranted,
                        automationEvents,
                        nextAutomationRemaining);
                    yield break;
                }
                yield return true;
            }

            LastDiagnostic = "cycle_boundary_limit";
            yield break;
        }

        private static bool TryBatchNoOpAutomationTicks(
            SaveDataSettings settings,
            DysonFacilityAutomationRule[] facilityRules,
            ResearchAutomationRule[] researchRules,
            double resetBotThreshold,
            double resetRemaining,
            double automationIntervalSeconds,
            long maximumTicks,
            out long processedTicks)
        {
            processedTicks = 0L;
            if (maximumTicks < 2L ||
                !NumericSafety.IsFinite(
                    resetRemaining) &&
                resetRemaining != double.MaxValue)
            {
                return false;
            }

            long requestedTicks =
                resetRemaining == double.MaxValue
                    ? maximumTicks
                    : Math.Min(
                        maximumTicks,
                        NumericSafety.ToLongFloor(
                            Math.Floor(
                                Math.Max(
                                    0d,
                                    resetRemaining) /
                                automationIntervalSeconds))
                            .Value);
            if (requestedTicks <
                MinimumAnalyticalAutomationBatchTicks)
                return false;

            SaveDataSettings probe;
            try
            {
                probe = CloneSimulationCandidate(settings);
            }
            catch
            {
                return false;
            }
            DysonVerseSaveData probeDyson =
                probe.dysonVerseSaveData;
            long probedTicks =
                AnalyticalOfflineSimulation.TryAdvanceDyson(
                    probeDyson.dysonVerseInfinityData,
                    probeDyson.dysonVerseSkillTreeData,
                    probeDyson.dysonVersePrestigeData,
                    probe.prestigePlus,
                    requestedTicks,
                    resetBotThreshold,
                        state =>
                            DysonAutomationTransactions
                                .WouldPurchaseAtState(
                                    probe,
                                    facilityRules,
                                    researchRules,
                                    state));
            if (probedTicks < 2L)
                return false;

            settings.dysonVerseSaveData =
                probe.dysonVerseSaveData;
            settings.prestigePlus =
                probe.prestigePlus;
            processedTicks = probedTicks;
            return true;
        }

        private static bool RunAutomation(
            SaveDataSettings settings,
            DysonFacilityAutomationRule[] facilityRules,
            ResearchAutomationRule[] researchRules,
            SimulationAutomationPolicy automationPolicy)
        {
            bool researchChanged = false;
            int facilityCount = facilityRules?.Length ?? 0;
            if (facilityCount > 0)
            {
                int first = AutomationRotation.Normalize(
                    settings.dysonAutomationTargetIndex,
                    facilityCount);
                for (int offset = 0; offset < facilityCount; offset++)
                {
                    DysonAutomationTransactions.TryPurchaseFacility(
                        settings,
                        facilityRules[(first + offset) % facilityCount],
                        automationPolicy,
                        out _);
                }
                settings.dysonAutomationTargetIndex =
                    AutomationRotation.Advance(
                        first,
                        facilityCount,
                        1L);
            }

            int researchCount = researchRules?.Length ?? 0;
            if (researchCount <= 0) return false;
            int researchFirst = AutomationRotation.Normalize(
                settings.researchAutomationTargetIndex,
                researchCount);
            for (int offset = 0; offset < researchCount; offset++)
            {
                researchChanged |=
                    DysonAutomationTransactions.TryPurchaseResearch(
                        settings,
                        researchRules[
                            (researchFirst + offset) % researchCount],
                        automationPolicy,
                        out _);
            }
            settings.researchAutomationTargetIndex =
                AutomationRotation.Advance(
                researchFirst,
                researchCount,
                1L);
            return researchChanged;
        }

        private static double NormalizeAutomationRemaining(
            double value,
            double interval)
        {
            return NumericSafety.IsFinite(value) &&
                   value > TimeEpsilon &&
                   value <= interval + TimeEpsilon
                ? Math.Min(interval, value)
                : interval;
        }

        private static bool IsMinimumCycleDuration(
            double duration,
            double minimum)
        {
            return NumericSafety.IsFinite(duration) &&
                   NumericSafety.IsFinite(minimum) &&
                   minimum > 0d &&
                   duration <=
                   NumericSafety.BitIncrement(minimum);
        }

        private static bool HasState(SaveDataSettings settings)
        {
            return settings?.dysonVerseSaveData
                       ?.dysonVerseInfinityData != null &&
                   settings.dysonVerseSaveData
                       .dysonVerseSkillTreeData != null &&
                   settings.dysonVerseSaveData
                       .dysonVersePrestigeData != null &&
                   settings.prestigePlus != null;
        }

        private static SaveDataSettings CloneSimulationCandidate(
            SaveDataSettings source)
        {
            if (source == null)
                return null;
            var candidate = new SaveDataSettings();
            foreach (FieldInfo field in
                     typeof(SaveDataSettings).GetFields(
                         BindingFlags.Instance |
                         BindingFlags.Public))
            {
                Type type = field.FieldType;
                if (type.IsValueType ||
                    type.IsEnum ||
                    type == typeof(string))
                {
                    field.SetValue(
                        candidate,
                        field.GetValue(source));
                }
            }

            candidate.dysonVerseSaveData =
                (DysonVerseSaveData)CloneDataObject(
                    source.dysonVerseSaveData);
            candidate.prestigePlus =
                (PrestigePlus)CloneDataObject(
                    source.prestigePlus);
            candidate.sdSimulation =
                (SaveDataDream1)CloneDataObject(
                    source.sdSimulation);
            candidate.sdPrestige =
                (SaveDataPrestige)CloneDataObject(
                    source.sdPrestige);
            candidate.simulationStatistics = null;
            return candidate;
        }

        private static object CloneDataObject(object source)
        {
            if (source == null)
                return null;
            Type type = source.GetType();
            if (type.IsValueType ||
                type.IsEnum ||
                type == typeof(string))
            {
                return source;
            }
            if (type.IsArray)
            {
                var sourceArray = (Array)source;
                Type elementType = type.GetElementType();
                var clone = Array.CreateInstance(
                    elementType,
                    sourceArray.Length);
                for (int index = 0;
                     index < sourceArray.Length;
                     index++)
                {
                    clone.SetValue(
                        CloneDataObject(
                            sourceArray.GetValue(index)),
                        index);
                }
                return clone;
            }
            if (source is IDictionary sourceDictionary)
            {
                var clone =
                    (IDictionary)Activator.CreateInstance(type);
                foreach (DictionaryEntry entry in sourceDictionary)
                {
                    clone.Add(
                        CloneDataObject(entry.Key),
                        CloneDataObject(entry.Value));
                }
                return clone;
            }
            if (source is IList sourceList)
            {
                var clone =
                    (IList)Activator.CreateInstance(type);
                foreach (object item in sourceList)
                {
                    clone.Add(CloneDataObject(item));
                }
                return clone;
            }

            object result = Activator.CreateInstance(type);
            foreach (FieldInfo field in type.GetFields(
                         BindingFlags.Instance |
                         BindingFlags.Public))
            {
                field.SetValue(
                    result,
                    CloneDataObject(
                        field.GetValue(source)));
            }
            return result;
        }

        internal sealed class ProjectionEstimator
        {
            private readonly DysonFacilityAutomationRule[]
                _facilityRules;
            private readonly ResearchAutomationRule[]
                _researchRules;
            private readonly InfinityResetPolicy _resetPolicy;
            private readonly Func<double, long> _calculateReward;
            private readonly long _rewardTarget;
            private readonly double _resetBotThreshold;
            private readonly double _minimumCycleSeconds;
            private readonly double _automationIntervalSeconds;
            private readonly long _cycleCount;
            private readonly int _segments;
            private readonly SimulationAutomationPolicy
                _automationPolicy;
            private SaveDataSettings _state;
            private double _automationRemaining;
            private double _totalSeconds;
            private long _totalAutomationEvents;
            private long _lastReward;
            private double _lastDuration;
            private double _predictorDuration;
            private long _predictorReward;
            private int _segment;
            private CycleExecution _activeCycle;
            private SaveDataSettings _cycleStart;
            private long _pendingSegmentCycles;
            private int _pendingDysonRotation;
            private int _pendingResearchRotation;
            private long _pendingStartingPoints;
            private double _pendingStartingAutomationRemaining;
            private readonly double _maximumCycleDurationSeconds;

            public ProjectionEstimator(
                SaveDataSettings starting,
                DysonFacilityAutomationRule[] facilityRules,
                ResearchAutomationRule[] researchRules,
                InfinityResetPolicy resetPolicy,
                Func<double, long> calculateReward,
                long rewardTarget,
                double resetBotThreshold,
                double minimumCycleSeconds,
                double automationIntervalSeconds,
                double automationRemaining,
                long cycleCount,
                int requestedSegments,
                SimulationAutomationPolicy automationPolicy,
                double initialDuration,
                long initialReward,
                double maximumCycleDurationSeconds =
                    double.MaxValue)
            {
                _facilityRules = facilityRules;
                _researchRules = researchRules;
                _resetPolicy = resetPolicy;
                _calculateReward = calculateReward;
                _rewardTarget = rewardTarget;
                _resetBotThreshold = resetBotThreshold;
                _minimumCycleSeconds = minimumCycleSeconds;
                _automationIntervalSeconds =
                    automationIntervalSeconds;
                _automationRemaining = automationRemaining;
                _cycleCount = cycleCount;
                _segments = (int)Math.Min(
                    requestedSegments,
                    cycleCount);
                _automationPolicy = automationPolicy;
                _predictorDuration = initialDuration;
                _predictorReward = initialReward;
                _maximumCycleDurationSeconds =
                    maximumCycleDurationSeconds;
                try
                {
                    _state = CloneSimulationCandidate(starting);
                }
                catch
                {
                    IsCompleted = true;
                    Result = default;
                }
                if (_state != null)
                    _state.simulationStatistics = null;
            }

            public bool IsCompleted { get; private set; }
            public bool SignatureChanged { get; private set; }
            public ProjectionEstimate Result { get; private set; }

            public void Step()
            {
                if (IsCompleted)
                    return;
                if (_state == null ||
                    _segments <= 0 ||
                    !NumericSafety.IsFinite(_predictorDuration) ||
                    _predictorDuration <= 0d ||
                    _predictorReward <= 0L)
                {
                    Complete(default);
                    return;
                }

                if (_activeCycle == null &&
                    !BeginSegmentCycle())
                {
                    Complete(default);
                    return;
                }

                StepCycleExecution(
                    _activeCycle,
                    MaximumCycleBoundariesPerProjectionStep);
                if (!_activeCycle.IsCompleted)
                    return;
                if (!_activeCycle.Accepted)
                {
                    Complete(default);
                    return;
                }
                if (!ResetOwnedStateMatches(
                        _cycleStart,
                        _state))
                {
                    SignatureChanged = true;
                    Complete(default);
                    return;
                }

                if (_pendingSegmentCycles == 1L)
                {
                    CompleteExactSegment();
                }
                else
                {
                    CompleteProjectedSegment();
                }
            }

            private bool BeginSegmentCycle()
            {
                long baseCycles =
                    _cycleCount / _segments;
                long extraCycles =
                    _cycleCount % _segments;
                _pendingSegmentCycles =
                    baseCycles +
                    (_segment < extraCycles ? 1L : 0L);
                try
                {
                    _cycleStart =
                        CloneSimulationCandidate(_state);
                }
                catch
                {
                    return false;
                }

                _pendingDysonRotation =
                    _state.dysonAutomationTargetIndex;
                _pendingResearchRotation =
                    _state.researchAutomationTargetIndex;
                _pendingStartingPoints = _state
                    .dysonVerseSaveData
                    .dysonVersePrestigeData.infinityPoints;
                _pendingStartingAutomationRemaining =
                    _automationRemaining;
                double cycleAutomationRemaining =
                    _automationRemaining;

                if (_pendingSegmentCycles > 1L)
                {
                    double midpointCycles =
                        (_pendingSegmentCycles - 1d) * 0.5d;
                    long midpointGain =
                        NumericSafety.ToLongFloor(
                            Math.Round(
                                NumericSafety.Multiply(
                                    _predictorReward,
                                    midpointCycles).Value)).Value;
                    long midpointPoints = NumericSafety.Add(
                        _pendingStartingPoints,
                        midpointGain).Value;
                    double midpointSeconds =
                        NumericSafety.Multiply(
                            _predictorDuration,
                            midpointCycles).Value;
                    AdvanceAutomationClock(
                        _pendingStartingAutomationRemaining,
                        midpointSeconds,
                        _automationIntervalSeconds,
                        out long midpointEvents,
                        out cycleAutomationRemaining);
                    _state.dysonVerseSaveData
                        .dysonVersePrestigeData.infinityPoints =
                        midpointPoints;
                    _state.dysonAutomationTargetIndex =
                        AutomationRotation.Advance(
                            _pendingDysonRotation,
                            _facilityRules?.Length ?? 0,
                            midpointEvents);
                    _state.researchAutomationTargetIndex =
                        AutomationRotation.Advance(
                            _pendingResearchRotation,
                            _researchRules?.Length ?? 0,
                            midpointEvents);
                    InfinityResetModel.RebuildDerivedState(
                        _state);
                }

                _activeCycle = CreateCycleExecution(
                    _state,
                    _facilityRules,
                    _researchRules,
                    _resetPolicy,
                    _calculateReward,
                    _rewardTarget,
                    _resetBotThreshold,
                    _minimumCycleSeconds,
                    _automationIntervalSeconds,
                    cycleAutomationRemaining,
                    _automationPolicy,
                    _maximumCycleDurationSeconds);
                return true;
            }

            private void CompleteExactSegment()
            {
                _totalSeconds = NumericSafety.Add(
                    _totalSeconds,
                    _activeCycle.Duration).Value;
                _totalAutomationEvents = NumericSafety.Add(
                    _totalAutomationEvents,
                    _activeCycle.AutomationEvents).Value;
                _lastReward =
                    _activeCycle.RewardGranted;
                _lastDuration =
                    _activeCycle.Duration;
                _predictorDuration =
                    _activeCycle.Duration;
                _predictorReward =
                    _activeCycle.RewardGranted;
                _automationRemaining =
                    _activeCycle.NextAutomationRemaining;
                FinishSegment();
            }

            private void CompleteProjectedSegment()
            {
                double duration =
                    _activeCycle.Duration;
                long reward =
                    _activeCycle.RewardGranted;
                long segmentGain = NumericSafety.Multiply(
                    reward,
                    _pendingSegmentCycles).Value;
                long finalPoints = NumericSafety.Add(
                    _pendingStartingPoints,
                    segmentGain).Value;
                double segmentSeconds =
                    NumericSafety.Multiply(
                        duration,
                        _pendingSegmentCycles).Value;
                if (!NumericSafety.IsFinite(segmentSeconds) ||
                    segmentSeconds <= 0d)
                {
                    Complete(default);
                    return;
                }
                AdvanceAutomationClock(
                    _pendingStartingAutomationRemaining,
                    segmentSeconds,
                    _automationIntervalSeconds,
                    out long events,
                    out _automationRemaining);
                _state.dysonVerseSaveData
                    .dysonVersePrestigeData.infinityPoints =
                    finalPoints;
                _state.dysonAutomationTargetIndex =
                    AutomationRotation.Advance(
                        _pendingDysonRotation,
                        _facilityRules?.Length ?? 0,
                        events);
                _state.researchAutomationTargetIndex =
                    AutomationRotation.Advance(
                        _pendingResearchRotation,
                        _researchRules?.Length ?? 0,
                        events);
                InfinityResetModel.RebuildDerivedState(
                    _state);
                _totalSeconds = NumericSafety.Add(
                    _totalSeconds,
                    segmentSeconds).Value;
                _totalAutomationEvents = NumericSafety.Add(
                    _totalAutomationEvents,
                    events).Value;
                _lastReward = finalPoints == long.MaxValue
                    ? 0L
                    : reward;
                _lastDuration = duration;
                _predictorDuration = duration;
                _predictorReward = reward;
                FinishSegment();
            }

            private void FinishSegment()
            {
                _activeCycle = null;
                _cycleStart = null;
                _segment++;
                if (_segment < _segments)
                    return;
                Complete(new ProjectionEstimate(
                    true,
                    _state,
                    _totalSeconds,
                    _state.dysonVerseSaveData
                        .dysonVersePrestigeData.infinityPoints,
                    _lastReward,
                    _lastDuration,
                    _totalAutomationEvents,
                    _automationRemaining));
            }

            private void StepLegacy()
            {
                if (IsCompleted)
                    return;
                if (_state == null ||
                    _segments <= 0 ||
                    !NumericSafety.IsFinite(_predictorDuration) ||
                    _predictorDuration <= 0d ||
                    _predictorReward <= 0L)
                {
                    Complete(default);
                    return;
                }

                long baseCycles = _cycleCount / _segments;
                long extraCycles = _cycleCount % _segments;
                long segmentCycles =
                    baseCycles +
                    (_segment < extraCycles ? 1L : 0L);
                SaveDataSettings cycleStart;
                try
                {
                    cycleStart =
                        CloneSimulationCandidate(_state);
                }
                catch
                {
                    Complete(default);
                    return;
                }
                if (segmentCycles == 1L)
                {
                    if (!TryRunOneCycle(
                            _state,
                            _facilityRules,
                            _researchRules,
                            _resetPolicy,
                            _calculateReward,
                            _rewardTarget,
                            _resetBotThreshold,
                            _minimumCycleSeconds,
                            _automationIntervalSeconds,
                            _automationRemaining,
                            _automationPolicy,
                            out double exactDuration,
                            out long exactReward,
                            out long exactEvents,
                            out double exactAutomationRemaining))
                    {
                        Complete(default);
                        return;
                    }
                    if (!ResetOwnedStateMatches(
                            cycleStart,
                            _state))
                    {
                        SignatureChanged = true;
                        Complete(default);
                        return;
                    }
                    _totalSeconds = NumericSafety.Add(
                        _totalSeconds,
                        exactDuration).Value;
                    _totalAutomationEvents = NumericSafety.Add(
                        _totalAutomationEvents,
                        exactEvents).Value;
                    _lastReward = exactReward;
                    _lastDuration = exactDuration;
                    _predictorDuration = exactDuration;
                    _predictorReward = exactReward;
                    _automationRemaining =
                        exactAutomationRemaining;
                    _segment++;
                    if (_segment < _segments)
                        return;
                    Complete(new ProjectionEstimate(
                        true,
                        _state,
                        _totalSeconds,
                        _state.dysonVerseSaveData
                            .dysonVersePrestigeData.infinityPoints,
                        _lastReward,
                        _lastDuration,
                        _totalAutomationEvents,
                        _automationRemaining));
                    return;
                }
                int dysonRotation =
                    _state.dysonAutomationTargetIndex;
                int researchRotation =
                    _state.researchAutomationTargetIndex;
                long startingPoints = _state
                    .dysonVerseSaveData
                    .dysonVersePrestigeData.infinityPoints;
                double startingAutomationRemaining =
                    _automationRemaining;
                double midpointCycles =
                    (segmentCycles - 1d) * 0.5d;
                long midpointGain =
                    NumericSafety.ToLongFloor(
                        Math.Round(
                            NumericSafety.Multiply(
                                _predictorReward,
                                midpointCycles).Value)).Value;
                long midpointPoints = NumericSafety.Add(
                    startingPoints,
                    midpointGain).Value;
                double midpointSeconds =
                    NumericSafety.Multiply(
                        _predictorDuration,
                        midpointCycles).Value;
                AdvanceAutomationClock(
                    startingAutomationRemaining,
                    midpointSeconds,
                    _automationIntervalSeconds,
                    out long midpointEvents,
                    out double midpointAutomationRemaining);
                _state.dysonVerseSaveData
                    .dysonVersePrestigeData.infinityPoints =
                    midpointPoints;
                _state.dysonAutomationTargetIndex =
                    AutomationRotation.Advance(
                        dysonRotation,
                        _facilityRules?.Length ?? 0,
                        midpointEvents);
                _state.researchAutomationTargetIndex =
                    AutomationRotation.Advance(
                        researchRotation,
                        _researchRules?.Length ?? 0,
                        midpointEvents);
                InfinityResetModel.RebuildDerivedState(_state);
                if (!TryRunOneCycle(
                        _state,
                        _facilityRules,
                        _researchRules,
                        _resetPolicy,
                        _calculateReward,
                        _rewardTarget,
                        _resetBotThreshold,
                        _minimumCycleSeconds,
                        _automationIntervalSeconds,
                        midpointAutomationRemaining,
                        _automationPolicy,
                        out double duration,
                        out long reward,
                        out _,
                        out _))
                {
                    Complete(default);
                    return;
                }
                if (!ResetOwnedStateMatches(
                        cycleStart,
                        _state))
                {
                    SignatureChanged = true;
                    Complete(default);
                    return;
                }

                long segmentGain = NumericSafety.Multiply(
                    reward,
                    segmentCycles).Value;
                long finalPoints = NumericSafety.Add(
                    startingPoints,
                    segmentGain).Value;
                double segmentSeconds = NumericSafety.Multiply(
                    duration,
                    segmentCycles).Value;
                if (!NumericSafety.IsFinite(segmentSeconds) ||
                    segmentSeconds <= 0d)
                {
                    Complete(default);
                    return;
                }
                AdvanceAutomationClock(
                    startingAutomationRemaining,
                    segmentSeconds,
                    _automationIntervalSeconds,
                    out long events,
                    out _automationRemaining);
                _state.dysonVerseSaveData
                    .dysonVersePrestigeData.infinityPoints =
                    finalPoints;
                _state.dysonAutomationTargetIndex =
                    AutomationRotation.Advance(
                        dysonRotation,
                        _facilityRules?.Length ?? 0,
                        events);
                _state.researchAutomationTargetIndex =
                    AutomationRotation.Advance(
                        researchRotation,
                        _researchRules?.Length ?? 0,
                        events);
                InfinityResetModel.RebuildDerivedState(_state);
                _totalSeconds = NumericSafety.Add(
                    _totalSeconds,
                    segmentSeconds).Value;
                _totalAutomationEvents = NumericSafety.Add(
                    _totalAutomationEvents,
                    events).Value;
                _lastReward = finalPoints == long.MaxValue
                    ? 0L
                    : reward;
                _lastDuration = duration;
                _predictorDuration = duration;
                _predictorReward = reward;
                _segment++;
                if (_segment < _segments)
                    return;

                Complete(new ProjectionEstimate(
                    true,
                    _state,
                    _totalSeconds,
                    _state.dysonVerseSaveData
                        .dysonVersePrestigeData.infinityPoints,
                    _lastReward,
                    _lastDuration,
                    _totalAutomationEvents,
                    _automationRemaining));
            }

            private void Complete(ProjectionEstimate result)
            {
                Result = result;
                IsCompleted = true;
            }
        }

        internal readonly struct ProjectionEstimate
        {
            public ProjectionEstimate(
                bool valid,
                SaveDataSettings candidate,
                double consumedSeconds,
                long finalInfinityPoints,
                long lastReward,
                double lastDuration,
                long automationEvents,
                double automationRemaining)
            {
                Valid = valid;
                Candidate = candidate;
                ConsumedSeconds = consumedSeconds;
                FinalInfinityPoints = finalInfinityPoints;
                LastReward = lastReward;
                LastDuration = lastDuration;
                AutomationEvents = automationEvents;
                AutomationRemaining = automationRemaining;
            }

            public bool Valid { get; }
            public SaveDataSettings Candidate { get; }
            public double ConsumedSeconds { get; }
            public long FinalInfinityPoints { get; }
            public long LastReward { get; }
            public double LastDuration { get; }
            public long AutomationEvents { get; }
            public double AutomationRemaining { get; }
            public int DysonRotation =>
                Candidate?.dysonAutomationTargetIndex ?? 0;
            public int ResearchRotation =>
                Candidate?.researchAutomationTargetIndex ?? 0;
        }

        internal readonly struct EndpointCycleEvaluation
        {
            public EndpointCycleEvaluation(
                SaveDataSettings candidate,
                double duration,
                long reward,
                long automationEvents,
                double automationRemaining,
                bool resetOccurred = true)
            {
                Candidate = candidate;
                Duration = duration;
                Reward = reward;
                AutomationEvents = automationEvents;
                AutomationRemaining = automationRemaining;
                ResetOccurred = resetOccurred;
            }

            public SaveDataSettings Candidate { get; }
            public double Duration { get; }
            public long Reward { get; }
            public long AutomationEvents { get; }
            public double AutomationRemaining { get; }
            public bool ResetOccurred { get; }
        }
    }
}
