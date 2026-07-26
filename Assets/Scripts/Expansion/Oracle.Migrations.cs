using System;
using System.Collections.Generic;
using Classes;
using GameData;
using SirenixSerializationUtility = Sirenix.Serialization.SerializationUtility;
using Systems.Migrations;
using Systems.Numeric;
using Systems.Save;
using Systems.Skills;
using Systems.Stats;
using UnityEngine;

namespace Expansion
{
    /// <summary>
    /// Migration orchestration and save-shape normalization for <see cref="Oracle.SaveDataSettings"/>.
    /// </summary>
    /// <remarks>
    /// Purpose: run versioned migration steps and enforce non-null save containers/collections used by migration logic.
    /// Runs: runtime during load flow (invoked from <c>Oracle.Load()</c> via <c>ApplyMigrations()</c>).
    /// Primary entry points: <c>CreateSavePreparationPipeline()</c>, <c>ApplyMigrations()</c>,
    /// <c>RunMigrationDryRun()</c>, and migration ensure hooks in <c>BuildMigrationOptions()</c>.
    /// Owns: migration orchestration, save-version upgrade transforms, and defensive shape normalization for migrated
    /// save data.
    /// Delegates: save codec/disk IO to Oracle persistence partials and migration execution plumbing to
    /// <see cref="MigrationRunner"/>.
    ///
    /// Interacts with:
    /// - Calls into <see cref="Systems.Migrations.MigrationRunner"/> and <see cref="Systems.Migrations.MigrationRegistry"/>.
    /// - Uses <see cref="SkillIdMap"/>, <see cref="SkillBitsetUtility"/>, <see cref="ResearchIdMap"/>, and
    ///   <see cref="FacilityArrayNormalizer"/> for data transforms.
    /// - Reads runtime skill definitions from <see cref="GameDataRegistry"/>.
    /// - Called by load flow in <c>Assets/Scripts/Expansion/Oracle.cs</c> (<c>Start()</c> -> <c>Load()</c>).
    ///
    /// Change notes:
    /// - Changing migration order, target versions, or ensure hooks can invalidate legacy save upgrades; keep
    ///   <c>CurrentSaveVersion</c> and registry latest version aligned.
    /// - Changing skill/research mapping behavior requires coordinated updates in Skill/Research ID maps and any
    ///   bitset conversion helpers.
    /// - Null-normalization helpers in this file are relied on by migration steps; removing them can reintroduce
    ///   load-time NullReference failures for legacy/partial clipboard saves.
    /// - Base64 decode guards in migration paths intentionally prefer dropping malformed legacy payloads over failing
    ///   load; changing this behavior can bring back load-blocking exceptions for damaged clipboard exports.
    /// - EnsureSimulationMathematicsParity() keeps mathematics3 permanent unlock saves aligned with legacy
    ///   solar generation expectations; changing this rule requires matching updates in ResearchManager and
    ///   InformationEraManager.
    /// - EnsureMegaResearchPercentDefaults() normalizes legacy mega research percent fields to non-zero defaults;
    ///   changing defaults affects displayed boost text and mega production modifier scaling on load.
    /// - NumericSaveRepair applies the V12 finite/range contract on the isolated candidate before validation.
    /// </remarks>
    public partial class Oracle
    {
        private const double DefaultMegaResearchPercent = 0.03d;

        /// <summary>
        /// Creates the production decode/version/migration/validation pipeline bound to this Oracle's migration code.
        /// </summary>
        /// <returns>A preparation pipeline that migrates isolated candidates to the current schema.</returns>
        private SavePreparationPipeline CreateSavePreparationPipeline()
        {
            return new SavePreparationPipeline(CurrentSaveVersion, RunPreparedSaveMigration);
        }

        /// <summary>
        /// Runs production migration and normalization against an isolated candidate without publishing it.
        /// </summary>
        /// <param name="workingCopy">The pipeline-owned deep copy.</param>
        /// <returns>The non-throwing migration result.</returns>
        private MigrationRunResult RunPreparedSaveMigration(SaveDataSettings workingCopy)
        {
            SaveDataSettings publishedBefore = saveSettings;
            try
            {
                saveSettings = workingCopy;
                MigrationRegistry registry = BuildMigrationRegistry();
                MigrationRunOptions options = BuildMigrationOptions(false);
                options.CaptureSnapshots = false;
                options.ThrowOnError = false;
                options.UpdateLastSuccessfulLoadUtc = false;
                return MigrationRunner.Run(this, registry, options);
            }
            finally
            {
                saveSettings = publishedBefore;
            }
        }

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
            catch (Exception ex)
            {
                Debug.LogWarning(
                    $"[Migrations] ApplyMigrations failed. Restoring original save snapshot before rethrow. Error: {ex.Message}");
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
                    EnsureSaveSettingsShape();
                    EnsureDysonVerseSaveShape();
                    EnsureSkillOwnershipData();
                    EnsureSkillAutoAssignmentIds();
                    EnsureResearchLevelData();
                    EnsureMegaResearchPercentDefaults();
                    EnsurePackedSettingsFlags();
                    NumericSaveRepair.Repair(saveSettings);
                    EnsureInfinitySparseArrays();
                    EnsureSimulationMathematicsParity();
                }
            };
        }

        /// <summary>
        /// Determines whether runtime has reached the deliberate finite bot cap.
        /// </summary>
        /// <param name="bots">The prepared or legacy bots value.</param>
        /// <returns><see langword="true"/> only for the finite cap; non-finite values are corruption.</returns>
        internal static bool IsBotCapSignal(double bots)
        {
            return bots == double.MaxValue;
        }

        private MigrationRegistry BuildMigrationRegistry()
        {
            var registry = new MigrationRegistry();
            registry.AddStep(new MigrationStep(
                targetVersion: 12,
                name: "Numeric safety migration (V12)",
                summary: "Upgrade legacy saves to the finite numeric contract in a single deterministic pass.",
                apply: _ => { MigrateToV12(); }));

            return registry;
        }

        private void MigrateToV12()
        {
            MigrateToV11();
            NumericSaveRepair.Repair(saveSettings);
        }

        private void MigrateToV11()
        {
            EnsureSaveSettingsShape();

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

        private void EnsureSimulationMathematicsParity()
        {
            SaveDataPrestige prestige = saveSettings?.sdPrestige;
            SaveDataDream1 simulation = saveSettings?.sdSimulation;
            if (prestige == null || simulation == null) return;
            if (!prestige.mathematics3) return;

            simulation.mathematicsComplete = true;
            if (simulation.solarPanelGeneration < 200)
                simulation.solarPanelGeneration = 200;
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
                    if (!TryDecodeBase64Bytes(infinityData.skillOwnedBitsBase64, "skillOwnedBitsBase64", out byte[] decodedBits))
                    {
                        decodedBits = SkillBitsetUtility.CreateEmptyBitset();
                        PopulateOwnedBitsetFromLegacySources(decodedBits);
                    }

                    infinityData.skillOwnedBits = decodedBits;
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
            DysonVerseSaveData data = EnsureDysonVerseSaveShape();
            if (data == null) return;

            if (data.skillAutoAssignmentIds.Count == 0 && data.skillAutoAssignmentList.Count > 0)
            {
                data.skillAutoAssignmentIds = SkillIdMap.ConvertKeysToIds(data.skillAutoAssignmentList);
            }

            if (data.skillAutoAssignmentIds1.Count == 0 && data.skillAutoAssignmentList1.Count > 0)
            {
                data.skillAutoAssignmentIds1 = SkillIdMap.ConvertKeysToIds(data.skillAutoAssignmentList1);
            }

            if (data.skillAutoAssignmentIds2.Count == 0 && data.skillAutoAssignmentList2.Count > 0)
            {
                data.skillAutoAssignmentIds2 = SkillIdMap.ConvertKeysToIds(data.skillAutoAssignmentList2);
            }

            if (data.skillAutoAssignmentIds3.Count == 0 && data.skillAutoAssignmentList3.Count > 0)
            {
                data.skillAutoAssignmentIds3 = SkillIdMap.ConvertKeysToIds(data.skillAutoAssignmentList3);
            }

            if (data.skillAutoAssignmentIds4.Count == 0 && data.skillAutoAssignmentList4.Count > 0)
            {
                data.skillAutoAssignmentIds4 = SkillIdMap.ConvertKeysToIds(data.skillAutoAssignmentList4);
            }

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
                    ids = SkillAutoAssignOrderUtility.BuildDependencySafeOrder(ids);
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
            DysonVerseSaveData data = EnsureDysonVerseSaveShape();
            if (data == null) return;

            if (data.skillAutoAssignmentBits == null || data.skillAutoAssignmentBits.Length == 0)
            {
                if (data.skillAutoAssignmentIds == null || data.skillAutoAssignmentIds.Count == 0)
                {
                    if (data.skillAutoAssignmentList != null && data.skillAutoAssignmentList.Count > 0)
                        data.skillAutoAssignmentIds = SkillIdMap.ConvertKeysToIds(data.skillAutoAssignmentList);
                    else if (!string.IsNullOrEmpty(data.skillAutoAssignmentBitsBase64))
                    {
                        if (TryDecodeBase64Bytes(data.skillAutoAssignmentBitsBase64, "skillAutoAssignmentBitsBase64",
                                out byte[] decodedBits))
                        {
                            data.skillAutoAssignmentIds = SkillBitsetUtility.ConvertBitsetToIds(decodedBits);
                        }
                    }
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
            infinityData.researchProgressById ??= new Dictionary<string, double>();

            if (infinityData.researchLevelsById.Count == 0)
            {
                ResearchIdMap.PopulateLevelsFromLegacy(infinityData, infinityData.researchLevelsById);
                return;
            }

            ResearchIdMap.ApplyLevelsToLegacy(infinityData, infinityData.researchLevelsById);
            ResearchIdMap.PopulateLevelsFromLegacy(infinityData, infinityData.researchLevelsById);
        }

        private void EnsureMegaResearchPercentDefaults()
        {
            if (infinityData == null) return;

            if (infinityData.matrioshkaUpgradePercent <= 0d)
            {
                infinityData.matrioshkaUpgradePercent = DefaultMegaResearchPercent;
            }

            if (infinityData.birchUpgradePercent <= 0d)
            {
                infinityData.birchUpgradePercent = DefaultMegaResearchPercent;
            }

            if (infinityData.galacticUpgradePercent <= 0d)
            {
                infinityData.galacticUpgradePercent = DefaultMegaResearchPercent;
            }
        }

        private void MigrateResearchLevelsToIds()
        {
            if (infinityData == null) return;
            infinityData.researchLevelsById ??= new Dictionary<string, double>();
            infinityData.researchProgressById ??= new Dictionary<string, double>();
            if (infinityData.researchLevelsById.Count > 0) return;

            ResearchIdMap.PopulateLevelsFromLegacy(infinityData, infinityData.researchLevelsById);
        }

        private void SyncResearchLevelsFromLegacy()
        {
            if (infinityData == null) return;
            infinityData.researchLevelsById ??= new Dictionary<string, double>();
            infinityData.researchProgressById ??= new Dictionary<string, double>();
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
            DysonVerseSaveData data = EnsureDysonVerseSaveShape();
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

        private DysonVerseSaveData EnsureDysonVerseSaveShape()
        {
            SaveDataSettings root = EnsureSaveSettingsShape();
            if (root == null) return null;
            DysonVerseSaveData data = root.dysonVerseSaveData;

            data.dysonVerseInfinityData ??= new DysonVerseInfinityData();
            data.dysonVersePrestigeData ??= new DysonVersePrestigeData();
            data.dysonVerseSkillTreeData ??= new DysonVerseSkillTreeData();

            data.skillAutoAssignmentList ??= new List<int>();
            data.skillAutoAssignmentList1 ??= new List<int>();
            data.skillAutoAssignmentList2 ??= new List<int>();
            data.skillAutoAssignmentList3 ??= new List<int>();
            data.skillAutoAssignmentList4 ??= new List<int>();
            data.skillAutoAssignmentList5 ??= new List<int>();

            data.skillAutoAssignmentIds ??= new List<string>();
            data.skillAutoAssignmentIds1 ??= new List<string>();
            data.skillAutoAssignmentIds2 ??= new List<string>();
            data.skillAutoAssignmentIds3 ??= new List<string>();
            data.skillAutoAssignmentIds4 ??= new List<string>();
            data.skillAutoAssignmentIds5 ??= new List<string>();

            data.preset1Name ??= "Preset 1";
            data.preset2Name ??= "Preset 2";
            data.preset3Name ??= "Preset 3";
            data.preset4Name ??= "Preset 4";
            data.preset5Name ??= "Preset 5";
            data.selectedPreset = Mathf.Clamp(data.selectedPreset, 1, 5);

            return data;
        }

        private SaveDataSettings EnsureSaveSettingsShape()
        {
            if (saveSettings == null) return null;

            saveSettings.saveData ??= new SaveData();
            saveSettings.dysonVerseSaveData ??= new DysonVerseSaveData();
            saveSettings.sdPrestige ??= new SaveDataPrestige();
            saveSettings.sdSimulation ??= new SaveDataDream1();
            saveSettings.prestigePlus ??= new PrestigePlus();
            saveSettings.avocadoData ??= new AvocadoData();
            saveSettings.lastNumericRepairLog ??= new List<string>();

            return saveSettings;
        }

        private void MigrateSkillBitsets()
        {
            EnsureSkillOwnedBitset();
            EnsureSkillAutoAssignmentBitsets();
        }

        /// <summary>
        /// Normalizes preset auto-assignment queues into dependency-safe order.
        /// </summary>
        private void MigratePresetAutoAssignOrder()
        {
            DysonVerseSaveData data = EnsureDysonVerseSaveShape();
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
                ids = SkillAutoAssignOrderUtility.BuildDependencySafeOrder(ids);
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
            {
                if (TryDecodeBase64Bytes(base64, "presetAutoAssignmentBitsBase64", out byte[] decodedBits))
                {
                    return SkillBitsetUtility.ConvertBitsetToIds(decodedBits);
                }
            }

            return new List<string>();
        }

        private bool TryDecodeBase64Bytes(string base64, string label, out byte[] bytes)
        {
            bytes = null;
            if (string.IsNullOrEmpty(base64)) return false;

            try
            {
                bytes = Convert.FromBase64String(base64);
                return true;
            }
            catch (FormatException ex)
            {
                Debug.LogWarning(
                    $"[Migrations] Ignoring invalid base64 payload ({label}). " +
                    $"This save will continue with fallback defaults. Error: {ex.Message}");
                return false;
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
                avocado.infinityPoints =
                    NumericSafety.Add(avocado.infinityPoints, pp.avocatoIP).Value;
                avocado.influence =
                    NumericSafety.Add(avocado.influence, pp.avocatoInfluence).Value;
                avocado.strangeMatter =
                    NumericSafety.Add(avocado.strangeMatter, pp.avocatoStrangeMatter).Value;
                avocado.overflowMultiplier =
                    NumericSafety.Add(avocado.overflowMultiplier, pp.avocatoOverflow).Value;

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
