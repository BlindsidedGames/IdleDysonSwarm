/*
 * Purpose: Pure Dream reset eligibility, reward, and durable-state transition.
 * Runs: Shared event-time reset phase and queued black-hole actions.
 * Owns: Reset decision, counters/rewards/statistics, and Dream run-state wipe.
 * Delegates: Runtime timer rebuild, persistent research reapplication, and UI.
 */

using System;
using Expansion;
using Systems.Numeric;

namespace Systems.Simulation
{
    public readonly struct DreamResetOutcome
    {
        public DreamResetOutcome(
            DreamResetCause cause,
            long strangeMatter)
        {
            Cause = cause;
            StrangeMatter = strangeMatter;
        }

        public DreamResetCause Cause { get; }
        public long StrangeMatter { get; }
    }

    public static class DreamResetTransitions
    {
        public static bool IsAutomaticReady(
            Oracle.SaveDataSettings settings)
        {
            return TryGetAutomaticOutcome(
                settings,
                out _);
        }

        public static bool TryApplyAutomatic(
            Oracle.SaveDataSettings settings,
            out DreamResetOutcome outcome)
        {
            if (!TryGetAutomaticOutcome(
                    settings,
                    out outcome))
            {
                return false;
            }

            return Apply(settings, outcome);
        }

        public static bool TryApplyExplicit(
            Oracle.SaveDataSettings settings,
            DreamResetCause cause,
            long strangeMatter,
            out DreamResetOutcome outcome)
        {
            outcome = new DreamResetOutcome(
                cause,
                Math.Max(0L, strangeMatter));
            return Apply(settings, outcome);
        }

        private static bool TryGetAutomaticOutcome(
            Oracle.SaveDataSettings settings,
            out DreamResetOutcome outcome)
        {
            outcome = default;
            Oracle.SaveDataDream1 dream =
                settings?.sdSimulation;
            Oracle.SaveDataPrestige prestige =
                settings?.sdPrestige;
            if (dream == null || prestige == null)
                return false;

            switch (prestige.disasterStage)
            {
                case 0:
                case 1:
                    if (dream.cities < 1d) return false;
                    outcome = new DreamResetOutcome(
                        DreamResetCause.Meteor,
                        1L);
                    return true;
                case 2:
                    if (dream.bots < 100d) return false;
                    outcome = new DreamResetOutcome(
                        DreamResetCause.ArtificialIntelligence,
                        10L);
                    return true;
                case 3:
                    if (dream.spaceFactories < 5d)
                        return false;
                    outcome = new DreamResetOutcome(
                        DreamResetCause.GlobalWarming,
                        20L);
                    return true;
                default:
                    return false;
            }
        }

        private static bool Apply(
            Oracle.SaveDataSettings settings,
            DreamResetOutcome outcome)
        {
            Oracle.SaveDataPrestige prestige =
                settings?.sdPrestige;
            if (settings == null || prestige == null)
                return false;

            NumericResult<long> nextCount =
                NumericSafety.Add(
                    prestige.simulationCount,
                    1L);
            NumericResult<long> nextReward =
                NumericSafety.Add(
                    prestige.strangeMatter,
                    outcome.StrangeMatter);
            if (!nextCount.IsSuccess ||
                nextCount.Value <= prestige.simulationCount ||
                !nextReward.IsSuccess ||
                (outcome.StrangeMatter > 0L &&
                 nextReward.Value <= prestige.strangeMatter))
            {
                return false;
            }

            prestige.disasterStage = 0L;
            prestige.simulationCount = nextCount.Value;
            prestige.strangeMatter = nextReward.Value;
            settings.simulationStatistics?.RecordDreamReset(
                outcome.Cause,
                outcome.StrangeMatter);
            settings.sdSimulation =
                new Oracle.SaveDataDream1();
            return true;
        }
    }
}
