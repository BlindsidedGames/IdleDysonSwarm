using NUnit.Framework;

namespace Tests.Services
{
    /// <summary>
    /// Unit tests for worker-related functionality using MockWorkerService.
    /// Tests offline progress, influence gathering, and worker generation.
    /// </summary>
    [TestFixture]
    public class WorkerServiceTests
    {
        private MockWorkerService _workerService;
        private const long WorkerBatchSize = 128;

        [SetUp]
        public void Setup()
        {
            _workerService = new MockWorkerService();
        }

        #region TryGatherInfluence Tests

        [Test]
        public void TryGatherInfluence_WithFullBatch_Succeeds()
        {
            // Arrange
            _workerService.SetWorkersReady(WorkerBatchSize);

            // Act
            bool result = _workerService.TryGatherInfluence();

            // Assert
            Assert.IsTrue(result, "Should succeed when batch is full");
            Assert.AreEqual(0, _workerService.WorkersReady, "Workers should be reset to 0");
            Assert.AreEqual(WorkerBatchSize, _workerService.InfluenceBalance, "Influence should increase by batch size");
        }

        [Test]
        public void TryGatherInfluence_WithPartialBatch_Fails()
        {
            // Arrange
            _workerService.SetWorkersReady(WorkerBatchSize - 1);
            long initialInfluence = _workerService.InfluenceBalance;

            // Act
            bool result = _workerService.TryGatherInfluence();

            // Assert
            Assert.IsFalse(result, "Should fail when batch is not full");
            Assert.AreEqual(WorkerBatchSize - 1, _workerService.WorkersReady, "Workers should not change");
            Assert.AreEqual(initialInfluence, _workerService.InfluenceBalance, "Influence should not change");
        }

        [Test]
        public void TryGatherInfluence_WithZeroWorkers_Fails()
        {
            // Arrange - Default is 0 workers

            // Act
            bool result = _workerService.TryGatherInfluence();

            // Assert
            Assert.IsFalse(result, "Should fail with zero workers");
        }

        [Test]
        public void TryGatherInfluence_FiresEvent()
        {
            // Arrange
            _workerService.SetWorkersReady(WorkerBatchSize);
            long gatheredAmount = 0;
            _workerService.OnInfluenceGathered += amount => gatheredAmount = amount;

            // Act
            _workerService.TryGatherInfluence();

            // Assert
            Assert.AreEqual(WorkerBatchSize, gatheredAmount, "Event should fire with batch size");
        }

        #endregion

        #region ApplyOfflineProgress Tests

        [Test]
        public void ApplyOfflineProgress_WithAutoGather_AddsToInfluence()
        {
            // Arrange
            _workerService.AutoGatherEnabled = true;
            _workerService.SetWorkerGenerationSpeed(10f); // 10 workers per second

            // Act
            _workerService.ApplyOfflineProgress(100); // 100 seconds = 1000 workers

            // Assert
            Assert.AreEqual(1000, _workerService.InfluenceBalance, "Influence should be 1000");
            Assert.AreEqual(0, _workerService.WorkersReady, "Workers should remain 0 with auto-gather");
        }

        [Test]
        public void ApplyOfflineProgress_WithManualGather_AccumulatesWorkers()
        {
            // Arrange
            _workerService.AutoGatherEnabled = false;
            _workerService.SetWorkerGenerationSpeed(1f); // 1 worker per second

            // Act
            _workerService.ApplyOfflineProgress(50); // 50 seconds = 50 workers

            // Assert
            Assert.AreEqual(50, _workerService.WorkersReady, "Workers should be 50");
            Assert.AreEqual(0, _workerService.InfluenceBalance, "Influence should remain 0");
        }

        [Test]
        public void ApplyOfflineProgress_WithManualGather_CapsAtBatchSize()
        {
            // Arrange
            _workerService.AutoGatherEnabled = false;
            _workerService.SetWorkerGenerationSpeed(10f); // 10 workers per second

            // Act
            _workerService.ApplyOfflineProgress(100); // 100 seconds = 1000 workers, but caps at 128

            // Assert
            Assert.AreEqual(WorkerBatchSize, _workerService.WorkersReady, "Workers should cap at batch size");
        }

        [Test]
        public void ApplyOfflineProgress_WithPartialWorkers_AccumulatesCorrectly()
        {
            // Arrange
            _workerService.AutoGatherEnabled = false;
            _workerService.SetWorkersReady(100); // Start with 100 workers
            _workerService.SetWorkerGenerationSpeed(1f);

            // Act
            _workerService.ApplyOfflineProgress(20); // 20 more workers = 120 total (under cap)

            // Assert
            Assert.AreEqual(120, _workerService.WorkersReady, "Workers should be 120");
        }

        #endregion

        #region TrySpendInfluence Tests

        [Test]
        public void TrySpendInfluence_WithSufficientBalance_Succeeds()
        {
            // Arrange
            _workerService.SetInfluenceBalance(1000);

            // Act
            bool result = _workerService.TrySpendInfluence(500);

            // Assert
            Assert.IsTrue(result, "Should succeed with sufficient balance");
            Assert.AreEqual(500, _workerService.InfluenceBalance, "Balance should be reduced");
        }

        [Test]
        public void TrySpendInfluence_WithInsufficientBalance_Fails()
        {
            // Arrange
            _workerService.SetInfluenceBalance(100);

            // Act
            bool result = _workerService.TrySpendInfluence(500);

            // Assert
            Assert.IsFalse(result, "Should fail with insufficient balance");
            Assert.AreEqual(100, _workerService.InfluenceBalance, "Balance should not change");
        }

        [Test]
        public void TrySpendInfluence_WithZeroAmount_Fails()
        {
            // Arrange
            _workerService.SetInfluenceBalance(1000);

            // Act
            bool result = _workerService.TrySpendInfluence(0);

            // Assert
            Assert.IsFalse(result, "Should fail with zero amount");
        }

        [Test]
        public void TrySpendInfluence_WithNegativeAmount_Fails()
        {
            // Arrange
            _workerService.SetInfluenceBalance(1000);

            // Act
            bool result = _workerService.TrySpendInfluence(-100);

            // Assert
            Assert.IsFalse(result, "Should fail with negative amount");
        }

        [Test]
        public void TrySpendInfluence_FiresEvent()
        {
            // Arrange
            _workerService.SetInfluenceBalance(1000);
            long spentAmount = 0;
            _workerService.OnInfluenceSpent += amount => spentAmount = amount;

            // Act
            _workerService.TrySpendInfluence(300);

            // Assert
            Assert.AreEqual(300, spentAmount, "Event should fire with spent amount");
        }

        #endregion

        #region IncrementWorker Tests

        [Test]
        public void IncrementWorker_IncreasesWorkerCount()
        {
            // Arrange
            _workerService.SetWorkersReady(10);

            // Act
            _workerService.IncrementWorker();

            // Assert
            Assert.AreEqual(11, _workerService.WorkersReady, "Worker count should increase by 1");
        }

        [Test]
        public void IncrementWorker_IncreasesBatchesProcessed()
        {
            // Arrange
            _workerService.SetWorkerBatchesProcessed(100);

            // Act
            _workerService.IncrementWorker();

            // Assert
            Assert.AreEqual(101, _workerService.WorkerBatchesProcessed, "Batches processed should increase by 1");
        }

        #endregion

        #region ClampWorkersNonNegative Tests

        [Test]
        public void ClampWorkersNonNegative_WithNegativeWorkers_ClampsToZero()
        {
            // Arrange
            _workerService.SetWorkersReady(-10);

            // Act
            _workerService.ClampWorkersNonNegative();

            // Assert
            Assert.AreEqual(0, _workerService.WorkersReady, "Workers should be clamped to 0");
        }

        [Test]
        public void ClampWorkersNonNegative_WithPositiveWorkers_DoesNotChange()
        {
            // Arrange
            _workerService.SetWorkersReady(50);

            // Act
            _workerService.ClampWorkersNonNegative();

            // Assert
            Assert.AreEqual(50, _workerService.WorkersReady, "Positive workers should not change");
        }

        #endregion

        #region Calculation Properties Tests

        [Test]
        public void CanGather_WhenFull_ReturnsTrue()
        {
            // Arrange
            _workerService.SetWorkersReady(WorkerBatchSize);

            // Assert
            Assert.IsTrue(_workerService.CanGather);
        }

        [Test]
        public void CanGather_WhenNotFull_ReturnsFalse()
        {
            // Arrange
            _workerService.SetWorkersReady(WorkerBatchSize - 1);

            // Assert
            Assert.IsFalse(_workerService.CanGather);
        }

        [Test]
        public void WorkerFillPercent_CalculatesCorrectly()
        {
            // Arrange
            _workerService.SetWorkersReady(64); // Half of batch size

            // Assert
            Assert.AreEqual(0.5f, _workerService.WorkerFillPercent, 0.01f, "Fill percent should be 50%");
        }

        #endregion
    }
}
