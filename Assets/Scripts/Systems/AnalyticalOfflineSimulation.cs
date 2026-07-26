/*
 * Purpose: Accelerates verified affine sections of the canonical Dyson 10 Hz simulation.
 * Runs: Offline fast-forward only. Non-affine or event-heavy state falls back to canonical ticks.
 */

using System;
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
            double[] expected = EvaluateNext(data, skills, prestige, prestigePlus, state);
            double[] actual = ApplyOnce(transition, state);
            for (int i = 0; i < StateSize; i++)
            {
                double scale = Math.Max(1d, Math.Max(Math.Abs(expected[i]), Math.Abs(actual[i])));
                double tolerance = Math.Max(
                    ValidationAbsoluteTolerance,
                    scale * ValidationRelativeTolerance);
                if (Math.Abs(expected[i] - actual[i]) > tolerance)
                    return false;
            }

            return true;
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
            double[] state)
        {
            Restore(data, state);
            ProductionSystem.SetBotDistribution(data, prestige, prestigePlus);
            ProductionSystem.RecalculateDerivedState(data, skills, prestige, prestigePlus);

            double[] next = (double[])state.Clone();
            Add(ref next[(int)StateIndex.Money],
                ProductionSystem.MoneyToAdd(data, skills) * TickSeconds);
            Add(ref next[(int)StateIndex.Science],
                ProductionSystem.ScienceToAdd(data, skills) * TickSeconds);
            Add(ref next[(int)StateIndex.PanelsDecayed], data.panelsPerSec * TickSeconds);
            Add(ref next[(int)StateIndex.Bots], data.botProduction * TickSeconds);
            Add(ref next[(int)StateIndex.AssemblyLines], data.assemblyLineProduction * TickSeconds);
            Add(ref next[(int)StateIndex.Managers], data.managerProduction * TickSeconds);
            Add(ref next[(int)StateIndex.Servers], data.serverProduction * TickSeconds);
            Add(ref next[(int)StateIndex.DataCenters], data.dataCenterProduction * TickSeconds);
            Add(ref next[(int)StateIndex.Planets],
                NumericSafety.Add(
                    data.totalPlanetProduction,
                    data.matrioshkaBrainPlanetProduction).Value * TickSeconds);
            Add(ref next[(int)StateIndex.MatrioshkaBrains],
                data.birchPlanetMatrioshkaProduction * TickSeconds);
            Add(ref next[(int)StateIndex.BirchPlanets],
                data.galacticBrainBirchProduction * TickSeconds);
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
    }
}
