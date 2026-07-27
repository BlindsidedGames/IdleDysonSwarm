using System;
using Expansion;
using IdleDysonSwarm.Systems.Balance;
using Systems.Numeric;
using Systems.Simulation;
using static Expansion.Oracle;
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
            (float)Math.Min(
                float.MaxValue,
                (double)BalanceRuntime.BaseWorkerGenerationSpeed + PrestigePlus.influence);

        public float WorkerFillPercent => (float)WorkersReady / BalanceRuntime.WorkerBatchSize;

        public bool CanGather => WorkersReady >= BalanceRuntime.WorkerBatchSize;

        public bool IsRealityUnlocked =>
            PrestigePlus.points >= 1 ||
            PrestigeData.secretsOfTheUniverse >= MaxSecrets;

        #endregion

        #region Actions

        public bool TryGatherInfluence()
        {
            if (!CanGather)
                return false;

            int batchSize = BalanceRuntime.WorkerBatchSize;
            SaveData.influence = NumericSafety.Add(SaveData.influence, batchSize).Value;
            SaveData.workersReadyToGo = 0;
            StaticSaveSettings.simulationStatistics?.RecordSegment(
                0d,
                new SimulationPresentationSummary
                {
                    ManualInfluence = batchSize
                });

            OnInfluenceGathered?.Invoke(batchSize);

            return true;
        }

        public void ApplyOfflineProgress(double seconds)
        {
            AdvanceSimulation(seconds);
        }

        public RealityAdvanceResult AdvanceSimulation(double seconds)
        {
            RealityAdvanceResult result = RealitySimulation.Advance(
                SaveData.workerGenerationProgress,
                SaveData.workersReadyToGo,
                SaveData.influence,
                AutoGatherEnabled,
                WorkerGenerationSpeed,
                seconds,
                BalanceRuntime.WorkerBatchSize);
            SaveData.workerGenerationProgress = result.FractionalProgress;
            SaveData.workersReadyToGo = result.WorkersReady;
            SaveData.influence = result.Influence;
            SaveData.universesConsumed = NumericSafety.Add(
                SaveData.universesConsumed,
                result.WorkersGenerated).Value;
            if (result.AutomaticInfluence > 0L)
                OnInfluenceGathered?.Invoke(result.AutomaticInfluence);
            return result;
        }

        public bool TrySpendInfluence(long amount)
        {
            DiscreteDebitResult debit = EconomyTransaction.TryDebit(SaveData.influence, amount);
            if (!debit.Succeeded) return false;
            SaveData.influence = debit.Balance;
            OnInfluenceSpent?.Invoke(amount);

            return true;
        }

        public void AddInfluence(long amount)
        {
            if (amount > 0)
            {
                SaveData.influence = NumericSafety.Add(SaveData.influence, amount).Value;
            }
        }

        public void IncrementWorker()
        {
            AddGeneratedWorkers(1L);
        }

        public void AddGeneratedWorkers(long amount)
        {
            if (amount <= 0L) return;

            SaveData.universesConsumed = NumericSafety.Add(SaveData.universesConsumed, amount).Value;
            if (AutoGatherEnabled)
            {
                SaveData.influence = NumericSafety.Add(SaveData.influence, amount).Value;
                SaveData.workersReadyToGo = 0L;
                OnInfluenceGathered?.Invoke(amount);
                return;
            }

            long total = NumericSafety.Add(SaveData.workersReadyToGo, amount).Value;
            SaveData.workersReadyToGo = Math.Min(total, BalanceRuntime.WorkerBatchSize);
        }

        public void ClampWorkersNonNegative()
        {
            if (SaveData.workersReadyToGo < 0)
            {
                SaveData.workersReadyToGo = 0;
            }
        }

        #endregion

        #region Events

        public event Action<long> OnInfluenceGathered;
        public event Action<long> OnInfluenceSpent;
        public event Action OnWorkerBatchCompleted;

        /// <summary>
        /// Called externally when a worker batch is completed (e.g., by WorkerController).
        /// </summary>
        internal void NotifyWorkerBatchCompleted()
        {
            OnWorkerBatchCompleted?.Invoke();
        }

        #endregion
    }
}
