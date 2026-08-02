using System;
using IdleDysonSwarm.Services;
using Systems.Simulation;

namespace Tests.Services
{
    /// <summary>
    /// Mock implementation of IWorkerService for unit testing.
    /// Provides controllable, in-memory worker state without Oracle dependency.
    /// </summary>
    public class MockWorkerService : IWorkerService
    {
        private long _workersReady;
        private long _influenceBalance;
        private long _workerBatchesProcessed;
        private bool _autoGatherEnabled;
        private float _workerGenerationSpeed = 1f;
        private const long MockWorkerBatchSize = 128;

        #region State Properties

        public long WorkersReady => _workersReady;
        public long InfluenceBalance => _influenceBalance;
        public long WorkerBatchesProcessed => _workerBatchesProcessed;

        public bool AutoGatherEnabled
        {
            get => _autoGatherEnabled;
            set => _autoGatherEnabled = value;
        }

        #endregion

        #region Calculations

        public float WorkerGenerationSpeed => _workerGenerationSpeed;
        public float WorkerFillPercent => (float)_workersReady / MockWorkerBatchSize;
        public bool CanGather => _workersReady >= MockWorkerBatchSize;
        public bool IsRealityUnlocked { get; set; } = true;

        #endregion

        #region Actions

        public bool TryGatherInfluence()
        {
            if (!CanGather)
                return false;

            _influenceBalance += MockWorkerBatchSize;
            _workersReady = 0;

            OnInfluenceGathered?.Invoke(MockWorkerBatchSize);
            OnWorkerBatchCompleted?.Invoke();

            return true;
        }

        public void ApplyOfflineProgress(double seconds)
        {
            int amountWhileAway = (int)Math.Round(seconds * _workerGenerationSpeed);

            if (_autoGatherEnabled)
            {
                _influenceBalance += amountWhileAway;
                _workerBatchesProcessed += amountWhileAway;
            }
            else
            {
                long total = _workersReady + amountWhileAway;
                if (total >= MockWorkerBatchSize)
                {
                    long overflow = _workersReady;
                    _workersReady = MockWorkerBatchSize;
                    _workerBatchesProcessed += MockWorkerBatchSize - overflow;
                }
                else
                {
                    _workersReady += amountWhileAway;
                    _workerBatchesProcessed += amountWhileAway;
                }
            }
        }

        public RealityAdvanceResult AdvanceSimulation(double seconds)
        {
            ApplyOfflineProgress(seconds);
            return new RealityAdvanceResult(
                0d,
                _workersReady,
                _influenceBalance,
                0L,
                0L,
                0d);
        }

        public bool TrySpendInfluence(long amount)
        {
            if (amount <= 0 || _influenceBalance < amount)
                return false;

            _influenceBalance -= amount;
            OnInfluenceSpent?.Invoke(amount);

            return true;
        }

        public void AddInfluence(long amount)
        {
            if (amount > 0)
            {
                _influenceBalance += amount;
            }
        }

        public void IncrementWorker()
        {
            AddGeneratedWorkers(1L);
        }

        public void AddGeneratedWorkers(long amount)
        {
            if (amount <= 0L) return;
            _workerBatchesProcessed = SaturatingAdd(_workerBatchesProcessed, amount);
            if (_autoGatherEnabled)
            {
                _influenceBalance = SaturatingAdd(_influenceBalance, amount);
                _workersReady = 0L;
                return;
            }

            _workersReady = Math.Min(MockWorkerBatchSize, SaturatingAdd(_workersReady, amount));
        }

        public void ClampWorkersNonNegative()
        {
            if (_workersReady < 0)
            {
                _workersReady = 0;
            }
        }

        #endregion

        #region Events

        public event Action<long> OnInfluenceGathered;
        public event Action<long> OnInfluenceSpent;
        public event Action OnWorkerBatchCompleted;

        #endregion

        #region Test Helpers

        /// <summary>
        /// Sets the number of workers ready for testing.
        /// </summary>
        public void SetWorkersReady(long count) => _workersReady = count;

        /// <summary>
        /// Sets the influence balance for testing.
        /// </summary>
        public void SetInfluenceBalance(long balance) => _influenceBalance = balance;

        /// <summary>
        /// Sets the worker generation speed for testing.
        /// </summary>
        public void SetWorkerGenerationSpeed(float speed) => _workerGenerationSpeed = speed;

        /// <summary>
        /// Sets the worker batches processed for testing.
        /// </summary>
        public void SetWorkerBatchesProcessed(long count) => _workerBatchesProcessed = count;

        private static long SaturatingAdd(long left, long right)
        {
            return right > 0L && left > long.MaxValue - right ? long.MaxValue : left + right;
        }

        #endregion
    }
}
