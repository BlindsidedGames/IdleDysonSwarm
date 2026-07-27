/*
 * Purpose: Accelerates verified affine sections of the canonical Dyson 10 Hz simulation.
 * Runs: Offline fast-forward only. Non-affine or event-heavy state falls back to canonical ticks.
 */

using System;
using System.Reflection;
using Systems.Numeric;
using static Expansion.Oracle;

namespace Systems.Simulation
{
    public readonly struct DysonAnalyticalState
    {
        internal DysonAnalyticalState(double[] values)
        {
            Money = values[0];
            Science = values[1];
            PanelsDecayed = values[2];
            Bots = values[3];
            AssemblyLines = values[4];
            Managers = values[5];
            Servers = values[6];
            DataCenters = values[7];
            Planets = values[8];
            MatrioshkaBrains = values[9];
            BirchPlanets = values[10];
            GalacticBrains = values[11];
        }

        public double Money { get; }
        public double Science { get; }
        public double PanelsDecayed { get; }
        public double Bots { get; }
        public double AssemblyLines { get; }
        public double Managers { get; }
        public double Servers { get; }
        public double DataCenters { get; }
        public double Planets { get; }
        public double MatrioshkaBrains { get; }
        public double BirchPlanets { get; }
        public double GalacticBrains { get; }

        public bool TryGetFacilityCount(string facilityId, out double count)
        {
            count = facilityId switch
            {
                "assembly_lines" => AssemblyLines,
                "ai_managers" => Managers,
                "servers" => Servers,
                "data_centers" => DataCenters,
                "planets" => Planets,
                "matrioshka_brains" => MatrioshkaBrains,
                "birch_planets" => BirchPlanets,
                "galactic_brains" => GalacticBrains,
                _ => 0d
            };
            return facilityId == "assembly_lines" ||
                   facilityId == "ai_managers" ||
                   facilityId == "servers" ||
                   facilityId == "data_centers" ||
                   facilityId == "planets" ||
                   facilityId == "matrioshka_brains" ||
                   facilityId == "birch_planets" ||
                   facilityId == "galactic_brains";
        }
    }

    public static class AnalyticalOfflineSimulation
    {
        internal const double TickSeconds = 0.1d;
        private const int StateSize = 12;
        private const int AugmentedSize = StateSize + 1;
        private const double ValidationRelativeTolerance = 1e-11d;
        private const double ValidationAbsoluteTolerance = 1e-9d;
        private static DysonVerseInfinityData _cachedExactData;
        private static double[,] _cachedExactTransition;
        private static SparseTransition _cachedExactSparse;
        private static long _cachedExactValidatedTicksRemaining;
        private static ExactPlanKey _cachedExactKey;
        private static double[] _cachedExactManualFacilities;
        private static readonly FieldInfo[] SkillBooleanFields =
            typeof(DysonVerseSkillTreeData).GetFields(
                BindingFlags.Instance | BindingFlags.Public);
        public static bool LastExactBotDistributionAttemptSupported
        {
            get;
            private set;
        }

        public static bool TryCaptureState(
            DysonVerseInfinityData data,
            out DysonAnalyticalState state)
        {
            state = default;
            if (data == null) return false;
            double[] values = Capture(data);
            if (!AllFiniteNonNegative(values))
                return false;
            state = new DysonAnalyticalState(values);
            return true;
        }

        public static bool TryFindResetBoundary(
            DysonVerseInfinityData data,
            DysonVerseSkillTreeData skills,
            DysonVersePrestigeData prestige,
            PrestigePlus prestigePlus,
            double boundarySeconds,
            long maximumBoundaries,
            double resetBotThreshold,
            out bool supported,
            out long boundaries)
        {
            supported = false;
            boundaries = 0L;
            if (data == null || skills == null ||
                prestige == null || prestigePlus == null ||
                HasPersistentSideEffects(skills) ||
                !NumericSafety.IsFinite(boundarySeconds) ||
                boundarySeconds <= 0d ||
                maximumBoundaries <= 0L ||
                !NumericSafety.IsFinite(resetBotThreshold) ||
                resetBotThreshold <= 0d)
            {
                return false;
            }

            double[] start = Capture(data);
            if (!AllFiniteNonNegative(start))
                return false;
            supported = true;
            double[] state = start;
            try
            {
                for (long boundary = 1L;
                     boundary <= maximumBoundaries;
                     boundary++)
                {
                    state = EvaluateNext(
                        data,
                        skills,
                        prestige,
                        prestigePlus,
                        state,
                        boundarySeconds);
                    if (!AllFiniteNonNegative(state))
                    {
                        supported = false;
                        return false;
                    }
                    if (state[(int)StateIndex.Bots] + 1e-9d >=
                        resetBotThreshold)
                    {
                        boundaries = boundary;
                        return true;
                    }
                }
                return false;
            }
            finally
            {
                Restore(data, start);
                ProductionSystem.SetBotDistribution(
                    data,
                    prestige,
                    prestigePlus);
                ProductionSystem.RecalculateDerivedState(
                    data,
                    skills,
                    prestige,
                    prestigePlus);
            }
        }

        private enum StateIndex
        {
            Money,
            Science,
            PanelsDecayed,
            Bots,
            AssemblyLines,
            Managers,
            Servers,
            DataCenters,
            Planets,
            MatrioshkaBrains,
            BirchPlanets,
            GalacticBrains
        }

#if UNITY_EDITOR
        public static DysonAnalyticalState CreateStateForTests(
            double money = 0d,
            double science = 0d,
            double bots = 0d,
            double assemblyLines = 0d,
            double managers = 0d,
            double servers = 0d,
            double dataCenters = 0d,
            double planets = 0d,
            double matrioshkaBrains = 0d,
            double birchPlanets = 0d,
            double galacticBrains = 0d)
        {
            return new DysonAnalyticalState(new[]
            {
                money,
                science,
                0d,
                bots,
                assemblyLines,
                managers,
                servers,
                dataCenters,
                planets,
                matrioshkaBrains,
                birchPlanets,
                galacticBrains
            });
        }
#endif

        public static long TryAdvanceDyson(
            DysonVerseInfinityData data,
            DysonVerseSkillTreeData skills,
            DysonVersePrestigeData prestige,
            PrestigePlus prestigePlus,
            long requestedTicks,
            double resetBotThreshold,
            Func<DysonAnalyticalState, bool> hasMaterialEvent = null)
        {
            if (data == null || skills == null || prestige == null || prestigePlus == null ||
                requestedTicks < 2 ||
                HasPersistentSideEffects(skills))
            {
                return 0L;
            }

            double[] start = Capture(data);
            if (!AllFiniteNonNegative(start))
                return 0L;

            ProductionSystem.SetBotDistribution(data, prestige, prestigePlus);
            ProductionSystem.RecalculateDerivedState(data, skills, prestige, prestigePlus);
            if (HasNoDysonProduction(data, skills))
            {
                if (data.bots >= resetBotThreshold ||
                    hasMaterialEvent?.Invoke(new DysonAnalyticalState(start)) == true)
                    return 0L;
                return requestedTicks;
            }

            if (!TryBuildTransition(
                    data,
                    skills,
                    prestige,
                    prestigePlus,
                    start,
                    out double[,] transition))
            {
                Restore(data, start);
                ProductionSystem.SetBotDistribution(data, prestige, prestigePlus);
                ProductionSystem.RecalculateDerivedState(data, skills, prestige, prestigePlus);
                return 0L;
            }

            var powers = new TransitionPowerCache(transition, requestedTicks);
            long candidate = LimitBeforeReset(
                powers,
                start,
                requestedTicks,
                resetBotThreshold);
            candidate = LimitBeforeMaterialEvent(
                powers,
                start,
                candidate,
                hasMaterialEvent);
            while (candidate >= 2)
            {
                long quarter = candidate / 4L;
                long threeQuarters = candidate - quarter;
                double[] firstQuarter = powers.Apply(start, quarter);
                double[] midpoint = powers.Apply(start, candidate / 2);
                double[] thirdQuarter =
                    powers.Apply(start, threeQuarters);
                double[] endpoint = powers.Apply(start, candidate);
                if (AllFiniteNonNegative(firstQuarter) &&
                    AllFiniteNonNegative(midpoint) &&
                    AllFiniteNonNegative(thirdQuarter) &&
                    AllFiniteNonNegative(endpoint) &&
                    TransitionMatchesCanonical(
                        data, skills, prestige, prestigePlus, transition, firstQuarter) &&
                    TransitionMatchesCanonical(
                        data, skills, prestige, prestigePlus, transition, midpoint) &&
                    TransitionMatchesCanonical(
                        data, skills, prestige, prestigePlus, transition, thirdQuarter) &&
                    TransitionMatchesCanonical(
                        data, skills, prestige, prestigePlus, transition, endpoint))
                {
                    Restore(data, endpoint);
                    ProductionSystem.SetBotDistribution(data, prestige, prestigePlus);
                    ProductionSystem.RecalculateDerivedState(data, skills, prestige, prestigePlus);
                    return candidate;
                }

                candidate /= 2L;
            }

            Restore(data, start);
            ProductionSystem.SetBotDistribution(data, prestige, prestigePlus);
            ProductionSystem.RecalculateDerivedState(data, skills, prestige, prestigePlus);
            return 0L;
        }

        /// <summary>
        /// Advances an otherwise-affine Dyson chain while preserving the exact
        /// whole-bot worker/researcher allocation used before Bot Multitasking.
        /// The facility rows are advanced by the validated sparse affine
        /// transition; the three currency/panel rows are integrated once per
        /// tick from the canonical floor/ceiling allocation. This avoids
        /// repeatedly rebuilding matrix powers when only those discrete rows
        /// make a long interval non-affine.
        /// </summary>
        public static long TryAdvanceDysonWithExactBotDistribution(
            DysonVerseInfinityData data,
            DysonVerseSkillTreeData skills,
            DysonVersePrestigeData prestige,
            PrestigePlus prestigePlus,
            long requestedTicks,
            double resetBotThreshold,
            Func<DysonAnalyticalState, bool> hasMaterialEvent = null)
        {
            LastExactBotDistributionAttemptSupported = false;
            if (data == null || skills == null || prestige == null ||
                prestigePlus == null || requestedTicks < 2L ||
                prestigePlus.botMultitasking ||
                HasPersistentSideEffects(skills) ||
                skills.reapers ||
                skills.rocketMania)
            {
                return 0L;
            }

            double[] start = Capture(data);
            double startingPanelRate = data.panelsPerSec;
            double startingWorkers = data.workers;
            double startingResearchers = data.researchers;
            if (!AllFiniteNonNegative(start))
            {
                return 0L;
            }

            ProductionSystem.SetBotDistribution(data, prestige, prestigePlus);
            ProductionSystem.RecalculateDerivedState(
                data, skills, prestige, prestigePlus);
            if (HasNoDysonProduction(data, skills))
            {
                LastExactBotDistributionAttemptSupported = true;
                bool blocked =
                    data.bots >= resetBotThreshold ||
                    hasMaterialEvent?.Invoke(
                        new DysonAnalyticalState(start)) == true;
                return blocked ? 0L : requestedTicks;
            }
            double[,] transition;
            SparseTransition sparse;
            ExactPlanKey planKey = ExactPlanKey.Capture(
                data, prestige, prestigePlus);
            double[] manualFacilities = CaptureManualFacilities(data);
            bool sameConfiguration =
                ReferenceEquals(_cachedExactData, data) &&
                _cachedExactTransition != null &&
                _cachedExactSparse != null &&
                _cachedExactKey.Equals(planKey) &&
                !prestige.infinityAutoResearch &&
                !HasAnyActiveSkill(skills);
            bool sameManualFacilities =
                ManualFacilitiesEqual(
                    _cachedExactManualFacilities,
                    manualFacilities);
            bool reused =
                sameConfiguration &&
                sameManualFacilities &&
                _cachedExactValidatedTicksRemaining >= 2L &&
                requestedTicks <= _cachedExactValidatedTicksRemaining;
            if (reused)
            {
                transition = _cachedExactTransition;
                sparse = _cachedExactSparse;
            }
            else if (sameConfiguration &&
                     !sameManualFacilities &&
                     !HasAnyActiveSkill(skills))
            {
                transition = (double[,])_cachedExactTransition.Clone();
                AdjustManualFacilityIntercept(
                    transition,
                    _cachedExactManualFacilities,
                    manualFacilities);
                sparse = SparseTransition.Create(transition);
                _cachedExactTransition = transition;
                _cachedExactSparse = sparse;
                _cachedExactManualFacilities = manualFacilities;
                _cachedExactValidatedTicksRemaining = requestedTicks;
            }
            else if (!TryBuildTransition(
                         data,
                         skills,
                         prestige,
                         prestigePlus,
                         start,
                         out transition))
            {
                Restore(data, start);
                ProductionSystem.SetBotDistribution(data, prestige, prestigePlus);
                ProductionSystem.RecalculateDerivedState(
                    data, skills, prestige, prestigePlus);
                return 0L;
            }

            else
            {
                var powers = new TransitionPowerCache(
                    transition,
                    requestedTicks);
                if (!StructuralTransitionMatchesAtSamples(
                        data,
                        skills,
                        prestige,
                        prestigePlus,
                        transition,
                        powers,
                        start,
                        requestedTicks))
                {
                    Restore(data, start);
                    ProductionSystem.SetBotDistribution(
                        data, prestige, prestigePlus);
                    ProductionSystem.RecalculateDerivedState(
                        data, skills, prestige, prestigePlus);
                    return 0L;
                }

                sparse = SparseTransition.Create(transition);
                _cachedExactData = data;
                _cachedExactTransition = transition;
                _cachedExactSparse = sparse;
                _cachedExactValidatedTicksRemaining = requestedTicks;
                _cachedExactKey = planKey;
                _cachedExactManualFacilities = manualFacilities;
            }
            if (hasMaterialEvent?.Invoke(
                    new DysonAnalyticalState(start)) == true)
            {
                LastExactBotDistributionAttemptSupported = true;
                Restore(data, start);
                ProductionSystem.SetBotDistribution(data, prestige, prestigePlus);
                ProductionSystem.RecalculateDerivedState(
                    data, skills, prestige, prestigePlus);
                return 0L;
            }

            const int eventProbeTicks = 256;
            long processed = 0L;
            double[] current = start;
            double currentPanelRate = startingPanelRate;
            double currentWorkers = startingWorkers;
            double currentResearchers = startingResearchers;
            while (processed < requestedTicks)
            {
                long chunk = Math.Min(
                    eventProbeTicks,
                    requestedTicks - processed);
                long chunkProcessed = RunExactBotDistributionTicks(
                    data,
                    skills,
                    prestige,
                    prestigePlus,
                    sparse,
                    current,
                    chunk,
                    currentPanelRate,
                    currentWorkers,
                    currentResearchers,
                    resetBotThreshold,
                    hasMaterialEvent,
                    checkEveryTick: false,
                    out double[] chunkEnd,
                    out double chunkPanelRate,
                    out double chunkWorkers,
                    out double chunkResearchers);
                bool crossedEvent =
                    chunkProcessed < chunk ||
                    chunkEnd[(int)StateIndex.Bots] >= resetBotThreshold ||
                    hasMaterialEvent?.Invoke(
                        new DysonAnalyticalState(chunkEnd)) == true;
                if (crossedEvent)
                {
                    chunkProcessed = RunExactBotDistributionTicks(
                        data,
                        skills,
                        prestige,
                        prestigePlus,
                        sparse,
                        current,
                        chunk,
                        currentPanelRate,
                        currentWorkers,
                        currentResearchers,
                        resetBotThreshold,
                        hasMaterialEvent,
                        checkEveryTick: true,
                        out chunkEnd,
                        out chunkPanelRate,
                        out chunkWorkers,
                        out chunkResearchers);
                    processed += chunkProcessed;
                    current = chunkEnd;
                    currentPanelRate = chunkPanelRate;
                    currentWorkers = chunkWorkers;
                    currentResearchers = chunkResearchers;
                    break;
                }

                processed += chunkProcessed;
                current = chunkEnd;
                currentPanelRate = chunkPanelRate;
                currentWorkers = chunkWorkers;
                currentResearchers = chunkResearchers;
            }

            Restore(data, current);
            data.workers = currentWorkers;
            data.researchers = currentResearchers;
            data.panelsPerSec = currentPanelRate;
            ProductionSystem.RecalculateDerivedState(
                data, skills, prestige, prestigePlus);
            LastExactBotDistributionAttemptSupported = true;
            if (ReferenceEquals(_cachedExactData, data))
            {
                _cachedExactValidatedTicksRemaining = Math.Max(
                    0L,
                    _cachedExactValidatedTicksRemaining - processed);
            }
            return processed;
        }

        public static void ConsumeExactBotDistributionPlanTicks(
            DysonVerseInfinityData data,
            long ticks)
        {
            if (!ReferenceEquals(_cachedExactData, data) || ticks <= 0L)
                return;
            _cachedExactValidatedTicksRemaining = Math.Max(
                0L,
                _cachedExactValidatedTicksRemaining - ticks);
        }

        private static long RunExactBotDistributionTicks(
            DysonVerseInfinityData data,
            DysonVerseSkillTreeData skills,
            DysonVersePrestigeData prestige,
            PrestigePlus prestigePlus,
            SparseTransition sparse,
            double[] start,
            long requestedTicks,
            double initialPanelRate,
            double initialWorkers,
            double initialResearchers,
            double resetBotThreshold,
            Func<DysonAnalyticalState, bool> hasMaterialEvent,
            bool checkEveryTick,
            out double[] final,
            out double finalPanelRate,
            out double finalWorkers,
            out double finalResearchers)
        {
            double[] current = (double[])start.Clone();
            double[] next = new double[StateSize];
            double panelRateState = initialPanelRate;
            double workersState = initialWorkers;
            double researchersState = initialResearchers;
            long processed = 0L;
            while (processed < requestedTicks)
            {
                double wholeBots = Math.Floor(
                    current[(int)StateIndex.Bots]);
                double workers = Math.Ceiling(
                    wholeBots / 100f *
                    ((1f - prestige.botDistribution) * 100f));
                double researchers = Math.Floor(
                    wholeBots / 100f *
                    prestige.botDistribution * 100f);
                double nextPanelRate = CalculateExactPanelRate(
                    workers,
                    data,
                    skills);
                double baseMoneyRate = NumericSafety.Multiply(
                    NumericSafety.Multiply(
                        panelRateState,
                        data.panelLifetime).Value,
                    data.moneyMulti).Value;
                double moneyRate = skills.powerOverwhelming
                    ? NumericSafety.Power(baseMoneyRate, 1.03d).Value
                    : baseMoneyRate;
                double baseScienceRate = NumericSafety.Multiply(
                    researchers,
                    data.scienceMulti).Value;
                double scienceRate = skills.powerUnderwhelming
                    ? NumericSafety.Power(baseScienceRate, 1.05d).Value
                    : baseScienceRate;

                sparse.ApplyFast(current, next);
                next[(int)StateIndex.Money] = NumericSafety.Add(
                    current[(int)StateIndex.Money],
                    NumericSafety.Multiply(moneyRate, TickSeconds).Value).Value;
                next[(int)StateIndex.Science] = NumericSafety.Add(
                    current[(int)StateIndex.Science],
                    NumericSafety.Multiply(scienceRate, TickSeconds).Value).Value;
                next[(int)StateIndex.PanelsDecayed] = NumericSafety.Add(
                    current[(int)StateIndex.PanelsDecayed],
                    NumericSafety.Multiply(
                        panelRateState,
                        TickSeconds).Value).Value;

                if (!AllFiniteNonNegative(next) ||
                    next[(int)StateIndex.Bots] >= resetBotThreshold ||
                    (checkEveryTick &&
                     hasMaterialEvent?.Invoke(
                         new DysonAnalyticalState(next)) == true))
                {
                    break;
                }

                double[] swap = current;
                current = next;
                next = swap;
                panelRateState = nextPanelRate;
                workersState = workers;
                researchersState = researchers;
                processed++;
            }

            final = current;
            finalPanelRate = panelRateState;
            finalWorkers = workersState;
            finalResearchers = researchersState;
            return processed;
        }

        private static bool StructuralTransitionMatchesAtSamples(
            DysonVerseInfinityData data,
            DysonVerseSkillTreeData skills,
            DysonVersePrestigeData prestige,
            PrestigePlus prestigePlus,
            double[,] transition,
            TransitionPowerCache powers,
            double[] start,
            long requestedTicks)
        {
            long[] samples =
            {
                1L,
                Math.Max(1L, requestedTicks / 4L),
                Math.Max(1L, requestedTicks / 2L),
                Math.Max(1L, requestedTicks - requestedTicks / 4L),
                requestedTicks
            };
            for (int sampleIndex = 0; sampleIndex < samples.Length; sampleIndex++)
            {
                double[] state = powers.Apply(start, samples[sampleIndex]);
                if (!AllFiniteNonNegative(state) ||
                    !TransitionMatchesCanonicalRows(
                        data,
                        skills,
                        prestige,
                        prestigePlus,
                        transition,
                        state,
                        (int)StateIndex.Bots,
                        StateSize))
                {
                    return false;
                }

                Restore(data, state);
                ProductionSystem.SetBotDistribution(data, prestige, prestigePlus);
                ProductionSystem.RecalculateDerivedState(
                    data, skills, prestige, prestigePlus);
                double expectedPanelRate = CalculateExactPanelRate(
                    data.workers,
                    data,
                    skills);
                if (!NearlyEqual(data.panelsPerSec, expectedPanelRate))
                    return false;
            }

            return true;
        }

        private static long LimitBeforeMaterialEvent(
            TransitionPowerCache powers,
            double[] start,
            long requestedTicks,
            Func<DysonAnalyticalState, bool> hasMaterialEvent)
        {
            return hasMaterialEvent == null
                ? requestedTicks
                : LimitBeforeEvent(
                    powers,
                    start,
                    requestedTicks,
                    state => hasMaterialEvent(new DysonAnalyticalState(state)));
        }

        private static bool HasNoDysonProduction(
            DysonVerseInfinityData data,
            DysonVerseSkillTreeData skills)
        {
            return data.panelsPerSec == 0d &&
                   data.botProduction == 0d &&
                   data.assemblyLineProduction == 0d &&
                   data.managerProduction == 0d &&
                   data.serverProduction == 0d &&
                   data.dataCenterProduction == 0d &&
                   data.totalPlanetProduction == 0d &&
                   data.matrioshkaBrainPlanetProduction == 0d &&
                   data.birchPlanetMatrioshkaProduction == 0d &&
                   data.galacticBrainBirchProduction == 0d &&
                   ProductionSystem.MoneyToAdd(data, skills) == 0d &&
                   ProductionSystem.ScienceToAdd(data, skills) == 0d;
        }

        public static double[] ApplyAffinePowerForTests(
            double[,] transition,
            double[] state,
            long ticks)
        {
            if (transition == null ||
                transition.GetLength(0) != state.Length + 1 ||
                transition.GetLength(1) != state.Length + 1)
            {
                throw new ArgumentException("Transition must be an augmented square matrix.");
            }

            return new TransitionPowerCache(transition, ticks).Apply(state, ticks);
        }

        public static bool HasPersistentSideEffects(
            DysonVerseSkillTreeData skills)
        {
            return skills == null ||
                   skills.androids ||
                   skills.pocketAndroids ||
                   skills.superRadiantScattering ||
                   skills.shouldersOfGiants ||
                   skills.shouldersOfTheFallen ||
                   skills.shouldersOfTheEnlightened ||
                   skills.whatCouldHaveBeen ||
                   skills.stellarSacrifices;
        }

        public static long TicksBeforeMaterialEventForTests(
            double[,] transition,
            double[] state,
            long requestedTicks,
            Func<double[], bool> hasMaterialEvent)
        {
            if (transition == null || state == null || hasMaterialEvent == null ||
                transition.GetLength(0) != state.Length + 1 ||
                transition.GetLength(1) != state.Length + 1)
            {
                throw new ArgumentException(
                    "Transition must be an augmented square matrix with an event predicate.");
            }

            return LimitBeforeEvent(
                new TransitionPowerCache(transition, requestedTicks),
                state,
                requestedTicks,
                hasMaterialEvent);
        }

        private static long LimitBeforeEvent(
            TransitionPowerCache powers,
            double[] start,
            long requestedTicks,
            Func<double[], bool> hasMaterialEvent)
        {
            if (requestedTicks <= 0L) return requestedTicks;
            if (!hasMaterialEvent(powers.Apply(start, requestedTicks)))
                return requestedTicks;

            long low = 1L;
            long high = requestedTicks;
            while (low < high)
            {
                long middle = low + (high - low) / 2L;
                if (hasMaterialEvent(powers.Apply(start, middle)))
                    high = middle;
                else
                    low = middle + 1L;
            }

            return Math.Max(0L, low - 1L);
        }

        private static bool TryBuildTransition(
            DysonVerseInfinityData data,
            DysonVerseSkillTreeData skills,
            DysonVersePrestigeData prestige,
            PrestigePlus prestigePlus,
            double[] validationState,
            out double[,] transition)
        {
            transition = new double[AugmentedSize, AugmentedSize];
            double[] zero = new double[StateSize];
            double[] intercept = EvaluateNext(data, skills, prestige, prestigePlus, zero);
            if (!AllFiniteNonNegative(intercept)) return false;

            for (int row = 0; row < StateSize; row++)
                transition[row, StateSize] = intercept[row];
            transition[StateSize, StateSize] = 1d;

            for (int column = 0; column < StateSize; column++)
            {
                double[] basis = new double[StateSize];
                double scale = Math.Max(1d, Math.Min(1e150d, validationState[column]));
                basis[column] = scale;
                double[] output = EvaluateNext(data, skills, prestige, prestigePlus, basis);
                if (!AllFiniteNonNegative(output)) return false;

                for (int row = 0; row < StateSize; row++)
                {
                    double coefficient = (output[row] - intercept[row]) / scale;
                    if (!NumericSafety.IsFinite(coefficient) || coefficient < -1e-12d)
                        return false;
                    transition[row, column] = Math.Max(0d, coefficient);
                }
            }

            Restore(data, validationState);
            ProductionSystem.SetBotDistribution(data, prestige, prestigePlus);
            ProductionSystem.RecalculateDerivedState(data, skills, prestige, prestigePlus);
            return TransitionMatchesCanonical(
                data, skills, prestige, prestigePlus, transition, validationState);
        }

        private static bool TransitionMatchesCanonical(
            DysonVerseInfinityData data,
            DysonVerseSkillTreeData skills,
            DysonVersePrestigeData prestige,
            PrestigePlus prestigePlus,
            double[,] transition,
            double[] state)
        {
            return TransitionMatchesCanonicalRows(
                data,
                skills,
                prestige,
                prestigePlus,
                transition,
                state,
                0,
                StateSize);
        }

        private static bool TransitionMatchesCanonicalRows(
            DysonVerseInfinityData data,
            DysonVerseSkillTreeData skills,
            DysonVersePrestigeData prestige,
            PrestigePlus prestigePlus,
            double[,] transition,
            double[] state,
            int firstRow,
            int rowLimit)
        {
            double[] expected = EvaluateNext(data, skills, prestige, prestigePlus, state);
            double[] actual = ApplyOnce(transition, state);
            for (int i = firstRow; i < rowLimit; i++)
            {
                if (!NearlyEqual(expected[i], actual[i]))
                    return false;
            }

            return true;
        }

        private static bool NearlyEqual(double expected, double actual)
        {
            double scale = Math.Max(
                1d,
                Math.Max(Math.Abs(expected), Math.Abs(actual)));
            double tolerance = Math.Max(
                ValidationAbsoluteTolerance,
                scale * ValidationRelativeTolerance);
            return Math.Abs(expected - actual) <= tolerance;
        }

        private static long LimitBeforeReset(
            TransitionPowerCache powers,
            double[] start,
            long requestedTicks,
            double resetBotThreshold)
        {
            if (!NumericSafety.IsFinite(resetBotThreshold) ||
                resetBotThreshold <= start[(int)StateIndex.Bots])
            {
                return 0L;
            }

            double[] requested = powers.Apply(start, requestedTicks);
            if (requested[(int)StateIndex.Bots] < resetBotThreshold)
                return requestedTicks;

            long low = 1L;
            long high = requestedTicks;
            while (low < high)
            {
                long middle = low + (high - low) / 2L;
                double bots = powers.Apply(start, middle)[(int)StateIndex.Bots];
                if (bots >= resetBotThreshold)
                    high = middle;
                else
                    low = middle + 1L;
            }

            return Math.Max(0L, low - 1L);
        }

        private static double[] EvaluateNext(
            DysonVerseInfinityData data,
            DysonVerseSkillTreeData skills,
            DysonVersePrestigeData prestige,
            PrestigePlus prestigePlus,
            double[] state) =>
            EvaluateNext(
                data,
                skills,
                prestige,
                prestigePlus,
                state,
                TickSeconds);

        private static double[] EvaluateNext(
            DysonVerseInfinityData data,
            DysonVerseSkillTreeData skills,
            DysonVersePrestigeData prestige,
            PrestigePlus prestigePlus,
            double[] state,
            double intervalSeconds)
        {
            Restore(data, state);
            ProductionSystem.SetBotDistribution(data, prestige, prestigePlus);
            ProductionSystem.RecalculateDerivedState(data, skills, prestige, prestigePlus);

            double[] next = (double[])state.Clone();
            Add(ref next[(int)StateIndex.Money],
                ProductionSystem.MoneyToAdd(data, skills) * intervalSeconds);
            Add(ref next[(int)StateIndex.Science],
                ProductionSystem.ScienceToAdd(data, skills) * intervalSeconds);
            Add(ref next[(int)StateIndex.PanelsDecayed], data.panelsPerSec * intervalSeconds);
            Add(ref next[(int)StateIndex.Bots], data.botProduction * intervalSeconds);
            Add(ref next[(int)StateIndex.AssemblyLines], data.assemblyLineProduction * intervalSeconds);
            Add(ref next[(int)StateIndex.Managers], data.managerProduction * intervalSeconds);
            Add(ref next[(int)StateIndex.Servers], data.serverProduction * intervalSeconds);
            Add(ref next[(int)StateIndex.DataCenters], data.dataCenterProduction * intervalSeconds);
            Add(ref next[(int)StateIndex.Planets],
                NumericSafety.Add(
                    data.totalPlanetProduction,
                    data.matrioshkaBrainPlanetProduction).Value * intervalSeconds);
            Add(ref next[(int)StateIndex.MatrioshkaBrains],
                data.birchPlanetMatrioshkaProduction * intervalSeconds);
            Add(ref next[(int)StateIndex.BirchPlanets],
                data.galacticBrainBirchProduction * intervalSeconds);
            return next;
        }

        private static void Add(ref double target, double delta)
        {
            target = NumericSafety.Add(target, NumericSafety.ClampContinuous(delta)).Value;
        }

        private static double[] Capture(DysonVerseInfinityData data)
        {
            return new[]
            {
                data.money,
                data.science,
                data.totalPanelsDecayed,
                data.bots,
                data.assemblyLines[0],
                data.managers[0],
                data.servers[0],
                data.dataCenters[0],
                data.planets[0],
                data.matrioshkaBrains[0],
                data.birchPlanets[0],
                data.galacticBrains[0]
            };
        }

        private static void Restore(DysonVerseInfinityData data, double[] state)
        {
            data.money = state[(int)StateIndex.Money];
            data.science = state[(int)StateIndex.Science];
            data.totalPanelsDecayed = state[(int)StateIndex.PanelsDecayed];
            data.bots = state[(int)StateIndex.Bots];
            data.assemblyLines[0] = state[(int)StateIndex.AssemblyLines];
            data.managers[0] = state[(int)StateIndex.Managers];
            data.servers[0] = state[(int)StateIndex.Servers];
            data.dataCenters[0] = state[(int)StateIndex.DataCenters];
            data.planets[0] = state[(int)StateIndex.Planets];
            data.matrioshkaBrains[0] = state[(int)StateIndex.MatrioshkaBrains];
            data.birchPlanets[0] = state[(int)StateIndex.BirchPlanets];
            data.galacticBrains[0] = state[(int)StateIndex.GalacticBrains];
        }

        private static bool AllFiniteNonNegative(double[] values)
        {
            if (values == null) return false;
            for (int i = 0; i < values.Length; i++)
            {
                if (!NumericSafety.IsFinite(values[i]) || values[i] < 0d)
                    return false;
            }

            return true;
        }

        private static bool HasAnyActiveSkill(
            DysonVerseSkillTreeData skills)
        {
            for (int index = 0; index < SkillBooleanFields.Length; index++)
            {
                FieldInfo field = SkillBooleanFields[index];
                if (field.FieldType == typeof(bool) &&
                    (bool)field.GetValue(skills))
                {
                    return true;
                }
            }

            return false;
        }

        private static double CalculateExactPanelRate(
            double workers,
            DysonVerseInfinityData data,
            DysonVerseSkillTreeData skills)
        {
            double rate = NumericSafety.Multiply(
                workers / 100d,
                data.panelsPerSecMulti).Value;
            if (skills.burnOut)
                rate = NumericSafety.Multiply(rate, 3d).Value;
            if (skills.workerEfficiencyTree)
                rate = NumericSafety.Multiply(rate, 2d).Value;
            if (skills.saren)
                rate = NumericSafety.Multiply(rate, 40d).Value;
            if (skills.fusionReactors)
                rate = NumericSafety.Multiply(rate, 5d).Value;
            return rate;
        }

        private static double[] CaptureManualFacilities(
            DysonVerseInfinityData data)
        {
            return new[]
            {
                data.assemblyLines[1],
                data.managers[1],
                data.servers[1],
                data.dataCenters[1],
                data.planets[1],
                data.matrioshkaBrains[1],
                data.birchPlanets[1],
                data.galacticBrains[1]
            };
        }

        private static bool ManualFacilitiesEqual(
            double[] left,
            double[] right)
        {
            if (left == null || right == null ||
                left.Length != right.Length)
                return false;
            for (int index = 0; index < left.Length; index++)
            {
                if (!left[index].Equals(right[index]))
                    return false;
            }

            return true;
        }

        private static void AdjustManualFacilityIntercept(
            double[,] transition,
            double[] previousManual,
            double[] currentManual)
        {
            int firstFacility = (int)StateIndex.AssemblyLines;
            for (int row = (int)StateIndex.Bots;
                 row < StateSize;
                 row++)
            {
                double interceptDelta = 0d;
                for (int manualIndex = 0;
                     manualIndex < currentManual.Length;
                     manualIndex++)
                {
                    int column = firstFacility + manualIndex;
                    if (column == row) continue;
                    double delta =
                        currentManual[manualIndex] -
                        previousManual[manualIndex];
                    interceptDelta += transition[row, column] * delta;
                }

                transition[row, StateSize] += interceptDelta;
            }
        }

        private static double[] ApplyPower(double[,] transition, double[] state, long ticks)
        {
            return new TransitionPowerCache(transition, ticks).Apply(state, ticks);
        }

        private static double[] ApplyOnce(double[,] transition, double[] state)
        {
            return ApplyPower(transition, state, 1L);
        }

        private static double[] Multiply(double[,] matrix, double[] vector)
        {
            int size = vector.Length;
            double[] result = new double[size];
            for (int row = 0; row < size; row++)
            {
                double total = 0d;
                for (int column = 0; column < size; column++)
                {
                    if (matrix[row, column] <= 0d || vector[column] <= 0d)
                        continue;
                    total = NumericSafety.Add(
                        total,
                        NumericSafety.Multiply(matrix[row, column], vector[column]).Value).Value;
                }
                result[row] = total;
            }
            return result;
        }

        private static double[,] Multiply(double[,] left, double[,] right)
        {
            int size = left.GetLength(0);
            double[,] result = new double[size, size];
            for (int row = 0; row < size; row++)
            {
                for (int column = 0; column < size; column++)
                {
                    double total = 0d;
                    for (int inner = 0; inner < size; inner++)
                    {
                        if (left[row, inner] <= 0d || right[inner, column] <= 0d)
                            continue;
                        total = NumericSafety.Add(
                            total,
                            NumericSafety.Multiply(
                                left[row, inner],
                                right[inner, column]).Value).Value;
                    }
                    result[row, column] = total;
                }
            }
            return result;
        }

        private sealed class TransitionPowerCache
        {
            private readonly double[][,] _powers;

            public TransitionPowerCache(double[,] transition, long maximumTicks)
            {
                int bitCount = 1;
                long remaining = Math.Max(1L, maximumTicks);
                while ((remaining >>= 1) > 0L) bitCount++;

                _powers = new double[bitCount][,];
                _powers[0] = (double[,])transition.Clone();
                for (int bit = 1; bit < bitCount; bit++)
                    _powers[bit] = Multiply(_powers[bit - 1], _powers[bit - 1]);
            }

            public double[] Apply(double[] state, long ticks)
            {
                int stateSize = state.Length;
                double[] vector = new double[stateSize + 1];
                Array.Copy(state, vector, stateSize);
                vector[stateSize] = 1d;

                long remaining = Math.Max(0L, ticks);
                int bit = 0;
                while (remaining > 0L)
                {
                    if ((remaining & 1L) != 0L)
                        vector = Multiply(_powers[bit], vector);
                    remaining >>= 1;
                    bit++;
                }

                double[] result = new double[stateSize];
                Array.Copy(vector, result, stateSize);
                return result;
            }
        }

        private sealed class SparseTransition
        {
            private readonly int[][] _columns;
            private readonly double[][] _coefficients;

            private SparseTransition(
                int[][] columns,
                double[][] coefficients)
            {
                _columns = columns;
                _coefficients = coefficients;
            }

            public static SparseTransition Create(double[,] transition)
            {
                var columns = new int[StateSize][];
                var coefficients = new double[StateSize][];
                for (int row = 0; row < StateSize; row++)
                {
                    int nonzero = 0;
                    for (int column = 0; column < AugmentedSize; column++)
                    {
                        if (transition[row, column] != 0d)
                            nonzero++;
                    }

                    columns[row] = new int[nonzero];
                    coefficients[row] = new double[nonzero];
                    int output = 0;
                    for (int column = 0; column < AugmentedSize; column++)
                    {
                        double coefficient = transition[row, column];
                        if (coefficient == 0d) continue;
                        columns[row][output] = column;
                        coefficients[row][output] = coefficient;
                        output++;
                    }
                }

                return new SparseTransition(columns, coefficients);
            }

            public void Apply(double[] state, double[] result)
            {
                for (int row = 0; row < StateSize; row++)
                {
                    double total = 0d;
                    int[] columns = _columns[row];
                    double[] coefficients = _coefficients[row];
                    for (int entry = 0; entry < columns.Length; entry++)
                    {
                        int column = columns[entry];
                        double value = column == StateSize
                            ? 1d
                            : state[column];
                        if (value <= 0d) continue;
                        total = NumericSafety.Add(
                            total,
                            NumericSafety.Multiply(
                                coefficients[entry],
                                value).Value).Value;
                    }

                    result[row] = total;
                }
            }

            public void ApplyFast(double[] state, double[] result)
            {
                for (int row = 0; row < StateSize; row++)
                {
                    double total = 0d;
                    int[] columns = _columns[row];
                    double[] coefficients = _coefficients[row];
                    for (int entry = 0; entry < columns.Length; entry++)
                    {
                        int column = columns[entry];
                        double value = column == StateSize
                            ? 1d
                            : state[column];
                        if (value <= 0d) continue;
                        double term = coefficients[entry] * value;
                        if (!NumericSafety.IsFinite(term) ||
                            term >= double.MaxValue - total)
                        {
                            total = double.MaxValue;
                            break;
                        }
                        total += term;
                    }

                    result[row] = total;
                }
            }
        }

        private readonly struct ExactPlanKey : IEquatable<ExactPlanKey>
        {
            private readonly double _panelLifetime;
            private readonly double _panelsPerSecMulti;
            private readonly double _scienceMulti;
            private readonly double _moneyMulti;
            private readonly double _assemblyLineModifier;
            private readonly double _managerModifier;
            private readonly double _serverModifier;
            private readonly double _dataCenterModifier;
            private readonly double _planetModifier;
            private readonly double _matrioshkaModifier;
            private readonly double _birchModifier;
            private readonly double _galacticModifier;
            private readonly double _botDistribution;
            private readonly bool _botMultitasking;

            private ExactPlanKey(
                DysonVerseInfinityData data,
                DysonVersePrestigeData prestige,
                PrestigePlus prestigePlus)
            {
                _panelLifetime = data.panelLifetime;
                _panelsPerSecMulti = data.panelsPerSecMulti;
                _scienceMulti = data.scienceMulti;
                _moneyMulti = data.moneyMulti;
                _assemblyLineModifier = data.assemblyLineModifier;
                _managerModifier = data.managerModifier;
                _serverModifier = data.serverModifier;
                _dataCenterModifier = data.dataCenterModifier;
                _planetModifier = data.planetModifier;
                _matrioshkaModifier = data.matrioshkaBrainModifier;
                _birchModifier = data.birchPlanetModifier;
                _galacticModifier = data.galacticBrainModifier;
                _botDistribution = prestige.botDistribution;
                _botMultitasking = prestigePlus.botMultitasking;
            }

            public static ExactPlanKey Capture(
                DysonVerseInfinityData data,
                DysonVersePrestigeData prestige,
                PrestigePlus prestigePlus)
            {
                return new ExactPlanKey(data, prestige, prestigePlus);
            }

            public bool Equals(ExactPlanKey other)
            {
                return _panelLifetime.Equals(other._panelLifetime) &&
                       _panelsPerSecMulti.Equals(other._panelsPerSecMulti) &&
                       _scienceMulti.Equals(other._scienceMulti) &&
                       _moneyMulti.Equals(other._moneyMulti) &&
                       _assemblyLineModifier.Equals(other._assemblyLineModifier) &&
                       _managerModifier.Equals(other._managerModifier) &&
                       _serverModifier.Equals(other._serverModifier) &&
                       _dataCenterModifier.Equals(other._dataCenterModifier) &&
                       _planetModifier.Equals(other._planetModifier) &&
                       _matrioshkaModifier.Equals(other._matrioshkaModifier) &&
                       _birchModifier.Equals(other._birchModifier) &&
                       _galacticModifier.Equals(other._galacticModifier) &&
                       _botDistribution.Equals(other._botDistribution) &&
                       _botMultitasking == other._botMultitasking;
            }
        }
    }
}
