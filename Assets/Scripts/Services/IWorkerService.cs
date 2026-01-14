using System;

namespace IdleDysonSwarm.Services
{
    /// <summary>
    /// Service interface for the Worker/Influence system.
    /// Manages worker generation, influence gathering, and offline progress.
    /// </summary>
    /// <remarks>
    /// Workers accumulate over time (speed based on Quantum upgrades).
    /// When 128 workers are ready, they can be gathered to convert to Influence currency.
    /// Influence feeds into Dream1 economy and Avocado system.
    /// </remarks>
    public interface IWorkerService
    {
        #region State Properties

        /// <summary>
        /// Current number of workers ready to gather (0-128).
        /// </summary>
        long WorkersReady { get; }

        /// <summary>
        /// Current Influence currency balance.
        /// </summary>
        long InfluenceBalance { get; }

        /// <summary>
        /// Total worker batches processed (Universe Designation counter).
        /// </summary>
        long WorkerBatchesProcessed { get; }

        /// <summary>
        /// Whether auto-gather is enabled.
        /// When true, workers are automatically gathered when batch is full.
        /// </summary>
        bool AutoGatherEnabled { get; set; }

        #endregion

        #region Calculations

        /// <summary>
        /// Current worker generation speed (workers per second).
        /// Formula: BaseWorkerGenerationSpeed + (InfluenceSpeedLevel * InfluenceSpeedPerLevel)
        /// </summary>
        float WorkerGenerationSpeed { get; }

        /// <summary>
        /// Worker fill percentage (0-1).
        /// Used for UI fill bars.
        /// </summary>
        float WorkerFillPercent { get; }

        /// <summary>
        /// Whether a full batch of workers is ready to gather.
        /// </summary>
        bool CanGather { get; }

        /// <summary>
        /// Whether the Reality system is unlocked.
        /// Unlocked when player has Quantum Points or has 27 secrets.
        /// </summary>
        bool IsRealityUnlocked { get; }

        #endregion

        #region Actions

        /// <summary>
        /// Attempts to gather the current batch of workers into influence.
        /// Only succeeds if WorkersReady >= WorkerBatchSize.
        /// </summary>
        /// <returns>True if gather succeeded, false otherwise.</returns>
        bool TryGatherInfluence();

        /// <summary>
        /// Applies offline progress for accumulated time.
        /// </summary>
        /// <param name="seconds">Number of offline seconds to process.</param>
        void ApplyOfflineProgress(double seconds);

        /// <summary>
        /// Spends influence currency.
        /// </summary>
        /// <param name="amount">Amount to spend.</param>
        /// <returns>True if spend succeeded (had enough), false otherwise.</returns>
        bool TrySpendInfluence(long amount);

        /// <summary>
        /// Adds influence currency directly (used by systems like Dream1).
        /// </summary>
        /// <param name="amount">Amount to add.</param>
        void AddInfluence(long amount);

        #endregion

        #region Events

        /// <summary>
        /// Fired when influence is gathered from workers.
        /// Parameter is the amount gathered.
        /// </summary>
        event Action<long> OnInfluenceGathered;

        /// <summary>
        /// Fired when influence is spent.
        /// Parameter is the amount spent.
        /// </summary>
        event Action<long> OnInfluenceSpent;

        /// <summary>
        /// Fired when a worker batch is completed.
        /// </summary>
        event Action OnWorkerBatchCompleted;

        #endregion
    }
}
