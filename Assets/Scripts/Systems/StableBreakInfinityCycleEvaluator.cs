/*
 * Purpose: Evaluates a candidate stable Break Infinity cycle from the real
 * post-reset Dyson modifier graph without mutating live runtime state.
 * Scope: Conservative bot-only reset graphs. Automation and structural
 * changes require the canonical/event-aware evaluator instead.
 */

using System;
using Sirenix.Serialization;
using Systems.Numeric;
using Systems.Stats;
using static Expansion.Oracle;

namespace Systems.Simulation
{
    public sealed class StableBreakInfinityCycleEvaluator
    {
        public static string LastCreateDiagnostic { get; private set; }
        public string LastEvaluationDiagnostic { get; private set; }

        private readonly double _startingBots;
        private readonly double _botProductionWithoutInfinityMultiplier;
        private readonly double _resetBotThreshold;
        private readonly double _minimumCycleSeconds;
        private readonly long _minimumReward;
        private readonly Func<double, long> _calculateReward;

        private StableBreakInfinityCycleEvaluator(
            double startingBots,
            double botProductionWithoutInfinityMultiplier,
            double resetBotThreshold,
            double minimumCycleSeconds,
            long minimumReward,
            Func<double, long> calculateReward)
        {
            _startingBots = startingBots;
            _botProductionWithoutInfinityMultiplier =
                botProductionWithoutInfinityMultiplier;
            _resetBotThreshold = resetBotThreshold;
            _minimumCycleSeconds = minimumCycleSeconds;
            _minimumReward = Math.Max(1L, minimumReward);
            _calculateReward = calculateReward;
        }

        public static bool TryCreate(
            DysonVerseInfinityData postResetData,
            DysonVerseSkillTreeData postResetSkills,
            DysonVersePrestigeData prestige,
            PrestigePlus prestigePlus,
            double resetBotThreshold,
            double minimumCycleSeconds,
            long minimumReward,
            Func<double, long> calculateReward,
            out StableBreakInfinityCycleEvaluator evaluator)
        {
            evaluator = null;
            LastCreateDiagnostic = null;
            if (postResetData == null ||
                postResetSkills == null ||
                prestige == null ||
                prestigePlus == null ||
                calculateReward == null ||
                !NumericSafety.IsFinite(resetBotThreshold) ||
                resetBotThreshold <= 0d ||
                !NumericSafety.IsFinite(minimumCycleSeconds) ||
                minimumCycleSeconds <= 0d ||
                minimumReward <= 0L ||
                !IsBotOnlyGraph(postResetData))
            {
                LastCreateDiagnostic = postResetData == null
                    ? "missing_data"
                    : postResetSkills == null
                        ? "missing_skills"
                        : prestige == null
                            ? "missing_prestige"
                            : prestigePlus == null
                                ? "missing_prestige_plus"
                                : calculateReward == null
                                    ? "missing_reward"
                                    : !IsBotOnlyGraph(postResetData)
                                        ? "not_bot_only"
                                        : "invalid_contract";
                return false;
            }

            var data = (DysonVerseInfinityData)
                SerializationUtility.CreateCopy(postResetData);
            var skills = (DysonVerseSkillTreeData)
                SerializationUtility.CreateCopy(postResetSkills);
            var candidatePrestige = (DysonVersePrestigeData)
                SerializationUtility.CreateCopy(prestige);
            var candidatePrestigePlus = (PrestigePlus)
                SerializationUtility.CreateCopy(prestigePlus);
            if (data == null ||
                skills == null ||
                candidatePrestige == null ||
                candidatePrestigePlus == null)
            {
                LastCreateDiagnostic = "clone_failed";
                return false;
            }

            ProductionSystem.SetBotDistribution(
                data,
                candidatePrestige,
                candidatePrestigePlus);
            ProductionSystem.CalculateAssemblyLineProduction(
                data,
                skills,
                candidatePrestige,
                candidatePrestigePlus,
                0d);
            double initialInfinityMultiplier =
                FacilityModifierPipeline.CalculateInfinityMultiplier(
                    candidatePrestige.infinityPoints);
            double botProductionWithoutInfinityMultiplier =
                initialInfinityMultiplier > 0d
                    ? data.botProduction /
                      initialInfinityMultiplier
                    : 0d;
            if (!NumericSafety.IsFinite(
                    botProductionWithoutInfinityMultiplier) ||
                botProductionWithoutInfinityMultiplier <= 0d)
            {
                LastCreateDiagnostic =
                    "invalid_fixed_bot_coefficient";
                return false;
            }

            evaluator = new StableBreakInfinityCycleEvaluator(
                data.bots,
                botProductionWithoutInfinityMultiplier,
                resetBotThreshold,
                minimumCycleSeconds,
                minimumReward,
                calculateReward);
            LastCreateDiagnostic = "created";
            return true;
        }

        public InfinityCycleEvaluation Evaluate(
            long candidateInfinityPoints)
        {
            LastEvaluationDiagnostic = null;
            if (candidateInfinityPoints < 0L)
            {
                LastEvaluationDiagnostic = "negative_ip";
                return default;
            }

            double infinityMultiplier =
                FacilityModifierPipeline.CalculateInfinityMultiplier(
                    candidateInfinityPoints);
            double botProduction = NumericSafety.Multiply(
                _botProductionWithoutInfinityMultiplier,
                infinityMultiplier).Value;
            if (!NumericSafety.IsFinite(botProduction) ||
                botProduction <= 0d)
            {
                LastEvaluationDiagnostic = "invalid_bot_rate";
                return default;
            }

            double rawDuration = Math.Max(
                0d,
                _resetBotThreshold - _startingBots) /
                botProduction;
            double duration = Math.Max(
                _minimumCycleSeconds,
                rawDuration);
            double candidateBots = NumericSafety.Add(
                _startingBots,
                NumericSafety.Multiply(
                    botProduction,
                    duration).Value).Value;
            long reward = _calculateReward(candidateBots);
            if (reward < _minimumReward)
            {
                // The analytical threshold and inverse geometric purchase
                // calculation can meet at adjacent floating-point values.
                // Advance one representable bot step so the candidate follows
                // the canonical `projectedGain >= target` condition.
                candidateBots = NumericSafety.BitIncrement(
                    candidateBots);
                reward = _calculateReward(candidateBots);
                if (reward < _minimumReward)
                {
                    LastEvaluationDiagnostic =
                        "reward_below_target";
                    return default;
                }
            }
            LastEvaluationDiagnostic = "evaluated";
            return new InfinityCycleEvaluation(
                reward,
                duration);
        }

        private static bool IsBotOnlyGraph(
            DysonVerseInfinityData data)
        {
            return data != null &&
                   NumericSafety.IsFinite(data.bots) &&
                   data.bots >= 0d &&
                   NumericSafety.IsFinite(
                       data.botProduction) &&
                   data.assemblyLineProduction == 0d &&
                   data.managerProduction == 0d &&
                   data.serverProduction == 0d &&
                   data.dataCenterProduction == 0d &&
                   data.totalPlanetProduction == 0d &&
                   data.matrioshkaBrainPlanetProduction == 0d &&
                   data.birchPlanetMatrioshkaProduction == 0d &&
                   data.galacticBrainBirchProduction == 0d;
        }
    }
}
