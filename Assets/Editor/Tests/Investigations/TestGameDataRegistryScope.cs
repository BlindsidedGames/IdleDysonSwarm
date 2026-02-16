using System;
using System.Reflection;
using Expansion;
using GameData;
using NUnit.Framework;
using UnityEditor;
using UnityEngine;

/*
 * TestGameDataRegistryScope
 * Purpose (editor tests): Provides an isolated GameDataRegistry singleton wired to real database assets.
 * Runs: Unity EditMode test runner only.
 * Primary entry points: constructor (setup), Dispose() (teardown/restore).
 * Owns vs delegates:
 * - Owns temporary registry lifecycle, singleton override, and required asset loading assertions.
 * - Delegates production/stat behavior to runtime systems that consume GameDataRegistry.
 *
 * Interacts with:
 * - Assets/Scripts/Data/GameDataRegistry.cs
 * - Assets/Data/Databases/FacilityDatabase.asset
 * - Assets/Data/Databases/SkillDatabase.asset
 * - Assets/Data/Databases/EffectDatabase.asset
 * - Assets/Data/Databases/ResearchDatabase.asset
 * - Callers: Assets/Editor/Tests/Investigations/ProductionUiMismatchTests.cs
 *
 * Change notes:
 * - If GameDataRegistry.Instance changes from auto-property backing field, update reflection-based singleton set/reset.
 * - If database asset locations move/rename, update the path constants below.
 * - Any additional runtime database dependencies required by production pipelines must be added here.
 */
namespace Tests.Investigations
{
    internal sealed class TestGameDataRegistryScope : IDisposable
    {
        private const string FacilityDatabasePath = "Assets/Data/Databases/FacilityDatabase.asset";
        private const string SkillDatabasePath = "Assets/Data/Databases/SkillDatabase.asset";
        private const string EffectDatabasePath = "Assets/Data/Databases/EffectDatabase.asset";
        private const string ResearchDatabasePath = "Assets/Data/Databases/ResearchDatabase.asset";

        private static readonly FieldInfo InstanceBackingField = typeof(GameDataRegistry)
            .GetField("<Instance>k__BackingField", BindingFlags.Static | BindingFlags.NonPublic);

        private readonly GameDataRegistry _previousInstance;
        private readonly Oracle _previousOracle;
        private GameObject _registryObject;
        private GameObject _oracleObject;
        private bool _disposed;

        public GameDataRegistry Registry { get; private set; }

        public TestGameDataRegistryScope()
        {
            _previousInstance = GameDataRegistry.Instance;
            _previousOracle = Oracle.oracle;
            SetInstance(null);
            Oracle.oracle = null;

            try
            {
                _oracleObject = new GameObject("TestOracleScope");
                _oracleObject.hideFlags = HideFlags.HideAndDontSave;
                Oracle testOracle = _oracleObject.AddComponent<Oracle>();
                testOracle.saveSettings ??= new Oracle.SaveDataSettings();
                // EditMode AddComponent does not guarantee Awake execution; set singleton explicitly.
                Oracle.oracle = testOracle;

                _registryObject = new GameObject("TestGameDataRegistryScope");
                _registryObject.hideFlags = HideFlags.HideAndDontSave;
                Registry = _registryObject.AddComponent<GameDataRegistry>();
                Registry.facilityDatabase = LoadRequiredAsset<FacilityDatabase>(FacilityDatabasePath);
                Registry.skillDatabase = LoadRequiredAsset<SkillDatabase>(SkillDatabasePath);
                Registry.effectDatabase = LoadRequiredAsset<EffectDatabase>(EffectDatabasePath);
                Registry.researchDatabase = LoadRequiredAsset<ResearchDatabase>(ResearchDatabasePath);
                SetInstance(Registry);
            }
            catch
            {
                if (_registryObject != null)
                {
                    UnityEngine.Object.DestroyImmediate(_registryObject);
                    _registryObject = null;
                }
                if (_oracleObject != null)
                {
                    UnityEngine.Object.DestroyImmediate(_oracleObject);
                    _oracleObject = null;
                }

                Registry = null;
                SetInstance(_previousInstance);
                Oracle.oracle = _previousOracle;
                throw;
            }
        }

        public void Dispose()
        {
            if (_disposed) return;
            _disposed = true;

            if (_registryObject != null)
            {
                UnityEngine.Object.DestroyImmediate(_registryObject);
                _registryObject = null;
            }
            if (_oracleObject != null)
            {
                UnityEngine.Object.DestroyImmediate(_oracleObject);
                _oracleObject = null;
            }

            Registry = null;
            SetInstance(_previousInstance);
            Oracle.oracle = _previousOracle;
        }

        private static TAsset LoadRequiredAsset<TAsset>(string path) where TAsset : UnityEngine.Object
        {
            TAsset asset = AssetDatabase.LoadAssetAtPath<TAsset>(path);
            Assert.IsNotNull(asset, $"Required test asset missing at '{path}'.");
            return asset;
        }

        private static void SetInstance(GameDataRegistry instance)
        {
            Assert.IsNotNull(InstanceBackingField, "Could not find GameDataRegistry.Instance backing field.");
            InstanceBackingField.SetValue(null, instance);
        }
    }
}
