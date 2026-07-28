/*
 * Purpose: Pure, resumable event-time scheduler shared by active and stored-time simulation.
 * This file deliberately has no UnityEngine dependency. Runtime adapters own presentation,
 * persistence and scene references; the scheduler owns time, ordering and yield semantics.
 */

using System;
using System.Collections.Generic;
using System.Diagnostics;
using Systems.Numeric;

namespace Systems.Simulation
{
    public static class SimulationAccuracyContract
    {
        // Baseline user-approved bound for deliberately approximated aggregate
        // IP and continuous production outcomes.
        public const double MaximumAggregateRelativeError = 0.01d;
        public const double MaximumLongDurationRelativeError = 0.05d;

        // Very long stored-time jobs are allowed to trade progressively more
        // numerical precision for bounded real processing time. The curve is
        // intentionally smooth so crossing an authored duration boundary
        // cannot suddenly select a radically different projection.
        //
        // Discrete gameplay outcomes (unlocks, purchases, caps, reset kinds,
        // one-time rewards, and flags) remain exact. Only aggregate reset/IP
        // totals, continuous state, and internal scheduler phase use this
        // duration-scaled allowance.
        public static double AllowedAggregateRelativeError(
            double simulatedSeconds)
        {
            if (!NumericSafety.IsFinite(simulatedSeconds) ||
                simulatedSeconds <= 60d)
            {
                return MaximumAggregateRelativeError;
            }

            double decades = Math.Log10(simulatedSeconds / 60d);
            return Math.Min(
                MaximumLongDurationRelativeError,
                MaximumAggregateRelativeError +
                Math.Max(0d, decades) * 0.01d);
        }

        // Coarse-versus-refined disagreement is a conservative error signal,
        // not the measured final outcome error. Permit twice the outcome
        // budget here, then prove the resulting end state against saved
        // canonical fixtures in characterization tests.
        public static double AllowedProjectionDisagreement(
            double simulatedSeconds)
        {
            return Math.Min(
                0.15d,
                AllowedAggregateRelativeError(simulatedSeconds) * 3d);
        }
    }

    public static class AutomationRotation
    {
        public static int Normalize(int index, int targetCount)
        {
            if (targetCount <= 0) return 0;
            int normalized = index % targetCount;
            return normalized < 0
                ? normalized + targetCount
                : normalized;
        }

        public static int Advance(
            int currentIndex,
            int targetCount,
            long elapsedTicks)
        {
            if (targetCount <= 0 || elapsedTicks <= 0L)
                return Normalize(currentIndex, targetCount);
            int offset = (int)(elapsedTicks % targetCount);
            return Normalize(
                Normalize(currentIndex, targetCount) + offset,
                targetCount);
        }
    }

    public readonly struct InfinityStoredTimeUsage
    {
        public InfinityStoredTimeUsage(
            double currentInfinity,
            double previousInfinity)
        {
            CurrentInfinity = currentInfinity;
            PreviousInfinity = previousInfinity;
        }

        public double CurrentInfinity { get; }
        public double PreviousInfinity { get; }
    }

    public static class InfinityStoredTimeAccounting
    {
        public static InfinityStoredTimeUsage AdvanceWithoutReset(
            double currentInfinity,
            double previousInfinity,
            double seconds)
        {
            return new InfinityStoredTimeUsage(
                NumericSafety.Add(
                    NumericSafety.ClampContinuous(currentInfinity),
                    NumericSafety.ClampContinuous(seconds)).Value,
                NumericSafety.ClampContinuous(previousInfinity));
        }

        public static InfinityStoredTimeUsage CompleteAggregate(
            double currentInfinity,
            double previousInfinity,
            double consumedSeconds,
            long completedCycles,
            double lastCycleSeconds)
        {
            if (completedCycles <= 0L)
            {
                return AdvanceWithoutReset(
                    currentInfinity,
                    previousInfinity,
                    consumedSeconds);
            }

            double previous = completedCycles == 1L
                ? NumericSafety.Add(
                    NumericSafety.ClampContinuous(currentInfinity),
                    NumericSafety.ClampContinuous(consumedSeconds)).Value
                : NumericSafety.ClampContinuous(lastCycleSeconds);
            return new InfinityStoredTimeUsage(
                0d,
                previous);
        }
    }

    public enum SimulationAdvanceMode
    {
        Active,
        StoredTime,
        Shadow
    }

    public enum SimulationAutomationPolicy
    {
        PreserveConfiguredMode,
        ForceBuyMax
    }

    public enum SimulationValidationStatus
    {
        Valid,
        Yielded,
        Cancelled,
        InvalidRequest,
        InvalidState,
        UnvalidatedAcceleration,
        ZeroTimeLoop
    }

    public enum SimulationEventKind
    {
        Endpoint,
        ProductionArrival,
        Automation,
        Affordability,
        TimerExpiry,
        ResearchCompletion,
        BoostExpiry,
        DoubleTimeDepletion,
        RealityCapacity,
        DreamReset,
        BotCapTransition,
        InfinityReset,
        QueuedInput
    }

    public enum SimulationInputKind
    {
        BreakTarget,
        Purchase,
        AutomationSetting,
        QuantumAction,
        BlackHoleAction
    }

    public readonly struct SimulationQueuedInput
    {
        public SimulationQueuedInput(
            double time,
            SimulationInputKind kind,
            long discreteValue = 0L,
            double continuousValue = 0d,
            string id = null)
        {
            Time = time;
            Kind = kind;
            DiscreteValue = discreteValue;
            ContinuousValue = continuousValue;
            Id = id;
        }

        public double Time { get; }
        public SimulationInputKind Kind { get; }
        public long DiscreteValue { get; }
        public double ContinuousValue { get; }
        public string Id { get; }
    }

    public readonly struct SimulationEvent
    {
        public SimulationEvent(
            double time,
            SimulationEventKind kind,
            int stableOrder = 0,
            string id = null)
        {
            Time = time;
            Kind = kind;
            StableOrder = stableOrder;
            Id = id;
        }

        public double Time { get; }
        public SimulationEventKind Kind { get; }
        public int StableOrder { get; }
        public string Id { get; }
    }

    public sealed class SimulationPresentationSummary
    {
        public long OrdinaryInfinityCount;
        public long BreakInfinityCount;
        public long OrdinaryInfinityPoints;
        public long BreakInfinityPoints;
        public long BotCapInfinityPoints;
        public long BotCapOverflowRewards;
        public long MeteorDreamResets;
        public long AiDreamResets;
        public long GlobalWarmingDreamResets;
        public long BlackHoleDreamResets;
        public long StrangeMatter;
        public long RealityWorkers;
        public long AutomaticInfluence;
        public long ManualInfluence;
        public double RealityCapacityStallSeconds;

        public long CombinedInfinityCount =>
            NumericSafety.Add(OrdinaryInfinityCount, BreakInfinityCount).Value;

        public long CombinedInfinityPoints =>
            NumericSafety.Add(
                NumericSafety.Add(
                    OrdinaryInfinityPoints,
                    BreakInfinityPoints).Value,
                BotCapInfinityPoints).Value;

        public long CombinedDreamResets =>
            NumericSafety.Add(
                NumericSafety.Add(
                    MeteorDreamResets,
                    AiDreamResets).Value,
                NumericSafety.Add(
                    GlobalWarmingDreamResets,
                    BlackHoleDreamResets).Value).Value;

        public void Merge(SimulationPresentationSummary other)
        {
            if (other == null) return;
            OrdinaryInfinityCount = NumericSafety.Add(
                OrdinaryInfinityCount, other.OrdinaryInfinityCount).Value;
            BreakInfinityCount = NumericSafety.Add(
                BreakInfinityCount, other.BreakInfinityCount).Value;
            OrdinaryInfinityPoints = NumericSafety.Add(
                OrdinaryInfinityPoints, other.OrdinaryInfinityPoints).Value;
            BreakInfinityPoints = NumericSafety.Add(
                BreakInfinityPoints, other.BreakInfinityPoints).Value;
            BotCapInfinityPoints = NumericSafety.Add(
                BotCapInfinityPoints, other.BotCapInfinityPoints).Value;
            BotCapOverflowRewards = NumericSafety.Add(
                BotCapOverflowRewards, other.BotCapOverflowRewards).Value;
            MeteorDreamResets = NumericSafety.Add(
                MeteorDreamResets, other.MeteorDreamResets).Value;
            AiDreamResets = NumericSafety.Add(
                AiDreamResets, other.AiDreamResets).Value;
            GlobalWarmingDreamResets = NumericSafety.Add(
                GlobalWarmingDreamResets,
                other.GlobalWarmingDreamResets).Value;
            BlackHoleDreamResets = NumericSafety.Add(
                BlackHoleDreamResets, other.BlackHoleDreamResets).Value;
            StrangeMatter = NumericSafety.Add(
                StrangeMatter, other.StrangeMatter).Value;
            RealityWorkers = NumericSafety.Add(
                RealityWorkers, other.RealityWorkers).Value;
            AutomaticInfluence = NumericSafety.Add(
                AutomaticInfluence, other.AutomaticInfluence).Value;
            ManualInfluence = NumericSafety.Add(
                ManualInfluence, other.ManualInfluence).Value;
            RealityCapacityStallSeconds = NumericSafety.Add(
                RealityCapacityStallSeconds,
                other.RealityCapacityStallSeconds).Value;
        }
    }

    public sealed class SimulationAdvanceRequest
    {
        public IEventTimeSimulationModel StartingState;
        public double DurationSeconds;
        public SimulationAdvanceMode Mode;
        public SimulationAutomationPolicy AutomationPolicy;
        public double AutomationIntervalSeconds = 0.1d;
        public double AutomationTimeUntilNextEvent;
        public double InfinityMinimumCycleSeconds = 1d / 60d;
        public double ProcessingBudgetMilliseconds = 4d;
        public bool AllowAcceleration = true;
        public bool CloneStartingState = true;
        public bool ProcessPartialEndpoint = true;
        public bool CancelRequested;
        public IReadOnlyList<SimulationQueuedInput> QueuedInputs;
    }

    public sealed class SimulationAdvanceResult
    {
        public IEventTimeSimulationModel CandidateState;
        public double ConsumedSeconds;
        public double RemainingSeconds;
        public double AutomationTimeUntilNextEvent;
        public SimulationValidationStatus ValidationStatus;
        public SimulationPresentationSummary Summary;
        public List<SimulationEvent> Events = new();
        public SimulationWorkMetrics Work = new();
        public string DiagnosticCode;

        public bool Completed =>
            ValidationStatus == SimulationValidationStatus.Valid &&
            RemainingSeconds <= 0d;
    }

    public sealed class SimulationWorkMetrics
    {
        public long SchedulerPasses;
        public long ContinuousSegments;
        public long MaterialEvents;
        public long AutomationEvents;
        public long AccelerationAttempts;
        public long AccelerationBlocksAccepted;
        public long AccelerationBlocksRejected;
        public long OrdinaryInfinityBlocks;
        public long BreakInfinityBlocks;
        public long DreamResetBlocks;
        public long ProductionOnlyBlocks;
        public double OrdinaryInfinityBlockSeconds;
        public double BreakInfinityBlockSeconds;
        public double DreamResetBlockSeconds;
        public double ProductionOnlyBlockSeconds;
        public double AcceleratedSeconds;
        public double ExactSeconds;
        public double ProcessingMilliseconds;

        public void Merge(SimulationWorkMetrics other)
        {
            if (other == null) return;
            SchedulerPasses = NumericSafety.Add(
                SchedulerPasses, other.SchedulerPasses).Value;
            ContinuousSegments = NumericSafety.Add(
                ContinuousSegments, other.ContinuousSegments).Value;
            MaterialEvents = NumericSafety.Add(
                MaterialEvents, other.MaterialEvents).Value;
            AutomationEvents = NumericSafety.Add(
                AutomationEvents, other.AutomationEvents).Value;
            AccelerationAttempts = NumericSafety.Add(
                AccelerationAttempts, other.AccelerationAttempts).Value;
            AccelerationBlocksAccepted = NumericSafety.Add(
                AccelerationBlocksAccepted,
                other.AccelerationBlocksAccepted).Value;
            AccelerationBlocksRejected = NumericSafety.Add(
                AccelerationBlocksRejected,
                other.AccelerationBlocksRejected).Value;
            OrdinaryInfinityBlocks = NumericSafety.Add(
                OrdinaryInfinityBlocks,
                other.OrdinaryInfinityBlocks).Value;
            BreakInfinityBlocks = NumericSafety.Add(
                BreakInfinityBlocks,
                other.BreakInfinityBlocks).Value;
            DreamResetBlocks = NumericSafety.Add(
                DreamResetBlocks,
                other.DreamResetBlocks).Value;
            ProductionOnlyBlocks = NumericSafety.Add(
                ProductionOnlyBlocks,
                other.ProductionOnlyBlocks).Value;
            OrdinaryInfinityBlockSeconds = NumericSafety.Add(
                OrdinaryInfinityBlockSeconds,
                other.OrdinaryInfinityBlockSeconds).Value;
            BreakInfinityBlockSeconds = NumericSafety.Add(
                BreakInfinityBlockSeconds,
                other.BreakInfinityBlockSeconds).Value;
            DreamResetBlockSeconds = NumericSafety.Add(
                DreamResetBlockSeconds,
                other.DreamResetBlockSeconds).Value;
            ProductionOnlyBlockSeconds = NumericSafety.Add(
                ProductionOnlyBlockSeconds,
                other.ProductionOnlyBlockSeconds).Value;
            AcceleratedSeconds = NumericSafety.Add(
                AcceleratedSeconds, other.AcceleratedSeconds).Value;
            ExactSeconds = NumericSafety.Add(
                ExactSeconds, other.ExactSeconds).Value;
            ProcessingMilliseconds = NumericSafety.Add(
                ProcessingMilliseconds,
                other.ProcessingMilliseconds).Value;
        }
    }

    public readonly struct SimulationAccelerationResult
    {
        public SimulationAccelerationResult(
            bool accepted,
            double consumedSeconds,
            SimulationPresentationSummary summary,
            double validationError = 0d,
            bool allAutomationEventsHandled = false,
            double automationTimeUntilNextEvent = double.NaN,
            bool yieldRequested = false)
        {
            Accepted = accepted;
            ConsumedSeconds = consumedSeconds;
            Summary = summary;
            ValidationError = validationError;
            AllAutomationEventsHandled = allAutomationEventsHandled;
            AutomationTimeUntilNextEvent =
                automationTimeUntilNextEvent;
            YieldRequested = yieldRequested;
        }

        public bool Accepted { get; }
        public double ConsumedSeconds { get; }
        public SimulationPresentationSummary Summary { get; }
        public double ValidationError { get; }
        /// <summary>
        /// True only when the block applied every Dyson and Dream automation
        /// event it crossed in canonical order. Partial subsystem handling is
        /// forbidden.
        /// </summary>
        public bool AllAutomationEventsHandled { get; }
        public double AutomationTimeUntilNextEvent { get; }
        public bool YieldRequested { get; }
    }

    /// <summary>
    /// Model-only contract. Implementations must not render, save, log or read wall-clock
    /// time. Clone creates the isolated candidate used by stored-time processing.
    /// </summary>
    public interface IEventTimeSimulationModel
    {
        IEventTimeSimulationModel Clone();
        bool IsFiniteAndValid(out string diagnosticCode);
        double TimeToNextMaterialEvent(
            double maximumSeconds,
            double infinityMinimumCycleSeconds);
        void AdvanceContinuous(double seconds);
        void ApplyProductionArrivals(SimulationPresentationSummary summary);
        void ApplyAutomation(
            SimulationAutomationPolicy policy,
            SimulationPresentationSummary summary);
        void ApplyDerivedTimersAndDoubleTime(
            double seconds,
            SimulationPresentationSummary summary);
        void ApplyDreamReset(SimulationPresentationSummary summary);
        void ApplyBotCapTransition(SimulationPresentationSummary summary);
        void ApplyInfinityReset(
            double minimumCycleSeconds,
            SimulationPresentationSummary summary);
        void ApplyQueuedInput(
            SimulationQueuedInput input,
            SimulationPresentationSummary summary);
        bool TryAccelerate(
            double maximumSeconds,
            SimulationAdvanceRequest request,
            out SimulationAccelerationResult acceleration);
    }

    public static class UnifiedEventTimeSimulation
    {
        private const double TimeEpsilon = 1e-12d;
        private const int MaximumZeroTimePasses = 32;

        public static SimulationAdvanceResult Advance(
            SimulationAdvanceRequest request)
        {
            var result = new SimulationAdvanceResult
            {
                CandidateState = request?.StartingState == null
                    ? null
                    : request.CloneStartingState
                        ? request.StartingState.Clone()
                        : request.StartingState,
                RemainingSeconds = request?.DurationSeconds ?? 0d,
                AutomationTimeUntilNextEvent =
                    request?.AutomationTimeUntilNextEvent ?? 0d,
                ValidationStatus = SimulationValidationStatus.InvalidRequest,
                Summary = new SimulationPresentationSummary()
            };
            if (!IsValidRequest(request) || result.CandidateState == null)
                return result;
            if (!result.CandidateState.IsFiniteAndValid(
                    out string initialDiagnostic))
            {
                result.ValidationStatus = SimulationValidationStatus.InvalidState;
                result.DiagnosticCode = initialDiagnostic;
                return result;
            }

            result.ValidationStatus = SimulationValidationStatus.Valid;
            double automationRemaining = NormalizeAutomationRemaining(request);
            int queuedIndex = 0;
            var timer = Stopwatch.StartNew();
            int zeroTimePasses = 0;

            while (result.RemainingSeconds > TimeEpsilon)
            {
                result.Work.SchedulerPasses = NumericSafety.Add(
                    result.Work.SchedulerPasses,
                    1L).Value;
                if (request.CancelRequested)
                {
                    result.ValidationStatus =
                        SimulationValidationStatus.Cancelled;
                    break;
                }
                if (request.ProcessingBudgetMilliseconds > 0d &&
                    timer.Elapsed.TotalMilliseconds >=
                    request.ProcessingBudgetMilliseconds &&
                    result.ConsumedSeconds > TimeEpsilon)
                {
                    result.ValidationStatus =
                        SimulationValidationStatus.Yielded;
                    break;
                }

                double inputHorizon = TimeToQueuedInput(
                    request.QueuedInputs,
                    queuedIndex,
                    result.ConsumedSeconds);

                // A validated model accelerator may consume many internal
                // production, automation and reset events in one pure block.
                // Queued player input is the only boundary it may not cross.
                double accelerationHorizon = Math.Min(
                    result.RemainingSeconds,
                    inputHorizon);
                request.AutomationTimeUntilNextEvent =
                    automationRemaining;
                if (request.AllowAcceleration &&
                    accelerationHorizon > TimeEpsilon)
                {
                    result.Work.AccelerationAttempts =
                        NumericSafety.Add(
                            result.Work.AccelerationAttempts,
                            1L).Value;
                    bool offered =
                        result.CandidateState.TryAccelerate(
                            accelerationHorizon,
                            request,
                            out SimulationAccelerationResult block);
                    if (offered && block.YieldRequested)
                    {
                        result.ValidationStatus =
                            SimulationValidationStatus.Yielded;
                        break;
                    }
                    if (offered &&
                        block.Accepted &&
                        block.ConsumedSeconds > TimeEpsilon &&
                        block.ConsumedSeconds <=
                        accelerationHorizon + TimeEpsilon &&
                        block.ValidationError <=
                        SimulationAccuracyContract
                            .AllowedProjectionDisagreement(
                                block.ConsumedSeconds))
                    {
                        AdvanceClockAcrossAutomation(
                            result,
                            block.ConsumedSeconds,
                            request.AutomationIntervalSeconds,
                            ref automationRemaining,
                            block.AllAutomationEventsHandled,
                            block.AutomationTimeUntilNextEvent);
                        result.Summary.Merge(block.Summary);
                        result.Work.AccelerationBlocksAccepted =
                            NumericSafety.Add(
                                result.Work.AccelerationBlocksAccepted,
                                1L).Value;
                        if ((block.Summary?.BreakInfinityCount ?? 0L) > 0L)
                        {
                            result.Work.BreakInfinityBlocks =
                                NumericSafety.Add(
                                    result.Work.BreakInfinityBlocks,
                                    1L).Value;
                            result.Work.BreakInfinityBlockSeconds =
                                NumericSafety.Add(
                                    result.Work.BreakInfinityBlockSeconds,
                                    block.ConsumedSeconds).Value;
                        }
                        else if ((block.Summary?.OrdinaryInfinityCount ?? 0L) >
                                 0L)
                        {
                            result.Work.OrdinaryInfinityBlocks =
                                NumericSafety.Add(
                                    result.Work.OrdinaryInfinityBlocks,
                                    1L).Value;
                            result.Work.OrdinaryInfinityBlockSeconds =
                                NumericSafety.Add(
                                    result.Work.OrdinaryInfinityBlockSeconds,
                                    block.ConsumedSeconds).Value;
                        }
                        else if ((block.Summary?.CombinedDreamResets ?? 0L) >
                                 0L)
                        {
                            result.Work.DreamResetBlocks =
                                NumericSafety.Add(
                                    result.Work.DreamResetBlocks,
                                    1L).Value;
                            result.Work.DreamResetBlockSeconds =
                                NumericSafety.Add(
                                    result.Work.DreamResetBlockSeconds,
                                    block.ConsumedSeconds).Value;
                        }
                        else
                        {
                            result.Work.ProductionOnlyBlocks =
                                NumericSafety.Add(
                                    result.Work.ProductionOnlyBlocks,
                                    1L).Value;
                            result.Work.ProductionOnlyBlockSeconds =
                                NumericSafety.Add(
                                    result.Work.ProductionOnlyBlockSeconds,
                                    block.ConsumedSeconds).Value;
                        }
                        result.Work.AcceleratedSeconds =
                            NumericSafety.Add(
                                result.Work.AcceleratedSeconds,
                                block.ConsumedSeconds).Value;
                        continue;
                    }
                    result.Work.AccelerationBlocksRejected =
                        NumericSafety.Add(
                            result.Work.AccelerationBlocksRejected,
                            1L).Value;
                }

                double rawModelHorizon =
                    result.CandidateState.TimeToNextMaterialEvent(
                        result.RemainingSeconds,
                        request.InfinityMinimumCycleSeconds);
                bool modelEventWithinRequest =
                    NumericSafety.IsFinite(rawModelHorizon) &&
                    rawModelHorizon >= 0d &&
                    rawModelHorizon <=
                    result.RemainingSeconds + TimeEpsilon;
                bool automationWithinRequest =
                    automationRemaining <=
                    result.RemainingSeconds + TimeEpsilon;
                bool inputWithinRequest =
                    inputHorizon <=
                    result.RemainingSeconds + TimeEpsilon;
                if (!request.ProcessPartialEndpoint &&
                    !modelEventWithinRequest &&
                    !automationWithinRequest &&
                    !inputWithinRequest)
                {
                    result.ValidationStatus =
                        SimulationValidationStatus.Yielded;
                    break;
                }

                double modelHorizon = NormalizeHorizon(
                    rawModelHorizon,
                    result.RemainingSeconds);
                double horizon = Math.Min(
                    result.RemainingSeconds,
                    Math.Min(
                        automationRemaining,
                        Math.Min(modelHorizon, inputHorizon)));

                if (horizon > TimeEpsilon)
                {
                    result.CandidateState.AdvanceContinuous(horizon);
                    AdvanceClock(result, horizon, ref automationRemaining);
                    result.Work.ContinuousSegments = NumericSafety.Add(
                        result.Work.ContinuousSegments,
                        1L).Value;
                    result.Work.ExactSeconds = NumericSafety.Add(
                        result.Work.ExactSeconds,
                        horizon).Value;
                    zeroTimePasses = 0;
                }
                else
                {
                    zeroTimePasses++;
                    if (zeroTimePasses > MaximumZeroTimePasses)
                    {
                        result.ValidationStatus =
                            SimulationValidationStatus.ZeroTimeLoop;
                        result.DiagnosticCode = "SIM-ZERO-TIME-LOOP";
                        break;
                    }
                }

                bool atInput =
                    queuedIndex < (request.QueuedInputs?.Count ?? 0) &&
                    request.QueuedInputs[queuedIndex].Time <=
                    result.ConsumedSeconds + TimeEpsilon;
                bool atAutomation = automationRemaining <= TimeEpsilon;
                bool atModelEvent =
                    modelEventWithinRequest &&
                    modelHorizon <= horizon + TimeEpsilon;
                bool atEndpoint = result.RemainingSeconds <= TimeEpsilon;

                // Production/resource arrival is always first at a material boundary.
                if (atModelEvent || atAutomation || atInput || atEndpoint)
                {
                    result.Work.MaterialEvents = NumericSafety.Add(
                        result.Work.MaterialEvents,
                        1L).Value;
                    result.CandidateState.ApplyProductionArrivals(result.Summary);
                    result.Events.Add(new SimulationEvent(
                        result.ConsumedSeconds,
                        SimulationEventKind.ProductionArrival));
                }

                // Queued inputs are safe-boundary events. A changed slider/mode is
                // therefore visible to this and every subsequent unprocessed segment.
                while (atInput)
                {
                    SimulationQueuedInput input =
                        request.QueuedInputs[queuedIndex++];
                    result.CandidateState.ApplyQueuedInput(
                        input,
                        result.Summary);
                    result.Events.Add(new SimulationEvent(
                        result.ConsumedSeconds,
                        SimulationEventKind.QueuedInput,
                        queuedIndex,
                        input.Id));
                    atInput =
                        queuedIndex < request.QueuedInputs.Count &&
                        request.QueuedInputs[queuedIndex].Time <=
                        result.ConsumedSeconds + TimeEpsilon;
                }

                if (atAutomation)
                {
                    result.Work.AutomationEvents = NumericSafety.Add(
                        result.Work.AutomationEvents,
                        1L).Value;
                    result.CandidateState.ApplyAutomation(
                        request.AutomationPolicy,
                        result.Summary);
                    result.Events.Add(new SimulationEvent(
                        result.ConsumedSeconds,
                        SimulationEventKind.Automation));
                    automationRemaining = request.AutomationIntervalSeconds;
                }

                if (atModelEvent || atAutomation || atInput || atEndpoint)
                {
                    result.CandidateState.ApplyDerivedTimersAndDoubleTime(
                        horizon,
                        result.Summary);
                    result.CandidateState.ApplyDreamReset(result.Summary);
                    result.CandidateState.ApplyBotCapTransition(result.Summary);
                    result.CandidateState.ApplyInfinityReset(
                        request.InfinityMinimumCycleSeconds,
                        result.Summary);
                }

                if (!result.CandidateState.IsFiniteAndValid(
                        out string diagnostic))
                {
                    result.ValidationStatus =
                        SimulationValidationStatus.InvalidState;
                    result.DiagnosticCode = diagnostic;
                    break;
                }
            }

            result.RemainingSeconds = Math.Max(0d, result.RemainingSeconds);
            result.AutomationTimeUntilNextEvent = automationRemaining;
            result.Work.ProcessingMilliseconds =
                timer.Elapsed.TotalMilliseconds;
            return result;
        }

        private static bool IsValidRequest(SimulationAdvanceRequest request)
        {
            return request != null &&
                   request.StartingState != null &&
                   NumericSafety.IsFinite(request.DurationSeconds) &&
                   request.DurationSeconds >= 0d &&
                   NumericSafety.IsFinite(request.AutomationIntervalSeconds) &&
                   request.AutomationIntervalSeconds > 0d &&
                   NumericSafety.IsFinite(request.InfinityMinimumCycleSeconds) &&
                   request.InfinityMinimumCycleSeconds > 0d &&
                   NumericSafety.IsFinite(request.ProcessingBudgetMilliseconds) &&
                   request.ProcessingBudgetMilliseconds >= 0d;
        }

        private static double NormalizeAutomationRemaining(
            SimulationAdvanceRequest request)
        {
            double value = request.AutomationTimeUntilNextEvent;
            if (!NumericSafety.IsFinite(value) ||
                value <= TimeEpsilon ||
                value > request.AutomationIntervalSeconds)
            {
                return request.AutomationIntervalSeconds;
            }
            return value;
        }

        private static double NormalizeHorizon(
            double horizon,
            double maximum)
        {
            if (!NumericSafety.IsFinite(horizon) || horizon < 0d)
                return maximum;
            return Math.Min(maximum, horizon);
        }

        private static double TimeToQueuedInput(
            IReadOnlyList<SimulationQueuedInput> inputs,
            int index,
            double consumedSeconds)
        {
            if (inputs == null || index >= inputs.Count)
                return double.MaxValue;
            double time = inputs[index].Time;
            if (!NumericSafety.IsFinite(time))
                return double.MaxValue;
            return Math.Max(0d, time - consumedSeconds);
        }

        private static void AdvanceClock(
            SimulationAdvanceResult result,
            double seconds,
            ref double automationRemaining)
        {
            result.ConsumedSeconds =
                NumericSafety.Add(result.ConsumedSeconds, seconds).Value;
            result.RemainingSeconds =
                Math.Max(0d, result.RemainingSeconds - seconds);
            automationRemaining = Math.Max(
                0d,
                automationRemaining - seconds);
        }

        private static void AdvanceClockAcrossAutomation(
            SimulationAdvanceResult result,
            double seconds,
            double automationInterval,
            ref double automationRemaining,
            bool allAutomationEventsHandled,
            double exactAutomationRemaining)
        {
            result.ConsumedSeconds =
                NumericSafety.Add(result.ConsumedSeconds, seconds).Value;
            result.RemainingSeconds =
                Math.Max(0d, result.RemainingSeconds - seconds);
            double phase = automationRemaining - seconds;
            if (!allAutomationEventsHandled)
            {
                automationRemaining = Math.Max(0d, phase);
                return;
            }
            if (NumericSafety.IsFinite(
                    exactAutomationRemaining) &&
                exactAutomationRemaining > TimeEpsilon &&
                exactAutomationRemaining <=
                    automationInterval + TimeEpsilon)
            {
                automationRemaining = Math.Min(
                    automationInterval,
                    exactAutomationRemaining);
                return;
            }
            if (phase > TimeEpsilon)
            {
                automationRemaining = phase;
                return;
            }

            double crossed = Math.Floor(
                Math.Max(0d, -phase) / automationInterval) + 1d;
            automationRemaining = NumericSafety.Add(
                phase,
                NumericSafety.Multiply(
                    crossed,
                    automationInterval).Value).Value;
            if (automationRemaining <= TimeEpsilon)
                automationRemaining = automationInterval;
        }
    }
}
