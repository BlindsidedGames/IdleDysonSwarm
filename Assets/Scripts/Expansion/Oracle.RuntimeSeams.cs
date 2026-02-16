using System;
using System.Globalization;
using Systems.Save;
using UnityEngine;

namespace Expansion
{
    /*
     * Oracle.RuntimeSeams
     * Purpose (runtime): Centralized dependency seam initialization for time, canonical save store, and lifecycle routing.
     * Runs: Runtime (Oracle MonoBehaviour in scene) and editor tests that exercise seam-backed helpers.
     * Primary entry points:
     * - EnsureRuntimeSeamsInitialized()
     * - OnLifecycleSaveRequested(string phase)
     * - OnLifecycleReloadRequested()
     * Owns vs delegates:
     * - Owns dependency wiring and lifecycle coordinator subscription.
     * - Delegates actual persistence to Oracle.SaveForQuit()/Oracle.Load() and Systems.Save abstractions.
     *
     * Interacts with:
     * - Systems.Save.IClock/SystemClock
     * - Systems.Save.ISaveStore/CanonicalSaveStore
     * - Systems.Save.ILifecycleEvents/OfflineLifecycleCoordinator/OfflineAwayTimeCalculator
     * - Oracle lifecycle callbacks in Assets/Scripts/Expansion/Oracle.cs
     *
     * Change notes:
     * - Lifecycle routing changes here affect save-on-background/quit behavior on all platforms.
     * - If seam initialization order changes, ensure Oracle.Awake still initializes before any save/load callback.
     */
    public partial class Oracle
    {
        private IClock _clock;
        private ISaveStore _saveStore;
        private OfflineAwayTimeCalculator _awayTimeCalculator;
        private ManualLifecycleEvents _lifecycleEvents;
        private OfflineLifecycleCoordinator _offlineLifecycleCoordinator;

        private void EnsureRuntimeSeamsInitialized()
        {
            _clock ??= new SystemClock();
            _saveStore ??= CanonicalSaveStore.CreateDefault();
            _awayTimeCalculator ??= new OfflineAwayTimeCalculator(_clock);

            if (_lifecycleEvents == null)
            {
                _lifecycleEvents = new ManualLifecycleEvents();
            }

            if (_offlineLifecycleCoordinator == null)
            {
                _offlineLifecycleCoordinator = new OfflineLifecycleCoordinator(
                    _lifecycleEvents,
                    OnLifecycleSaveRequested,
                    OnLifecycleReloadRequested,
                    ShouldReloadOnFocusGain());
            }
        }

        private void RebuildTimeSeams()
        {
            _awayTimeCalculator = new OfflineAwayTimeCalculator(_clock ?? new SystemClock());
        }

        private static bool ShouldReloadOnFocusGain()
        {
#if !UNITY_EDITOR && (UNITY_IOS || UNITY_ANDROID)
            return true;
#else
            return false;
#endif
        }

        private void OnLifecycleSaveRequested(string phase)
        {
            Debug.LogWarning(
                $"[OfflineTimeDiag] AppLifecycle | phase={phase}, platform={Application.platform}, " +
                $"ready={_isSaveReady.ToString().ToLowerInvariant()}, loaded={Loaded.ToString().ToLowerInvariant()}, " +
                $"dateQuitBefore='{FormatDebugString(saveSettings?.dateQuitString)}'");
            SaveForQuit();
        }

        private void OnLifecycleReloadRequested()
        {
            Load();
        }

        internal void ConfigureRuntimeSeamsForTests(
            IClock clock = null,
            ISaveStore saveStore = null,
            ManualLifecycleEvents lifecycleEvents = null)
        {
            if (clock != null) _clock = clock;
            if (saveStore != null) _saveStore = saveStore;
            if (lifecycleEvents != null) _lifecycleEvents = lifecycleEvents;

            RebuildTimeSeams();

            _offlineLifecycleCoordinator?.Dispose();
            _offlineLifecycleCoordinator = null;
            EnsureRuntimeSeamsInitialized();
        }

        private string FormatUtcForOfflineDiag(DateTime value)
        {
            if (value == default) return "0001-01-01T00:00:00.0000000Z";
            return value.ToString("o", CultureInfo.InvariantCulture);
        }
    }
}
