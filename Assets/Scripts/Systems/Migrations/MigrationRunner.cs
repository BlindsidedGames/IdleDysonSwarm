using System;
using System.Globalization;
using Expansion;
using Sirenix.Serialization;

namespace Systems.Migrations
{
    public static class MigrationRunner
    {
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
