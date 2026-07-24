/*
 * Purpose: Executes an ordered migration registry against Oracle save data with optional snapshots and ensure steps.
 * Runs: Runtime load migration and Unity Editor migration/compatibility tests.
 * Primary entry point: MigrationRunner.Run.
 * Owns: Version ordering, future-version rejection, step execution, snapshot capture, and dry-run restoration.
 * Delegates: Version transforms to MigrationStep actions and shape normalization to the caller-provided ensure action.
 *
 * Interacts with:
 * - Assets/Scripts/Expansion/Oracle.Migrations.cs.
 * - Systems.Migrations.MigrationRegistry, MigrationRunOptions, MigrationRunResult, and MigrationSnapshot.
 * - Assets/Editor/Tests/Save/SaveMigrationFixtureCharacterizationTests.cs.
 *
 * Change notes:
 * - Future schemas must stop before context creation, step execution, or ensure/normalization actions.
 * - Migration ordering and version advancement are save-compatibility contracts coordinated with Oracle.CurrentSaveVersion.
 * - Dry runs temporarily replace Oracle.saveSettings and must always restore the original reference.
 */

using System;
using System.Globalization;
using Expansion;
using Sirenix.Serialization;

namespace Systems.Migrations
{
    /// <summary>
    /// Executes versioned save migrations and rejects unsupported future schemas before normalization.
    /// </summary>
    public static class MigrationRunner
    {
        /// <summary>
        /// Runs the supplied migration registry against the Oracle save selected by the caller.
        /// </summary>
        /// <param name="oracle">The Oracle instance owning the selected save reference.</param>
        /// <param name="registry">The ordered migration registry.</param>
        /// <param name="options">Execution, snapshot, and ensure-step options.</param>
        /// <returns>The non-throwing run result unless <see cref="MigrationRunOptions.ThrowOnError"/> requests exceptions.</returns>
        public static MigrationRunResult Run(Oracle oracle, MigrationRegistry registry, MigrationRunOptions options)
        {
            if (oracle == null) throw new ArgumentNullException(nameof(oracle));
            if (registry == null) throw new ArgumentNullException(nameof(registry));
            options ??= new MigrationRunOptions();

            Oracle.SaveDataSettings originalSave = oracle.saveSettings;
            var result = new MigrationRunResult
            {
                DryRun = options.DryRun,
                Succeeded = true,
                StartingVersion = originalSave?.saveVersion ?? 0,
                EndingVersion = originalSave?.saveVersion ?? 0
            };

            if (originalSave == null)
            {
                result.Succeeded = false;
                return result;
            }

            if (originalSave.saveVersion > registry.LatestVersion)
            {
                result.Succeeded = false;
                if (options.ThrowOnError)
                {
                    throw new InvalidOperationException(
                        $"Save schema {originalSave.saveVersion} is newer than supported schema {registry.LatestVersion}.");
                }

                return result;
            }

            Oracle.SaveDataSettings workingSave = options.DryRun
                ? (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(originalSave)
                : originalSave;

            try
            {
                if (options.DryRun)
                {
                    oracle.saveSettings = workingSave;
                }

                if (workingSave.saveVersion < 0)
                {
                    workingSave.saveVersion = 0;
                }

                var context = new MigrationContext(oracle, workingSave, options.DryRun);

                if (options.CaptureSnapshots)
                {
                    result.InitialSnapshot = MigrationSnapshot.Capture(workingSave);
                }

                for (int i = 0; i < registry.Steps.Count; i++)
                {
                    MigrationStep step = registry.Steps[i];
                    if (workingSave.saveVersion >= step.TargetVersion)
                    {
                        continue;
                    }

                    var stepResult = new MigrationStepResult { Step = step };
                    if (options.CaptureSnapshots)
                    {
                        stepResult.Before = MigrationSnapshot.Capture(workingSave);
                    }

                    if (step.Validate != null)
                    {
                        stepResult.ValidationMessage = step.Validate(context);
                        if (!string.IsNullOrEmpty(stepResult.ValidationMessage))
                        {
                            stepResult.Error = stepResult.ValidationMessage;
                            result.Succeeded = false;
                            result.Steps.Add(stepResult);
                            if (options.ThrowOnError)
                            {
                                throw new InvalidOperationException(stepResult.ValidationMessage);
                            }

                            break;
                        }
                    }

                    try
                    {
                        if (step.AdvancesVersion)
                        {
                            workingSave.lastMigratedFromVersion = workingSave.saveVersion;
                        }

                        step.Apply(context);

                        if (step.AdvancesVersion)
                        {
                            workingSave.saveVersion = step.TargetVersion;
                        }

                        stepResult.Applied = true;
                    }
                    catch (Exception ex)
                    {
                        stepResult.Error = ex.Message;
                        result.Succeeded = false;
                        result.Steps.Add(stepResult);
                        if (options.ThrowOnError)
                        {
                            throw;
                        }

                        break;
                    }

                    if (options.CaptureSnapshots)
                    {
                        stepResult.After = MigrationSnapshot.Capture(workingSave);
                    }

                    result.Steps.Add(stepResult);
                }

                if (options.IncludeEnsureStep && options.EnsureAction != null)
                {
                    var ensureStep = new MigrationStep(
                        targetVersion: workingSave.saveVersion,
                        name: options.EnsureName,
                        summary: options.EnsureSummary,
                        apply: context => options.EnsureAction(context),
                        advancesVersion: false);

                    var ensureResult = new MigrationStepResult { Step = ensureStep };
                    if (options.CaptureSnapshots)
                    {
                        ensureResult.Before = MigrationSnapshot.Capture(workingSave);
                    }

                    try
                    {
                        ensureStep.Apply(context);
                        ensureResult.Applied = true;
                    }
                    catch (Exception ex)
                    {
                        ensureResult.Error = ex.Message;
                        result.Succeeded = false;
                        if (options.ThrowOnError)
                        {
                            throw;
                        }
                    }

                    if (options.CaptureSnapshots)
                    {
                        ensureResult.After = MigrationSnapshot.Capture(workingSave);
                    }

                    result.Steps.Add(ensureResult);
                }

                if (!options.DryRun && options.UpdateLastSuccessfulLoadUtc && result.Succeeded)
                {
                    workingSave.lastSuccessfulLoadUtc = DateTime.UtcNow.ToString(CultureInfo.InvariantCulture);
                }

                result.EndingVersion = workingSave.saveVersion;

                if (options.CaptureSnapshots)
                {
                    result.FinalSnapshot = MigrationSnapshot.Capture(workingSave);
                }
            }
            finally
            {
                if (options.DryRun)
                {
                    oracle.saveSettings = originalSave;
                }
            }

            return result;
        }
    }
}
