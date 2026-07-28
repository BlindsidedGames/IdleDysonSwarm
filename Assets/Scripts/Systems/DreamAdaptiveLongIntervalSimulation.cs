using System;
using Systems.Numeric;
using static Expansion.Oracle;
using static IdleDysonSwarm.Systems.Constants.Dream1Constants;

namespace Systems.Simulation
{
    /// <summary>
    /// Validated long-interval Dream projection for stable stages. It compares
    /// a projection with a deterministic subdivision, refining until every
    /// continuous field agrees within the approved aggregate tolerance and
    /// discrete output agrees exactly.
    /// Structurally changing states are rejected for the canonical event path.
    /// </summary>
    public static class DreamAdaptiveLongIntervalSimulation
    {
        private const double RelativeTolerance =
            SimulationAccuracyContract.MaximumAggregateRelativeError;
        private const double HousingConversionCost = 10d;
        private const double VillageConversionCost = 25d;
        private const int InitialSegments = 32;
        private const int MaximumSegments = 4096;
        private const int MaximumSegmentsPerWorkStep = 32;
        private const double ExactWarmupSeconds = 60d;
        private const double ExactTailSeconds = 60d;
        public static double LastValidationError { get; private set; }
        public static int LastSegments { get; private set; }
        public static bool LastSucceeded { get; private set; }
        public static string LastErrorField { get; private set; }
        public static double LastErrorCoarseValue { get; private set; }
        public static double LastErrorFineValue { get; private set; }
#if UNITY_EDITOR
        public static long DiagnosticIncompleteWorkSteps {
            get;
            private set;
        }
        public static long DiagnosticProjectionSegmentsProcessed {
            get;
            private set;
        }

        public static void ResetWorkDiagnostics()
        {
            DiagnosticIncompleteWorkSteps = 0L;
            DiagnosticProjectionSegmentsProcessed = 0L;
        }
#endif

        public sealed class ProjectionWork
        {
            internal ProjectionWork(
                SaveDataDream1 dream,
                SaveDataPrestige prestige,
                DreamOfflineTiming timing,
                double seconds)
            {
                Dream = dream;
                Prestige = prestige;
                Timing = timing;
                Seconds = seconds;
            }

            internal SaveDataDream1 Dream { get; }
            internal SaveDataPrestige Prestige { get; }
            internal DreamOfflineTiming Timing { get; }
            internal double Seconds { get; }
            internal State Warm { get; set; }
            internal State CoarseMiddle { get; set; }
            internal State FineMiddle { get; set; }
            internal State Coarse { get; set; }
            internal ProjectStepper ActiveProjection { get; set; }
            internal double WarmupSeconds { get; set; }
            internal double TailSeconds { get; set; }
            internal double ProjectedSeconds { get; set; }
            internal int WarmupSegments { get; set; }
            internal int TailSegments { get; set; }
            internal int CoarseSegments { get; set; }
            internal int Stage { get; set; }

            public bool IsCompleted { get; internal set; }
            public bool Accepted { get; internal set; }
            public double ValidationError { get; internal set; } =
                double.MaxValue;
        }

        public static ProjectionWork CreateProjectionWork(
            SaveDataDream1 dream,
            SaveDataPrestige prestige,
            DreamOfflineTiming timing,
            double seconds)
        {
            return new ProjectionWork(
                dream,
                prestige,
                timing,
                seconds);
        }

        public static void StepProjectionWork(ProjectionWork work)
        {
            if (work == null || work.IsCompleted)
                return;

            switch (work.Stage)
            {
                case 0:
                    InitializeProjectionWork(work);
                    break;
                case 1:
                    StepWarmup(work);
                    break;
                case 2:
                    StepShortTail(work);
                    break;
                case 3:
                    StepCoarseMiddle(work);
                    break;
                case 4:
                    StepFineMiddle(work);
                    break;
                case 5:
                    StepCoarseTail(work);
                    break;
                case 6:
                    StepFineTailAndValidate(work);
                    break;
                default:
                    CompleteProjectionWork(
                        work,
                        accepted: false,
                        double.MaxValue);
                    break;
            }
#if UNITY_EDITOR
            if (!work.IsCompleted)
            {
                DiagnosticIncompleteWorkSteps =
                    NumericSafety.Add(
                        DiagnosticIncompleteWorkSteps,
                        1L).Value;
            }
#endif
        }

        public static bool CanProject(
            SaveDataDream1 dream,
            SaveDataPrestige prestige,
            DreamOfflineTiming timing)
        {
            if (dream == null || prestige == null) return false;
            if (IsDreamResetReady(
                    prestige.disasterStage,
                    dream.cities,
                    dream.bots,
                    dream.spaceFactories))
            {
                return false;
            }
            return Positive(timing.Hunter) &&
                   Positive(timing.Gatherer) &&
                   Positive(timing.Community) &&
                   Positive(timing.Housing) &&
                   Positive(timing.Villages) &&
                   Positive(timing.Workers) &&
                   Positive(timing.Cities) &&
                   Positive(timing.Factories) &&
                   Positive(timing.Bots) &&
                   Positive(timing.SpaceFactories) &&
                   dream.rocketsPerSpaceFactory > 0L;
        }

        public static bool TryAdvance(
            SaveDataDream1 dream,
            SaveDataPrestige prestige,
            DreamOfflineTiming timing,
            double seconds,
            out double validationError)
        {
            ProjectionWork work = CreateProjectionWork(
                dream,
                prestige,
                timing,
                seconds);
            while (!work.IsCompleted)
            {
                StepProjectionWork(work);
            }
            validationError = work.ValidationError;
            return work.Accepted;
        }

        private static void InitializeProjectionWork(
            ProjectionWork work)
        {
            LastValidationError = double.MaxValue;
            LastSegments = 0;
            LastSucceeded = false;
            LastErrorField = null;
            LastErrorCoarseValue = 0d;
            LastErrorFineValue = 0d;
            if (!CanProject(
                    work.Dream,
                    work.Prestige,
                    work.Timing) ||
                !NumericSafety.IsFinite(work.Seconds) ||
                work.Seconds <= 0d ||
                !CanProjectInterval(
                    work.Dream,
                    work.Prestige,
                    work.Seconds))
            {
                CompleteProjectionWork(
                    work,
                    accepted: false,
                    double.MaxValue);
                return;
            }

            work.WarmupSeconds = Math.Min(
                work.Seconds,
                ExactWarmupSeconds);
            work.WarmupSegments = Math.Max(
                1,
                (int)Math.Ceiling(
                    work.WarmupSeconds / 0.1d));
            work.ActiveProjection = new ProjectStepper(
                State.Capture(work.Dream),
                work.Prestige,
                work.Timing,
                work.WarmupSeconds,
                work.WarmupSegments);
            work.Stage = 1;
        }

        private static void StepWarmup(ProjectionWork work)
        {
            if (!StepActiveProjection(work))
                return;
            work.Warm = work.ActiveProjection.Result;
            double remainingSeconds = Math.Max(
                0d,
                work.Seconds - work.WarmupSeconds);
            work.TailSeconds = Math.Min(
                remainingSeconds,
                ExactTailSeconds);
            work.ProjectedSeconds = Math.Max(
                0d,
                remainingSeconds - work.TailSeconds);
            work.TailSegments =
                ExactSegments(work.TailSeconds);
            if (work.ProjectedSeconds <= 1e-12d)
            {
                work.ActiveProjection = new ProjectStepper(
                    work.Warm,
                    work.Prestige,
                    work.Timing,
                    work.TailSeconds,
                    work.TailSegments);
                work.Stage = 2;
                return;
            }

            work.CoarseSegments = InitialSegments;
            BeginCoarseMiddle(work);
        }

        private static void StepShortTail(ProjectionWork work)
        {
            if (!StepActiveProjection(work))
                return;
            State completed = work.ActiveProjection.Result;
            if (!State.IsFinite(completed) ||
                IsDreamResetReady(
                    work.Prestige.disasterStage,
                    completed.Cities,
                    completed.Bots,
                    completed.SpaceFactories))
            {
                CompleteProjectionWork(
                    work,
                    accepted: false,
                    double.MaxValue);
                return;
            }
            completed.Apply(work.Dream);
            ApplyPrestigeTime(
                work.Prestige,
                work.Seconds);
            LastSegments =
                work.WarmupSegments +
                work.TailSegments;
            CompleteProjectionWork(
                work,
                accepted: true,
                0d);
        }

        private static void BeginCoarseMiddle(
            ProjectionWork work)
        {
            work.ActiveProjection = new ProjectStepper(
                work.Warm,
                work.Prestige,
                work.Timing,
                work.ProjectedSeconds,
                work.CoarseSegments);
            work.Stage = 3;
        }

        private static void StepCoarseMiddle(
            ProjectionWork work)
        {
            if (!StepActiveProjection(work))
                return;
            work.CoarseMiddle =
                work.ActiveProjection.Result;
            work.ActiveProjection = new ProjectStepper(
                work.Warm,
                work.Prestige,
                work.Timing,
                work.ProjectedSeconds,
                work.CoarseSegments * 2);
            work.Stage = 4;
        }

        private static void StepFineMiddle(
            ProjectionWork work)
        {
            if (!StepActiveProjection(work))
                return;
            work.FineMiddle =
                work.ActiveProjection.Result;
            work.ActiveProjection = new ProjectStepper(
                work.CoarseMiddle,
                work.Prestige,
                work.Timing,
                work.TailSeconds,
                work.TailSegments);
            work.Stage = 5;
        }

        private static void StepCoarseTail(
            ProjectionWork work)
        {
            if (!StepActiveProjection(work))
                return;
            work.Coarse = work.ActiveProjection.Result;
            work.ActiveProjection = new ProjectStepper(
                work.FineMiddle,
                work.Prestige,
                work.Timing,
                work.TailSeconds,
                work.TailSegments);
            work.Stage = 6;
        }

        private static void StepFineTailAndValidate(
            ProjectionWork work)
        {
            if (!StepActiveProjection(work))
                return;
            State fine = work.ActiveProjection.Result;
            double validationError = State.RelativeError(
                work.Coarse,
                fine,
                out string errorField);
            LastErrorField = errorField;
            State.ErrorValues(
                work.Coarse,
                fine,
                errorField,
                out double coarseValue,
                out double fineValue);
            LastErrorCoarseValue = coarseValue;
            LastErrorFineValue = fineValue;
            LastValidationError = validationError;
            LastSegments =
                work.WarmupSegments +
                work.CoarseSegments * 2 +
                work.TailSegments * 2;
            work.ValidationError = validationError;
            if (validationError <= RelativeTolerance &&
                State.DiscreteStateMatches(
                    work.Coarse,
                    fine) &&
                !IsDreamResetReady(
                    work.Prestige.disasterStage,
                    work.Coarse.Cities,
                    work.Coarse.Bots,
                    work.Coarse.SpaceFactories) &&
                !IsDreamResetReady(
                    work.Prestige.disasterStage,
                    fine.Cities,
                    fine.Bots,
                    fine.SpaceFactories) &&
                State.IsFinite(fine))
            {
                fine.Apply(work.Dream);
                ApplyPrestigeTime(
                    work.Prestige,
                    work.Seconds);
                CompleteProjectionWork(
                    work,
                    accepted: true,
                    validationError);
                return;
            }

            work.CoarseSegments *= 2;
            if (work.CoarseSegments >= MaximumSegments)
            {
                CompleteProjectionWork(
                    work,
                    accepted: false,
                    validationError);
                return;
            }
            BeginCoarseMiddle(work);
        }

        private static bool StepActiveProjection(
            ProjectionWork work)
        {
#if UNITY_EDITOR
            int remainingBefore =
                work.ActiveProjection.RemainingSegments;
#endif
            work.ActiveProjection.Step(
                MaximumSegmentsPerWorkStep);
#if UNITY_EDITOR
            DiagnosticProjectionSegmentsProcessed =
                NumericSafety.Add(
                    DiagnosticProjectionSegmentsProcessed,
                    Math.Max(
                        0,
                        remainingBefore -
                        work.ActiveProjection.RemainingSegments))
                    .Value;
#endif
            return work.ActiveProjection.IsCompleted;
        }

        private static void CompleteProjectionWork(
            ProjectionWork work,
            bool accepted,
            double validationError)
        {
            work.Accepted = accepted;
            work.ValidationError = validationError;
            work.IsCompleted = true;
            LastValidationError = validationError;
            LastSucceeded = accepted;
        }

        public static double GetProjectionHorizonSeconds(
            SaveDataDream1 dream,
            SaveDataPrestige prestige,
            DreamOfflineTiming timing,
            double maximumSeconds)
        {
            if (!CanProject(dream, prestige, timing) ||
                !NumericSafety.IsFinite(maximumSeconds) ||
                maximumSeconds <= 0d)
            {
                return 0d;
            }

            double global = GlobalMultiplier(prestige);
            double horizon = maximumSeconds;
            int rate = Math.Max(
                0,
                Math.Min(10, prestige.doubleTimeRate));
            if (prestige.doubleTimeOwned &&
                prestige.doubleTime > 0d &&
                rate > 0)
            {
                LimitBeforeEvent(
                    ref horizon,
                    prestige.doubleTime / rate);
            }
            LimitBeforeEvent(
                ref horizon,
                dream.communityBoostTime);
            LimitBeforeEvent(
                ref horizon,
                dream.factoriesBoostTime);
            LimitBeforeResearchCompletion(
                ref horizon,
                dream.engineering,
                dream.engineeringComplete,
                dream.engineeringProgress,
                dream.engineeringResearchTime,
                global);
            LimitBeforeResearchCompletion(
                ref horizon,
                dream.shipping,
                dream.shippingComplete,
                dream.shippingProgress,
                dream.shippingResearchTime,
                global);
            LimitBeforeResearchCompletion(
                ref horizon,
                dream.worldTrade,
                dream.worldTradeComplete,
                dream.worldTradeProgress,
                dream.worldTradeResearchTime,
                global);
            LimitBeforeResearchCompletion(
                ref horizon,
                dream.worldPeace,
                dream.worldPeaceComplete,
                dream.worldPeaceProgress,
                dream.worldPeaceResearchTime,
                global);
            LimitBeforeResearchCompletion(
                ref horizon,
                dream.mathematics,
                dream.mathematicsComplete,
                dream.mathematicsProgress,
                dream.mathematicsResearchTime,
                global);
            LimitBeforeResearchCompletion(
                ref horizon,
                dream.advancedPhysics,
                dream.advancedPhysicsComplete,
                dream.advancedPhysicsProgress,
                dream.advancedPhysicsResearchTime,
                global);
            LimitBeforeDreamMaterialBoundary(
                ref horizon,
                dream,
                prestige,
                timing);
            return Math.Max(0d, horizon);
        }

        private static void LimitBeforeDreamMaterialBoundary(
            ref double horizon,
            SaveDataDream1 dream,
            SaveDataPrestige prestige,
            DreamOfflineTiming timing)
        {
            if (prestige.disasterStage is < 0 or > 3 ||
                horizon <= 0d)
            {
                return;
            }

            long requestedTicks = NumericSafety.ToLongFloor(
                Math.Floor(
                    (horizon + 1e-12d) / 0.1d)).Value;
            if (requestedTicks < 2L)
            {
                horizon = 0d;
                return;
            }

            long quietTicks =
                DreamAnalyticalOfflineSimulation
                    .GetQuietTickHorizon(
                        dream,
                        prestige,
                        timing,
                        requestedTicks);
            if (quietTicks <= 0L)
            {
                horizon = 0d;
                return;
            }

            // Disaster eligibility is discrete and must remain exact. The
            // quiet-tick solver proves that no Dream timer output,
            // conversion, railgun action, research completion, expiry, or
            // reset can occur during these ticks. Stop there and let the
            // canonical shared scheduler execute the next material boundary.
            horizon = Math.Min(
                horizon,
                NumericSafety.Multiply(
                    quietTicks,
                    0.1d).Value);
        }

        private static bool IsDreamResetReady(
            long disasterStage,
            double cities,
            double bots,
            double spaceFactories)
        {
            return disasterStage switch
            {
                0L or 1L => cities >= 1d,
                2L => bots >= 100d,
                3L => spaceFactories >= 5d,
                _ => false
            };
        }

        private static void LimitBeforeResearchCompletion(
            ref double horizon,
            bool active,
            bool complete,
            double progress,
            double duration,
            double global)
        {
            if (!active || complete || global <= 0d)
                return;
            LimitBeforeEvent(
                ref horizon,
                NumericSafety.Divide(
                    Math.Max(0d, duration - progress),
                    global).Value);
        }

        private static void LimitBeforeEvent(
            ref double horizon,
            double eventSeconds)
        {
            if (!NumericSafety.IsFinite(eventSeconds) ||
                eventSeconds <= 0d ||
                eventSeconds > horizon)
            {
                return;
            }
            horizon = Math.Max(
                0d,
                NumericSafety.BitDecrement(eventSeconds));
        }

        private static bool CanProjectInterval(
            SaveDataDream1 dream,
            SaveDataPrestige prestige,
            double seconds)
        {
            double global = GlobalMultiplier(prestige);
            int rate = Math.Max(
                0,
                Math.Min(10, prestige.doubleTimeRate));
            bool doubleTimeActive =
                prestige.doubleTimeOwned &&
                prestige.doubleTime > 0d &&
                rate > 0;
            if (doubleTimeActive &&
                seconds >=
                prestige.doubleTime / rate)
            {
                return false;
            }
            if (dream.communityBoostTime > 0d &&
                seconds >=
                dream.communityBoostTime)
            {
                return false;
            }
            if (dream.factoriesBoostTime > 0d &&
                seconds >=
                dream.factoriesBoostTime)
            {
                return false;
            }

            return ResearchRemainsIncomplete(
                       dream.engineering,
                       dream.engineeringComplete,
                       dream.engineeringProgress,
                       dream.engineeringResearchTime,
                       global,
                       seconds) &&
                   ResearchRemainsIncomplete(
                       dream.shipping,
                       dream.shippingComplete,
                       dream.shippingProgress,
                       dream.shippingResearchTime,
                       global,
                       seconds) &&
                   ResearchRemainsIncomplete(
                       dream.worldTrade,
                       dream.worldTradeComplete,
                       dream.worldTradeProgress,
                       dream.worldTradeResearchTime,
                       global,
                       seconds) &&
                   ResearchRemainsIncomplete(
                       dream.worldPeace,
                       dream.worldPeaceComplete,
                       dream.worldPeaceProgress,
                       dream.worldPeaceResearchTime,
                       global,
                       seconds) &&
                   ResearchRemainsIncomplete(
                       dream.mathematics,
                       dream.mathematicsComplete,
                       dream.mathematicsProgress,
                       dream.mathematicsResearchTime,
                       global,
                       seconds) &&
                   ResearchRemainsIncomplete(
                       dream.advancedPhysics,
                       dream.advancedPhysicsComplete,
                       dream.advancedPhysicsProgress,
                       dream.advancedPhysicsResearchTime,
                       global,
                       seconds);
        }

        private static bool ResearchRemainsIncomplete(
            bool active,
            bool complete,
            double progress,
            double duration,
            double global,
            double seconds)
        {
            if (!active || complete)
                return true;
            if (!NumericSafety.IsFinite(progress) ||
                !NumericSafety.IsFinite(duration) ||
                duration <= 0d)
            {
                return false;
            }
            return NumericSafety.Add(
                       progress,
                       NumericSafety.Multiply(
                           global,
                           seconds).Value).Value <
                   duration;
        }

        private static double GlobalMultiplier(
            SaveDataPrestige prestige)
        {
            if (prestige == null ||
                !prestige.doubleTimeOwned ||
                prestige.doubleTime <= 0d)
            {
                return 1d;
            }
            return 1d + Math.Max(
                0,
                Math.Min(10, prestige.doubleTimeRate));
        }

        private static void ApplyPrestigeTime(
            SaveDataPrestige prestige,
            double seconds)
        {
            if (prestige == null)
                return;
            int rate = Math.Max(
                0,
                Math.Min(10, prestige.doubleTimeRate));
            if (prestige.doubleTimeOwned &&
                prestige.doubleTime > 0d &&
                rate > 0)
            {
                prestige.doubleTime = Math.Max(
                    0d,
                    NumericSafety.Subtract(
                        prestige.doubleTime,
                        NumericSafety.Multiply(
                            rate,
                            seconds).Value).Value);
            }
            prestige.doDoubleTime =
                prestige.doubleTimeOwned &&
                prestige.doubleTime > 0d;
        }

        private static int ExactSegments(double seconds)
        {
            if (seconds <= 0d) return 1;
            return Math.Max(
                1,
                (int)Math.Ceiling(seconds / 0.1d));
        }

        internal sealed class ProjectStepper
        {
            private readonly SaveDataPrestige _prestige;
            private readonly DreamOfflineTiming _timing;
            private readonly double _stepSeconds;
            private State _state;
            private int _remainingSegments;

            public ProjectStepper(
                State seed,
                SaveDataPrestige prestige,
                DreamOfflineTiming timing,
                double seconds,
                int segments)
            {
                _state = seed;
                _prestige = prestige;
                _timing = timing;
                _remainingSegments = Math.Max(1, segments);
                _stepSeconds =
                    seconds / _remainingSegments;
            }

            public bool IsCompleted =>
                _remainingSegments <= 0;
            public State Result => _state;
            internal int RemainingSegments =>
                _remainingSegments;

            public void Step(int maximumSegments)
            {
                if (IsCompleted)
                    return;
                int segments = Math.Min(
                    Math.Max(1, maximumSegments),
                    _remainingSegments);
                _state = ProjectWithStep(
                    _state,
                    _prestige,
                    _timing,
                    _stepSeconds,
                    segments);
                _remainingSegments -= segments;
            }
        }

        private static State Project(
            State seed,
            SaveDataPrestige prestige,
            DreamOfflineTiming timing,
            double seconds,
            int segments)
        {
            return ProjectWithStep(
                seed,
                prestige,
                timing,
                seconds / segments,
                segments);
        }

        private static State ProjectWithStep(
            State seed,
            SaveDataPrestige prestige,
            DreamOfflineTiming timing,
            double step,
            int segments)
        {
            State state = seed;
            for (int segment = 0; segment < segments; segment++)
            {
                State start = state;
                double global = GlobalMultiplier(prestige);

                double hunterCycles = AdvanceTimer(
                    ref state.HunterTimer,
                    timing.Hunter,
                    start.Hunters,
                    global,
                    step);
                double gathererCycles = AdvanceTimer(
                    ref state.GathererTimer,
                    timing.Gatherer,
                    start.Gatherers,
                    global,
                    step);
                state.Community = Add(
                    state.Community,
                    Add(hunterCycles, gathererCycles));

                double communityCycles = AdvanceTimer(
                    ref state.CommunityTimer,
                    timing.Community,
                    start.Community,
                    start.CommunityBoostTime > 0d
                        ? global * 2d
                        : global,
                    step);
                state.Housing = Add(state.Housing, communityCycles);

                double housingCycles = AdvanceTimer(
                    ref state.HousingTimer,
                    timing.Housing,
                    start.Housing,
                    global,
                    step);
                state.Workers = Add(state.Workers, housingCycles);

                double villageCycles = AdvanceTimer(
                    ref state.VillagesTimer,
                    timing.Villages,
                    start.Villages,
                    global,
                    step);
                state.Workers = Add(
                    state.Workers,
                    Multiply(villageCycles, 2d));

                double workerGlobal = global;
                if (prestige.workerBoostAcivator &&
                    start.Workers > 0d)
                    workerGlobal *= 1d + Math.Log10(start.Workers);
                double workerCycles = AdvanceTimer(
                    ref state.WorkersTimer,
                    timing.Workers,
                    start.Workers,
                    workerGlobal,
                    step);
                state.Housing = Add(state.Housing, workerCycles);

                double cityCycles = AdvanceTimer(
                    ref state.CitiesTimer,
                    timing.Cities,
                    start.Cities,
                    global,
                    step);
                state.Workers = Add(
                    state.Workers,
                    Multiply(cityCycles, 5d));
                if (start.EngineeringComplete)
                {
                    state.Factories = Add(
                        state.Factories,
                        Multiply(
                            cityCycles,
                            prestige.citiesBoostActivator ? 10d : 1d));
                }

                double factoryGlobal = global;
                if (start.FactoriesBoostTime > 0d)
                    factoryGlobal *= 2d;
                if (start.ShippingComplete) factoryGlobal *= 2d;
                if (start.WorldTradeComplete) factoryGlobal *= 2d;
                double factoryCycles = AdvanceTimer(
                    ref state.FactoriesTimer,
                    timing.Factories,
                    start.Factories,
                    factoryGlobal,
                    step);
                double factoryYield = prestige.factoriesBoostActivator
                    ? Multiply(start.Factories, 9d)
                    : start.Factories;
                state.Bots = Add(
                    state.Bots,
                    Multiply(factoryCycles, factoryYield));

                double botBase = BaseMultiplier(start.Bots);
                if (start.Bots > 0d && start.Bots < 100d)
                    botBase *= start.Bots / 100d;
                double botGlobal = global;
                if (start.WorldPeaceComplete) botGlobal *= 2d;
                if (prestige.botsBoost1Activator) botGlobal *= 2d;
                double botCycles = AdvanceTimerWithMultiplier(
                    ref state.BotsTimer,
                    timing.Bots,
                    botBase * botGlobal,
                    step);
                state.Rockets = Add(
                    state.Rockets,
                    Multiply(
                        botCycles,
                        prestige.botsBoost2Activator ? 2d : 1d));

                if (state.DysonPanels < DysonPanelCap)
                {
                    double spaceGlobal = global;
                    if (prestige.sfActivator1) spaceGlobal *= 2d;
                    if (prestige.sfActivator2) spaceGlobal *= 2d;
                    if (prestige.sfActivator3) spaceGlobal *= 2d;
                    double panels = AdvanceTimer(
                        ref state.SpaceFactoriesTimer,
                        timing.SpaceFactories,
                        start.SpaceFactories,
                        spaceGlobal,
                        step);
                    long producedPanels = NumericSafety.ToLongFloor(
                        Math.Floor(panels)).Value;
                    state.DysonPanels = Math.Min(
                        DysonPanelCap,
                        NumericSafety.Add(
                            state.DysonPanels,
                            producedPanels).Value);
                }

                state.Energy = Add(
                    state.Energy,
                    EnergyDelta(start, global, step));

                AdvanceResearchProgress(
                    ref state.EngineeringProgress,
                    start.Engineering &&
                    !start.EngineeringComplete,
                    global,
                    step);
                AdvanceResearchProgress(
                    ref state.ShippingProgress,
                    start.Shipping &&
                    !start.ShippingComplete,
                    global,
                    step);
                AdvanceResearchProgress(
                    ref state.WorldTradeProgress,
                    start.WorldTrade &&
                    !start.WorldTradeComplete,
                    global,
                    step);
                AdvanceResearchProgress(
                    ref state.WorldPeaceProgress,
                    start.WorldPeace &&
                    !start.WorldPeaceComplete,
                    global,
                    step);
                AdvanceResearchProgress(
                    ref state.MathematicsProgress,
                    start.Mathematics &&
                    !start.MathematicsComplete,
                    global,
                    step);
                AdvanceResearchProgress(
                    ref state.AdvancedPhysicsProgress,
                    start.AdvancedPhysics &&
                    !start.AdvancedPhysicsComplete,
                    global,
                    step);
                state.CommunityBoostTime = Math.Max(
                    0d,
                    state.CommunityBoostTime - step);
                state.FactoriesBoostTime = Math.Max(
                    0d,
                    state.FactoriesBoostTime - step);

                state.AutomationRemainder = Add(
                    state.AutomationRemainder,
                    step);
                long automationEvents = NumericSafety.ToLongFloor(
                    Math.Floor(
                        (state.AutomationRemainder + 1e-12d) /
                        0.1d)).Value;
                if (automationEvents > 0L)
                {
                    state.AutomationRemainder = Math.Max(
                        0d,
                        state.AutomationRemainder -
                        automationEvents * 0.1d);
                    ApplyConversions(
                        ref state,
                        automationEvents,
                        start.RocketsPerSpaceFactory);
                    ApplyRailgunEvents(
                        ref state,
                        prestige,
                        automationEvents);
                }
            }
            return state;
        }

        private static void ApplyConversions(
            ref State state,
            long automationEvents,
            long rocketsPerSpaceFactory)
        {
            double villages = Math.Min(
                Math.Floor(state.Housing / 10d),
                automationEvents);
            state.Housing = Math.Max(
                0d,
                state.Housing - villages * 10d);
            state.Villages = Add(state.Villages, villages);

            double cities = Math.Min(
                Math.Floor(state.Villages / 25d),
                automationEvents);
            state.Villages = Math.Max(
                0d,
                state.Villages - cities * 25d);
            state.Cities = Add(state.Cities, cities);

            double spaceFactories = Math.Min(
                Math.Floor(state.Rockets / rocketsPerSpaceFactory),
                Math.Floor(state.Factories));
            state.Rockets = Math.Max(
                0d,
                state.Rockets -
                spaceFactories * rocketsPerSpaceFactory);
            state.Factories = Math.Max(
                0d,
                state.Factories - spaceFactories);
            state.SpaceFactories = Add(
                state.SpaceFactories,
                spaceFactories);
        }

        private static void ApplyRailgunEvents(
            ref State state,
            SaveDataPrestige prestige,
            long automationEvents)
        {
            if (automationEvents <= 0L ||
                state.RailgunMaxCharge <= 0d)
            {
                return;
            }

            int selectedRate = Math.Max(
                0,
                Math.Min(10, prestige.doubleTimeRate));
            int activeRate =
                prestige.doDoubleTime && selectedRate >= 1
                    ? selectedRate
                    : 1;
            const int shotsPerVolley = 10;
            double totalFireTime = prestige.railgunActivator2
                ? 1d
                : prestige.railgunActivator1
                    ? 2.5d
                    : 5d;
            double progressPerEvent =
                NumericSafety.Multiply(
                    NumericSafety.Divide(
                        shotsPerVolley,
                        totalFireTime).Value,
                    0.1d).Value;
            double shotThreshold = NumericSafety.Divide(
                totalFireTime,
                shotsPerVolley).Value;
            double chargePerShot = NumericSafety.Divide(
                state.RailgunMaxCharge,
                shotsPerVolley).Value;
            long remainingEvents = automationEvents;

            if (state.RailgunFiring)
            {
                // Canonical automation transfers all currently available
                // energy into the charge bank before advancing a firing
                // volley. A full charge is sufficient for the remaining
                // ten-shot volley, so one transfer also preserves a batched
                // run of its subsequent shot events.
                ChargeRailgun(ref state);
                AdvancePartialRailgunVolley(
                    ref state,
                    ref remainingEvents,
                    progressPerEvent,
                    shotThreshold,
                    chargePerShot,
                    activeRate);
            }

            long eventsPerFullVolley = EventsUntilShot(
                0d,
                shotThreshold,
                progressPerEvent);
            eventsPerFullVolley = NumericSafety.Add(
                eventsPerFullVolley,
                NumericSafety.Multiply(
                    9L,
                    eventsPerFullVolley).Value).Value;
            if (!state.RailgunFiring &&
                remainingEvents >= eventsPerFullVolley)
            {
                double availableCharge = Add(
                    state.RailgunCharge,
                    state.Energy);
                long resourceVolleys = NumericSafety.ToLongFloor(
                    Math.Floor(
                        NumericSafety.Divide(
                            availableCharge,
                            state.RailgunMaxCharge).Value)).Value;
                long panelVolleys =
                    state.DysonPanels /
                    NumericSafety.Multiply(
                        shotsPerVolley,
                        activeRate).Value;
                long fullVolleys = Math.Min(
                    remainingEvents / eventsPerFullVolley,
                    Math.Min(
                        resourceVolleys,
                        panelVolleys));
                if (fullVolleys > 0L)
                {
                    double chargeUsed = Multiply(
                        state.RailgunMaxCharge,
                        fullVolleys);
                    ConsumeChargeResource(
                        ref state,
                        chargeUsed);
                    long panelsUsed = NumericSafety.Multiply(
                        NumericSafety.Multiply(
                            fullVolleys,
                            shotsPerVolley).Value,
                        activeRate).Value;
                    state.DysonPanels = Math.Max(
                        0L,
                        state.DysonPanels - panelsUsed);
                    state.SwarmPanels = NumericSafety.Add(
                        state.SwarmPanels,
                        panelsUsed).Value;
                    remainingEvents -=
                        fullVolleys * eventsPerFullVolley;
                }
            }

            if (remainingEvents <= 0L)
                return;

            ChargeRailgun(ref state);
            long panelsRequiredToStart =
                NumericSafety.Multiply(
                    (long)RailgunBasePanelsRequired,
                    activeRate).Value;
            if (!state.RailgunFiring &&
                state.RailgunCharge >=
                    state.RailgunMaxCharge &&
                state.DysonPanels >=
                    panelsRequiredToStart)
            {
                state.RailgunFiring = true;
                state.RailgunFireProgress = 0d;
                state.RailgunShotsRemaining =
                    shotsPerVolley;
            }
            if (state.RailgunFiring)
            {
                AdvancePartialRailgunVolley(
                    ref state,
                    ref remainingEvents,
                    progressPerEvent,
                    shotThreshold,
                    chargePerShot,
                    activeRate);
            }
        }

        private static void AdvancePartialRailgunVolley(
            ref State state,
            ref long remainingEvents,
            double progressPerEvent,
            double shotThreshold,
            double chargePerShot,
            int panelsPerShot)
        {
            while (remainingEvents > 0L &&
                   state.RailgunFiring &&
                   state.RailgunShotsRemaining > 0)
            {
                long eventsToShot = EventsUntilShot(
                    state.RailgunFireProgress,
                    shotThreshold,
                    progressPerEvent);
                if (eventsToShot > remainingEvents)
                {
                    state.RailgunFireProgress = Add(
                        state.RailgunFireProgress,
                        Multiply(
                            progressPerEvent,
                            remainingEvents));
                    remainingEvents = 0L;
                    return;
                }

                remainingEvents -= eventsToShot;
                state.RailgunFireProgress = 0d;
                if (state.RailgunCharge < chargePerShot ||
                    state.DysonPanels < panelsPerShot)
                {
                    StopRailgun(ref state);
                    return;
                }

                state.RailgunCharge = Math.Max(
                    0d,
                    state.RailgunCharge - chargePerShot);
                state.DysonPanels = Math.Max(
                    0L,
                    state.DysonPanels - panelsPerShot);
                state.SwarmPanels = NumericSafety.Add(
                    state.SwarmPanels,
                    panelsPerShot).Value;
                state.RailgunShotsRemaining = Math.Max(
                    0,
                    state.RailgunShotsRemaining - 1);
                if (state.RailgunCharge < chargePerShot ||
                    state.RailgunShotsRemaining <= 0)
                {
                    StopRailgun(ref state);
                    return;
                }
            }
        }

        private static long EventsUntilShot(
            double progress,
            double threshold,
            double progressPerEvent)
        {
            double remaining = Math.Max(
                0d,
                threshold - progress);
            return Math.Max(
                1L,
                NumericSafety.ToLongFloor(
                    Math.Ceiling(
                        NumericSafety.Divide(
                            remaining,
                            progressPerEvent).Value -
                        1e-12d)).Value);
        }

        private static void ChargeRailgun(ref State state)
        {
            if (state.Energy <= 0d ||
                state.RailgunCharge >=
                    state.RailgunMaxCharge)
            {
                return;
            }
            double transferred = Math.Min(
                state.Energy,
                Math.Max(
                    0d,
                    state.RailgunMaxCharge -
                    state.RailgunCharge));
            state.Energy = Math.Max(
                0d,
                state.Energy - transferred);
            state.RailgunCharge = Add(
                state.RailgunCharge,
                transferred);
        }

        private static void ConsumeChargeResource(
            ref State state,
            double requested)
        {
            double fromCharge = Math.Min(
                state.RailgunCharge,
                requested);
            state.RailgunCharge = Math.Max(
                0d,
                state.RailgunCharge - fromCharge);
            double fromEnergy = Math.Min(
                state.Energy,
                Math.Max(0d, requested - fromCharge));
            state.Energy = Math.Max(
                0d,
                state.Energy - fromEnergy);
        }

        private static void StopRailgun(ref State state)
        {
            state.RailgunFiring = false;
            state.RailgunFireProgress = 0d;
            state.RailgunShotsRemaining = 0;
        }

        private static double AdvanceTimer(
            ref double progress,
            double duration,
            double source,
            double multiplier,
            double seconds)
        {
            return AdvanceTimerWithMultiplier(
                ref progress,
                duration,
                BaseMultiplier(source) * multiplier,
                seconds);
        }

        private static double AdvanceTimerWithMultiplier(
            ref double progress,
            double duration,
            double effectiveMultiplier,
            double seconds)
        {
            if (effectiveMultiplier <= 0d ||
                !NumericSafety.IsFinite(duration) ||
                duration <= 0d)
            {
                return 0d;
            }
            double total = Add(
                progress,
                Multiply(effectiveMultiplier, seconds));
            double completed = Math.Floor(
                NumericSafety.Divide(
                    total,
                    duration).Value);
            double remainder = total % duration;
            progress =
                NumericSafety.IsFinite(remainder) &&
                remainder >= 0d &&
                remainder < duration
                    ? remainder
                    : 0d;
            return Math.Min(double.MaxValue, completed);
        }

        private static double BaseMultiplier(double source) =>
            source >= 1d ? 1d + Math.Log10(source) : 0d;

        private static double EnergyDelta(
            State state,
            double global,
            double seconds)
        {
            double solar = Multiply(
                state.SolarPanels,
                state.SolarPanelGeneration);
            if (state.MathematicsComplete)
                solar = Multiply(solar, 2d);
            double fusion = Multiply(
                state.Fusion,
                state.FusionGeneration);
            double swarm = Multiply(
                state.SwarmPanels,
                state.SwarmPanelGeneration);
            return Multiply(
                Multiply(Add(Add(solar, fusion), swarm), global),
                seconds);
        }

        private static void AdvanceResearchProgress(
            ref double progress,
            bool active,
            double global,
            double seconds)
        {
            if (!active)
                return;
            progress = Add(
                progress,
                Multiply(global, seconds));
        }

        private static bool Positive(double value) =>
            NumericSafety.IsFinite(value) && value > 0d;

        private static double Add(double left, double right) =>
            NumericSafety.Add(left, right).Value;

        private static double Multiply(double left, double right) =>
            NumericSafety.Multiply(left, right).Value;

        internal struct State
        {
            public long Hunters;
            public long Gatherers;
            public double Community;
            public double Housing;
            public double Villages;
            public double Workers;
            public double Cities;
            public double Factories;
            public double Bots;
            public double Rockets;
            public double SpaceFactories;
            public long DysonPanels;
            public double Energy;
            public double RailgunCharge;
            public double RailgunMaxCharge;
            public double RailgunFireProgress;
            public bool RailgunFiring;
            public int RailgunShotsRemaining;
            public double SolarPanels;
            public long SolarPanelGeneration;
            public double Fusion;
            public long FusionGeneration;
            public long SwarmPanels;
            public long SwarmPanelGeneration;
            public long RocketsPerSpaceFactory;
            public bool EngineeringComplete;
            public bool ShippingComplete;
            public bool WorldTradeComplete;
            public bool WorldPeaceComplete;
            public bool MathematicsComplete;
            public bool AdvancedPhysicsComplete;
            public bool Engineering;
            public bool Shipping;
            public bool WorldTrade;
            public bool WorldPeace;
            public bool Mathematics;
            public bool AdvancedPhysics;
            public double EngineeringProgress;
            public double ShippingProgress;
            public double WorldTradeProgress;
            public double WorldPeaceProgress;
            public double MathematicsProgress;
            public double AdvancedPhysicsProgress;
            public double CommunityBoostTime;
            public double FactoriesBoostTime;
            public double HunterTimer;
            public double GathererTimer;
            public double CommunityTimer;
            public double HousingTimer;
            public double VillagesTimer;
            public double WorkersTimer;
            public double CitiesTimer;
            public double FactoriesTimer;
            public double BotsTimer;
            public double SpaceFactoriesTimer;
            public double AutomationRemainder;

            public static State Capture(SaveDataDream1 dream) =>
                new State
                {
                    Hunters = dream.hunters,
                    Gatherers = dream.gatherers,
                    Community = dream.community,
                    Housing = dream.housing,
                    Villages = dream.villages,
                    Workers = dream.workers,
                    Cities = dream.cities,
                    Factories = dream.factories,
                    Bots = dream.bots,
                    Rockets = dream.rockets,
                    SpaceFactories = dream.spaceFactories,
                    DysonPanels = dream.dysonPanels,
                    Energy = dream.energy,
                    RailgunCharge = dream.railgunCharge,
                    RailgunMaxCharge =
                        dream.railgunMaxCharge,
                    RailgunFireProgress =
                        dream.railgunFireProgress,
                    RailgunFiring = dream.railgunFiring,
                    RailgunShotsRemaining =
                        dream.railgunShotsRemaining,
                    SolarPanels = dream.solarPanels,
                    SolarPanelGeneration =
                        dream.solarPanelGeneration,
                    Fusion = dream.fusion,
                    FusionGeneration = dream.fusionGeneration,
                    SwarmPanels = dream.swarmPanels,
                    SwarmPanelGeneration =
                        dream.swarmPanelGeneration,
                    RocketsPerSpaceFactory =
                        dream.rocketsPerSpaceFactory,
                    EngineeringComplete =
                        dream.engineeringComplete,
                    ShippingComplete = dream.shippingComplete,
                    WorldTradeComplete = dream.worldTradeComplete,
                    WorldPeaceComplete = dream.worldPeaceComplete,
                    MathematicsComplete =
                        dream.mathematicsComplete,
                    AdvancedPhysicsComplete =
                        dream.advancedPhysicsComplete,
                    Engineering = dream.engineering,
                    Shipping = dream.shipping,
                    WorldTrade = dream.worldTrade,
                    WorldPeace = dream.worldPeace,
                    Mathematics = dream.mathematics,
                    AdvancedPhysics = dream.advancedPhysics,
                    EngineeringProgress =
                        dream.engineeringProgress,
                    ShippingProgress = dream.shippingProgress,
                    WorldTradeProgress =
                        dream.worldTradeProgress,
                    WorldPeaceProgress =
                        dream.worldPeaceProgress,
                    MathematicsProgress =
                        dream.mathematicsProgress,
                    AdvancedPhysicsProgress =
                        dream.advancedPhysicsProgress,
                    CommunityBoostTime =
                        dream.communityBoostTime,
                    FactoriesBoostTime =
                        dream.factoriesBoostTime,
                    HunterTimer = dream.hunterTimerProgress,
                    GathererTimer = dream.gathererTimerProgress,
                    CommunityTimer =
                        dream.communityTimerProgress,
                    HousingTimer = dream.housingTimerProgress,
                    VillagesTimer = dream.villagesTimerProgress,
                    WorkersTimer = dream.workersTimerProgress,
                    CitiesTimer = dream.citiesTimerProgress,
                    FactoriesTimer =
                        dream.factoriesTimerProgress,
                    BotsTimer = dream.botsTimerProgress,
                    SpaceFactoriesTimer =
                        dream.spaceFactoriesTimerProgress,
                    AutomationRemainder = 0d
                };

            public void Apply(SaveDataDream1 dream)
            {
                dream.community = Community;
                dream.housing = Housing;
                dream.villages = Villages;
                dream.workers = Workers;
                dream.cities = Cities;
                dream.factories = Factories;
                dream.bots = Bots;
                dream.rockets = Rockets;
                dream.spaceFactories = SpaceFactories;
                dream.dysonPanels = DysonPanels;
                dream.energy = Energy;
                dream.railgunCharge = RailgunCharge;
                dream.railgunMaxCharge =
                    RailgunMaxCharge;
                dream.railgunFireProgress =
                    RailgunFireProgress;
                dream.railgunFiring = RailgunFiring;
                dream.railgunShotsRemaining =
                    RailgunShotsRemaining;
                dream.swarmPanels = SwarmPanels;
                dream.engineeringProgress =
                    EngineeringProgress;
                dream.shippingProgress = ShippingProgress;
                dream.worldTradeProgress =
                    WorldTradeProgress;
                dream.worldPeaceProgress =
                    WorldPeaceProgress;
                dream.mathematicsProgress =
                    MathematicsProgress;
                dream.advancedPhysicsProgress =
                    AdvancedPhysicsProgress;
                dream.communityBoostTime =
                    CommunityBoostTime;
                dream.factoriesBoostTime =
                    FactoriesBoostTime;
                dream.hunterTimerProgress = HunterTimer;
                dream.gathererTimerProgress = GathererTimer;
                dream.communityTimerProgress = CommunityTimer;
                dream.housingTimerProgress = HousingTimer;
                dream.villagesTimerProgress = VillagesTimer;
                dream.workersTimerProgress = WorkersTimer;
                dream.citiesTimerProgress = CitiesTimer;
                dream.factoriesTimerProgress = FactoriesTimer;
                dream.botsTimerProgress = BotsTimer;
                dream.spaceFactoriesTimerProgress =
                    SpaceFactoriesTimer;
            }

            public static bool IsFinite(State state) =>
                Finite(state.Community) &&
                Finite(state.Housing) &&
                Finite(state.Villages) &&
                Finite(state.Workers) &&
                Finite(state.Cities) &&
                Finite(state.Factories) &&
                Finite(state.Bots) &&
                Finite(state.Rockets) &&
                Finite(state.SpaceFactories) &&
                Finite(state.Energy) &&
                Finite(state.RailgunCharge) &&
                Finite(state.RailgunMaxCharge) &&
                Finite(state.RailgunFireProgress) &&
                Finite(state.EngineeringProgress) &&
                Finite(state.ShippingProgress) &&
                Finite(state.WorldTradeProgress) &&
                Finite(state.WorldPeaceProgress) &&
                Finite(state.MathematicsProgress) &&
                Finite(state.AdvancedPhysicsProgress) &&
                Finite(state.CommunityBoostTime) &&
                Finite(state.FactoriesBoostTime) &&
                Finite(state.AutomationRemainder);

            public static bool DiscreteStateMatches(
                State left,
                State right)
            {
                return left.DysonPanels ==
                           right.DysonPanels &&
                       left.SwarmPanels ==
                           right.SwarmPanels &&
                       left.RailgunFiring ==
                           right.RailgunFiring &&
                       left.RailgunShotsRemaining ==
                           right.RailgunShotsRemaining;
            }

            public static double RelativeError(
                State left,
                State right,
                out string field)
            {
                double error = 0d;
                field = null;
                Compare(ref error, ref field, "community", left.Community, right.Community);
                CompareConversionBuffer(
                    ref error,
                    ref field,
                    "housing",
                    left.Housing,
                    right.Housing,
                    HousingConversionCost);
                CompareConversionBuffer(
                    ref error,
                    ref field,
                    "villages",
                    left.Villages,
                    right.Villages,
                    VillageConversionCost);
                Compare(ref error, ref field, "workers", left.Workers, right.Workers);
                Compare(ref error, ref field, "cities", left.Cities, right.Cities);
                Compare(ref error, ref field, "factories", left.Factories, right.Factories);
                Compare(ref error, ref field, "bots", left.Bots, right.Bots);
                Compare(ref error, ref field, "rockets", left.Rockets, right.Rockets);
                Compare(
                    ref error,
                    ref field,
                    "spaceFactories",
                    left.SpaceFactories,
                    right.SpaceFactories);
                Compare(ref error, ref field, "energy", left.Energy, right.Energy);
                Compare(
                    ref error,
                    ref field,
                    "railgunCharge",
                    left.RailgunCharge,
                    right.RailgunCharge);
                Compare(
                    ref error,
                    ref field,
                    "railgunFireProgress",
                    left.RailgunFireProgress,
                    right.RailgunFireProgress);
                Compare(
                    ref error,
                    ref field,
                    "engineeringProgress",
                    left.EngineeringProgress,
                    right.EngineeringProgress);
                Compare(
                    ref error,
                    ref field,
                    "shippingProgress",
                    left.ShippingProgress,
                    right.ShippingProgress);
                Compare(
                    ref error,
                    ref field,
                    "worldTradeProgress",
                    left.WorldTradeProgress,
                    right.WorldTradeProgress);
                Compare(
                    ref error,
                    ref field,
                    "worldPeaceProgress",
                    left.WorldPeaceProgress,
                    right.WorldPeaceProgress);
                Compare(
                    ref error,
                    ref field,
                    "mathematicsProgress",
                    left.MathematicsProgress,
                    right.MathematicsProgress);
                Compare(
                    ref error,
                    ref field,
                    "advancedPhysicsProgress",
                    left.AdvancedPhysicsProgress,
                    right.AdvancedPhysicsProgress);
                Compare(
                    ref error,
                    ref field,
                    "communityBoostTime",
                    left.CommunityBoostTime,
                    right.CommunityBoostTime);
                Compare(
                    ref error,
                    ref field,
                    "factoriesBoostTime",
                    left.FactoriesBoostTime,
                    right.FactoriesBoostTime);
                return error;
            }

            private static void CompareConversionBuffer(
                ref double maximum,
                ref string maximumField,
                string field,
                double left,
                double right,
                double conversionCost)
            {
                // Housing and villages are integer-produced, bounded phase
                // buffers consumed on the independent automation clock. Long
                // projections can land at different remainders within the
                // same conversion interval even when all material totals have
                // converged. Retain the ordinary relative test if either side
                // carries a backlog large enough for an immediate conversion.
                if (left >= 0d &&
                    right >= 0d &&
                    left < conversionCost &&
                    right < conversionCost)
                {
                    return;
                }
                Compare(
                    ref maximum,
                    ref maximumField,
                    field,
                    left,
                    right);
            }

            private static void Compare(
                ref double maximum,
                ref string maximumField,
                string field,
                double left,
                double right)
            {
                double scale = Math.Max(
                    1d,
                    Math.Max(Math.Abs(left), Math.Abs(right)));
                double error = Math.Abs(left - right) / scale;
                if (error <= maximum) return;
                maximum = error;
                maximumField = field;
            }

            public static void ErrorValues(
                State left,
                State right,
                string field,
                out double leftValue,
                out double rightValue)
            {
                leftValue = field switch
                {
                    "community" => left.Community,
                    "housing" => left.Housing,
                    "villages" => left.Villages,
                    "workers" => left.Workers,
                    "cities" => left.Cities,
                    "factories" => left.Factories,
                    "bots" => left.Bots,
                    "rockets" => left.Rockets,
                    "spaceFactories" => left.SpaceFactories,
                    "energy" => left.Energy,
                    "railgunCharge" => left.RailgunCharge,
                    "railgunFireProgress" =>
                        left.RailgunFireProgress,
                    "engineeringProgress" =>
                        left.EngineeringProgress,
                    "shippingProgress" =>
                        left.ShippingProgress,
                    "worldTradeProgress" =>
                        left.WorldTradeProgress,
                    "worldPeaceProgress" =>
                        left.WorldPeaceProgress,
                    "mathematicsProgress" =>
                        left.MathematicsProgress,
                    "advancedPhysicsProgress" =>
                        left.AdvancedPhysicsProgress,
                    "communityBoostTime" =>
                        left.CommunityBoostTime,
                    "factoriesBoostTime" =>
                        left.FactoriesBoostTime,
                    _ => 0d
                };
                rightValue = field switch
                {
                    "community" => right.Community,
                    "housing" => right.Housing,
                    "villages" => right.Villages,
                    "workers" => right.Workers,
                    "cities" => right.Cities,
                    "factories" => right.Factories,
                    "bots" => right.Bots,
                    "rockets" => right.Rockets,
                    "spaceFactories" => right.SpaceFactories,
                    "energy" => right.Energy,
                    "railgunCharge" =>
                        right.RailgunCharge,
                    "railgunFireProgress" =>
                        right.RailgunFireProgress,
                    "engineeringProgress" =>
                        right.EngineeringProgress,
                    "shippingProgress" =>
                        right.ShippingProgress,
                    "worldTradeProgress" =>
                        right.WorldTradeProgress,
                    "worldPeaceProgress" =>
                        right.WorldPeaceProgress,
                    "mathematicsProgress" =>
                        right.MathematicsProgress,
                    "advancedPhysicsProgress" =>
                        right.AdvancedPhysicsProgress,
                    "communityBoostTime" =>
                        right.CommunityBoostTime,
                    "factoriesBoostTime" =>
                        right.FactoriesBoostTime,
                    _ => 0d
                };
            }

            private static bool Finite(double value) =>
                NumericSafety.IsFinite(value) && value >= 0d;
        }
    }
}
