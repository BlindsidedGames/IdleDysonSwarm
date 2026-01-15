using NUnit.Framework;
using Systems;
using static Expansion.Oracle;

namespace Tests.Systems
{
    /// <summary>
    /// Unit tests for ModifierSystem, particularly the refactored SecretBuffs system.
    /// Verifies that the table-driven approach produces identical results to the original goto cascade.
    /// </summary>
    [TestFixture]
    public class ModifierSystemTests
    {
        private DysonVerseInfinityData _infinityData;
        private DysonVersePrestigeData _prestigeData;
        private SecretBuffState _secrets;

        [SetUp]
        public void Setup()
        {
            _infinityData = new DysonVerseInfinityData();
            _prestigeData = new DysonVersePrestigeData();
            _secrets = new SecretBuffState();
        }

        #region SecretBuffs Tests

        [Test]
        public void SecretBuffs_Level0_ReturnsDefaultMultipliers()
        {
            // Arrange
            _prestigeData.secretsOfTheUniverse = 0;

            // Act
            ModifierSystem.SecretBuffs(_infinityData, _prestigeData, _secrets);

            // Assert - All multipliers should be default (1.0)
            Assert.AreEqual(1, _secrets.PlanetMulti, "PlanetMulti should be 1");
            Assert.AreEqual(1, _secrets.ServerMulti, "ServerMulti should be 1");
            Assert.AreEqual(1, _secrets.AiMulti, "AiMulti should be 1");
            Assert.AreEqual(1, _secrets.AssemblyMulti, "AssemblyMulti should be 1");
            Assert.AreEqual(1, _secrets.CashMulti, "CashMulti should be 1");
            Assert.AreEqual(1, _secrets.ScienceMulti, "ScienceMulti should be 1");
        }

        [Test]
        public void SecretBuffs_Level1_AppliesOnlyFirstBuff()
        {
            // Arrange
            _prestigeData.secretsOfTheUniverse = 1;

            // Act
            ModifierSystem.SecretBuffs(_infinityData, _prestigeData, _secrets);

            // Assert - Only assembly line upgrade should be applied (to infinityData)
            Assert.AreEqual(0.06f, _infinityData.assemblyLineUpgradePercent, 0.001f, "assemblyLineUpgradePercent should be 0.06");
            // Multipliers should still be default
            Assert.AreEqual(1, _secrets.CashMulti, "CashMulti should still be 1 at level 1");
        }

        [Test]
        public void SecretBuffs_Level2_AppliesCashMultiplier()
        {
            // Arrange
            _prestigeData.secretsOfTheUniverse = 2;

            // Act
            ModifierSystem.SecretBuffs(_infinityData, _prestigeData, _secrets);

            // Assert
            Assert.AreEqual(2, _secrets.CashMulti, "CashMulti should be 2 at level 2");
            Assert.AreEqual(0.06f, _infinityData.assemblyLineUpgradePercent, 0.001f, "assemblyLineUpgradePercent should be 0.06");
        }

        [Test]
        public void SecretBuffs_Level6_AppliesScienceMultiplier()
        {
            // Arrange
            _prestigeData.secretsOfTheUniverse = 6;

            // Act
            ModifierSystem.SecretBuffs(_infinityData, _prestigeData, _secrets);

            // Assert
            Assert.AreEqual(2, _secrets.ScienceMulti, "ScienceMulti should be 2 at level 6");
            Assert.AreEqual(2, _secrets.CashMulti, "CashMulti should be 2 at level 6");
        }

        [Test]
        public void SecretBuffs_Level10_OverwritesScienceMultiplier()
        {
            // Arrange
            _prestigeData.secretsOfTheUniverse = 10;

            // Act
            ModifierSystem.SecretBuffs(_infinityData, _prestigeData, _secrets);

            // Assert - Level 10 overwrites level 6's ScienceMulti
            Assert.AreEqual(4, _secrets.ScienceMulti, "ScienceMulti should be 4 at level 10 (overwritten from 2)");
        }

        [Test]
        public void SecretBuffs_Level20_AppliesServerMultiplier()
        {
            // Arrange
            _prestigeData.secretsOfTheUniverse = 20;

            // Act
            ModifierSystem.SecretBuffs(_infinityData, _prestigeData, _secrets);

            // Assert
            Assert.AreEqual(2, _secrets.ServerMulti, "ServerMulti should be 2 at level 20");
        }

        [Test]
        public void SecretBuffs_Level27_AppliesMaxAiMultiplier()
        {
            // Arrange
            _prestigeData.secretsOfTheUniverse = 27;

            // Act
            ModifierSystem.SecretBuffs(_infinityData, _prestigeData, _secrets);

            // Assert - All buffs should be at their highest values
            Assert.AreEqual(42, _secrets.AiMulti, "AiMulti should be 42 at level 27");
            Assert.AreEqual(8, _secrets.CashMulti, "CashMulti should be 8 at level 27");
            Assert.AreEqual(10, _secrets.ScienceMulti, "ScienceMulti should be 10 at level 27");
            Assert.AreEqual(7, _secrets.AssemblyMulti, "AssemblyMulti should be 7 at level 27");
            Assert.AreEqual(3, _secrets.ServerMulti, "ServerMulti should be 3 at level 27");
            Assert.AreEqual(5, _secrets.PlanetMulti, "PlanetMulti should be 5 at level 27");
        }

        [Test]
        public void SecretBuffs_Level27_AppliesAllUpgradePercents()
        {
            // Arrange
            _prestigeData.secretsOfTheUniverse = 27;

            // Act
            ModifierSystem.SecretBuffs(_infinityData, _prestigeData, _secrets);

            // Assert - All upgrade percents should be at their highest values
            Assert.AreEqual(0.12f, _infinityData.assemblyLineUpgradePercent, 0.001f, "assemblyLineUpgradePercent should be 0.12");
            Assert.AreEqual(0.09f, _infinityData.serverUpgradePercent, 0.001f, "serverUpgradePercent should be 0.09");
            Assert.AreEqual(0.09f, _infinityData.aiManagerUpgradePercent, 0.001f, "aiManagerUpgradePercent should be 0.09");
            Assert.AreEqual(0.09f, _infinityData.planetUpgradePercent, 0.001f, "planetUpgradePercent should be 0.09");
        }

        [Test]
        public void SecretBuffs_NullPrestigeData_DoesNotThrow()
        {
            // Act & Assert - Should not throw
            Assert.DoesNotThrow(() => ModifierSystem.SecretBuffs(_infinityData, null, _secrets));
        }

        [Test]
        public void SecretBuffs_NullSecrets_DoesNotThrow()
        {
            // Arrange
            _prestigeData.secretsOfTheUniverse = 10;

            // Act & Assert - Should not throw
            Assert.DoesNotThrow(() => ModifierSystem.SecretBuffs(_infinityData, _prestigeData, null));
        }

        #endregion

        #region BuildSecretBuffState Tests

        [Test]
        public void BuildSecretBuffState_Level0_ReturnsDefaultState()
        {
            // Arrange
            _prestigeData.secretsOfTheUniverse = 0;

            // Act
            var result = ModifierSystem.BuildSecretBuffState(_prestigeData);

            // Assert - All multipliers should be default
            Assert.AreEqual(1, result.PlanetMulti);
            Assert.AreEqual(1, result.ServerMulti);
            Assert.AreEqual(1, result.AiMulti);
            Assert.AreEqual(1, result.AssemblyMulti);
            Assert.AreEqual(1, result.CashMulti);
            Assert.AreEqual(1, result.ScienceMulti);
        }

        [Test]
        public void BuildSecretBuffState_Level27_ReturnsMaxMultipliers()
        {
            // Arrange
            _prestigeData.secretsOfTheUniverse = 27;

            // Act
            var result = ModifierSystem.BuildSecretBuffState(_prestigeData);

            // Assert
            Assert.AreEqual(42, result.AiMulti, "AiMulti should be 42");
            Assert.AreEqual(8, result.CashMulti, "CashMulti should be 8");
            Assert.AreEqual(10, result.ScienceMulti, "ScienceMulti should be 10");
            Assert.AreEqual(7, result.AssemblyMulti, "AssemblyMulti should be 7");
            Assert.AreEqual(3, result.ServerMulti, "ServerMulti should be 3");
            Assert.AreEqual(5, result.PlanetMulti, "PlanetMulti should be 5");
        }

        [Test]
        public void BuildSecretBuffState_NullPrestigeData_ReturnsDefaultState()
        {
            // Act
            var result = ModifierSystem.BuildSecretBuffState(null);

            // Assert - Should return default state, not throw
            Assert.IsNotNull(result);
            Assert.AreEqual(1, result.ScienceMulti);
        }

        [Test]
        public void BuildSecretBuffState_DoesNotModifyInfinityData()
        {
            // Arrange
            _prestigeData.secretsOfTheUniverse = 27;
            double originalAssemblyPercent = _infinityData.assemblyLineUpgradePercent;

            // Act - BuildSecretBuffState should NOT modify any infinityData
            var result = ModifierSystem.BuildSecretBuffState(_prestigeData);

            // Assert - infinityData should be unchanged (BuildSecretBuffState doesn't have access to it)
            Assert.AreEqual(originalAssemblyPercent, _infinityData.assemblyLineUpgradePercent,
                "BuildSecretBuffState should not modify infinityData");
        }

        #endregion

        #region Consistency Tests

        [Test]
        public void SecretBuffs_And_BuildSecretBuffState_ProduceSameMultipliers()
        {
            // Test all levels to ensure both methods produce consistent multiplier values
            for (int level = 0; level <= 27; level++)
            {
                // Arrange
                var infinityData = new DysonVerseInfinityData();
                var prestigeData = new DysonVersePrestigeData { secretsOfTheUniverse = level };
                var secrets1 = new SecretBuffState();

                // Act
                ModifierSystem.SecretBuffs(infinityData, prestigeData, secrets1);
                var secrets2 = ModifierSystem.BuildSecretBuffState(prestigeData);

                // Assert - Both methods should produce identical multipliers
                Assert.AreEqual(secrets1.PlanetMulti, secrets2.PlanetMulti, $"PlanetMulti mismatch at level {level}");
                Assert.AreEqual(secrets1.ServerMulti, secrets2.ServerMulti, $"ServerMulti mismatch at level {level}");
                Assert.AreEqual(secrets1.AiMulti, secrets2.AiMulti, $"AiMulti mismatch at level {level}");
                Assert.AreEqual(secrets1.AssemblyMulti, secrets2.AssemblyMulti, $"AssemblyMulti mismatch at level {level}");
                Assert.AreEqual(secrets1.CashMulti, secrets2.CashMulti, $"CashMulti mismatch at level {level}");
                Assert.AreEqual(secrets1.ScienceMulti, secrets2.ScienceMulti, $"ScienceMulti mismatch at level {level}");
            }
        }

        #endregion
    }
}
