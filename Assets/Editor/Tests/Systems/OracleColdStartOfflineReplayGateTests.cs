using System;
using System.Globalization;
using System.Reflection;
using Expansion;
using NUnit.Framework;
using Systems.Save;
using UnityEngine;

/*
 * OracleColdStartOfflineReplayGateTests
 * Purpose (editor tests): Verifies cold-start lifecycle save gating and quit-timestamp replay consumption in Oracle.Persistence.
 * Runs: Unity EditMode test runner (headless-friendly).
 * Primary entry points: NUnit [Test] cases invoking private Oracle persistence methods via reflection.
 * Owns vs delegates:
 * - Owns fixture setup/teardown, private-state seeding, and behavioral assertions for gate/debounce/replay-consume logic.
 * - Delegates production behavior to Expansion.Oracle persistence/runtime seam code paths.
 *
 * Interacts with:
 * - Assets/Scripts/Expansion/Oracle.Persistence.cs (SaveForLifecycleTrigger, AwayForSeconds)
 * - Assets/Scripts/Expansion/Oracle.RuntimeSeams.cs (clock/save-store seams)
 * - Systems.Save.IClock / Systems.Save.ISaveStore
 *
 * Change notes:
 * - If private method or field names change in Oracle persistence, update reflection bindings in this fixture.
 * - These tests intentionally avoid exposing new public APIs; keep them aligned with runtime behavior.
 */
namespace Tests.Systems
{
    [TestFixture]
    public sealed class OracleColdStartOfflineReplayGateTests
    {
        private static readonly MethodInfo SaveForLifecycleTriggerMethod =
            typeof(Oracle).GetMethod("SaveForLifecycleTrigger", BindingFlags.Instance | BindingFlags.NonPublic);

        private static readonly MethodInfo AwayForSecondsMethod =
            typeof(Oracle).GetMethod("AwayForSeconds", BindingFlags.Instance | BindingFlags.NonPublic);

        private Oracle _oracle;
        private GameObject _oracleObject;
        private Oracle _previousOracle;

        [SetUp]
        public void SetUp()
        {
            Assert.IsNotNull(SaveForLifecycleTriggerMethod, "Could not bind Oracle.SaveForLifecycleTrigger via reflection.");
            Assert.IsNotNull(AwayForSecondsMethod, "Could not bind Oracle.AwayForSeconds via reflection.");

            _previousOracle = Oracle.oracle;
            _oracleObject = new GameObject("OracleColdStartOfflineReplayGateTests");
            _oracleObject.hideFlags = HideFlags.HideAndDontSave;
            _oracle = _oracleObject.AddComponent<Oracle>();
            _oracle.WipeSaveData();
            _oracle.saveSettings.dateStarted = "2026-02-15T18:00:00Z";

            // EditMode AddComponent does not guarantee Awake execution order for singleton wiring.
            Oracle.oracle = _oracle;
        }

        [TearDown]
        public void TearDown()
        {
            if (_oracleObject != null)
            {
                UnityEngine.Object.DestroyImmediate(_oracleObject);
                _oracleObject = null;
            }

            _oracle = null;
            Oracle.oracle = _previousOracle;
        }

        [Test]
        public void SaveForLifecycleTrigger_ColdStartGate_FirstRequestSavesWithoutUpdatingQuitTimestamp()
        {
            var saveStore = new RecordingSaveStore();
            var clock = new FakeClock { UtcNow = new DateTime(2026, 2, 15, 20, 0, 0, DateTimeKind.Utc) };
            _oracle.saveSettings.dateQuitString = "2026-02-15T19:00:00Z";

            SeedRuntimeForLifecycleTests(saveStore, clock, loaded: true, ready: false, coldStartPending: true, gateSaveUsed: false);
            InvokeSaveForLifecycleTrigger(LifecycleSaveTrigger.Pause);

            Assert.AreEqual(1, saveStore.SaveCount, "First gated lifecycle request should save exactly once.");
            Assert.AreEqual("2026-02-15T19:00:00Z", _oracle.saveSettings.dateQuitString,
                "Cold-start gated save should not overwrite quit timestamp.");
            Assert.IsTrue(GetPrivateField<bool>(_oracle, "_coldStartGateSaveUsed"),
                "First gated save should consume the cold-start save slot.");
        }

        [Test]
        public void SaveForLifecycleTrigger_ColdStartGate_SecondRequestIsDebounced()
        {
            var saveStore = new RecordingSaveStore();
            var clock = new FakeClock { UtcNow = new DateTime(2026, 2, 15, 20, 0, 0, DateTimeKind.Utc) };
            _oracle.saveSettings.dateQuitString = "2026-02-15T19:00:00Z";

            SeedRuntimeForLifecycleTests(saveStore, clock, loaded: true, ready: false, coldStartPending: true, gateSaveUsed: false);
            InvokeSaveForLifecycleTrigger(LifecycleSaveTrigger.FocusLost);
            InvokeSaveForLifecycleTrigger(LifecycleSaveTrigger.Pause);

            Assert.AreEqual(1, saveStore.SaveCount, "Second lifecycle request in cold-start gate should be debounced.");
            Assert.AreEqual("2026-02-15T19:00:00Z", _oracle.saveSettings.dateQuitString,
                "Debounced request must not mutate quit timestamp.");
        }

        [Test]
        public void SaveForLifecycleTrigger_AfterGateReleased_UpdatesQuitTimestamp()
        {
            var saveStore = new RecordingSaveStore();
            var clock = new FakeClock { UtcNow = new DateTime(2026, 2, 15, 21, 0, 0, DateTimeKind.Utc) };
            _oracle.saveSettings.dateQuitString = "2026-02-15T19:00:00Z";

            SeedRuntimeForLifecycleTests(saveStore, clock, loaded: true, ready: true, coldStartPending: false, gateSaveUsed: false);
            InvokeSaveForLifecycleTrigger(LifecycleSaveTrigger.Quit);

            Assert.AreEqual(1, saveStore.SaveCount, "Lifecycle save should persist once after gate release.");
            Assert.AreEqual(clock.UtcNow.ToString(CultureInfo.InvariantCulture), _oracle.saveSettings.dateQuitString,
                "Post-gate lifecycle save should stamp the current quit timestamp.");
        }

        [Test]
        public void AwayForSeconds_WithQuitInput_ClearsQuitTimestampInMemoryAfterReplay()
        {
            var clock = new FakeClock { UtcNow = new DateTime(2026, 2, 15, 22, 0, 0, DateTimeKind.Utc) };
            _oracle.saveSettings.dateStarted = "2026-02-15T18:00:00Z";
            _oracle.saveSettings.dateQuitString = "2026-02-15T21:30:00Z";

            SetPrivateField(_oracle, "_clock", clock);
            SetPrivateField(_oracle, "_awayTimeCalculator", new OfflineAwayTimeCalculator(clock));

            AwayForSecondsMethod.Invoke(_oracle, Array.Empty<object>());

            Assert.IsTrue(string.IsNullOrEmpty(_oracle.saveSettings.dateQuitString),
                "Away replay should consume quit timestamp in memory after grant application.");
        }

        private void SeedRuntimeForLifecycleTests(
            ISaveStore saveStore,
            IClock clock,
            bool loaded,
            bool ready,
            bool coldStartPending,
            bool gateSaveUsed)
        {
            _oracle.Loaded = loaded;
            SetPrivateField(_oracle, "_isSaveReady", ready);
            SetPrivateField(_oracle, "_coldStartReplayPending", coldStartPending);
            SetPrivateField(_oracle, "_coldStartGateSaveUsed", gateSaveUsed);
            SetPrivateField(_oracle, "_saveStore", saveStore);
            SetPrivateField(_oracle, "_clock", clock);
        }

        private void InvokeSaveForLifecycleTrigger(LifecycleSaveTrigger trigger)
        {
            SaveForLifecycleTriggerMethod.Invoke(_oracle, new object[] { trigger });
        }

        private static void SetPrivateField(object target, string fieldName, object value)
        {
            FieldInfo field = target.GetType().GetField(fieldName, BindingFlags.Instance | BindingFlags.NonPublic);
            Assert.IsNotNull(field, $"Could not find private field '{fieldName}'.");
            field.SetValue(target, value);
        }

        private static T GetPrivateField<T>(object target, string fieldName)
        {
            FieldInfo field = target.GetType().GetField(fieldName, BindingFlags.Instance | BindingFlags.NonPublic);
            Assert.IsNotNull(field, $"Could not find private field '{fieldName}'.");
            return (T)field.GetValue(target);
        }

        private sealed class FakeClock : IClock
        {
            public DateTime UtcNow { get; set; }
        }

        private sealed class RecordingSaveStore : ISaveStore
        {
            public int SaveCount { get; private set; }
            public Oracle.SaveDataSettings LastSaved { get; private set; }

            public bool Exists()
            {
                return LastSaved != null;
            }

            public bool TryLoad(out Oracle.SaveDataSettings loaded, out string error)
            {
                loaded = LastSaved;
                error = Exists() ? null : "No save available.";
                return Exists();
            }

            public bool TrySave(Oracle.SaveDataSettings settings, out SaveStringStats stats, out string error)
            {
                SaveCount++;
                LastSaved = settings;
                stats = default;
                error = null;
                return true;
            }
        }
    }
}
