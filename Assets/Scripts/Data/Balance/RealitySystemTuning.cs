using System;
using System.Collections.Generic;
using UnityEngine;

/*
 * RealitySystemTuning
 * Purpose: Central tuning values for worker/influence and artifact translation-speed behavior.
 * Runs: Runtime + Editor.
 * Primary entry points: Serialized fields read by BalanceRuntime/WorkerService/ArtifactController.
 * Owns vs delegates: Owns scalar thresholds and artifact tables; delegates state checks to upgrade state adapters.
 *
 * Interacts with:
 * - Assets/Scripts/Services/WorkerService.cs
 * - Assets/Scripts/Services/AvocadoService.cs
 * - Assets/Scripts/Expansion/ArtifactController.cs
 * - Assets/Editor/Balance/BalanceTuningWindow.cs
 *
 * Change notes:
 * - Worker and avocado threshold changes affect core progression speed and global multipliers.
 * - Artifact rule ordering is significant; first matching rule for a character is used by default helpers.
 */
namespace IdleDysonSwarm.Data.Balance
{
    /// <summary>
    /// Maps an upgrade key to artifact update interval in frames-per-second style pacing.
    /// </summary>
    [Serializable]
    public sealed class ArtifactSpeedRule
    {
        /// <summary>
        /// Upgrade key that enables this speed tier.
        /// </summary>
        public string upgradeKey;

        /// <summary>
        /// Tick interval value used by artifact display animation.
        /// </summary>
        public int tickInterval = 60;
    }

    /// <summary>
    /// Maps a locked character replacement rule to an upgrade key.
    /// </summary>
    [Serializable]
    public sealed class ArtifactTranslationRule
    {
        /// <summary>
        /// Upgrade key required to reveal the target character.
        /// </summary>
        public string upgradeKey;

        /// <summary>
        /// Character sequence to replace while locked.
        /// </summary>
        public string source;

        /// <summary>
        /// Replacement sequence while locked.
        /// </summary>
        public string replacement;
    }

    /// <summary>
    /// Reality/system-level balancing asset.
    /// </summary>
    [CreateAssetMenu(fileName = "RealitySystemTuning", menuName = "Idle Dyson/Balance/Reality System Tuning")]
    public sealed class RealitySystemTuning : ScriptableObject
    {
        /// <summary>
        /// Workers required before gather/convert becomes available.
        /// </summary>
        [Min(1)]
        public int workerBatchSize = 128;

        /// <summary>
        /// Base workers generated per second before upgrades.
        /// </summary>
        [Min(0)]
        public int baseWorkerGenerationSpeed = 4;

        /// <summary>
        /// Minimum value before log10 contributions apply in avocado multipliers.
        /// </summary>
        [Min(1)]
        public int avocadoLogThreshold = 10;

        /// <summary>
        /// Ordered speed rules from early to late upgrade tiers.
        /// </summary>
        public List<ArtifactSpeedRule> artifactSpeedRules = new List<ArtifactSpeedRule>();

        /// <summary>
        /// Character substitution rules for artifact translation progress.
        /// </summary>
        public List<ArtifactTranslationRule> artifactTranslationRules = new List<ArtifactTranslationRule>();
    }
}
