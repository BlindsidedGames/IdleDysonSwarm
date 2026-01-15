using System;
using System.Collections.Generic;
using System.Globalization;
using Expansion;
using GameData;
using Systems.Skills;

namespace Systems.Migrations
{
    public sealed class MigrationSnapshot
    {
        public int SaveVersion { get; private set; }
        public int SkillStateCount { get; private set; }
        public int SkillStateOwnedCount { get; private set; }
        public int SkillOwnedByIdCount { get; private set; }
        public int SkillOwnedTrueCount { get; private set; }
        public int LegacySkillTreeSaveCount { get; private set; }
        public int ResearchLevelsByIdCount { get; private set; }
        public int LegacyResearchNonZeroCount { get; private set; }
        public int LegacyResearchTotalIds { get; private set; }
        public int[] AutoAssignmentLegacyCounts { get; private set; }
        public int[] AutoAssignmentIdCounts { get; private set; }
        public double AndroidsSkillTimer { get; private set; }
        public double PocketAndroidsTimer { get; private set; }
        public double SuperRadiantScatteringTimer { get; private set; }
        public double IdleElectricSheepTimer { get; private set; }

        // AvocadoData tracking (Phase 3 migration)
        public bool AvocadoUnlocked { get; private set; }
        public double AvocadoInfinityPoints { get; private set; }
        public double AvocadoInfluence { get; private set; }
        public double AvocadoStrangeMatter { get; private set; }
        public double AvocadoOverflowMultiplier { get; private set; }

        // Legacy avocato fields (pre-migration)
        public bool LegacyAvocatoPurchased { get; private set; }
        public double LegacyAvocatoIP { get; private set; }
        public double LegacyAvocatoInfluence { get; private set; }
        public double LegacyAvocatoStrangeMatter { get; private set; }
        public double LegacyAvocatoOverflow { get; private set; }

        public static MigrationSnapshot Capture(Oracle.SaveDataSettings saveData)
        {
            var snapshot = new MigrationSnapshot
            {
                AutoAssignmentLegacyCounts = new int[6],
                AutoAssignmentIdCounts = new int[6]
            };

            if (saveData == null)
            {
                return snapshot;
            }

            snapshot.SaveVersion = saveData.saveVersion;

            Oracle.DysonVerseSaveData dysonVerse = saveData.dysonVerseSaveData;
            Oracle.DysonVerseInfinityData infinityData = dysonVerse?.dysonVerseInfinityData;

            if (infinityData != null)
            {
                snapshot.LegacySkillTreeSaveCount = infinityData.SkillTreeSaveData?.Count ?? 0;
                snapshot.SkillStateCount = infinityData.skillStateById?.Count ?? 0;
                snapshot.SkillStateOwnedCount = CountOwnedStates(infinityData.skillStateById);
                snapshot.SkillOwnedByIdCount = infinityData.skillOwnedById?.Count ?? 0;
                snapshot.SkillOwnedTrueCount = CountTrue(infinityData.skillOwnedById);
                snapshot.ResearchLevelsByIdCount = infinityData.researchLevelsById?.Count ?? 0;
                snapshot.LegacyResearchTotalIds = ResearchIdMap.Ids.Count;
                snapshot.LegacyResearchNonZeroCount = CountLegacyResearchNonZero(infinityData);
            }

            if (dysonVerse != null)
            {
                snapshot.AutoAssignmentLegacyCounts[0] = dysonVerse.skillAutoAssignmentList?.Count ?? 0;
                snapshot.AutoAssignmentLegacyCounts[1] = dysonVerse.skillAutoAssignmentList1?.Count ?? 0;
                snapshot.AutoAssignmentLegacyCounts[2] = dysonVerse.skillAutoAssignmentList2?.Count ?? 0;
                snapshot.AutoAssignmentLegacyCounts[3] = dysonVerse.skillAutoAssignmentList3?.Count ?? 0;
                snapshot.AutoAssignmentLegacyCounts[4] = dysonVerse.skillAutoAssignmentList4?.Count ?? 0;
                snapshot.AutoAssignmentLegacyCounts[5] = dysonVerse.skillAutoAssignmentList5?.Count ?? 0;

                snapshot.AutoAssignmentIdCounts[0] = dysonVerse.skillAutoAssignmentIds?.Count ?? 0;
                snapshot.AutoAssignmentIdCounts[1] = dysonVerse.skillAutoAssignmentIds1?.Count ?? 0;
                snapshot.AutoAssignmentIdCounts[2] = dysonVerse.skillAutoAssignmentIds2?.Count ?? 0;
                snapshot.AutoAssignmentIdCounts[3] = dysonVerse.skillAutoAssignmentIds3?.Count ?? 0;
                snapshot.AutoAssignmentIdCounts[4] = dysonVerse.skillAutoAssignmentIds4?.Count ?? 0;
                snapshot.AutoAssignmentIdCounts[5] = dysonVerse.skillAutoAssignmentIds5?.Count ?? 0;
            }

            if (infinityData != null)
            {
                snapshot.AndroidsSkillTimer = Oracle.GetSkillTimerSeconds(infinityData, "androids");
                snapshot.PocketAndroidsTimer = Oracle.GetSkillTimerSeconds(infinityData, "pocketAndroids");
                snapshot.SuperRadiantScatteringTimer = Oracle.GetSkillTimerSeconds(infinityData, "superRadiantScattering");
                snapshot.IdleElectricSheepTimer = Oracle.GetSkillTimerSeconds(infinityData, "idleElectricSheep");
            }

            // Capture AvocadoData state
            Oracle.AvocadoData avocadoData = saveData.avocadoData;
            if (avocadoData != null)
            {
                snapshot.AvocadoUnlocked = avocadoData.unlocked;
                snapshot.AvocadoInfinityPoints = avocadoData.infinityPoints;
                snapshot.AvocadoInfluence = avocadoData.influence;
                snapshot.AvocadoStrangeMatter = avocadoData.strangeMatter;
                snapshot.AvocadoOverflowMultiplier = avocadoData.overflowMultiplier;
            }

            // Capture legacy avocato fields (for verifying migration)
            Oracle.PrestigePlus prestigePlus = saveData.prestigePlus;
            if (prestigePlus != null)
            {
                snapshot.LegacyAvocatoPurchased = prestigePlus.avocatoPurchased;
                snapshot.LegacyAvocatoIP = prestigePlus.avocatoIP;
                snapshot.LegacyAvocatoInfluence = prestigePlus.avocatoInfluence;
                snapshot.LegacyAvocatoStrangeMatter = prestigePlus.avocatoStrangeMatter;
                snapshot.LegacyAvocatoOverflow = prestigePlus.avocatoOverflow;
            }

            return snapshot;
        }

        public IEnumerable<string> DescribeDifferences(MigrationSnapshot before)
        {
            if (before == null)
            {
                yield return "No baseline snapshot available.";
                yield break;
            }

            if (SaveVersion != before.SaveVersion)
            {
                yield return $"saveVersion: {before.SaveVersion} -> {SaveVersion}";
            }

            if (SkillOwnedByIdCount != before.SkillOwnedByIdCount || SkillOwnedTrueCount != before.SkillOwnedTrueCount)
            {
                yield return
                    $"skillOwnedById: {before.SkillOwnedByIdCount} ({before.SkillOwnedTrueCount} owned) -> {SkillOwnedByIdCount} ({SkillOwnedTrueCount} owned)";
            }

            if (SkillStateCount != before.SkillStateCount || SkillStateOwnedCount != before.SkillStateOwnedCount)
            {
                yield return
                    $"skillStateById: {before.SkillStateCount} ({before.SkillStateOwnedCount} owned) -> {SkillStateCount} ({SkillStateOwnedCount} owned)";
            }

            if (LegacySkillTreeSaveCount != before.LegacySkillTreeSaveCount)
            {
                yield return $"legacySkillTreeSaveData: {before.LegacySkillTreeSaveCount} -> {LegacySkillTreeSaveCount}";
            }

            if (ResearchLevelsByIdCount != before.ResearchLevelsByIdCount ||
                LegacyResearchNonZeroCount != before.LegacyResearchNonZeroCount)
            {
                yield return
                    $"researchLevelsById: {before.ResearchLevelsByIdCount} -> {ResearchLevelsByIdCount} (legacy>0 {before.LegacyResearchNonZeroCount}->{LegacyResearchNonZeroCount})";
            }

            if (!CountsEqual(AutoAssignmentLegacyCounts, before.AutoAssignmentLegacyCounts))
            {
                yield return
                    $"autoAssign legacy: {FormatCounts(before.AutoAssignmentLegacyCounts)} -> {FormatCounts(AutoAssignmentLegacyCounts)}";
            }

            if (!CountsEqual(AutoAssignmentIdCounts, before.AutoAssignmentIdCounts))
            {
                yield return
                    $"autoAssign ids: {FormatCounts(before.AutoAssignmentIdCounts)} -> {FormatCounts(AutoAssignmentIdCounts)}";
            }

            if (!NearlyEqual(AndroidsSkillTimer, before.AndroidsSkillTimer) ||
                !NearlyEqual(PocketAndroidsTimer, before.PocketAndroidsTimer) ||
                !NearlyEqual(SuperRadiantScatteringTimer, before.SuperRadiantScatteringTimer) ||
                !NearlyEqual(IdleElectricSheepTimer, before.IdleElectricSheepTimer))
            {
                yield return
                    $"timers androids: {FormatDouble(before.AndroidsSkillTimer)} -> {FormatDouble(AndroidsSkillTimer)}, " +
                    $"pocket: {FormatDouble(before.PocketAndroidsTimer)} -> {FormatDouble(PocketAndroidsTimer)}, " +
                    $"superRadiant: {FormatDouble(before.SuperRadiantScatteringTimer)} -> {FormatDouble(SuperRadiantScatteringTimer)}, " +
                    $"idleSheep: {FormatDouble(before.IdleElectricSheepTimer)} -> {FormatDouble(IdleElectricSheepTimer)}";
            }

            // AvocadoData migration tracking
            if (AvocadoUnlocked != before.AvocadoUnlocked)
            {
                yield return $"avocadoData.unlocked: {before.AvocadoUnlocked} -> {AvocadoUnlocked}";
            }

            if (!NearlyEqual(AvocadoInfinityPoints, before.AvocadoInfinityPoints) ||
                !NearlyEqual(AvocadoInfluence, before.AvocadoInfluence) ||
                !NearlyEqual(AvocadoStrangeMatter, before.AvocadoStrangeMatter) ||
                !NearlyEqual(AvocadoOverflowMultiplier, before.AvocadoOverflowMultiplier))
            {
                yield return
                    $"avocadoData: IP {FormatDouble(before.AvocadoInfinityPoints)} -> {FormatDouble(AvocadoInfinityPoints)}, " +
                    $"influence {FormatDouble(before.AvocadoInfluence)} -> {FormatDouble(AvocadoInfluence)}, " +
                    $"strangeMatter {FormatDouble(before.AvocadoStrangeMatter)} -> {FormatDouble(AvocadoStrangeMatter)}, " +
                    $"overflow {FormatDouble(before.AvocadoOverflowMultiplier)} -> {FormatDouble(AvocadoOverflowMultiplier)}";
            }

            // Legacy avocato fields (should be zeroed after migration)
            if (LegacyAvocatoPurchased != before.LegacyAvocatoPurchased ||
                !NearlyEqual(LegacyAvocatoIP, before.LegacyAvocatoIP) ||
                !NearlyEqual(LegacyAvocatoInfluence, before.LegacyAvocatoInfluence) ||
                !NearlyEqual(LegacyAvocatoStrangeMatter, before.LegacyAvocatoStrangeMatter) ||
                !NearlyEqual(LegacyAvocatoOverflow, before.LegacyAvocatoOverflow))
            {
                yield return
                    $"legacy avocato: purchased {before.LegacyAvocatoPurchased} -> {LegacyAvocatoPurchased}, " +
                    $"IP {FormatDouble(before.LegacyAvocatoIP)} -> {FormatDouble(LegacyAvocatoIP)}, " +
                    $"influence {FormatDouble(before.LegacyAvocatoInfluence)} -> {FormatDouble(LegacyAvocatoInfluence)}, " +
                    $"strangeMatter {FormatDouble(before.LegacyAvocatoStrangeMatter)} -> {FormatDouble(LegacyAvocatoStrangeMatter)}, " +
                    $"overflow {FormatDouble(before.LegacyAvocatoOverflow)} -> {FormatDouble(LegacyAvocatoOverflow)}";
            }
        }

        private static int CountTrue(Dictionary<string, bool> values)
        {
            if (values == null) return 0;
            int count = 0;
            foreach (KeyValuePair<string, bool> entry in values)
            {
                if (entry.Value) count++;
            }

            return count;
        }

        private static int CountOwnedStates(Dictionary<string, SkillState> values)
        {
            if (values == null) return 0;
            int count = 0;
            foreach (KeyValuePair<string, SkillState> entry in values)
            {
                if (entry.Value != null && entry.Value.owned) count++;
            }

            return count;
        }

        private static int CountLegacyResearchNonZero(Oracle.DysonVerseInfinityData infinityData)
        {
            if (infinityData == null) return 0;

            int count = 0;
            for (int i = 0; i < ResearchIdMap.Ids.Count; i++)
            {
                string id = ResearchIdMap.Ids[i];
                if (ResearchIdMap.TryGetLegacyLevel(infinityData, id, out double level) && level > 0)
                {
                    count++;
                }
            }

            return count;
        }

        private static bool CountsEqual(int[] left, int[] right)
        {
            if (left == null && right == null) return true;
            if (left == null || right == null) return false;
            if (left.Length != right.Length) return false;
            for (int i = 0; i < left.Length; i++)
            {
                if (left[i] != right[i]) return false;
            }

            return true;
        }

        private static string FormatCounts(int[] counts)
        {
            if (counts == null) return "n/a";
            return string.Join("/", counts);
        }

        private static bool NearlyEqual(double left, double right)
        {
            return Math.Abs(left - right) < 0.0001;
        }

        private static string FormatDouble(double value)
        {
            return value.ToString("G", CultureInfo.InvariantCulture);
        }
    }
}
