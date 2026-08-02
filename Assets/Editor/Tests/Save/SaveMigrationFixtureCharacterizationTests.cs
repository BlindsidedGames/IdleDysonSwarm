/*
 * Purpose: Characterizes production V11 migration and normalization against immutable schema 7 and schema 8 fixtures.
 * Runs: Unity EditMode test runner only.
 * Primary entry points: NUnit fixture migration, repeatability, failure, and future-schema tests.
 * Owns: Deep-copy isolation assertions, durable sentinel checks, normalized-shape checks, and side-effect guards.
 * Delegates: Fixture reads to SaveFixtureLoader and production migration execution to SaveMigrationTestScope.
 *
 * Interacts with:
 * - Assets/Editor/Tests/Save/Fixtures/fixture-manifest.json and its three immutable fixture files.
 * - Assets/Editor/Tests/Save/SaveFixtureLoader.cs and SaveMigrationTestScope.cs.
 * - Assets/Scripts/Expansion/Oracle.Migrations.cs and Systems.Migrations.MigrationRunner.
 *
 * Change notes:
 * - Guaranteed fixtures and decoded source objects are immutable inputs; all migration runs use independent deep copies.
 * - Schema 7 and 8 compatibility, V11 normalized shape, deterministic/idempotent output, and offline/lifecycle isolation
 *   are save-contract gates for Phase One.
 * - New persistent containers, ID projections, or facility arrays require matching normalized-shape assertions here.
 */

using System;
using System.Globalization;
using System.Linq;
using Expansion;
using NUnit.Framework;
using Systems.Migrations;

namespace Tests.Save
{
    /// <summary>
    /// Verifies that legacy fixture migration reaches V11 without mutating source artifacts or granting offline progress.
    /// </summary>
    [TestFixture]
    public sealed class SaveMigrationFixtureCharacterizationTests
    {
        private const int CurrentSchema = 12;
        private const string Schema7RawJsonId = "schema-07-raw-json-20260202-045325";
        private const string Schema8DebugDtoId = "schema-08-debug-dto-20260202-060115";
        private const string Schema8CanonicalIdb1Id = "schema-08-canonical-idb1-main-save";

        private SaveFixtureManifest _manifest;
        private string _fixtureFingerprint;

        /// <summary>
        /// Loads a fresh manifest and records the immutable fixture-directory fingerprint.
        /// </summary>
        [OneTimeSetUp]
        public void OneTimeSetUp()
        {
            _manifest = SaveFixtureLoader.LoadManifest();
            _fixtureFingerprint = SaveFixtureLoader.ComputeFixtureDirectoryFingerprint();
        }

        /// <summary>
        /// Rechecks every fixture, source artifact, and the directory fingerprint after migration tests.
        /// </summary>
        [OneTimeTearDown]
        public void OneTimeTearDown()
        {
            foreach (SaveFixtureDefinition fixture in _manifest.fixtures)
            {
                Assert.AreEqual(
                    fixture.sha256,
                    SaveFixtureLoader.ComputeFileSha256(fixture.fixturePath),
                    $"Fixture '{fixture.id}' changed during migration characterization.");
                Assert.AreEqual(
                    fixture.sha256,
                    SaveFixtureLoader.ComputeFileSha256(fixture.sourcePath),
                    $"Source artifact '{fixture.sourcePath}' changed during migration characterization.");
            }

            Assert.AreEqual(
                _fixtureFingerprint,
                SaveFixtureLoader.ComputeFixtureDirectoryFingerprint(),
                "The immutable fixture directory changed during migration characterization.");
        }

        /// <summary>
        /// Migrates an independent fixture copy and verifies V11 durable state, shape, and side-effect boundaries.
        /// </summary>
        /// <param name="fixtureId">The immutable fixture manifest identifier.</param>
        [TestCase(Schema7RawJsonId)]
        [TestCase(Schema8DebugDtoId)]
        [TestCase(Schema8CanonicalIdb1Id)]
        public void Fixture_DeepCopyMigratesToV11WithoutMutatingSourceOrGrantingOfflineTime(string fixtureId)
        {
            SaveFixtureDefinition fixture = SaveFixtureLoader.GetFixture(_manifest, fixtureId);
            Assert.IsTrue(SaveFixtureLoader.TryDecode(fixture, out Oracle.SaveDataSettings source), fixture.id);
            string sourceHashBefore = SaveFixtureLoader.ComputeSaveDataSha256(source);
            string fixtureHashBefore = SaveFixtureLoader.ComputeFileSha256(fixture.fixturePath);
            Oracle.SaveDataSettings working = SaveFixtureLoader.CreateDeepCopy(source);
            double offlineTimeBefore = working.offlineTime;
            double usedThisInfinityBefore = working.offlineTimeUsedThisInfinity;
            double usedPreviousInfinityBefore = working.offlineTimeUsedPreviousInfinity;
            string quitTimestampBefore = working.dateQuitString;

            using var scope = new SaveMigrationTestScope();
            MigrationRunResult result = scope.RunProductionMigration(working);

            Assert.IsTrue(result.Succeeded, result.ToReportString());
            Assert.AreEqual(fixture.sourceSchema, result.StartingVersion, fixture.id);
            Assert.AreEqual(CurrentSchema, result.EndingVersion, fixture.id);
            Assert.AreEqual(CurrentSchema, working.saveVersion, fixture.id);
            AssertSentinels(fixture, working);
            AssertNormalizedShape(working);
            Assert.AreEqual(offlineTimeBefore, working.offlineTime, 0d, $"{fixture.id} offlineTime");
            Assert.AreEqual(
                usedThisInfinityBefore,
                working.offlineTimeUsedThisInfinity,
                0d,
                $"{fixture.id} offlineTimeUsedThisInfinity");
            Assert.AreEqual(
                usedPreviousInfinityBefore,
                working.offlineTimeUsedPreviousInfinity,
                0d,
                $"{fixture.id} offlineTimeUsedPreviousInfinity");
            Assert.AreEqual(quitTimestampBefore, working.dateQuitString, $"{fixture.id} dateQuitString");
            Assert.AreEqual(0, scope.SaveWriteCount, $"{fixture.id} must not publish or persist migration output.");
            Assert.IsFalse(scope.Subject.Loaded, $"{fixture.id} must not enter the runtime load lifecycle.");

            Assert.AreEqual(fixture.sourceSchema, source.saveVersion, $"{fixture.id} decoded source schema");
            AssertSentinels(fixture, source);
            Assert.AreEqual(
                sourceHashBefore,
                SaveFixtureLoader.ComputeSaveDataSha256(source),
                $"{fixture.id} decoded source object was mutated.");
            Assert.AreEqual(
                fixtureHashBefore,
                SaveFixtureLoader.ComputeFileSha256(fixture.fixturePath),
                $"{fixture.id} fixture bytes were mutated.");
        }

        /// <summary>
        /// Verifies identical source copies migrate deterministically and a second V11 pass is idempotent.
        /// </summary>
        /// <param name="fixtureId">The immutable fixture manifest identifier.</param>
        [TestCase(Schema7RawJsonId)]
        [TestCase(Schema8DebugDtoId)]
        [TestCase(Schema8CanonicalIdb1Id)]
        public void Fixture_MigrationIsDeterministicAndIdempotent(string fixtureId)
        {
            SaveFixtureDefinition fixture = SaveFixtureLoader.GetFixture(_manifest, fixtureId);
            Assert.IsTrue(SaveFixtureLoader.TryDecode(fixture, out Oracle.SaveDataSettings source), fixture.id);
            string sourceHashBefore = SaveFixtureLoader.ComputeSaveDataSha256(source);
            Oracle.SaveDataSettings first = SaveFixtureLoader.CreateDeepCopy(source);
            Oracle.SaveDataSettings second = SaveFixtureLoader.CreateDeepCopy(source);

            using var scope = new SaveMigrationTestScope();
            MigrationRunResult firstResult = scope.RunProductionMigration(first);
            MigrationRunResult secondResult = scope.RunProductionMigration(second);

            Assert.IsTrue(firstResult.Succeeded, firstResult.ToReportString());
            Assert.IsTrue(secondResult.Succeeded, secondResult.ToReportString());
            string firstHash = SaveFixtureLoader.ComputeSaveDataSha256(first);
            string secondHash = SaveFixtureLoader.ComputeSaveDataSha256(second);
            Assert.AreEqual(firstHash, secondHash, $"{fixture.id} produced non-deterministic V11 graphs.");

            MigrationRunResult idempotentResult = scope.RunProductionMigration(first);

            Assert.IsTrue(idempotentResult.Succeeded, idempotentResult.ToReportString());
            Assert.AreEqual(CurrentSchema, idempotentResult.StartingVersion, fixture.id);
            Assert.AreEqual(CurrentSchema, idempotentResult.EndingVersion, fixture.id);
            Assert.AreEqual(
                firstHash,
                SaveFixtureLoader.ComputeSaveDataSha256(first),
                $"{fixture.id} changed on a second V11 normalization pass.");
            Assert.AreEqual(0, scope.SaveWriteCount, $"{fixture.id} repeatability checks must not write storage.");
            Assert.IsFalse(scope.Subject.Loaded, $"{fixture.id} repeatability checks must not enter lifecycle load.");
            Assert.AreEqual(
                sourceHashBefore,
                SaveFixtureLoader.ComputeSaveDataSha256(source),
                $"{fixture.id} decoded source changed during repeatability checks.");
        }

        /// <summary>
        /// Verifies a thrown migration step cannot mutate the decoded source object or immutable artifact.
        /// </summary>
        [Test]
        public void FailedMigration_PreservesDecodedSourceAndFixtureArtifact()
        {
            SaveFixtureDefinition fixture = SaveFixtureLoader.GetFixture(_manifest, Schema7RawJsonId);
            Assert.IsTrue(SaveFixtureLoader.TryDecode(fixture, out Oracle.SaveDataSettings source), fixture.id);
            string sourceHashBefore = SaveFixtureLoader.ComputeSaveDataSha256(source);
            string fixtureHashBefore = SaveFixtureLoader.ComputeFileSha256(fixture.fixturePath);
            Oracle.SaveDataSettings working = SaveFixtureLoader.CreateDeepCopy(source);
            var registry = new MigrationRegistry();
            registry.AddStep(new MigrationStep(
                CurrentSchema,
                "Intentional fixture failure",
                "Mutates only the isolated working copy and then fails.",
                context =>
                {
                    context.SaveData.dateStarted = "mutated-working-copy";
                    throw new InvalidOperationException("intentional migration characterization failure");
                }));
            var options = new MigrationRunOptions
            {
                CaptureSnapshots = true,
                IncludeEnsureStep = false,
                ThrowOnError = false,
                UpdateLastSuccessfulLoadUtc = false
            };

            using var scope = new SaveMigrationTestScope();
            MigrationRunResult result = scope.RunMigration(working, registry, options);

            Assert.IsFalse(result.Succeeded, result.ToReportString());
            Assert.AreEqual(fixture.sourceSchema, result.StartingVersion, fixture.id);
            Assert.AreEqual(fixture.sourceSchema, result.EndingVersion, fixture.id);
            Assert.AreEqual("mutated-working-copy", working.dateStarted, "The failure step did not execute as intended.");
            Assert.AreEqual(fixture.sourceSchema, source.saveVersion, fixture.id);
            AssertSentinels(fixture, source);
            Assert.AreEqual(
                sourceHashBefore,
                SaveFixtureLoader.ComputeSaveDataSha256(source),
                "A failed isolated migration mutated its decoded source object.");
            Assert.AreEqual(
                fixtureHashBefore,
                SaveFixtureLoader.ComputeFileSha256(fixture.fixturePath),
                "A failed isolated migration mutated its fixture artifact.");
            Assert.AreEqual(0, scope.SaveWriteCount, "A failed migration attempted to publish or persist.");
            Assert.IsFalse(scope.Subject.Loaded, "A failed migration entered the runtime load lifecycle.");
        }

        /// <summary>
        /// Verifies unsupported future schemas stop before any normalization or lifecycle side effect.
        /// </summary>
        [Test]
        public void FutureSchema_RejectsBeforeNormalizationOrPublication()
        {
            SaveFixtureDefinition fixture = SaveFixtureLoader.GetFixture(_manifest, Schema8CanonicalIdb1Id);
            Assert.IsTrue(SaveFixtureLoader.TryDecode(fixture, out Oracle.SaveDataSettings source), fixture.id);
            Oracle.SaveDataSettings future = SaveFixtureLoader.CreateDeepCopy(source);
            future.saveVersion = CurrentSchema + 1;
            future.dysonVerseSaveData.selectedPreset = 0;
            future.dysonVerseSaveData.dysonVerseInfinityData.skillStateById = null;
            future.dysonVerseSaveData.dysonVerseInfinityData.assemblyLines = null;
            double offlineTimeBefore = future.offlineTime;
            string futureHashBefore = SaveFixtureLoader.ComputeSaveDataSha256(future);

            using var scope = new SaveMigrationTestScope();
            MigrationRunResult result = scope.RunProductionMigration(future);

            Assert.IsFalse(result.Succeeded, result.ToReportString());
            Assert.AreEqual(CurrentSchema + 1, result.StartingVersion);
            Assert.AreEqual(CurrentSchema + 1, result.EndingVersion);
            Assert.IsEmpty(result.Steps, "A future schema must stop before migration and ensure steps.");
            Assert.AreEqual(0, future.dysonVerseSaveData.selectedPreset, "Future data was normalized before rejection.");
            Assert.IsNull(
                future.dysonVerseSaveData.dysonVerseInfinityData.skillStateById,
                "Future ID state was normalized before rejection.");
            Assert.IsNull(
                future.dysonVerseSaveData.dysonVerseInfinityData.assemblyLines,
                "Future facility arrays were normalized before rejection.");
            Assert.AreEqual(offlineTimeBefore, future.offlineTime, 0d, "Future rejection granted offline time.");
            Assert.AreEqual(
                futureHashBefore,
                SaveFixtureLoader.ComputeSaveDataSha256(future),
                "Future rejection mutated the candidate object.");
            Assert.AreEqual(0, scope.SaveWriteCount, "Future rejection attempted to publish or persist.");
            Assert.IsFalse(scope.Subject.Loaded, "Future rejection entered the runtime load lifecycle.");
        }

        /// <summary>
        /// Verifies the complete V11 shape required by save, migration, skill-ID, research-ID, and facility consumers.
        /// </summary>
        /// <param name="settings">The successfully migrated V11 settings.</param>
        private static void AssertNormalizedShape(Oracle.SaveDataSettings settings)
        {
            Assert.IsNotNull(settings.saveData);
            Assert.IsNotNull(settings.sdPrestige);
            Assert.IsNotNull(settings.sdSimulation);
            Assert.IsNotNull(settings.prestigePlus);
            Assert.IsNotNull(settings.avocadoData);
            Assert.IsNotNull(settings.dysonVerseSaveData);

            Oracle.DysonVerseSaveData dyson = settings.dysonVerseSaveData;
            Assert.IsNotNull(dyson.dysonVerseInfinityData);
            Assert.IsNotNull(dyson.dysonVersePrestigeData);
            Assert.IsNotNull(dyson.dysonVerseSkillTreeData);
            Assert.That(dyson.selectedPreset, Is.InRange(1, 5));
            AssertAllAutoAssignmentCollections(dyson);

            Oracle.DysonVerseInfinityData infinity = dyson.dysonVerseInfinityData;
            Assert.IsNotNull(infinity.skillStateById);
            Assert.IsNotNull(infinity.skillOwnedById);
            Assert.IsNotNull(infinity.researchLevelsById);
            Assert.IsTrue(infinity.skillStateById.Keys.All(key => !string.IsNullOrWhiteSpace(key)));
            Assert.IsTrue(infinity.skillOwnedById.Keys.All(key => !string.IsNullOrWhiteSpace(key)));
            Assert.IsTrue(infinity.researchLevelsById.Keys.All(key => !string.IsNullOrWhiteSpace(key)));
            Assert.IsNotEmpty(infinity.skillStateById, "V11 skill state must be projected to stable IDs.");
            Assert.IsNotEmpty(infinity.skillOwnedById, "V11 skill ownership must be projected to stable IDs.");
            Assert.IsNotEmpty(infinity.researchLevelsById, "V11 research levels must be projected to stable IDs.");
            Assert.IsNotNull(infinity.skillOwnedBits);
            Assert.IsNotEmpty(infinity.skillOwnedBits, "V11 skill ownership bitset must have canonical capacity.");

            AssertFacilityArray(infinity.assemblyLines, "assemblyLines");
            AssertFacilityArray(infinity.managers, "managers");
            AssertFacilityArray(infinity.servers, "servers");
            AssertFacilityArray(infinity.dataCenters, "dataCenters");
            AssertFacilityArray(infinity.planets, "planets");
            AssertFacilityArray(infinity.matrioshkaBrains, "matrioshkaBrains");
            AssertFacilityArray(infinity.birchPlanets, "birchPlanets");
            AssertFacilityArray(infinity.galacticBrains, "galacticBrains");

            Assert.IsNull(infinity.assemblyLinesSparseIndices);
            Assert.IsNull(infinity.assemblyLinesSparseValues);
            Assert.IsNull(infinity.managersSparseIndices);
            Assert.IsNull(infinity.managersSparseValues);
            Assert.IsNull(infinity.serversSparseIndices);
            Assert.IsNull(infinity.serversSparseValues);
            Assert.IsNull(infinity.dataCentersSparseIndices);
            Assert.IsNull(infinity.dataCentersSparseValues);
            Assert.IsNull(infinity.planetsSparseIndices);
            Assert.IsNull(infinity.planetsSparseValues);
            Assert.IsNull(infinity.matrioshkaBrainsSparseIndices);
            Assert.IsNull(infinity.matrioshkaBrainsSparseValues);
            Assert.IsNull(infinity.birchPlanetsSparseIndices);
            Assert.IsNull(infinity.birchPlanetsSparseValues);
            Assert.IsNull(infinity.galacticBrainsSparseIndices);
            Assert.IsNull(infinity.galacticBrainsSparseValues);
        }

        /// <summary>
        /// Verifies all legacy-key and stable-ID auto-assignment collections exist after normalization.
        /// </summary>
        /// <param name="data">The normalized Dyson Verse container.</param>
        private static void AssertAllAutoAssignmentCollections(Oracle.DysonVerseSaveData data)
        {
            Assert.IsNotNull(data.skillAutoAssignmentList);
            Assert.IsNotNull(data.skillAutoAssignmentList1);
            Assert.IsNotNull(data.skillAutoAssignmentList2);
            Assert.IsNotNull(data.skillAutoAssignmentList3);
            Assert.IsNotNull(data.skillAutoAssignmentList4);
            Assert.IsNotNull(data.skillAutoAssignmentList5);
            Assert.IsNotNull(data.skillAutoAssignmentIds);
            Assert.IsNotNull(data.skillAutoAssignmentIds1);
            Assert.IsNotNull(data.skillAutoAssignmentIds2);
            Assert.IsNotNull(data.skillAutoAssignmentIds3);
            Assert.IsNotNull(data.skillAutoAssignmentIds4);
            Assert.IsNotNull(data.skillAutoAssignmentIds5);
            Assert.IsNotNull(data.skillAutoAssignmentBits);
        }

        /// <summary>
        /// Verifies one normalized dense facility array has exactly its auto/manual slots.
        /// </summary>
        /// <param name="values">The normalized dense values.</param>
        /// <param name="label">The facility field label.</param>
        private static void AssertFacilityArray(double[] values, string label)
        {
            Assert.IsNotNull(values, label);
            Assert.AreEqual(2, values.Length, label);
        }

        /// <summary>
        /// Verifies every durable sentinel declared for a fixture survives migration.
        /// </summary>
        /// <param name="fixture">The fixture contract.</param>
        /// <param name="settings">The source or migrated settings.</param>
        private static void AssertSentinels(SaveFixtureDefinition fixture, Oracle.SaveDataSettings settings)
        {
            foreach (SaveFixtureSentinel sentinel in fixture.sentinels)
            {
                object actual = SaveFixtureLoader.ReadSentinelValue(settings, sentinel.path);
                string message = $"{fixture.id} sentinel '{sentinel.path}'";

                switch (sentinel.kind)
                {
                    case "string":
                        Assert.AreEqual(sentinel.value, actual as string, message);
                        break;
                    case "bool":
                        Assert.AreEqual(
                            bool.Parse(sentinel.value),
                            Convert.ToBoolean(actual, CultureInfo.InvariantCulture),
                            message);
                        break;
                    case "double":
                        Assert.AreEqual(
                            SaveFixtureLoader.ParseDouble(sentinel.value),
                            Convert.ToDouble(actual, CultureInfo.InvariantCulture),
                            0d,
                            message);
                        break;
                    case "int64":
                        Assert.AreEqual(
                            long.Parse(sentinel.value, NumberStyles.Integer, CultureInfo.InvariantCulture),
                            Convert.ToInt64(actual, CultureInfo.InvariantCulture),
                            message);
                        break;
                    default:
                        Assert.Fail($"{message} has unsupported kind '{sentinel.kind}'.");
                        break;
                }
            }
        }
    }
}
