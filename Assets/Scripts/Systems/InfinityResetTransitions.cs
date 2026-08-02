/*
 * Purpose: Pure durable-state transition for ordinary and Break Infinity.
 * Runs: Canonical event-time Infinity reset boundary.
 * Owns: Reward/counters, run wipe, retained starts, reset flags, and statistics.
 * Delegates: Skill auto-assignment, derived-state rebuild, persistence, and UI.
 */

using System;
using Expansion;
using Systems.Numeric;

namespace Systems.Simulation
{
    public readonly struct InfinityResetRequest
    {
        public InfinityResetRequest(
            bool breakInfinity,
            long requestedReward,
            int bankedSkillPoints,
            int artifactSkillPoints,
            bool botCapTransition)
        {
            BreakInfinity = breakInfinity;
            RequestedReward = Math.Max(0L, requestedReward);
            BankedSkillPoints = Math.Max(0, bankedSkillPoints);
            ArtifactSkillPoints = Math.Max(0, artifactSkillPoints);
            BotCapTransition = botCapTransition;
        }

        public bool BreakInfinity { get; }
        public long RequestedReward { get; }
        public int BankedSkillPoints { get; }
        public int ArtifactSkillPoints { get; }
        public bool BotCapTransition { get; }
    }

    public readonly struct InfinityResetOutcome
    {
        public InfinityResetOutcome(long rewardGranted)
        {
            RewardGranted = rewardGranted;
        }

        public long RewardGranted { get; }
    }

    public static class InfinityResetTransitions
    {
        public static bool TryApply(
            Oracle.SaveDataSettings settings,
            InfinityResetRequest request,
            out InfinityResetOutcome outcome)
        {
            outcome = default;
            Oracle.DysonVerseSaveData dyson =
                settings?.dysonVerseSaveData;
            Oracle.DysonVersePrestigeData prestige =
                dyson?.dysonVersePrestigeData;
            if (settings == null ||
                dyson == null ||
                prestige == null)
            {
                return false;
            }

            long previousPoints = prestige.infinityPoints;
            NumericResult<long> nextPoints =
                NumericSafety.Add(
                    previousPoints,
                    request.RequestedReward);
            if (!nextPoints.IsSuccess) return false;
            long rewardGranted = Math.Max(
                0L,
                nextPoints.Value - previousPoints);

            settings.offlineTimeUsedPreviousInfinity =
                NumericSafety.ClampContinuous(
                    settings.offlineTimeUsedThisInfinity);
            settings.offlineTimeUsedThisInfinity = 0d;
            settings.firstInfinityDone = true;
            settings.lastInfinityPointsGained =
                rewardGranted >= int.MaxValue
                    ? int.MaxValue
                    : (int)rewardGranted;

            dyson.dysonVerseInfinityData =
                new Oracle.DysonVerseInfinityData();
            dyson.dysonVerseSkillTreeData =
                new Oracle.DysonVerseSkillTreeData();
            Oracle.DysonVerseInfinityData infinity =
                dyson.dysonVerseInfinityData;
            Oracle.DysonVerseSkillTreeData skills =
                dyson.dysonVerseSkillTreeData;

            prestige.infinityPoints = nextPoints.Value;
            infinity.bots =
                prestige.infinityAssemblyLines ? 10d : 1d;
            infinity.assemblyLines[1] =
                prestige.infinityAssemblyLines ? 10d : 0d;
            infinity.managers[1] =
                prestige.infinityAiManagers ? 10d : 0d;
            infinity.servers[1] =
                prestige.infinityServers ? 10d : 0d;
            infinity.dataCenters[1] =
                prestige.infinityDataCenter ? 10d : 0d;
            infinity.planets[1] =
                prestige.infinityPlanets ? 10d : 0d;

            NumericResult<long> skillPoints =
                NumericSafety.Add(
                    prestige.permanentSkillPoint,
                    request.BankedSkillPoints);
            skillPoints = NumericSafety.Add(
                skillPoints.Value,
                request.ArtifactSkillPoints);
            skills.skillPointsTree = skillPoints.Value;
            skills.fragments = 0L;

            settings.tutorial = true;
            settings.infinityInProgress = false;
            settings.botCapTransitionPending = false;
            settings.botCapRewardsGranted = false;
            settings.simulationStatistics?.RecordInfinityCycle(
                request.BreakInfinity,
                settings.timeLastInfinity,
                rewardGranted,
                request.BotCapTransition);
            outcome = new InfinityResetOutcome(
                rewardGranted);
            return true;
        }
    }
}
