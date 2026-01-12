using System;

namespace Systems.Migrations
{
    public sealed class MigrationStep
    {
        public MigrationStep(int targetVersion, string name, string summary, Action<MigrationContext> apply,
            Func<MigrationContext, string> validate = null, bool advancesVersion = true)
        {
            if (string.IsNullOrWhiteSpace(name))
            {
                throw new ArgumentException("Migration step name is required.", nameof(name));
            }

            TargetVersion = targetVersion;
            Name = name;
            Summary = summary ?? string.Empty;
            Apply = apply ?? throw new ArgumentNullException(nameof(apply));
            Validate = validate;
            AdvancesVersion = advancesVersion;
        }

        public int TargetVersion { get; }
        public string Name { get; }
        public string Summary { get; }
        public Action<MigrationContext> Apply { get; }
        public Func<MigrationContext, string> Validate { get; }
        public bool AdvancesVersion { get; }
    }
}
