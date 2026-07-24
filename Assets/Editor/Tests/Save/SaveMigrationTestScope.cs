/*
 * Purpose: Provides an isolated Oracle and real data registries for fixture-backed migration characterization.
 * Runs: Unity EditMode test runner only.
 * Primary entry points: constructor, CreatePreparationPipeline, RunProductionMigration, RunMigration, and Dispose.
 * Owns: Temporary singleton wiring, hidden GameObjects, migration-builder reflection, and save-write recording.
 * Delegates: Migration transforms and normalization to Oracle.Migrations and Systems.Migrations.MigrationRunner.
 *
 * Interacts with:
 * - Assets/Scripts/Expansion/Oracle.Migrations.cs.
 * - Assets/Scripts/Data/GameDataRegistry.cs and the four database assets under Assets/Data/Databases/.
 * - Assets/Editor/Tests/Save/SaveMigrationFixtureCharacterizationTests.cs.
 *
 * Change notes:
 * - Private Oracle migration-builder names are reflection-bound; update this scope if those entry points change.
 * - The scope disables load-timestamp updates for deterministic tests and records any unexpected save publication.
 * - Always dispose the scope so Oracle and GameDataRegistry singleton state is restored between tests.
 */

using System;
using System.Reflection;
using Expansion;
using GameData;
using NUnit.Framework;
using Systems.Migrations;
using Systems.Save;
using UnityEditor;
using UnityEngine;

namespace Tests.Save
{
    /// <summary>
    /// Isolates production migration dependencies and records forbidden save writes.
    /// </summary>
    internal sealed class SaveMigrationTestScope : IDisposable
    {
        private const string FacilityDatabasePath = "Assets/Data/Databases/FacilityDatabase.asset";
        private const string SkillDatabasePath = "Assets/Data/Databases/SkillDatabase.asset";
        private const string EffectDatabasePath = "Assets/Data/Databases/EffectDatabase.asset";
        private const string ResearchDatabasePath = "Assets/Data/Databases/ResearchDatabase.asset";

        private static readonly FieldInfo RegistryInstanceBackingField = typeof(GameDataRegistry)
            .GetField("<Instance>k__BackingField", BindingFlags.Static | BindingFlags.NonPublic);

        private static readonly MethodInfo BuildMigrationRegistryMethod = typeof(Oracle)
            .GetMethod("BuildMigrationRegistry", BindingFlags.Instance | BindingFlags.NonPublic);

        private static readonly MethodInfo BuildMigrationOptionsMethod = typeof(Oracle)
            .GetMethod("BuildMigrationOptions", BindingFlags.Instance | BindingFlags.NonPublic);

        private static readonly FieldInfo SaveStoreField = typeof(Oracle)
            .GetField("_saveStore", BindingFlags.Instance | BindingFlags.NonPublic);

        private readonly GameDataRegistry _previousRegistry;
        private readonly Oracle _previousOracle;
        private readonly RecordingSaveStore _saveStore = new RecordingSaveStore();
        private GameObject _oracleObject;
        private GameObject _registryObject;
        private bool _disposed;

        /// <summary>
        /// Gets the isolated Oracle used for migration runs.
        /// </summary>
        internal Oracle Subject { get; private set; }

        /// <summary>
        /// Gets the number of unexpected persistence writes requested during characterization.
        /// </summary>
        internal int SaveWriteCount => _saveStore.SaveCount;

        /// <summary>
        /// Creates the production-equivalent prepared-save pipeline bound to this isolated Oracle.
        /// </summary>
        /// <returns>A schema 11 preparation pipeline using the real migration registry and normalization.</returns>
        internal SavePreparationPipeline CreatePreparationPipeline()
        {
            return new SavePreparationPipeline(11, RunProductionMigration);
        }

        /// <summary>
        /// Creates hidden Oracle and registry objects wired to the project's real ID databases.
        /// </summary>
        internal SaveMigrationTestScope()
        {
            Assert.IsNotNull(RegistryInstanceBackingField);
            Assert.IsNotNull(BuildMigrationRegistryMethod);
            Assert.IsNotNull(BuildMigrationOptionsMethod);
            Assert.IsNotNull(SaveStoreField);

            _previousRegistry = GameDataRegistry.Instance;
            _previousOracle = Expansion.Oracle.oracle;
            SetRegistryInstance(null);
            Expansion.Oracle.oracle = null;

            try
            {
                _oracleObject = new GameObject("SaveMigrationTestOracle");
                _oracleObject.hideFlags = HideFlags.HideAndDontSave;
                Subject = _oracleObject.AddComponent<Oracle>();
                Expansion.Oracle.oracle = Subject;
                SaveStoreField.SetValue(Subject, _saveStore);

                _registryObject = new GameObject("SaveMigrationTestRegistry");
                _registryObject.hideFlags = HideFlags.HideAndDontSave;
                GameDataRegistry registry = _registryObject.AddComponent<GameDataRegistry>();
                registry.facilityDatabase = LoadRequiredAsset<FacilityDatabase>(FacilityDatabasePath);
                registry.skillDatabase = LoadRequiredAsset<SkillDatabase>(SkillDatabasePath);
                registry.effectDatabase = LoadRequiredAsset<EffectDatabase>(EffectDatabasePath);
                registry.researchDatabase = LoadRequiredAsset<ResearchDatabase>(ResearchDatabasePath);
                SetRegistryInstance(registry);
            }
            catch
            {
                Dispose();
                throw;
            }
        }

        /// <summary>
        /// Runs the production registry and ensure action without clock-driven load timestamp updates.
        /// </summary>
        /// <param name="workingCopy">The isolated save copy to migrate.</param>
        /// <returns>The production migration result.</returns>
        internal MigrationRunResult RunProductionMigration(Oracle.SaveDataSettings workingCopy)
        {
            MigrationRegistry registry = (MigrationRegistry)BuildMigrationRegistryMethod.Invoke(
                Subject,
                Array.Empty<object>());
            MigrationRunOptions options = (MigrationRunOptions)BuildMigrationOptionsMethod.Invoke(
                Subject,
                new object[] { false });
            options.UpdateLastSuccessfulLoadUtc = false;
            options.ThrowOnError = false;
            return RunMigration(workingCopy, registry, options);
        }

        /// <summary>
        /// Runs a caller-supplied migration registry against an isolated save copy.
        /// </summary>
        /// <param name="workingCopy">The isolated save copy.</param>
        /// <param name="registry">The migration registry to execute.</param>
        /// <param name="options">The migration options.</param>
        /// <returns>The migration result.</returns>
        internal MigrationRunResult RunMigration(
            Oracle.SaveDataSettings workingCopy,
            MigrationRegistry registry,
            MigrationRunOptions options)
        {
            Subject.saveSettings = workingCopy ?? throw new ArgumentNullException(nameof(workingCopy));
            return MigrationRunner.Run(Subject, registry, options);
        }

        /// <summary>
        /// Restores singleton state and destroys all hidden test objects.
        /// </summary>
        public void Dispose()
        {
            if (_disposed)
            {
                return;
            }

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

            Subject = null;
            SetRegistryInstance(_previousRegistry);
            Expansion.Oracle.oracle = _previousOracle;
        }

        /// <summary>
        /// Loads a required ScriptableObject database asset for real ID normalization.
        /// </summary>
        /// <typeparam name="TAsset">The required asset type.</typeparam>
        /// <param name="path">The project asset path.</param>
        /// <returns>The loaded asset.</returns>
        private static TAsset LoadRequiredAsset<TAsset>(string path) where TAsset : UnityEngine.Object
        {
            TAsset asset = AssetDatabase.LoadAssetAtPath<TAsset>(path);
            Assert.IsNotNull(asset, $"Required migration test asset missing at '{path}'.");
            return asset;
        }

        /// <summary>
        /// Replaces the GameDataRegistry singleton backing field for the duration of the scope.
        /// </summary>
        /// <param name="registry">The temporary or restored registry instance.</param>
        private static void SetRegistryInstance(GameDataRegistry registry)
        {
            RegistryInstanceBackingField.SetValue(null, registry);
        }

        /// <summary>
        /// Records any forbidden persistence call made during migration characterization.
        /// </summary>
        private sealed class RecordingSaveStore : ISaveStore
        {
            /// <summary>
            /// Gets the number of save attempts.
            /// </summary>
            internal int SaveCount { get; private set; }

            /// <summary>
            /// Reports that no prior save exists in the recording store.
            /// </summary>
            /// <returns>Always <see langword="false"/>.</returns>
            public bool Exists()
            {
                return false;
            }

            /// <summary>
            /// Rejects loads because migration tests must not read persistence.
            /// </summary>
            /// <param name="loaded">Always null.</param>
            /// <param name="error">The test-only rejection message.</param>
            /// <returns>Always <see langword="false"/>.</returns>
            public bool TryLoad(out Oracle.SaveDataSettings loaded, out string error)
            {
                loaded = null;
                error = "Migration characterization does not load storage.";
                return false;
            }

            /// <summary>
            /// Records a forbidden save attempt without writing storage.
            /// </summary>
            /// <param name="settings">The attempted save settings.</param>
            /// <param name="stats">Default statistics because no encoding occurs.</param>
            /// <param name="error">The test-only rejection message.</param>
            /// <returns>Always <see langword="false"/>.</returns>
            public bool TrySave(
                Oracle.SaveDataSettings settings,
                out SaveStringStats stats,
                out string error)
            {
                SaveCount++;
                stats = default;
                error = "Migration characterization forbids persistence writes.";
                return false;
            }
        }
    }
}
