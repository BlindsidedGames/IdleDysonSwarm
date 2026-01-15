using NUnit.Framework;
using IdleDysonSwarm.Services;
using static Expansion.Oracle;

namespace Tests.Services
{
    /// <summary>
    /// Example unit tests demonstrating the testability benefits of the service layer.
    /// These tests run without Unity dependencies or Oracle singleton.
    /// </summary>
    [TestFixture]
    public class ServiceLayerExampleTests
    {
        private MockGameStateService _mockGameState;

        [SetUp]
        public void Setup()
        {
            _mockGameState = new MockGameStateService();
        }

        [Test]
        public void Science_CanBeSetAndRetrieved()
        {
            // Arrange
            _mockGameState.SetScience(1000);

            // Act
            double science = _mockGameState.Science;

            // Assert
            Assert.AreEqual(1000, science);
        }

        [Test]
        public void Science_CanBeModified()
        {
            // Arrange
            _mockGameState.SetScience(1000);

            // Act
            _mockGameState.Science -= 500;

            // Assert
            Assert.AreEqual(500, _mockGameState.Science);
        }

        [Test]
        public void ResearchLevel_DefaultsToZero()
        {
            // Act
            double level = _mockGameState.GetResearchLevel("test_research");

            // Assert
            Assert.AreEqual(0, level);
        }

        [Test]
        public void ResearchLevel_CanBeSetAndRetrieved()
        {
            // Arrange
            string researchId = "money_multiplier";

            // Act
            _mockGameState.SetResearchLevel(researchId, 10);
            double level = _mockGameState.GetResearchLevel(researchId);

            // Assert
            Assert.AreEqual(10, level);
        }

        [Test]
        public void ResearchBuyMode_CanBeConfigured()
        {
            // Arrange
            _mockGameState.SetResearchBuyMode(BuyMode.BuyMax);

            // Act
            BuyMode mode = _mockGameState.ResearchBuyMode;

            // Assert
            Assert.AreEqual(BuyMode.BuyMax, mode);
        }

        [Test]
        public void RoundedBulkBuy_CanBeConfigured()
        {
            // Arrange
            _mockGameState.SetRoundedBulkBuy(true);

            // Act
            bool roundedBulkBuy = _mockGameState.RoundedBulkBuy;

            // Assert
            Assert.IsTrue(roundedBulkBuy);
        }

        [Test]
        public void PrestigeData_IsAccessible()
        {
            // Arrange
            _mockGameState.PrestigeData.infinityAutoResearch = true;

            // Act
            bool autoResearch = _mockGameState.PrestigeData.infinityAutoResearch;

            // Assert
            Assert.IsTrue(autoResearch);
        }

        [Test]
        public void InfinityData_CanBeModified()
        {
            // Arrange
            _mockGameState.InfinityData.assemblyLines = new double[] { 5, 10 };

            // Act
            double autoCount = _mockGameState.InfinityData.assemblyLines[0];
            double manualCount = _mockGameState.InfinityData.assemblyLines[1];

            // Assert
            Assert.AreEqual(5, autoCount);
            Assert.AreEqual(10, manualCount);
        }

        /// <summary>
        /// Example of testing presenter logic with mock services.
        /// This demonstrates how presenters can now be unit tested without Unity dependencies.
        /// </summary>
        [Test]
        public void Example_TestingPresenterLogic()
        {
            // Arrange - Set up mock game state
            _mockGameState.SetScience(1000);
            _mockGameState.SetResearchLevel("science_boost", 5);
            _mockGameState.PrestigeData.infinityAutoResearch = false;

            // Act - Test logic that would be in a presenter
            bool canPurchase = _mockGameState.Science >= 500;
            double currentLevel = _mockGameState.GetResearchLevel("science_boost");

            // Assert
            Assert.IsTrue(canPurchase, "Should have enough science to purchase");
            Assert.AreEqual(5, currentLevel, "Research level should be 5");
        }
    }
}
