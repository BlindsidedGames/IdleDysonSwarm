using NUnit.Framework;
using Systems.Facilities;
using static Expansion.Oracle;

namespace Tests.Systems
{
    /// <summary>
    /// Unit tests for FacilityCountAccessor.
    /// Verifies the reflection-based facility count access pattern works correctly.
    /// </summary>
    [TestFixture]
    public class FacilityCountAccessorTests
    {
        private DysonVerseInfinityData _infinityData;

        [SetUp]
        public void Setup()
        {
            _infinityData = new DysonVerseInfinityData();
        }

        #region TryGetCount Tests

        [Test]
        public void TryGetCount_AssemblyLines_ReturnsCorrectArray()
        {
            // Arrange
            _infinityData.assemblyLines = new double[] { 10, 20 };

            // Act
            bool result = FacilityCountAccessor.TryGetCount(_infinityData, "assembly_lines", out var counts);

            // Assert
            Assert.IsTrue(result, "Should succeed for valid facility ID");
            Assert.IsNotNull(counts);
            Assert.AreEqual(10, counts[0], "Auto count should match");
            Assert.AreEqual(20, counts[1], "Manual count should match");
        }

        [Test]
        public void TryGetCount_AiManagers_ReturnsCorrectArray()
        {
            // Arrange
            _infinityData.managers = new double[] { 5, 15 };

            // Act
            bool result = FacilityCountAccessor.TryGetCount(_infinityData, "ai_managers", out var counts);

            // Assert
            Assert.IsTrue(result);
            Assert.AreEqual(5, counts[0]);
            Assert.AreEqual(15, counts[1]);
        }

        [Test]
        public void TryGetCount_Servers_ReturnsCorrectArray()
        {
            // Arrange
            _infinityData.servers = new double[] { 25, 35 };

            // Act
            bool result = FacilityCountAccessor.TryGetCount(_infinityData, "servers", out var counts);

            // Assert
            Assert.IsTrue(result);
            Assert.AreEqual(25, counts[0]);
            Assert.AreEqual(35, counts[1]);
        }

        [Test]
        public void TryGetCount_DataCenters_ReturnsCorrectArray()
        {
            // Arrange
            _infinityData.dataCenters = new double[] { 50, 100 };

            // Act
            bool result = FacilityCountAccessor.TryGetCount(_infinityData, "data_centers", out var counts);

            // Assert
            Assert.IsTrue(result);
            Assert.AreEqual(50, counts[0]);
            Assert.AreEqual(100, counts[1]);
        }

        [Test]
        public void TryGetCount_Planets_ReturnsCorrectArray()
        {
            // Arrange
            _infinityData.planets = new double[] { 1000, 2000 };

            // Act
            bool result = FacilityCountAccessor.TryGetCount(_infinityData, "planets", out var counts);

            // Assert
            Assert.IsTrue(result);
            Assert.AreEqual(1000, counts[0]);
            Assert.AreEqual(2000, counts[1]);
        }

        [Test]
        public void TryGetCount_UnknownFacility_ReturnsFalse()
        {
            // Act
            bool result = FacilityCountAccessor.TryGetCount(_infinityData, "unknown_facility", out var counts);

            // Assert
            Assert.IsFalse(result, "Should return false for unknown facility ID");
            Assert.IsNull(counts, "Counts should be null for unknown facility");
        }

        [Test]
        public void TryGetCount_NullData_ReturnsFalse()
        {
            // Act
            bool result = FacilityCountAccessor.TryGetCount(null, "assembly_lines", out var counts);

            // Assert
            Assert.IsFalse(result, "Should return false for null data");
            Assert.IsNull(counts);
        }

        [Test]
        public void TryGetCount_NullFacilityId_ReturnsFalse()
        {
            // Act
            bool result = FacilityCountAccessor.TryGetCount(_infinityData, null, out var counts);

            // Assert
            Assert.IsFalse(result, "Should return false for null facility ID");
            Assert.IsNull(counts);
        }

        [Test]
        public void TryGetCount_EmptyFacilityId_ReturnsFalse()
        {
            // Act
            bool result = FacilityCountAccessor.TryGetCount(_infinityData, "", out var counts);

            // Assert
            Assert.IsFalse(result, "Should return false for empty facility ID");
            Assert.IsNull(counts);
        }

        #endregion

        #region TrySetCount Tests

        [Test]
        public void TrySetCount_AssemblyLines_SetsCorrectValues()
        {
            // Act
            bool result = FacilityCountAccessor.TrySetCount(_infinityData, "assembly_lines", 100, 200);

            // Assert
            Assert.IsTrue(result, "Should succeed for valid facility ID");
            Assert.AreEqual(100, _infinityData.assemblyLines[0], "Auto count should be set");
            Assert.AreEqual(200, _infinityData.assemblyLines[1], "Manual count should be set");
        }

        [Test]
        public void TrySetCount_AiManagers_SetsCorrectValues()
        {
            // Act
            bool result = FacilityCountAccessor.TrySetCount(_infinityData, "ai_managers", 50, 75);

            // Assert
            Assert.IsTrue(result);
            Assert.AreEqual(50, _infinityData.managers[0]);
            Assert.AreEqual(75, _infinityData.managers[1]);
        }

        [Test]
        public void TrySetCount_Servers_SetsCorrectValues()
        {
            // Act
            bool result = FacilityCountAccessor.TrySetCount(_infinityData, "servers", 300, 400);

            // Assert
            Assert.IsTrue(result);
            Assert.AreEqual(300, _infinityData.servers[0]);
            Assert.AreEqual(400, _infinityData.servers[1]);
        }

        [Test]
        public void TrySetCount_DataCenters_SetsCorrectValues()
        {
            // Act
            bool result = FacilityCountAccessor.TrySetCount(_infinityData, "data_centers", 1500, 2500);

            // Assert
            Assert.IsTrue(result);
            Assert.AreEqual(1500, _infinityData.dataCenters[0]);
            Assert.AreEqual(2500, _infinityData.dataCenters[1]);
        }

        [Test]
        public void TrySetCount_Planets_SetsCorrectValues()
        {
            // Act
            bool result = FacilityCountAccessor.TrySetCount(_infinityData, "planets", 5000, 10000);

            // Assert
            Assert.IsTrue(result);
            Assert.AreEqual(5000, _infinityData.planets[0]);
            Assert.AreEqual(10000, _infinityData.planets[1]);
        }

        [Test]
        public void TrySetCount_UnknownFacility_ReturnsFalse()
        {
            // Act
            bool result = FacilityCountAccessor.TrySetCount(_infinityData, "unknown_facility", 100, 200);

            // Assert
            Assert.IsFalse(result, "Should return false for unknown facility ID");
        }

        [Test]
        public void TrySetCount_NullData_ReturnsFalse()
        {
            // Act
            bool result = FacilityCountAccessor.TrySetCount(null, "assembly_lines", 100, 200);

            // Assert
            Assert.IsFalse(result, "Should return false for null data");
        }

        #endregion

        #region IsKnownFacility Tests

        [Test]
        public void IsKnownFacility_ValidFacilities_ReturnsTrue()
        {
            Assert.IsTrue(FacilityCountAccessor.IsKnownFacility("assembly_lines"));
            Assert.IsTrue(FacilityCountAccessor.IsKnownFacility("ai_managers"));
            Assert.IsTrue(FacilityCountAccessor.IsKnownFacility("servers"));
            Assert.IsTrue(FacilityCountAccessor.IsKnownFacility("data_centers"));
            Assert.IsTrue(FacilityCountAccessor.IsKnownFacility("planets"));
        }

        [Test]
        public void IsKnownFacility_UnknownFacility_ReturnsFalse()
        {
            Assert.IsFalse(FacilityCountAccessor.IsKnownFacility("unknown"));
            Assert.IsFalse(FacilityCountAccessor.IsKnownFacility("AssemblyLines")); // Case sensitive
            Assert.IsFalse(FacilityCountAccessor.IsKnownFacility("ASSEMBLY_LINES"));
        }

        [Test]
        public void IsKnownFacility_NullOrEmpty_ReturnsFalse()
        {
            Assert.IsFalse(FacilityCountAccessor.IsKnownFacility(null));
            Assert.IsFalse(FacilityCountAccessor.IsKnownFacility(""));
        }

        #endregion

        #region Round-trip Tests

        [Test]
        public void SetThenGet_ProducesConsistentResults()
        {
            // Arrange - Set values
            FacilityCountAccessor.TrySetCount(_infinityData, "assembly_lines", 123, 456);

            // Act - Get values back
            FacilityCountAccessor.TryGetCount(_infinityData, "assembly_lines", out var counts);

            // Assert
            Assert.AreEqual(123, counts[0], "Auto count should round-trip correctly");
            Assert.AreEqual(456, counts[1], "Manual count should round-trip correctly");
        }

        [Test]
        public void AllFacilities_RoundTrip_ProducesConsistentResults()
        {
            // Test all facilities
            string[] facilities = { "assembly_lines", "ai_managers", "servers", "data_centers", "planets" };

            for (int i = 0; i < facilities.Length; i++)
            {
                double auto = (i + 1) * 100;
                double manual = (i + 1) * 200;

                // Set
                bool setResult = FacilityCountAccessor.TrySetCount(_infinityData, facilities[i], auto, manual);
                Assert.IsTrue(setResult, $"Set should succeed for {facilities[i]}");

                // Get
                bool getResult = FacilityCountAccessor.TryGetCount(_infinityData, facilities[i], out var counts);
                Assert.IsTrue(getResult, $"Get should succeed for {facilities[i]}");
                Assert.AreEqual(auto, counts[0], $"Auto count mismatch for {facilities[i]}");
                Assert.AreEqual(manual, counts[1], $"Manual count mismatch for {facilities[i]}");
            }
        }

        #endregion
    }
}
