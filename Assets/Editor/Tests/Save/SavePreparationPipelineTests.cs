/*
 * Purpose: Verifies prepared-save decode, migration, validation, isolation, and canonical output contracts.
 * Runs: Unity EditMode test runner only.
 * Primary entry points: NUnit fixture, future-version, migration-failure, and validation tests.
 * Owns: Prepared result classification and immutable source assertions.
 * Delegates: Real migration dependencies to SaveMigrationTestScope and fixture IO to SaveFixtureLoader.
 *
 * Interacts with:
 * - Assets/Scripts/Systems/Save/SavePreparationPipeline.cs and SaveDataValidator.cs.
 * - Assets/Editor/Tests/Save/SaveMigrationTestScope.cs.
 * - Assets/Editor/Tests/Save/Fixtures/fixture-manifest.json.
 *
 * Change notes:
 * - Successful results must be isolated schema 11 graphs with uppercase canonical output.
 * - Failed results, including null durable skill-state values, must never expose Settings or CanonicalText.
 * - The legacy non-finite bots overflow marker must prepare to a finite runtime sentinel, while non-finite values
 *   in other durable fields remain validation failures.
 * - Overflow preparation must clear stale packed/unpacked transition state, and runtime coverage must prove repeated
 *   overflow markers remain consumable without production or ordinary-prestige races.
 * - Fixture and decoded-source immutability remain hard compatibility gates.
 */

using System;
using System.Reflection;
using Expansion;
using NUnit.Framework;
using Systems.Migrations;
using Systems.Save;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace Tests.Save
{
    /// <summary>
    /// Characterizes the complete preparation boundary before runtime publication or canonical storage.
    /// </summary>
    [TestFixture]
    public sealed class SavePreparationPipelineTests
    {
        private const string Schema7RawJsonId = "schema-07-raw-json-20260202-045325";
        private const string Schema8DebugDtoId = "schema-08-debug-dto-20260202-060115";
        private const string Schema8CanonicalIdb1Id = "schema-08-canonical-idb1-main-save";
        private SaveFixtureManifest _manifest;

        /// <summary>
        /// Loads the immutable fixture manifest.
        /// </summary>
        [OneTimeSetUp]
        public void OneTimeSetUp()
        {
            _manifest = SaveFixtureLoader.LoadManifest();
        }

        /// <summary>
        /// Verifies each guaranteed artifact prepares to an isolated validated V11 canonical result.
        /// </summary>
        /// <param name="fixtureId">The immutable fixture identifier.</param>
        [TestCase(Schema7RawJsonId)]
        [TestCase(Schema8DebugDtoId)]
        [TestCase(Schema8CanonicalIdb1Id)]
        public void GuaranteedFixture_PreparesWithoutMutatingDecodedSourceOrArtifact(string fixtureId)
        {
            SaveFixtureDefinition fixture = SaveFixtureLoader.GetFixture(_manifest, fixtureId);
            string artifactHashBefore = SaveFixtureLoader.ComputeFileSha256(fixture.fixturePath);
            Assert.IsTrue(SaveFixtureLoader.TryDecode(fixture, out Oracle.SaveDataSettings source), fixture.id);
            string sourceHashBefore = SaveFixtureLoader.ComputeSaveDataSha256(source);

            using var scope = new SaveMigrationTestScope();
            SavePreparationPipeline pipeline = scope.CreatePreparationPipeline();
            PreparedSaveResult fromText = pipeline.PrepareText(SaveFixtureLoader.LoadText(fixture));
            PreparedSaveResult fromSettings = pipeline.PrepareSettings(source);

            AssertPreparedV11(fromText);
            AssertPreparedV11(fromSettings);
            Assert.AreEqual(fixture.sourceSchema, fromText.SourceSchema, fixture.id);
            Assert.AreEqual(fixture.sourceSchema, fromSettings.SourceSchema, fixture.id);
            Assert.AreNotSame(source, fromSettings.Settings, fixture.id);
            Assert.AreEqual(
                sourceHashBefore,
                SaveFixtureLoader.ComputeSaveDataSha256(source),
                $"{fixture.id} decoded source was mutated by preparation.");
            Assert.AreEqual(
                artifactHashBefore,
                SaveFixtureLoader.ComputeFileSha256(fixture.fixturePath),
                $"{fixture.id} artifact was mutated by preparation.");
            Assert.AreEqual(0, scope.SaveWriteCount, $"{fixture.id} preparation attempted a storage write.");
            Assert.IsFalse(scope.Subject.Loaded, $"{fixture.id} preparation entered runtime load lifecycle.");
        }

        /// <summary>
        /// Verifies future schemas fail before migration/normalization and remain unchanged.
        /// </summary>
        [Test]
        public void FutureSchema_ReturnsClassifiedFailureBeforeMigration()
        {
            var future = new Oracle.SaveDataSettings { saveVersion = 12 };
            future.dysonVerseSaveData.selectedPreset = 0;
            future.dysonVerseSaveData.dysonVerseInfinityData.assemblyLines = null;
            string sourceHashBefore = SaveFixtureLoader.ComputeSaveDataSha256(future);

            using var scope = new SaveMigrationTestScope();
            PreparedSaveResult result = scope.CreatePreparationPipeline().PrepareSettings(future);

            AssertFailure(result, PreparedSaveFailureReason.UnsupportedFutureVersion);
            Assert.AreEqual(12, result.SourceSchema);
            Assert.AreEqual(
                sourceHashBefore,
                SaveFixtureLoader.ComputeSaveDataSha256(future),
                "Future candidate changed before rejection.");
            Assert.AreEqual(0, scope.SaveWriteCount);
        }

        /// <summary>
        /// Verifies a failed migration mutates only its private working copy and returns no publishable state.
        /// </summary>
        [Test]
        public void MigrationFailure_ReturnsNoPublishableStateAndPreservesSource()
        {
            var source = new Oracle.SaveDataSettings { saveVersion = 8 };
            source.dysonVerseSaveData.dysonVerseInfinityData.money = 42d;
            string sourceHashBefore = SaveFixtureLoader.ComputeSaveDataSha256(source);
            var pipeline = new SavePreparationPipeline(
                11,
                working =>
                {
                    working.dysonVerseSaveData.dysonVerseInfinityData.money = 999d;
                    return new MigrationRunResult
                    {
                        Succeeded = false,
                        StartingVersion = 8,
                        EndingVersion = 8
                    };
                });

            PreparedSaveResult result = pipeline.PrepareSettings(source);

            AssertFailure(result, PreparedSaveFailureReason.MigrationFailed);
            Assert.AreEqual(
                sourceHashBefore,
                SaveFixtureLoader.ComputeSaveDataSha256(source),
                "Migration failure escaped the isolated working copy.");
            Assert.AreEqual(42d, source.dysonVerseSaveData.dysonVerseInfinityData.money);
        }

        /// <summary>
        /// Verifies the historically supported non-finite bots marker prepares to a finite, canonical runtime signal.
        /// </summary>
        /// <param name="useInfinity">Whether to exercise Infinity instead of NaN.</param>
        [TestCase(false, TestName = "BotOverflowSignal_NaN_PreparesAsFiniteCanonicalRuntimeSignal")]
        [TestCase(true, TestName = "BotOverflowSignal_Infinity_PreparesAsFiniteCanonicalRuntimeSignal")]
        public void BotOverflowSignal_PreparesAsFiniteCanonicalRuntimeSignal(bool useInfinity)
        {
            var source = new Oracle.SaveDataSettings { saveVersion = 11 };
            double sourceSignal = useInfinity ? double.PositiveInfinity : double.NaN;
            source.dysonVerseSaveData.dysonVerseInfinityData.bots = sourceSignal;
            source.dysonVerseSaveData.dysonVersePrestigeData.infinityPoints = 17;
            source.avocadoData.overflowMultiplier = 9d;
            source.prestigePlus.avocatoOverflow = 4d;
            source.infinityInProgress = true;
            source.hasPackedSettingsFlags = true;
            source.packedSettingsFlags = 1UL << 6;
            string sourceHashBefore = SaveFixtureLoader.ComputeSaveDataSha256(source);

            using var scope = new SaveMigrationTestScope();
            PreparedSaveResult result = scope.CreatePreparationPipeline().PrepareSettings(source);

            AssertPreparedV11(result);
            Assert.AreEqual(double.MaxValue, result.Settings.dysonVerseSaveData.dysonVerseInfinityData.bots);
            Assert.AreEqual(17, result.Settings.dysonVerseSaveData.dysonVersePrestigeData.infinityPoints);
            Assert.AreEqual(9d, result.Settings.avocadoData.overflowMultiplier);
            Assert.AreEqual(4d, result.Settings.prestigePlus.avocatoOverflow);
            Assert.IsFalse(result.Settings.infinityInProgress);
            Assert.AreEqual(0UL, result.Settings.packedSettingsFlags & (1UL << 6));
            Assert.IsTrue(
                SaveCodec.TryDecodeSaveSettings(result.CanonicalText, out Oracle.SaveDataSettings canonicalRoundTrip));
            Assert.AreEqual(double.MaxValue, canonicalRoundTrip.dysonVerseSaveData.dysonVerseInfinityData.bots);
            Assert.IsFalse(canonicalRoundTrip.infinityInProgress);
            Assert.AreEqual(0UL, canonicalRoundTrip.packedSettingsFlags & (1UL << 6));
            Assert.AreEqual(sourceHashBefore, SaveFixtureLoader.ComputeSaveDataSha256(source));
            Assert.IsTrue(source.infinityInProgress);
            Assert.AreNotEqual(0UL, source.packedSettingsFlags & (1UL << 6));
            Assert.AreEqual(
                useInfinity,
                double.IsPositiveInfinity(source.dysonVerseSaveData.dysonVerseInfinityData.bots));
            Assert.AreEqual(
                !useInfinity,
                double.IsNaN(source.dysonVerseSaveData.dysonVerseInfinityData.bots));
            Assert.AreEqual(0, scope.SaveWriteCount);
            Assert.IsFalse(scope.Subject.Loaded);
        }

        /// <summary>
        /// Verifies runtime recognizes the prepared finite marker without broadening normal bots overflow detection.
        /// </summary>
        [Test]
        public void PreparedBotOverflowSentinel_IsRecognizedOnlyByOverflowContract()
        {
            MethodInfo method = typeof(Oracle).GetMethod(
                "IsBotOverflowSignal",
                BindingFlags.NonPublic | BindingFlags.Static);

            Assert.IsNotNull(method);
            Assert.IsTrue((bool)method.Invoke(null, new object[] { double.NaN }));
            Assert.IsTrue((bool)method.Invoke(null, new object[] { double.PositiveInfinity }));
            Assert.IsTrue((bool)method.Invoke(null, new object[] { double.NegativeInfinity }));
            Assert.IsTrue((bool)method.Invoke(null, new object[] { double.MaxValue }));
            Assert.IsFalse((bool)method.Invoke(null, new object[] { double.Epsilon }));
            Assert.IsFalse((bool)method.Invoke(null, new object[] { 0d }));
            Assert.IsFalse((bool)method.Invoke(null, new object[] { 1d }));
        }

        /// <summary>
        /// Verifies stale transition state cannot block a prepared overflow and that a second overflow is consumable.
        /// </summary>
        [Test]
        public void PreparedOverflow_WithStaleTransitionState_ConsumesTwiceAndClearsGuard()
        {
            var source = new Oracle.SaveDataSettings
            {
                saveVersion = 11,
                infinityFirstRunDone = true,
                infinityInProgress = true,
                hasPackedSettingsFlags = true,
                packedSettingsFlags = 1UL << 6
            };
            source.dysonVerseSaveData.dysonVerseInfinityData.bots = double.MaxValue;
            source.dysonVerseSaveData.dysonVersePrestigeData.infinityPoints = 17;
            source.avocadoData.overflowMultiplier = 9d;
            source.prestigePlus.avocatoOverflow = 4d;

            using var scope = new SaveMigrationTestScope();
            PreparedSaveResult prepared = scope.CreatePreparationPipeline().PrepareSettings(source);
            AssertPreparedV11(prepared);
            Assert.IsFalse(prepared.Settings.infinityInProgress);
            Assert.AreEqual(0UL, prepared.Settings.packedSettingsFlags & (1UL << 6));

            scope.Subject.saveSettings = prepared.Settings;
            GameObject gameManagerObject = null;
            GameObject confirmationObject = null;
            GameObject confirmationPanel = null;
            GameObject prestigeTextObject = null;
            GameObject prestigeScreen = null;
            GameObject prestigeButtonObject = null;
            GameObject rotatorObject = null;
            Rotator previousRotator = Rotator.Instance;
            try
            {
                gameManagerObject = new GameObject("OverflowRuntimeGameManager");
                GameManager gameManager = gameManagerObject.AddComponent<GameManager>();

                confirmationObject = new GameObject("OverflowRuntimeConfirmation");
                SkillTreeConfirmationManager confirmation =
                    confirmationObject.AddComponent<SkillTreeConfirmationManager>();
                confirmationPanel = new GameObject("OverflowRuntimeConfirmationPanel");
                SetPrivateField(confirmation, "confirmationGo", confirmationPanel);

                prestigeTextObject = new GameObject(
                    "OverflowRuntimePrestigeText",
                    typeof(RectTransform),
                    typeof(CanvasRenderer),
                    typeof(TextMeshProUGUI));
                TMP_Text prestigeText = prestigeTextObject.GetComponent<TextMeshProUGUI>();
                prestigeScreen = new GameObject("OverflowRuntimePrestigeScreen");
                prestigeScreen.SetActive(false);

                SetPrivateField(gameManager, "skillTreeConfirmationManager", confirmation);
                SetPrivateField(gameManager, "runAgePrestigeScreen", prestigeText);
                SetPrivateField(gameManager, "infinityButton", Array.Empty<GameObject>());
                SetPrivateField(gameManager, "prestigeScreen", prestigeScreen);

                prestigeButtonObject = new GameObject(
                    "OverflowRuntimePrestigeButton",
                    typeof(RectTransform),
                    typeof(CanvasRenderer),
                    typeof(Image),
                    typeof(Button));
                SetPrivateField(scope.Subject, "prestigeButton", prestigeButtonObject.GetComponent<Button>());
                SetPrivateField(scope.Subject, "_gameManager", gameManager);

                rotatorObject = new GameObject("OverflowRuntimeRotator");
                Rotator rotator = rotatorObject.AddComponent<Rotator>();
                rotator.panels = Array.Empty<GameObject>();
                SetStaticPrivateField(typeof(Rotator), "<Instance>k__BackingField", rotator);

                AssertOverflowFrameDefersThenConsumes(
                    scope.Subject,
                    gameManager,
                    expectedInfinityPoints: 1018,
                    expectedOverflowMultiplier: 10d,
                    expectedLegacyOverflow: 5d);

                scope.Subject.saveSettings.dysonVerseSaveData.dysonVerseInfinityData.bots = double.MaxValue;
                AssertOverflowFrameDefersThenConsumes(
                    scope.Subject,
                    gameManager,
                    expectedInfinityPoints: 2019,
                    expectedOverflowMultiplier: 11d,
                    expectedLegacyOverflow: 6d);
            }
            finally
            {
                SetStaticPrivateField(typeof(Rotator), "<Instance>k__BackingField", previousRotator);
                DestroyImmediate(rotatorObject);
                DestroyImmediate(prestigeButtonObject);
                DestroyImmediate(prestigeScreen);
                DestroyImmediate(prestigeTextObject);
                DestroyImmediate(confirmationPanel);
                DestroyImmediate(confirmationObject);
                DestroyImmediate(gameManagerObject);
            }

            Assert.AreEqual(0, scope.SaveWriteCount);
            Assert.IsFalse(scope.Subject.Loaded);
        }

        /// <summary>
        /// Verifies non-finite state outside the supported bots marker remains invalid after production normalization.
        /// </summary>
        /// <param name="useInfinity">Whether to exercise Infinity instead of NaN.</param>
        [TestCase(false, TestName = "NonBotNumericState_NaN_ReturnsValidationFailure")]
        [TestCase(true, TestName = "NonBotNumericState_Infinity_ReturnsValidationFailure")]
        public void NonBotNonFiniteNumericState_ReturnsValidationFailure(bool useInfinity)
        {
            var source = new Oracle.SaveDataSettings { saveVersion = 11 };
            source.dysonVerseSaveData.dysonVerseInfinityData.money =
                useInfinity ? double.PositiveInfinity : double.NaN;
            string sourceHashBefore = SaveFixtureLoader.ComputeSaveDataSha256(source);

            using var scope = new SaveMigrationTestScope();
            PreparedSaveResult result = scope.CreatePreparationPipeline().PrepareSettings(source);

            AssertFailure(result, PreparedSaveFailureReason.ValidationFailed);
            StringAssert.Contains("non-finite", result.Error);
            Assert.AreEqual(sourceHashBefore, SaveFixtureLoader.ComputeSaveDataSha256(source));
            Assert.AreEqual(0, scope.SaveWriteCount);
            Assert.IsFalse(scope.Subject.Loaded);
        }

        /// <summary>
        /// Verifies a null stable-ID skill state remains isolated and cannot become publishable runtime state.
        /// </summary>
        [Test]
        public void NullSkillStateValue_ReturnsValidationFailureWithoutPublication()
        {
            const string malformedSkillId = "malformed-null-state";
            var source = new Oracle.SaveDataSettings { saveVersion = 11 };
            source.dysonVerseSaveData.dysonVerseInfinityData.skillStateById[malformedSkillId] = null;
            string sourceHashBefore = SaveFixtureLoader.ComputeSaveDataSha256(source);

            using var scope = new SaveMigrationTestScope();
            PreparedSaveResult result = scope.CreatePreparationPipeline().PrepareSettings(source);

            AssertFailure(result, PreparedSaveFailureReason.ValidationFailed);
            StringAssert.Contains("skillStateById", result.Error);
            StringAssert.Contains("null value", result.Error);
            Assert.IsTrue(
                source.dysonVerseSaveData.dysonVerseInfinityData.skillStateById.ContainsKey(malformedSkillId));
            Assert.IsNull(source.dysonVerseSaveData.dysonVerseInfinityData.skillStateById[malformedSkillId]);
            Assert.AreEqual(sourceHashBefore, SaveFixtureLoader.ComputeSaveDataSha256(source));
            Assert.AreEqual(0, scope.SaveWriteCount);
            Assert.IsFalse(scope.Subject.Loaded);
        }

        /// <summary>
        /// Verifies GameManager defers a pending marker before Oracle consumes it through the special overflow path.
        /// </summary>
        /// <param name="oracle">The isolated runtime Oracle.</param>
        /// <param name="gameManager">The wired runtime GameManager.</param>
        /// <param name="expectedInfinityPoints">Expected points after the special award and Infinity reset.</param>
        /// <param name="expectedOverflowMultiplier">Expected canonical overflow multiplier.</param>
        /// <param name="expectedLegacyOverflow">Expected mirrored legacy overflow count.</param>
        private static void AssertOverflowFrameDefersThenConsumes(
            Oracle oracle,
            GameManager gameManager,
            long expectedInfinityPoints,
            double expectedOverflowMultiplier,
            double expectedLegacyOverflow)
        {
            Oracle.SaveDataSettings settings = oracle.saveSettings;
            long pointsBefore = settings.dysonVerseSaveData.dysonVersePrestigeData.infinityPoints;
            double overflowBefore = settings.avocadoData.overflowMultiplier;

            InvokePrivateUpdate(gameManager);

            Assert.AreEqual(double.MaxValue, settings.dysonVerseSaveData.dysonVerseInfinityData.bots);
            Assert.AreEqual(pointsBefore, settings.dysonVerseSaveData.dysonVersePrestigeData.infinityPoints);
            Assert.AreEqual(overflowBefore, settings.avocadoData.overflowMultiplier);

            InvokePrivateUpdate(oracle);

            Assert.AreEqual(expectedInfinityPoints, settings.dysonVerseSaveData.dysonVersePrestigeData.infinityPoints);
            Assert.AreEqual(expectedOverflowMultiplier, settings.avocadoData.overflowMultiplier);
            Assert.AreEqual(expectedLegacyOverflow, settings.prestigePlus.avocatoOverflow);
            Assert.IsFalse(settings.infinityInProgress);
            Assert.AreEqual(1d, settings.dysonVerseSaveData.dysonVerseInfinityData.bots);
        }

        /// <summary>
        /// Assigns a private serialized field in an isolated runtime test object.
        /// </summary>
        /// <param name="target">The object that owns the field.</param>
        /// <param name="fieldName">The private field name.</param>
        /// <param name="value">The value to assign.</param>
        private static void SetPrivateField(object target, string fieldName, object value)
        {
            FieldInfo field = target.GetType().GetField(
                fieldName,
                BindingFlags.Instance | BindingFlags.NonPublic);
            Assert.IsNotNull(field, $"{target.GetType().Name}.{fieldName}");
            field.SetValue(target, value);
        }

        /// <summary>
        /// Assigns a private static field while preserving the prior test-environment singleton.
        /// </summary>
        /// <param name="type">The type that owns the field.</param>
        /// <param name="fieldName">The private static field name.</param>
        /// <param name="value">The value to assign.</param>
        private static void SetStaticPrivateField(Type type, string fieldName, object value)
        {
            FieldInfo field = type.GetField(
                fieldName,
                BindingFlags.Static | BindingFlags.NonPublic);
            Assert.IsNotNull(field, $"{type.Name}.{fieldName}");
            field.SetValue(null, value);
        }

        /// <summary>
        /// Invokes the private Unity Update method on an isolated runtime component.
        /// </summary>
        /// <param name="target">The Oracle or GameManager component.</param>
        private static void InvokePrivateUpdate(object target)
        {
            MethodInfo method = target.GetType().GetMethod(
                "Update",
                BindingFlags.Instance | BindingFlags.NonPublic);
            Assert.IsNotNull(method, $"{target.GetType().Name}.Update");
            method.Invoke(target, Array.Empty<object>());
        }

        /// <summary>
        /// Destroys a temporary Unity object when it was created.
        /// </summary>
        /// <param name="gameObject">The object to destroy.</param>
        private static void DestroyImmediate(GameObject gameObject)
        {
            if (gameObject != null)
            {
                UnityEngine.Object.DestroyImmediate(gameObject);
            }
        }

        /// <summary>
        /// Verifies a successful result is isolated, current, validated, and canonical.
        /// </summary>
        /// <param name="result">The prepared result.</param>
        private static void AssertPreparedV11(PreparedSaveResult result)
        {
            Assert.IsNotNull(result);
            Assert.IsTrue(result.Succeeded, result.Error);
            Assert.AreEqual(PreparedSaveFailureReason.None, result.FailureReason);
            Assert.AreEqual(SaveDecodeFailureReason.None, result.DecodeFailureReason);
            Assert.IsNotNull(result.Settings);
            Assert.AreEqual(11, result.PreparedSchema);
            Assert.AreEqual(11, result.Settings.saveVersion);
            Assert.IsNotNull(result.CanonicalText);
            Assert.IsTrue(result.CanonicalText.StartsWith(SaveCodec.BinarySavePrefix, StringComparison.Ordinal));
        }

        /// <summary>
        /// Verifies a failed result exposes classification but no publishable settings or canonical output.
        /// </summary>
        /// <param name="result">The failed result.</param>
        /// <param name="reason">The expected failure category.</param>
        private static void AssertFailure(
            PreparedSaveResult result,
            PreparedSaveFailureReason reason)
        {
            Assert.IsNotNull(result);
            Assert.IsFalse(result.Succeeded);
            Assert.AreEqual(reason, result.FailureReason);
            Assert.IsNull(result.Settings);
            Assert.IsNull(result.CanonicalText);
            Assert.IsFalse(string.IsNullOrWhiteSpace(result.Error));
        }
    }
}
