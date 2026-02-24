using System;

namespace Systems.Save
{
    public enum LifecycleSaveTrigger
    {
        Pause,
        FocusLost,
        Quit
    }

    /*
     * OfflineLifecycleCoordinator
     * Purpose (runtime): Centralizes lifecycle-trigger policy for save-on-background/quit and optional focus reload.
     * Runs: Runtime and editor tests.
     * Primary entry points:
     * - constructor (subscribes to ILifecycleEvents)
     * - Dispose() (unsubscribes)
     * Owns vs delegates:
     * - Owns the lifecycle policy matrix:
     *   pause(saveOnPause) => request save, focus(false) => optional save (platform policy), quit => request save,
     *   focus(true) => optional reload or optional offline time calculation.
     * - Delegates actual save/load/time work to injected callbacks.
     *
     * Interacts with:
     * - Systems.Save.ILifecycleEvents
     * - Expansion.Oracle (save/reload callbacks)
     * - Editor tests validating lifecycle permutations
     *
     * Change notes:
     * - Callback ordering materially affects persistence reliability; keep pause/focus/quit routing consistent.
     * - Focus-loss save policy is platform-configurable via constructor; mobile and desktop expectations differ.
     * - If focus-gain reload policy changes, update mobile behavior tests and Oracle integration docs together.
     */
    public sealed class OfflineLifecycleCoordinator : IDisposable
    {
        private readonly ILifecycleEvents _events;
        private readonly Action<LifecycleSaveTrigger> _requestSaveForLifecycle;
        private readonly Action _requestReloadOnFocusGain;
        private readonly Action _requestOfflineTimeOnFocusGain;
        private readonly bool _reloadOnFocusGain;
        private readonly bool _saveOnFocusLoss;
        private readonly bool _saveOnPause;
        private bool _disposed;

        public OfflineLifecycleCoordinator(
            ILifecycleEvents lifecycleEvents,
            Action<LifecycleSaveTrigger> requestSaveForLifecycle,
            Action requestReloadOnFocusGain,
            Action requestOfflineTimeOnFocusGain,
            bool reloadOnFocusGain,
            bool saveOnFocusLoss,
            bool saveOnPause)
        {
            _events = lifecycleEvents ?? throw new ArgumentNullException(nameof(lifecycleEvents));
            _requestSaveForLifecycle =
                requestSaveForLifecycle ?? throw new ArgumentNullException(nameof(requestSaveForLifecycle));
            _requestReloadOnFocusGain = requestReloadOnFocusGain; // Can be null if unused
            _requestOfflineTimeOnFocusGain = requestOfflineTimeOnFocusGain; // Can be null if unused
            _reloadOnFocusGain = reloadOnFocusGain;
            _saveOnFocusLoss = saveOnFocusLoss;
            _saveOnPause = saveOnPause;

            _events.PauseChanged += HandlePauseChanged;
            _events.FocusChanged += HandleFocusChanged;
            _events.QuitRequested += HandleQuitRequested;
        }

        public void Dispose()
        {
            if (_disposed) return;
            _disposed = true;

            _events.PauseChanged -= HandlePauseChanged;
            _events.FocusChanged -= HandleFocusChanged;
            _events.QuitRequested -= HandleQuitRequested;
        }

        private void HandlePauseChanged(bool paused)
        {
            if (!paused) return;
            if (_saveOnPause)
            {
                _requestSaveForLifecycle(LifecycleSaveTrigger.Pause);
            }
        }

        private void HandleFocusChanged(bool focused)
        {
            if (focused)
            {
                if (_reloadOnFocusGain && _requestReloadOnFocusGain != null)
                {
                    _requestReloadOnFocusGain();
                }
                else if (_requestOfflineTimeOnFocusGain != null)
                {
                    _requestOfflineTimeOnFocusGain();
                }

                return;
            }

            if (_saveOnFocusLoss)
            {
                _requestSaveForLifecycle(LifecycleSaveTrigger.FocusLost);
            }
        }

        private void HandleQuitRequested()
        {
            _requestSaveForLifecycle(LifecycleSaveTrigger.Quit);
        }
    }
}
