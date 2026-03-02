using System.Reflection;
using Buildings;
using Expansion;
using IdleDysonSwarm.Services;
using NUnit.Framework;
using Research;
using UnityEngine;

namespace Tests.Balance
{
    /// <summary>
    /// Edit mode tests for preload null-safety around Oracle statics and research presenter startup.
    /// </summary>
    [TestFixture]
    public class ResearchStartupSafetyTests
    {
        [SetUp]
        public void SetUp()
        {
            ServiceLocator.Clear();
            ServiceLocator.Register<IGameStateService>(new GameStateService());
            Oracle.oracle = null;
        }

        [TearDown]
        public void TearDown()
        {
            ServiceLocator.Clear();
            Oracle.oracle = null;

            Object[] objects = Object.FindObjectsByType<Object>(FindObjectsInactive.Include, FindObjectsSortMode.None);
            for (int i = 0; i < objects.Length; i++)
            {
                Object obj = objects[i];
                if (obj is GameObject gameObject && (gameObject.name.StartsWith("Test_") || gameObject.name.StartsWith("Oracle_")))
                {
                    Object.DestroyImmediate(gameObject);
                }
            }
        }

        [Test]
        public void OracleStaticAccessors_DoNotThrow_WhenSingletonOrSaveIsMissing()
        {
            Assert.DoesNotThrow(() =>
            {
                _ = Oracle.IsRuntimeStateReady;
                _ = Oracle.StaticSaveSettings;
                _ = Oracle.StaticInfinityData;
                _ = Oracle.StaticPrestigeData;
                _ = Oracle.StaticSkillTreeData;
                _ = Oracle.StaticBuyMode;
                _ = Oracle.StaticResearchBuyMode;
                _ = Oracle.StaticRoundedBulkBuy;
                _ = Oracle.Money;
                _ = Oracle.Science;
                _ = Oracle.Bots;
                Oracle.Money = 123;
                Oracle.Science = 456;
                Oracle.Bots = 789;
            });
        }

        [Test]
        public void ResearchPresenter_OnEnable_DoesNotThrow_WhenOracleSaveNotLoaded()
        {
            GameObject oracleObject = new GameObject("Oracle_Test");
            _ = oracleObject.AddComponent<Oracle>();

            GameObject cardObject = new GameObject("Test_ResearchCard");
            BuildingReferences references = cardObject.AddComponent<BuildingReferences>();

            GameObject presenterObject = new GameObject("Test_ResearchPresenter");
            presenterObject.SetActive(false);
            ResearchPresenter presenter = presenterObject.AddComponent<ResearchPresenter>();

            SetPrivateField(presenter, "buildingReferences", references);
            SetPrivateField(presenter, "definition", CreateDefinitionWithFacilityPrereq());
            SetPrivateField(presenter, "researchIdOverride", "research.matrioshka_brains_upgrade");

            Assert.DoesNotThrow(() => presenterObject.SetActive(true));
        }

        private static GameData.ResearchDefinition CreateDefinitionWithFacilityPrereq()
        {
            GameData.ResearchDefinition definition = ScriptableObject.CreateInstance<GameData.ResearchDefinition>();
            IdleDysonSwarm.Data.ResearchId researchId = ScriptableObject.CreateInstance<IdleDysonSwarm.Data.ResearchId>();
            SetPrivateField(researchId, "_id", "research.matrioshka_brains_upgrade");
            SetPrivateField(definition, "_id", researchId);
            definition.displayName = "Matrioshka Brains";
            definition.baseCost = 10;
            definition.exponent = 1.1;
            definition.prerequisiteFacilityId = "matrioshka_brains";
            definition.prerequisiteFacilityOwned = 1;
            return definition;
        }

        private static void SetPrivateField(object target, string fieldName, object value)
        {
            System.Type type = target.GetType();
            FieldInfo field = null;
            while (type != null && field == null)
            {
                field = type.GetField(fieldName, BindingFlags.Instance | BindingFlags.NonPublic);
                type = type.BaseType;
            }

            Assert.IsNotNull(field, $"Field '{fieldName}' should exist on {target.GetType().Name}.");
            field.SetValue(target, value);
        }
    }
}
