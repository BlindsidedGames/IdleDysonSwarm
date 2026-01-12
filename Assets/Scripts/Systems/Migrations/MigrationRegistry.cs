using System;
using System.Collections.Generic;

namespace Systems.Migrations
{
    public sealed class MigrationRegistry
    {
        private readonly List<MigrationStep> _steps = new List<MigrationStep>();

        public IReadOnlyList<MigrationStep> Steps => _steps;

        public int LatestVersion => _steps.Count == 0 ? 0 : _steps[_steps.Count - 1].TargetVersion;

        public MigrationRegistry AddStep(MigrationStep step)
        {
            if (step == null) throw new ArgumentNullException(nameof(step));

            if (_steps.Count > 0)
            {
                int lastVersion = _steps[_steps.Count - 1].TargetVersion;
                if (step.AdvancesVersion && step.TargetVersion <= lastVersion)
                {
                    throw new InvalidOperationException(
                        $"Migration step version {step.TargetVersion} must be greater than {lastVersion}.");
                }
            }

            _steps.Add(step);
            return this;
        }
    }
}
