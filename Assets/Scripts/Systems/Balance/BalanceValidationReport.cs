using System;
using System.Collections.Generic;
using System.Text;

/*
 * BalanceValidationReport
 * Purpose: Shared validation DTO used by editor tooling and edit-mode tests.
 * Runs: Runtime + Editor.
 * Primary entry points: AddError(), AddWarning(), BuildSummary().
 * Owns vs delegates: Owns structured issue collection; delegates actual validation rules to BalanceDataValidator.
 *
 * Interacts with:
 * - Assets/Scripts/Systems/Balance/BalanceDataValidator.cs
 * - Assets/Editor/Balance/BalanceTuningWindow.cs
 * - Assets/Editor/Tests/Balance/*.cs
 *
 * Change notes:
 * - Issue codes are intended to be stable for automation and test assertions.
 */
namespace IdleDysonSwarm.Systems.Balance
{
    /// <summary>
    /// Validation issue severity.
    /// </summary>
    public enum BalanceValidationSeverity
    {
        /// <summary>
        /// Informational issue.
        /// </summary>
        Info,

        /// <summary>
        /// Non-blocking issue.
        /// </summary>
        Warning,

        /// <summary>
        /// Blocking issue.
        /// </summary>
        Error
    }

    /// <summary>
    /// One validation issue record.
    /// </summary>
    public sealed class BalanceValidationIssue
    {
        /// <summary>
        /// Machine-friendly issue code.
        /// </summary>
        public string code;

        /// <summary>
        /// Human-readable issue text.
        /// </summary>
        public string message;

        /// <summary>
        /// Optional context (key/path/id).
        /// </summary>
        public string context;

        /// <summary>
        /// Issue severity.
        /// </summary>
        public BalanceValidationSeverity severity = BalanceValidationSeverity.Info;
    }

    /// <summary>
    /// Aggregated validation report for balance assets.
    /// </summary>
    public sealed class BalanceValidationReport
    {
        /// <summary>
        /// Report title.
        /// </summary>
        public string title = "Balance Validation";

        /// <summary>
        /// Generation timestamp.
        /// </summary>
        public DateTime generatedUtc = DateTime.UtcNow;

        /// <summary>
        /// Collected issues.
        /// </summary>
        public List<BalanceValidationIssue> issues = new List<BalanceValidationIssue>();

        /// <summary>
        /// Whether report contains errors.
        /// </summary>
        public bool HasErrors => Count(BalanceValidationSeverity.Error) > 0;

        /// <summary>
        /// Adds an error issue.
        /// </summary>
        /// <param name="code">Issue code.</param>
        /// <param name="message">Issue message.</param>
        /// <param name="context">Issue context.</param>
        public void AddError(string code, string message, string context = null)
        {
            AddIssue(BalanceValidationSeverity.Error, code, message, context);
        }

        /// <summary>
        /// Adds a warning issue.
        /// </summary>
        /// <param name="code">Issue code.</param>
        /// <param name="message">Issue message.</param>
        /// <param name="context">Issue context.</param>
        public void AddWarning(string code, string message, string context = null)
        {
            AddIssue(BalanceValidationSeverity.Warning, code, message, context);
        }

        /// <summary>
        /// Adds an info issue.
        /// </summary>
        /// <param name="code">Issue code.</param>
        /// <param name="message">Issue message.</param>
        /// <param name="context">Issue context.</param>
        public void AddInfo(string code, string message, string context = null)
        {
            AddIssue(BalanceValidationSeverity.Info, code, message, context);
        }

        /// <summary>
        /// Builds a simple text summary.
        /// </summary>
        /// <returns>Multi-line summary text.</returns>
        public string BuildSummary()
        {
            var builder = new StringBuilder();
            builder.AppendLine($"{title} ({generatedUtc:O})");
            builder.AppendLine($"Errors: {Count(BalanceValidationSeverity.Error)}");
            builder.AppendLine($"Warnings: {Count(BalanceValidationSeverity.Warning)}");
            builder.AppendLine($"Info: {Count(BalanceValidationSeverity.Info)}");

            for (int i = 0; i < issues.Count; i++)
            {
                BalanceValidationIssue issue = issues[i];
                if (issue == null)
                {
                    continue;
                }

                builder.Append('[')
                    .Append(issue.severity)
                    .Append("] ")
                    .Append(issue.code);

                if (!string.IsNullOrWhiteSpace(issue.context))
                {
                    builder.Append(" (").Append(issue.context).Append(')');
                }

                builder.Append(": ").Append(issue.message).AppendLine();
            }

            return builder.ToString();
        }

        private void AddIssue(BalanceValidationSeverity severity, string code, string message, string context)
        {
            issues.Add(new BalanceValidationIssue
            {
                severity = severity,
                code = string.IsNullOrWhiteSpace(code) ? "unspecified" : code,
                message = string.IsNullOrWhiteSpace(message) ? "No details provided." : message,
                context = context
            });
        }

        private int Count(BalanceValidationSeverity severity)
        {
            int count = 0;
            for (int i = 0; i < issues.Count; i++)
            {
                if (issues[i] != null && issues[i].severity == severity)
                {
                    count++;
                }
            }

            return count;
        }
    }
}
