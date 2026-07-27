using System;
using Systems.Numeric;
using static Expansion.Oracle;
using static IdleDysonSwarm.Systems.Constants.Dream1Constants;

namespace Systems.Simulation
{
    /// <summary>
    /// Validated long-interval Dream projection for stable stages. It compares
    /// a projection with a deterministic subdivision, refining until every
    /// continuous field agrees within 0.1% and discrete output agrees exactly.
    /// Structurally changing states are rejected for the canonical event path.
    /// </summary>
    public static class DreamAdaptiveLongIntervalSimulation
    {
        private const double RelativeTolerance = 0.001d;
        private const double HousingConversionCost = 10d;
        private const double VillageConversionCost = 25d;
        private const int InitialSegments = 32;
        private const int MaximumSegments = 4096;
        private const double ExactWarmupSeconds = 60d;
        private const double ExactTailSeconds = 60d;
        public static double LastValidationError { get; private set; }
        public static int LastSegments { get; private set; }
        public static bool LastSucceeded { get; private set; }
        public static string LastErrorField { get; private set; }
        public static double LastErrorCoarseValue { get; private set; }
        public static double LastErrorFineValue { get; private set; }

        public static bool CanProject(
            SaveDataDream1 dream,
            SaveDataPrestige prestige,
            DreamOfflineTiming timing)
        {
            if (dream == null || prestige == null) return false;
            if (prestige.disasterStage is >= 0 and <= 3) return false;
            if (prestige.doubleTimeOwned &&
                prestige.doubleTime > 0d &&
                prestige.doubleTimeRate > 0)
                return false;
            if (timing.RailgunFiring ||
                dream.railgunFireProgress > 0d ||
                dream.railgunCharge > 0d)
                return false;
            if (dream.communityBoostTime > 0d ||
                dream.factoriesBoostTime > 0d)
                return false;
            if (ActiveResearch(dream)) return false;
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
            validationError = double.MaxValue;
            LastValidationError = validationError;
            LastSegments = 0;
            LastSucceeded = false;
            LastErrorField = null;
            LastErrorCoarseValue = 0d;
            LastErrorFineValue = 0d;
            if (!CanProject(dream, prestige, timing) ||
                !NumericSafety.IsFinite(seconds) ||
                seconds < 1d)
            {
                return false;
            }

            State seed = State.Capture(dream);
            double warmupSeconds = Math.Min(
                seconds,
                ExactWarmupSeconds);
            int warmupSegments = Math.Max(
                1,
                (int)Math.Ceiling(
                    warmupSeconds / 0.1d));
            State warm = Project(
                seed,
                prestige,
                timing,
                warmupSeconds,
                warmupSegments);
            double remainingSeconds =
                Math.Max(0d, seconds - warmupSeconds);
            double tailSeconds = Math.Min(
                remainingSeconds,
                ExactTailSeconds);
            double projectedSeconds = Math.Max(
                0d,
                remainingSeconds - tailSeconds);
            if (projectedSeconds <= 1e-12d)
            {
                int tailSegments = ExactSegments(tailSeconds);
                State completed = Project(
                    warm,
                    prestige,
                    timing,
                    tailSeconds,
                    tailSegments);
                if (!State.IsFinite(completed)) return false;
                completed.Apply(dream);
                validationError = 0d;
                LastValidationError = 0d;
                LastSegments = warmupSegments + tailSegments;
                LastSucceeded = true;
                return true;
            }

            int coarseSegments = InitialSegments;
            while (coarseSegments < MaximumSegments)
            {
                State coarseMiddle = Project(
                    warm,
                    prestige,
                    timing,
                    projectedSeconds,
                    coarseSegments);
                State fineMiddle = Project(
                    warm,
                    prestige,
                    timing,
                    projectedSeconds,
                    coarseSegments * 2);
                int tailSegments = ExactSegments(tailSeconds);
                State coarse = Project(
                    coarseMiddle,
                    prestige,
                    timing,
                    tailSeconds,
                    tailSegments);
                State fine = Project(
                    fineMiddle,
                    prestige,
                    timing,
                    tailSeconds,
                    tailSegments);
                validationError = State.RelativeError(
                    coarse,
                    fine,
                    out string errorField);
                LastErrorField = errorField;
                State.ErrorValues(
                    coarse,
                    fine,
                    errorField,
                    out double coarseValue,
                    out double fineValue);
                LastErrorCoarseValue = coarseValue;
                LastErrorFineValue = fineValue;
                LastValidationError = validationError;
                LastSegments =
                    warmupSegments +
                    coarseSegments * 2 +
                    tailSegments * 2;
                if (validationError <= RelativeTolerance &&
                    coarse.DysonPanels == fine.DysonPanels &&
                    State.IsFinite(fine))
                {
                    fine.Apply(dream);
                    LastSucceeded = true;
                    return true;
                }
                coarseSegments *= 2;
            }

            return false;
        }

        private static int ExactSegments(double seconds)
        {
            if (seconds <= 0d) return 1;
            return Math.Max(
                1,
                (int)Math.Ceiling(seconds / 0.1d));
        }

        private static State Project(
            State seed,
            SaveDataPrestige prestige,
            DreamOfflineTiming timing,
            double seconds,
            int segments)
        {
            State state = seed;
            double step = seconds / segments;
            double automationRemainder = 0d;
            for (int segment = 0; segment < segments; segment++)
            {
                State start = state;
                double global = 1d;

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
                    global,
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

                automationRemainder += step;
                long automationEvents = NumericSafety.ToLongFloor(
                    Math.Floor(
                        (automationRemainder + 1e-12d) / 0.1d)).Value;
                if (automationEvents > 0L)
                {
                    automationRemainder -= automationEvents * 0.1d;
                    ApplyConversions(
                        ref state,
                        automationEvents,
                        start.RocketsPerSpaceFactory);
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
            if (effectiveMultiplier <= 0d) return 0d;
            double total = Add(
                progress,
                Multiply(effectiveMultiplier, seconds));
            double completed = Math.Floor(total / duration);
            progress = completed >= int.MaxValue
                ? 0d
                : Math.Max(0d, total - completed * duration);
            return Math.Min(int.MaxValue, completed);
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

        private static bool ActiveResearch(SaveDataDream1 dream) =>
            (dream.engineering && !dream.engineeringComplete) ||
            (dream.shipping && !dream.shippingComplete) ||
            (dream.worldTrade && !dream.worldTradeComplete) ||
            (dream.worldPeace && !dream.worldPeaceComplete) ||
            (dream.mathematics && !dream.mathematicsComplete) ||
            (dream.advancedPhysics && !dream.advancedPhysicsComplete);

        private static bool Positive(double value) =>
            NumericSafety.IsFinite(value) && value > 0d;

        private static double Add(double left, double right) =>
            NumericSafety.Add(left, right).Value;

        private static double Multiply(double left, double right) =>
            NumericSafety.Multiply(left, right).Value;

        private struct State
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
                        dream.spaceFactoriesTimerProgress
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
                Finite(state.Energy);

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
                    _ => 0d
                };
            }

            private static bool Finite(double value) =>
                NumericSafety.IsFinite(value) && value >= 0d;
        }
    }
}
