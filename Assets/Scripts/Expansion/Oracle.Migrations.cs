using System;
using System.Collections.Generic;
using Classes;
using GameData;
using SirenixSerializationUtility = Sirenix.Serialization.SerializationUtility;
using Systems.Migrations;
using Systems.Save;
using Systems.Skills;
using Systems.Stats;
using UnityEngine;

namespace Expansion
{
    /// <summary>
    /// Migration orchestration for <see cref="Oracle.SaveDataSettings"/>.
    /// </summary>
    /// <remarks>
    /// The project uses a single consolidated V11 migration step to upgrade any legacy save in one pass.
    /// This file groups the orchestration logic so clipboard/disk IO can stay separate.
    /// </remarks>
    public partial class Oracle
    {
        private void ApplyMigrations()
        {
            if (saveSettings == null) return;

            MigrationRegistry registry = BuildMigrationRegistry();
            if (registry.LatestVersion != CurrentSaveVersion)
            {
                string message =
                    $"Migration registry latest version {registry.LatestVersion} does not match CurrentSaveVersion {CurrentSaveVersion}.";
#if UNITY_EDITOR
                Debug.LogError(message);
                throw new InvalidOperationException(message);
#else
                Debug.LogWarning(message);
#endif
            }

            MigrationRunOptions options = BuildMigrationOptions(false);
            // Transactional migration: run against a deep copy and only commit on success.
            SaveDataSettings original = saveSettings;
            SaveDataSettings working = (SaveDataSettings)SirenixSerializationUtility.CreateCopy(original);
            saveSettings = working;
            try
            {
                MigrationRunResult result = MigrationRunner.Run(this, registry, options);
                Debug.Log(result.ToReportString());
            }
            catch
            {
                saveSettings = original;
                throw;
            }
        }

        public MigrationRunResult RunMigrationDryRun()
        {
            if (saveSettings == null) return null;

            MigrationRegistry registry = BuildMigrationRegistry();
            MigrationRunOptions options = BuildMigrationOptions(true);
            options.ThrowOnError = false;
            MigrationRunResult result = MigrationRunner.Run(this, registry, options);
            Debug.Log(result.ToReportString());
            return result;
        }

        public MigrationRunResult RunMigrationDryRun(SaveDataSettings saveData)
        {
            if (saveData == null) return null;

            SaveDataSettings original = saveSettings;
            try
            {
                saveSettings = saveData;
                return RunMigrationDryRun();
            }
            finally
            {
                saveSettings = original;
            }
        }

        private MigrationRunOptions BuildMigrationOptions(bool dryRun)
        {
            return new MigrationRunOptions
            {
                DryRun = dryRun,
                CaptureSnapshots = dryRun,
                IncludeEnsureStep = true,
                ThrowOnError = !dryRun,
                UpdateLastSuccessfulLoadUtc = !dryRun,
                EnsureAction = _ =>
                {
                    EnsureSkillOwnershipData();
                    EnsureSkillAutoAssignmentIds();
                    EnsureResearchLevelData();
                    EnsurePackedSettingsFlags();
                    EnsureInfinitySparseArrays();
                }
            };
        }

        private MigrationRegistry BuildMigrationRegistry()
        {
            var registry = new MigrationRegistry();
            registry.AddStep(new MigrationStep(
                targetVersion: 11,
                name: "Consolidated migration (V11)",
                summary: "Upgrade any legacy save to V11 in a single step (skipping intermediate chains).",
                apply: _ => { MigrateToV11(); }));

            return registry;
        }

        private void MigrateToV11()
        {
            // Apply all prior migrations idempotently in one pass.
            MigrateSkillOwnershipToIds();
            MigrateSkillAutoAssignmentIds();
            MigrateResearchLevelsToIds();
            MigrateSkillStateToIds();
            MigrateAvocadoData();
            MigrateMegaStructureData();
            MigrateSkillBitsets();
            PackSettingsFlags();
            MigratePresetAutoAssignOrder();
            MigrateAvotationProgress();
        }

        private void MigrateAvotationProgress()
        {
            if (saveSettings == null) return;

            saveSettings.avotationProgressStep = Mathf.Clamp(saveSettings.avotationProgressStep, 0, 7);

            // Legacy complete flag remains canonical for the +4 skill-point reward.
            if (saveSettings.avotation)
            {
                saveSettings.avotationProgressStep = 7;
            }
            else if (saveSettings.avotationProgressStep >= 7)
            {
                saveSettings.avotation = true;
                saveSettings.avotationProgressStep = 7;
            }
        }

        private void EnsureInfinitySparseArrays()
        {
            if (infinityData == null) return;

            // Legacy bridge: older clipboard exports may have nulled dense arrays and relied on sparse lists.
            // V11 canonical format keeps dense arrays only; we merge sparse into dense then discard sparse.
            FacilityArrayNormalizer.Normalize(infinityData);
        }

        private void EnsureSkillOwnershipData()
        {
            if (infinityData == null) return;
            EnsureSkillStateData();
            EnsureSkillOwnedBitset();
            SyncSkillOwnedByIdFromBitset();
            SyncSkillFlagsFromBitset();
        }

        private void EnsureSkillStateData()
        {
            if (infinityData == null) return;
            infinityData.skillStateById ??= new Dictionary<string, SkillState>();
            if (infinityData.skillStateById.Count == 0)
            {
                if (infinityData.skillOwnedById != null && infinityData.skillOwnedById.Count > 0)
                {
                    foreach (KeyValuePair<string, bool> entry in infinityData.skillOwnedById)
                    {
                        EnsureSkillStateEntry(entry.Key, entry.Value);
                    }
                }
                else if (infinityData.SkillTreeSaveData != null && infinityData.SkillTreeSaveData.Count > 0)
                {
                    foreach (KeyValuePair<int, bool> entry in infinityData.SkillTreeSaveData)
                    {
                        if (SkillIdMap.TryGetId(entry.Key, out string id))
                        {
                            EnsureSkillStateEntry(id, entry.Value);
                        }
                    }
                }
                else
                {
                    GameDataRegistry registry = GameDataRegistry.Instance;
                    if (registry != null && registry.skillDatabase != null && registry.skillDatabase.skills.Count > 0)
                    {
                        foreach (SkillDefinition skill in registry.skillDatabase.skills)
                        {
                            if (skill == null || string.IsNullOrEmpty(skill.id)) continue;
                            bool owned = SkillFlagAccessor.TryGetFlag(skillTreeData, skill.id, out bool flag) && flag;
                            EnsureSkillStateEntry(skill.id, owned);
                        }
                    }
                }
            }
        }

        private void EnsureSkillOwnedBitset()
        {
            if (infinityData == null) return;
            if (infinityData.skillOwnedBits == null || infinityData.skillOwnedBits.Length == 0)
            {
                if (!string.IsNullOrEmpty(infinityData.skillOwnedBitsBase64))
                {
                    infinityData.skillOwnedBits = Convert.FromBase64String(infinityData.skillOwnedBitsBase64);
                }
                else
                {
                    infinityData.skillOwnedBits = SkillBitsetUtility.CreateEmptyBitset();
                    PopulateOwnedBitsetFromLegacySources(infinityData.skillOwnedBits);
                }
                return;
            }

            infinityData.skillOwnedBits = SkillBitsetUtility.EnsureSize(infinityData.skillOwnedBits);
            if (infinityData.skillOwnedBits.Length == 0)
            {
                infinityData.skillOwnedBits = SkillBitsetUtility.CreateEmptyBitset();
                PopulateOwnedBitsetFromLegacySources(infinityData.skillOwnedBits);
            }
        }

        private void PopulateOwnedBitsetFromLegacySources(byte[] bits)
        {
            if (bits == null || infinityData == null) return;

            GameDataRegistry registry = GameDataRegistry.Instance;
            if (registry != null && registry.skillDatabase != null && registry.skillDatabase.skills.Count > 0)
            {
                foreach (SkillDefinition skill in registry.skillDatabase.skills)
                {
                    if (skill == null || string.IsNullOrEmpty(skill.id)) continue;
                    if (!TryGetOwnedFromLegacySources(skill.id)) continue;
                    if (SkillBitsetUtility.TryGetIndex(skill.id, out int index))
                    {
                        SkillBitsetUtility.SetBit(bits, index, true);
                    }
                }

                return;
            }

            if (infinityData.skillStateById != null)
            {
                foreach (KeyValuePair<string, SkillState> entry in infinityData.skillStateById)
                {
                    if (entry.Value == null || !entry.Value.owned) continue;
                    if (SkillBitsetUtility.TryGetIndex(entry.Key, out int index))
                    {
                        SkillBitsetUtility.SetBit(bits, index, true);
                    }
                }
            }
        }

        private bool TryGetOwnedFromLegacySources(string skillId)
        {
            if (string.IsNullOrEmpty(skillId)) return false;

            if (infinityData != null && infinityData.skillStateById != null &&
                infinityData.skillStateById.TryGetValue(skillId, out SkillState state) && state != null)
            {
                return state.owned;
            }

            if (infinityData != null && infinityData.skillOwnedById != null &&
                infinityData.skillOwnedById.TryGetValue(skillId, out bool owned))
            {
                return owned;
            }

            if (infinityData != null && infinityData.SkillTreeSaveData != null &&
                SkillIdMap.TryGetLegacyKey(skillId, out int key) &&
                infinityData.SkillTreeSaveData.TryGetValue(key, out bool legacyOwned))
            {
                return legacyOwned;
            }

            if (SkillFlagAccessor.TryGetFlag(skillTreeData, skillId, out bool flag))
            {
                return flag;
            }

            return false;
        }

        private void SyncSkillOwnedByIdFromBitset()
        {
            if (infinityData == null) return;
            infinityData.skillOwnedById ??= new Dictionary<string, bool>();
            infinityData.skillOwnedById.Clear();

            GameDataRegistry registry = GameDataRegistry.Instance;
            if (registry == null || registry.skillDatabase == null || registry.skillDatabase.skills.Count == 0) return;
            if (infinityData.skillOwnedBits == null || infinityData.skillOwnedBits.Length == 0) return;

            foreach (SkillDefinition skill in registry.skillDatabase.skills)
            {
                if (skill == null || string.IsNullOrEmpty(skill.id)) continue;
                bool owned = TryGetOwnedFromBitset(skill.id);
                infinityData.skillOwnedById[skill.id] = owned;
                if (infinityData.skillStateById != null &&
                    infinityData.skillStateById.TryGetValue(skill.id, out SkillState state) && state != null)
                {
                    state.owned = owned;
                    if (owned && state.level < 1) state.level = 1;
                    if (!owned) state.level = 0;
                }
            }
        }

        private void SyncSkillFlagsFromBitset()
        {
            GameDataRegistry registry = GameDataRegistry.Instance;
            if (registry == null || registry.skillDatabase == null || registry.skillDatabase.skills.Count == 0) return;
            if (infinityData?.skillOwnedBits == null || infinityData.skillOwnedBits.Length == 0) return;

            foreach (SkillDefinition skill in registry.skillDatabase.skills)
            {
                if (skill == null || string.IsNullOrEmpty(skill.id)) continue;
                bool owned = TryGetOwnedFromBitset(skill.id);
                SkillFlagAccessor.TrySetFlag(skillTreeData, skill.id, owned);
            }
        }

        private void MigrateLegacySkillTimersToState()
        {
            if (infinityData == null) return;

            if (prestigeData != null)
            {
                if (prestigeData.androidsSkillTimer > 0)
                {
                    SetSkillTimerSeconds(infinityData, "androids", prestigeData.androidsSkillTimer);
                }

                if (prestigeData.pocketAndroidsTimer > 0)
                {
                    SetSkillTimerSeconds(infinityData, "pocketAndroids", prestigeData.pocketAndroidsTimer);
                }

                prestigeData.androidsSkillTimer = 0;
                prestigeData.pocketAndroidsTimer = 0;
            }

            if (skillTreeData != null)
            {
                if (skillTreeData.superRadiantScatteringTimer > 0)
                {
                    SetSkillTimerSeconds(infinityData, "superRadiantScattering", skillTreeData.superRadiantScatteringTimer);
                }

                if (skillTreeData.idleElectricSheepTimer > 0)
                {
                    SetSkillTimerSeconds(infinityData, "idleElectricSheep", skillTreeData.idleElectricSheepTimer);
                }

                skillTreeData.superRadiantScatteringTimer = 0;
                skillTreeData.idleElectricSheepTimer = 0;
            }
        }

        private void EnsureSkillAutoAssignmentIds()
        {
            DysonVerseSaveData data = saveSettings?.dysonVerseSaveData;
            if (data == null) return;

            data.skillAutoAssignmentIds ??= new List<string>();
            if (data.skillAutoAssignmentIds.Count == 0 && data.skillAutoAssignmentList.Count > 0)
            {
                data.skillAutoAssignmentIds = SkillIdMap.ConvertKeysToIds(data.skillAutoAssignmentList);
            }

            data.skillAutoAssignmentIds1 ??= new List<string>();
            if (data.skillAutoAssignmentIds1.Count == 0 && data.skillAutoAssignmentList1.Count > 0)
            {
                data.skillAutoAssignmentIds1 = SkillIdMap.ConvertKeysToIds(data.skillAutoAssignmentList1);
            }

            data.skillAutoAssignmentIds2 ??= new List<string>();
            if (data.skillAutoAssignmentIds2.Count == 0 && data.skillAutoAssignmentList2.Count > 0)
            {
                data.skillAutoAssignmentIds2 = SkillIdMap.ConvertKeysToIds(data.skillAutoAssignmentList2);
            }

            data.skillAutoAssignmentIds3 ??= new List<string>();
            if (data.skillAutoAssignmentIds3.Count == 0 && data.skillAutoAssignmentList3.Count > 0)
            {
                data.skillAutoAssignmentIds3 = SkillIdMap.ConvertKeysToIds(data.skillAutoAssignmentList3);
            }

            data.skillAutoAssignmentIds4 ??= new List<string>();
            if (data.skillAutoAssignmentIds4.Count == 0 && data.skillAutoAssignmentList4.Count > 0)
            {
                data.skillAutoAssignmentIds4 = SkillIdMap.ConvertKeysToIds(data.skillAutoAssignmentList4);
            }

            data.skillAutoAssignmentIds5 ??= new List<string>();
            if (data.skillAutoAssignmentIds5.Count == 0 && data.skillAutoAssignmentList5.Count > 0)
            {
                data.skillAutoAssignmentIds5 = SkillIdMap.ConvertKeysToIds(data.skillAutoAssignmentList5);
            }

            EnsurePresetAutoAssignOrderFromLegacyBits(data);
            EnsureSkillAutoAssignmentBitsets();
        }

        private void EnsurePresetAutoAssignOrderFromLegacyBits(DysonVerseSaveData data)
        {
            if (data == null) return;

            EnsurePresetAutoAssignOrderFromLegacyBits(ref data.skillAutoAssignmentIds1, ref data.skillAutoAssignmentBits1,
                ref data.skillAutoAssignmentBitsBase64_1, ref data.skillAutoAssignmentList1);
            EnsurePresetAutoAssignOrderFromLegacyBits(ref data.skillAutoAssignmentIds2, ref data.skillAutoAssignmentBits2,
                ref data.skillAutoAssignmentBitsBase64_2, ref data.skillAutoAssignmentList2);
            EnsurePresetAutoAssignOrderFromLegacyBits(ref data.skillAutoAssignmentIds3, ref data.skillAutoAssignmentBits3,
                ref data.skillAutoAssignmentBitsBase64_3, ref data.skillAutoAssignmentList3);
            EnsurePresetAutoAssignOrderFromLegacyBits(ref data.skillAutoAssignmentIds4, ref data.skillAutoAssignmentBits4,
                ref data.skillAutoAssignmentBitsBase64_4, ref data.skillAutoAssignmentList4);
            EnsurePresetAutoAssignOrderFromLegacyBits(ref data.skillAutoAssignmentIds5, ref data.skillAutoAssignmentBits5,
                ref data.skillAutoAssignmentBitsBase64_5, ref data.skillAutoAssignmentList5);
        }

        private void EnsurePresetAutoAssignOrderFromLegacyBits(ref List<string> ids, ref byte[] bits, ref string base64,
            ref List<int> legacyList)
        {
            bool hadBits = (bits != null && bits.Length > 0) || !string.IsNullOrEmpty(base64);
            if ((ids == null || ids.Count == 0) && hadBits)
            {
                ids = TryGetPresetIdsFromLegacyOrBits(legacyList, bits, base64);
                if (ids.Count > 0)
                {
                    List<string> before = new List<string>(ids);
                    ids = BuildDependencySafeOrder(ids);
                    legacyList = SkillIdMap.ConvertIdsToKeys(ids);
                    Debug.Log(
                        $"[PresetAutoAssign:Ensure] rebuilt from bits; " +
                        $"before={FormatPresetList(before)} after={FormatPresetList(ids)}");
                }
            }

            bits = null;
            base64 = null;
        }

        private void EnsureSkillAutoAssignmentBitsets()
        {
            DysonVerseSaveData data = saveSettings?.dysonVerseSaveData;
            if (data == null) return;

            if (data.skillAutoAssignmentBits == null || data.skillAutoAssignmentBits.Length == 0)
            {
                if (data.skillAutoAssignmentIds == null || data.skillAutoAssignmentIds.Count == 0)
                {
                    if (data.skillAutoAssignmentList != null && data.skillAutoAssignmentList.Count > 0)
                        data.skillAutoAssignmentIds = SkillIdMap.ConvertKeysToIds(data.skillAutoAssignmentList);
                    else if (!string.IsNullOrEmpty(data.skillAutoAssignmentBitsBase64))
                        data.skillAutoAssignmentIds = SkillBitsetUtility.ConvertBitsetToIds(
                            Convert.FromBase64String(data.skillAutoAssignmentBitsBase64));
                }

                data.skillAutoAssignmentBits = SkillBitsetUtility.BuildBitsetFromIds(data.skillAutoAssignmentIds);
            }
            else
            {
                data.skillAutoAssignmentBits = SkillBitsetUtility.EnsureSize(data.skillAutoAssignmentBits);
                if (data.skillAutoAssignmentIds == null || data.skillAutoAssignmentIds.Count == 0)
                {
                    if (data.skillAutoAssignmentList != null && data.skillAutoAssignmentList.Count > 0)
                        data.skillAutoAssignmentIds = SkillIdMap.ConvertKeysToIds(data.skillAutoAssignmentList);
                    else
                        data.skillAutoAssignmentIds = SkillBitsetUtility.ConvertBitsetToIds(data.skillAutoAssignmentBits);
                }
            }
        }

        private void EnsureResearchLevelData()
        {
            if (infinityData == null) return;
            infinityData.researchLevelsById ??= new Dictionary<string, double>();

            if (infinityData.researchLevelsById.Count == 0)
            {
                ResearchIdMap.PopulateLevelsFromLegacy(infinityData, infinityData.researchLevelsById);
                return;
            }

            ResearchIdMap.ApplyLevelsToLegacy(infinityData, infinityData.researchLevelsById);
            ResearchIdMap.PopulateLevelsFromLegacy(infinityData, infinityData.researchLevelsById);
        }

        private void MigrateResearchLevelsToIds()
        {
            if (infinityData == null) return;
            infinityData.researchLevelsById ??= new Dictionary<string, double>();
            if (infinityData.researchLevelsById.Count > 0) return;

            ResearchIdMap.PopulateLevelsFromLegacy(infinityData, infinityData.researchLevelsById);
        }

        private void SyncResearchLevelsFromLegacy()
        {
            if (infinityData == null) return;
            infinityData.researchLevelsById ??= new Dictionary<string, double>();
            ResearchIdMap.PopulateLevelsFromLegacy(infinityData, infinityData.researchLevelsById);
        }

        private void MigrateSkillOwnershipToIds()
        {
            if (infinityData == null) return;
            infinityData.skillOwnedById ??= new Dictionary<string, bool>();
            if (infinityData.skillOwnedById.Count > 0) return;

            if (infinityData.SkillTreeSaveData != null && infinityData.SkillTreeSaveData.Count > 0)
            {
                foreach (KeyValuePair<int, bool> entry in infinityData.SkillTreeSaveData)
                {
                    if (SkillIdMap.TryGetId(entry.Key, out string id))
                    {
                        infinityData.skillOwnedById[id] = entry.Value;
                    }
                }

                return;
            }

            if (SkillTree == null || SkillTree.Count == 0) return;
            foreach (KeyValuePair<int, SkillTreeItem> entry in SkillTree)
            {
                if (entry.Value == null) continue;
                if (SkillIdMap.TryGetId(entry.Key, out string id))
                {
                    infinityData.skillOwnedById[id] = entry.Value.Owned;
                }
            }
        }

        private void MigrateSkillStateToIds()
        {
            if (infinityData == null) return;
            infinityData.skillStateById ??= new Dictionary<string, SkillState>();
            if (infinityData.skillStateById.Count == 0)
            {
                EnsureSkillStateData();
            }

            MigrateLegacySkillTimersToState();
            SyncSkillOwnedByIdFromState();
        }

        private void MigrateSkillAutoAssignmentIds()
        {
            DysonVerseSaveData data = saveSettings?.dysonVerseSaveData;
            if (data == null) return;

            if (data.skillAutoAssignmentIds == null || data.skillAutoAssignmentIds.Count == 0)
            {
                data.skillAutoAssignmentIds = SkillIdMap.ConvertKeysToIds(data.skillAutoAssignmentList);
            }

            if (data.skillAutoAssignmentIds1 == null || data.skillAutoAssignmentIds1.Count == 0)
            {
                data.skillAutoAssignmentIds1 = SkillIdMap.ConvertKeysToIds(data.skillAutoAssignmentList1);
            }

            if (data.skillAutoAssignmentIds2 == null || data.skillAutoAssignmentIds2.Count == 0)
            {
                data.skillAutoAssignmentIds2 = SkillIdMap.ConvertKeysToIds(data.skillAutoAssignmentList2);
            }

            if (data.skillAutoAssignmentIds3 == null || data.skillAutoAssignmentIds3.Count == 0)
            {
                data.skillAutoAssignmentIds3 = SkillIdMap.ConvertKeysToIds(data.skillAutoAssignmentList3);
            }

            if (data.skillAutoAssignmentIds4 == null || data.skillAutoAssignmentIds4.Count == 0)
            {
                data.skillAutoAssignmentIds4 = SkillIdMap.ConvertKeysToIds(data.skillAutoAssignmentList4);
            }

            if (data.skillAutoAssignmentIds5 == null || data.skillAutoAssignmentIds5.Count == 0)
            {
                data.skillAutoAssignmentIds5 = SkillIdMap.ConvertKeysToIds(data.skillAutoAssignmentList5);
            }
        }

        private void MigrateSkillBitsets()
        {
            EnsureSkillOwnedBitset();
            EnsureSkillAutoAssignmentBitsets();
        }

        private void MigratePresetAutoAssignOrder()
        {
            DysonVerseSaveData data = saveSettings?.dysonVerseSaveData;
            if (data == null) return;

            MigratePresetAutoAssignOrder(ref data.skillAutoAssignmentIds1, ref data.skillAutoAssignmentBits1,
                ref data.skillAutoAssignmentBitsBase64_1, ref data.skillAutoAssignmentList1);
            MigratePresetAutoAssignOrder(ref data.skillAutoAssignmentIds2, ref data.skillAutoAssignmentBits2,
                ref data.skillAutoAssignmentBitsBase64_2, ref data.skillAutoAssignmentList2);
            MigratePresetAutoAssignOrder(ref data.skillAutoAssignmentIds3, ref data.skillAutoAssignmentBits3,
                ref data.skillAutoAssignmentBitsBase64_3, ref data.skillAutoAssignmentList3);
            MigratePresetAutoAssignOrder(ref data.skillAutoAssignmentIds4, ref data.skillAutoAssignmentBits4,
                ref data.skillAutoAssignmentBitsBase64_4, ref data.skillAutoAssignmentList4);
            MigratePresetAutoAssignOrder(ref data.skillAutoAssignmentIds5, ref data.skillAutoAssignmentBits5,
                ref data.skillAutoAssignmentBitsBase64_5, ref data.skillAutoAssignmentList5);
        }

        private void MigratePresetAutoAssignOrder(ref List<string> ids, ref byte[] bits, ref string base64,
            ref List<int> legacyList)
        {
            if (ids == null || ids.Count == 0)
            {
                ids = TryGetPresetIdsFromLegacyOrBits(legacyList, bits, base64);
            }

            if (ids.Count > 0)
            {
                List<string> before = new List<string>(ids);
                ids = BuildDependencySafeOrder(ids);
                legacyList = SkillIdMap.ConvertIdsToKeys(ids);
                Debug.Log(
                    $"[PresetAutoAssign:Migrate] reordered; " +
                    $"before={FormatPresetList(before)} after={FormatPresetList(ids)}");
            }

            bits = null;
            base64 = null;
        }

        private List<string> TryGetPresetIdsFromLegacyOrBits(List<int> legacyList, byte[] bits, string base64)
        {
            if (legacyList != null && legacyList.Count > 0)
                return SkillIdMap.ConvertKeysToIds(legacyList);

            if (bits != null && bits.Length > 0)
                return SkillBitsetUtility.ConvertBitsetToIds(bits);

            if (!string.IsNullOrEmpty(base64))
                return SkillBitsetUtility.ConvertBitsetToIds(Convert.FromBase64String(base64));

            return new List<string>();
        }

        private List<string> BuildDependencySafeOrder(List<string> ids)
        {
            if (ids == null || ids.Count <= 1) return ids ?? new List<string>();

            GameDataRegistry registry = GameDataRegistry.Instance;
            if (registry == null || registry.skillDatabase == null) return ids;

            var orderedInput = new List<string>();
            var seen = new HashSet<string>(StringComparer.Ordinal);
            foreach (string id in ids)
            {
                if (string.IsNullOrEmpty(id) || !seen.Add(id)) continue;
                orderedInput.Add(id);
            }

            if (orderedInput.Count <= 1) return orderedInput;

            var index = new Dictionary<string, int>(orderedInput.Count, StringComparer.Ordinal);
            for (int i = 0; i < orderedInput.Count; i++)
                index[orderedInput[i]] = i;

            var selected = new HashSet<string>(orderedInput, StringComparer.Ordinal);
            var indegree = new Dictionary<string, int>(orderedInput.Count, StringComparer.Ordinal);
            var adjacency = new Dictionary<string, List<string>>(orderedInput.Count, StringComparer.Ordinal);

            foreach (string id in orderedInput)
            {
                indegree[id] = 0;
                adjacency[id] = new List<string>();
            }

            foreach (string id in orderedInput)
            {
                if (!registry.skillDatabase.TryGet(id, out SkillDefinition definition) || definition == null) continue;
                AppendDependencies(id, definition.requiredSkillIds, selected, indegree, adjacency);
                AppendDependencies(id, definition.shadowRequirementIds, selected, indegree, adjacency);
            }

            var remaining = new HashSet<string>(orderedInput, StringComparer.Ordinal);
            var topo = new List<string>(orderedInput.Count);

            while (remaining.Count > 0)
            {
                bool progressed = false;
                for (int i = 0; i < orderedInput.Count; i++)
                {
                    string id = orderedInput[i];
                    if (!remaining.Contains(id)) continue;
                    if (indegree[id] != 0) continue;

                    remaining.Remove(id);
                    topo.Add(id);
                    foreach (string neighbor in adjacency[id])
                    {
                        indegree[neighbor]--;
                    }

                    progressed = true;
                }

                if (progressed) continue;

                // Cycle or missing prereqs inside selection; preserve original order for remaining.
                foreach (string id in orderedInput)
                {
                    if (!remaining.Contains(id)) continue;
                    topo.Add(id);
                }

                break;
            }

            // Filter out exclusives that would block later auto-assign.
            var accepted = new List<string>(topo.Count);
            var acceptedSet = new HashSet<string>(StringComparer.Ordinal);
            foreach (string id in topo)
            {
                if (!registry.skillDatabase.TryGet(id, out SkillDefinition definition) || definition == null)
                {
                    accepted.Add(id);
                    acceptedSet.Add(id);
                    continue;
                }

                if (definition.exclusiveWithIds != null && definition.exclusiveWithIds.Length > 0)
                {
                    bool blocked = false;
                    foreach (string exclusiveId in definition.exclusiveWithIds)
                    {
                        if (acceptedSet.Contains(exclusiveId))
                        {
                            blocked = true;
                            break;
                        }
                    }

                    if (blocked) continue;
                }

                accepted.Add(id);
                acceptedSet.Add(id);
            }

            return accepted;
        }

        private static void AppendDependencies(string id, string[] requirements, HashSet<string> selected,
            Dictionary<string, int> indegree, Dictionary<string, List<string>> adjacency)
        {
            if (requirements == null || requirements.Length == 0) return;
            foreach (string req in requirements)
            {
                if (string.IsNullOrEmpty(req)) continue;
                if (!selected.Contains(req)) continue;
                adjacency[req].Add(id);
                indegree[id] += 1;
            }
        }

        /// <summary>
        /// Migrates avocato fields from PrestigePlus to new AvocadoData structure.
        /// This preserves all accumulated progress while moving to cleaner data organization.
        /// </summary>
        private void MigrateAvocadoData()
        {
            if (saveSettings == null) return;

            if (saveSettings.prestigePlus == null) saveSettings.prestigePlus = new PrestigePlus();
            if (saveSettings.avocadoData == null) saveSettings.avocadoData = new AvocadoData();

            var pp = saveSettings.prestigePlus;
            var avocado = saveSettings.avocadoData;

            // Only migrate if AvocadoData hasn't been populated yet
            // (check if unlocked is false AND legacy field is true, or any accumulated values exist)
            bool needsMigration = !avocado.unlocked && pp.avocatoPurchased;
            bool hasLegacyData = pp.avocatoIP > 0 || pp.avocatoInfluence > 0 ||
                                 pp.avocatoStrangeMatter > 0 || pp.avocatoOverflow > 0;

            if (needsMigration || hasLegacyData)
            {
                // Migrate unlock state
                avocado.unlocked = pp.avocatoPurchased;

                // Migrate accumulated values (add to any existing values in case of partial migration)
                avocado.infinityPoints += pp.avocatoIP;
                avocado.influence += pp.avocatoInfluence;
                avocado.strangeMatter += pp.avocatoStrangeMatter;
                avocado.overflowMultiplier += pp.avocatoOverflow;

                // Clear legacy fields to prevent double-counting on future loads
                pp.avocatoIP = 0;
                pp.avocatoInfluence = 0;
                pp.avocatoStrangeMatter = 0;
                pp.avocatoOverflow = 0;
            }
        }

        private void MigrateMegaStructureData()
        {
            // Initialize mega-structure arrays for existing saves
            if (infinityData != null)
            {
                if (infinityData.matrioshkaBrains == null || infinityData.matrioshkaBrains.Length != 2)
                    infinityData.matrioshkaBrains = new double[] { 0, 0 };

                if (infinityData.birchPlanets == null || infinityData.birchPlanets.Length != 2)
                    infinityData.birchPlanets = new double[] { 0, 0 };

                if (infinityData.galacticBrains == null || infinityData.galacticBrains.Length != 2)
                    infinityData.galacticBrains = new double[] { 0, 0 };

                // Initialize modifier values to 1 (no modifier)
                if (infinityData.matrioshkaBrainModifier == 0)
                    infinityData.matrioshkaBrainModifier = 1;
                if (infinityData.birchPlanetModifier == 0)
                    infinityData.birchPlanetModifier = 1;
                if (infinityData.galacticBrainModifier == 0)
                    infinityData.galacticBrainModifier = 1;
            }

            // Initialize unlock flags (default to false - must be unlocked via Quantum upgrades)
            // No action needed here since bool defaults to false
        }
    }
}
