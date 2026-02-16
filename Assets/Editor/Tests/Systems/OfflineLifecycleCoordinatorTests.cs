using System.Collections.Generic;
using NUnit.Framework;
using Systems.Save;

/*
 * OfflineLifecycleCoordinatorTests
 * Purpose (editor tests): Characterizes lifecycle event routing to save/reload requests.
 * Runs: Unity EditMode test runner (headless-friendly).
 * Primary entry points: NUnit [Test] cases in this file.
 * Owns vs delegates:
 * - Owns lifecycle permutation assertions (focus/pause/quit order and callback counts).
 * - Delegates lifecycle policy execution to Systems.Save.OfflineLifecycleCoordinator.
 *
 * Interacts with:
 * - Systems.Save.ILifecycleEvents/ManualLifecycleEvents
 * - Systems.Save.OfflineLifecycleCoordinator
 *
 * Change notes:
 * - Any lifecycle policy changes in OfflineLifecycleCoordinator should update expected phase/order assertions here.
 * - Focus-loss save behavior is platform policy; keep both enabled/disabled expectations covered.
 */
namespace Tests.Systems
{
    [TestFixture]
    public sealed class OfflineLifecycleCoordinatorTests
    {
        [Test]
        public void FocusLostPauseQuit_TriggersSaveForEachLifecycleEvent()
        {
            var lifecycleEvents = new ManualLifecycleEvents();
            var savePhases = new List<LifecycleSaveTrigger>();
            int reloadCount = 0;

            using var coordinator = new OfflineLifecycleCoordinator(
                lifecycleEvents,
                phase => savePhases.Add(phase),
                () => reloadCount++,
                reloadOnFocusGain: false,
                saveOnFocusLoss: true);

            lifecycleEvents.RaiseFocusChanged(false);
            lifecycleEvents.RaisePauseChanged(true);
            lifecycleEvents.RaiseQuitRequested();

            CollectionAssert.AreEqual(
                new[] { LifecycleSaveTrigger.FocusLost, LifecycleSaveTrigger.Pause, LifecycleSaveTrigger.Quit },
                savePhases);
            Assert.AreEqual(0, reloadCount);
        }

        [Test]
        public void PauseTruePauseFalseQuit_OnlyPauseTrueAndQuitTriggerSave()
        {
            var lifecycleEvents = new ManualLifecycleEvents();
            var savePhases = new List<LifecycleSaveTrigger>();

            using var coordinator = new OfflineLifecycleCoordinator(
                lifecycleEvents,
                phase => savePhases.Add(phase),
                () => { },
                reloadOnFocusGain: false,
                saveOnFocusLoss: false);

            lifecycleEvents.RaisePauseChanged(true);
            lifecycleEvents.RaisePauseChanged(false);
            lifecycleEvents.RaiseQuitRequested();

            CollectionAssert.AreEqual(
                new[] { LifecycleSaveTrigger.Pause, LifecycleSaveTrigger.Quit },
                savePhases);
        }

        [Test]
        public void RapidFocusToggles_RequestsSaveOnlyOnFocusLoss()
        {
            var lifecycleEvents = new ManualLifecycleEvents();
            var savePhases = new List<LifecycleSaveTrigger>();
            int reloadCount = 0;

            using var coordinator = new OfflineLifecycleCoordinator(
                lifecycleEvents,
                phase => savePhases.Add(phase),
                () => reloadCount++,
                reloadOnFocusGain: false,
                saveOnFocusLoss: true);

            lifecycleEvents.RaiseFocusChanged(false);
            lifecycleEvents.RaiseFocusChanged(true);
            lifecycleEvents.RaiseFocusChanged(false);
            lifecycleEvents.RaiseFocusChanged(true);

            CollectionAssert.AreEqual(
                new[] { LifecycleSaveTrigger.FocusLost, LifecycleSaveTrigger.FocusLost },
                savePhases);
            Assert.AreEqual(0, reloadCount);
        }

        [Test]
        public void FocusGainReloadEnabled_ReloadsOnEachFocusGain()
        {
            var lifecycleEvents = new ManualLifecycleEvents();
            int saveCount = 0;
            int reloadCount = 0;

            using var coordinator = new OfflineLifecycleCoordinator(
                lifecycleEvents,
                _ => saveCount++,
                () => reloadCount++,
                reloadOnFocusGain: true,
                saveOnFocusLoss: true);

            lifecycleEvents.RaiseFocusChanged(true);
            lifecycleEvents.RaiseFocusChanged(false);
            lifecycleEvents.RaiseFocusChanged(true);

            Assert.AreEqual(1, saveCount);
            Assert.AreEqual(2, reloadCount);
        }

        [Test]
        public void Dispose_UnsubscribesFromEvents()
        {
            var lifecycleEvents = new ManualLifecycleEvents();
            int saveCount = 0;
            int reloadCount = 0;

            var coordinator = new OfflineLifecycleCoordinator(
                lifecycleEvents,
                _ => saveCount++,
                () => reloadCount++,
                reloadOnFocusGain: true,
                saveOnFocusLoss: true);

            coordinator.Dispose();

            lifecycleEvents.RaisePauseChanged(true);
            lifecycleEvents.RaiseFocusChanged(false);
            lifecycleEvents.RaiseFocusChanged(true);
            lifecycleEvents.RaiseQuitRequested();

            Assert.AreEqual(0, saveCount);
            Assert.AreEqual(0, reloadCount);
        }

        [Test]
        public void FocusLossDisabled_DoesNotRequestSave()
        {
            var lifecycleEvents = new ManualLifecycleEvents();
            int saveCount = 0;

            using var coordinator = new OfflineLifecycleCoordinator(
                lifecycleEvents,
                _ => saveCount++,
                () => { },
                reloadOnFocusGain: false,
                saveOnFocusLoss: false);

            lifecycleEvents.RaiseFocusChanged(false);

            Assert.AreEqual(0, saveCount);
        }
    }
}
