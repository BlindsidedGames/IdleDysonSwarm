using System;

namespace Systems.Migrations
{
    public sealed class MigrationRunOptions
    {
        public bool DryRun { get; set; }
        public bool CaptureSnapshots { get; set; } = true;
        public bool IncludeEnsureStep { get; set; } = true;
        public bool ThrowOnError { get; set; } = true;
        public bool UpdateLastSuccessfulLoadUtc { get; set; } = true;
        public Action<MigrationContext> EnsureAction { get; set; }
        public string EnsureName { get; set; } = "Ensure data";
        public string EnsureSummary { get; set; } = "Populate derived fields from legacy data.";
    }
}
