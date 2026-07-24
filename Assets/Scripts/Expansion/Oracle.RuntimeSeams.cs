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
     * - OnLifecycleSaveRequested(LifecycleSaveTrigger trigger)
     * - OnLifecycleReloadRequested()
     * Owns vs delegates:
     * - Owns dependency wiring and lifecycle coordinator subscription.
     * - Delegates actual persistence to Oracle.SaveForLifecycleTrigger()/Oracle.Load() and Systems.Save abstractions.
     *
     * Interacts with:
     * - Systems.Save.IClock/SystemClock
     * - Systems.Save.SavePreparationPipeline/ISaveStore/CanonicalSaveStore
     * - Systems.Save.ILifecycleEvents/OfflineLifecycleCoordinator/OfflineAwayTimeCalculator
     * - Oracle lifecycle callbacks in Assets/Scripts/Expansion/Oracle.cs
     *
     * Change notes:
     * - Lifecycle routing changes here affect save-on-background/quit behavior on all platforms.
     * - Focus-loss save policy is mobile-only; desktop focus changes must not stamp quit timestamps.
     * - Cold-start replay gating for lifecycle save behavior is enforced in Oracle.Persistence (SaveForLifecycleTrigger);
     *   this file should continue routing events only, without duplicating save policy state.
     * - CanonicalSaveStore must receive the Oracle-bound preparation pipeline before any load can publish state.
     * - If seam initialization order changes, ensure Oracle.Awake still initializes before any save/load callback.
     */
    public partial class Oracle
    {
        private IClock _clock;
        /// <summary>
        /// Owns decode, schema policy, migration, normalization, validation, and canonical re-encoding before publication.
        /// </summary>
        private SavePreparationPipeline _savePreparationPipeline;
        private ISaveStore _saveStore;
        private OfflineAwayTimeCalculator _awayTimeCalculator;
        private ManualLifecycleEvents _lifecycleEvents;
        private OfflineLifecycleCoordinator _offlineLifecycleCoordinator;

        private void EnsureRuntimeSeamsInitialized()
        {
            _clock ??= new SystemClock();
            _savePreparationPipeline ??= CreateSavePreparationPipeline();
            _saveStore ??= CanonicalSaveStore.CreateDefault(_savePreparationPipeline);
            _awayTimeCalculator ??= new OfflineAwayTimeCalculator(_clock);

            if (_lifecycleEvents == null)
            {
                _lifecycleEvents = new ManualLifecycleEvents();
            }

            if (_offlineLifecycleCoordinator == null)
            {
                _offlineLifecycleCoordinator = new OfflineLifecycleCoordinator(
                    _lifecycleEvents,
                    OnLifecycleSaveRequested, // Save triggers
                    OnLifecycleReloadRequested, // Optional reload on focus (mobile only, now disabled)
                    OnLifecycleFocusGained, // Optional offline time on focus (mobile only)
                    ShouldReloadOnFocusGain(),
                    ShouldSaveOnFocusLoss(),
                    ShouldSaveOnPause());
            }
        }

        private void RebuildTimeSeams()
        {
            _awayTimeCalculator = new OfflineAwayTimeCalculator(_clock ?? new SystemClock());
        }

        private static bool ShouldReloadOnFocusGain()
        {
            // By design, mobile now relies on OnLifecycleFocusGained to grant offline time 
            // without fully reloading the game on focus/unfocus.
            return false;
        }

        private static bool ShouldSaveOnFocusLoss()
        {
#if !UNITY_EDITOR && (UNITY_IOS || UNITY_ANDROID)
            return true;
#else
            return false;
#endif
        }

        private static bool ShouldSaveOnPause()
        {
#if !UNITY_EDITOR && (UNITY_IOS || UNITY_ANDROID)
            return true;
#else
            // Desktop pause (minimizing) should NOT stamp the quit timestamp to prevent gaining offline time while playing.
            return false;
#endif
        }

        private void OnLifecycleSaveRequested(LifecycleSaveTrigger trigger)
        {
            string phase = GetLifecyclePhaseLabel(trigger);
            Debug.LogWarning(
                $"[OfflineTimeDiag] AppLifecycle | phase={phase}, platform={Application.platform}, " +
                $"ready={_isSaveReady.ToString().ToLowerInvariant()}, loaded={Loaded.ToString().ToLowerInvariant()}, " +
                $"dateQuitBefore='{FormatDebugString(saveSettings?.dateQuitString)}'");
            SaveForLifecycleTrigger(trigger);
        }

        private void OnLifecycleReloadRequested()
        {
            Load();
        }

        private void OnLifecycleFocusGained()
        {
            Debug.LogWarning(
                $"[OfflineTimeDiag] AppLifecycle | phase=OnApplicationFocusGained, platform={Application.platform}, " +
                $"routing=AwayForSeconds");
            AwayForSeconds();
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

        private static string GetLifecyclePhaseLabel(LifecycleSaveTrigger trigger)
        {
            return trigger switch
            {
                LifecycleSaveTrigger.Pause => "OnApplicationPause",
                LifecycleSaveTrigger.FocusLost => "OnApplicationFocusLost",
                LifecycleSaveTrigger.Quit => "OnApplicationQuit",
                _ => "unknown"
            };
        }
    }
}
