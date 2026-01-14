using System;
using Expansion;
using static Expansion.Oracle;
using static IdleDysonSwarm.Systems.Constants.RealityConstants;
using static IdleDysonSwarm.Systems.Constants.QuantumConstants;

namespace IdleDysonSwarm.Services
{
    /// <summary>
    /// Default implementation of IWorkerService that wraps Oracle static access.
    /// Manages worker generation, influence gathering, and offline progress.
    /// </summary>
    public sealed class WorkerService : IWorkerService
    {
        private SaveData SaveData => StaticSaveSettings.saveData;
        private PrestigePlus PrestigePlus => StaticSaveSettings.prestigePlus;
        private DysonVersePrestigeData PrestigeData => StaticPrestigeData;

        #region State Properties

        public long WorkersReady => SaveData.workersReadyToGo;
        public long InfluenceBalance => SaveData.influence;
        public long WorkerBatchesProcessed => SaveData.universesConsumed;

        public bool AutoGatherEnabled
        {
            get => SaveData.workerAutoConvert;
            set => SaveData.workerAutoConvert = value;
        }

        #endregion

        #region Calculations

        public float WorkerGenerationSpeed =>
            BaseWorkerGenerationSpeed + PrestigePlus.influence;

        public float WorkerFillPercent => (float)WorkersReady / WorkerBatchSize;

        public bool CanGather => WorkersReady >= WorkerBatchSize;

        public bool IsRealityUnlocked =>
            PrestigePlus.points >= 1 ||
            PrestigeData.secretsOfTheUniverse >= MaxSecrets;

        #endregion

        #region Actions

        public bool TryGatherInfluence()
        {
            if (!CanGather)
                return false;

            SaveData.influence += WorkerBatchSize;
            SaveData.workersReadyToGo = 0;

            OnInfluenceGathered?.Invoke(WorkerBatchSize);

            return true;
        }

        public void ApplyOfflineProgress(double seconds)
        {
            int amountWhileAway = (int)Math.Round(seconds * WorkerGenerationSpeed);

            if (AutoGatherEnabled)
            {
                // Auto-convert: add directly to influence
                SaveData.influence += amountWhileAway;
                SaveData.universesConsumed += amountWhileAway;
            }
            else
            {
                // Manual mode: accumulate workers up to batch size
                long total = SaveData.workersReadyToGo + amountWhileAway;
                if (total >= WorkerBatchSize)
                {
                    // Calculate overflow before clamping (fixes minor bug in original)
                    long overflow = SaveData.workersReadyToGo;
                    SaveData.workersReadyToGo = WorkerBatchSize;
                    SaveData.universesConsumed += WorkerBatchSize - overflow;
                }
                else
                {
                    SaveData.workersReadyToGo += amountWhileAway;
                    SaveData.universesConsumed += amountWhileAway;
                }
            }
        }

        public bool TrySpendInfluence(long amount)
        {
            if (amount <= 0)
                return false;

            if (SaveData.influence < amount)
                return false;

            SaveData.influence -= amount;
            OnInfluenceSpent?.Invoke(amount);

            return true;
        }

        public void AddInfluence(long amount)
        {
            if (amount > 0)
            {
                SaveData.influence += amount;
            }
        }

        #endregion

        #region Events

        public event Action<long> OnInfluenceGathered;
        public event Action<long> OnInfluenceSpent;
        public event Action OnWorkerBatchCompleted;

        /// <summary>
        /// Called externally when a worker batch is completed (e.g., by InceptionController).
        /// </summary>
        internal void NotifyWorkerBatchCompleted()
        {
            OnWorkerBatchCompleted?.Invoke();
        }

        #endregion
    }
}
