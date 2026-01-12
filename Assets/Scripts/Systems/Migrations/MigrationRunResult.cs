using System.Collections.Generic;
using System.Text;

namespace Systems.Migrations
{
    public sealed class MigrationRunResult
    {
        public bool DryRun { get; set; }
        public bool Succeeded { get; set; }
        public int StartingVersion { get; set; }
        public int EndingVersion { get; set; }
        public MigrationSnapshot InitialSnapshot { get; set; }
        public MigrationSnapshot FinalSnapshot { get; set; }
        public List<MigrationStepResult> Steps { get; } = new List<MigrationStepResult>();

        public string ToReportString()
        {
            var builder = new StringBuilder();
            builder.AppendLine(DryRun ? "Save migration dry-run report" : "Save migration report");
            builder.AppendLine($"Version: {StartingVersion} -> {EndingVersion}");

            if (Steps.Count == 0)
            {
                builder.AppendLine("No migration steps required.");
                return builder.ToString();
            }

            for (int i = 0; i < Steps.Count; i++)
            {
                MigrationStepResult stepResult = Steps[i];
                string stepLabel = stepResult.Step != null
                    ? $"{stepResult.Step.Name} (v{stepResult.Step.TargetVersion})"
                    : $"Step {i + 1}";

                builder.AppendLine(stepLabel);

                if (!string.IsNullOrEmpty(stepResult.Step?.Summary))
                {
                    builder.AppendLine($"  {stepResult.Step.Summary}");
                }

                if (!string.IsNullOrEmpty(stepResult.ValidationMessage))
                {
                    builder.AppendLine($"  VALIDATION: {stepResult.ValidationMessage}");
                }

                if (!string.IsNullOrEmpty(stepResult.Error))
                {
                    builder.AppendLine($"  ERROR: {stepResult.Error}");
                    continue;
                }

                if (stepResult.Before != null && stepResult.After != null)
                {
                    bool hasDiffs = false;
                    foreach (string diff in stepResult.After.DescribeDifferences(stepResult.Before))
                    {
                        builder.AppendLine($"  {diff}");
                        hasDiffs = true;
                    }

                    if (!hasDiffs)
                    {
                        builder.AppendLine("  No changes detected.");
                    }
                }
            }

            return builder.ToString();
        }
    }
}
