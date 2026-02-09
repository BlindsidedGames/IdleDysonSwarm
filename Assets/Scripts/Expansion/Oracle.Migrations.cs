using System;
using SirenixSerializationUtility = Sirenix.Serialization.SerializationUtility;
using Systems.Migrations;
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
    }
}

