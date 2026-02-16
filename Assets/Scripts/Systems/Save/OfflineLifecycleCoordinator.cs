using System;

namespace Systems.Save
{
    /*
     * OfflineLifecycleCoordinator
     * Purpose (runtime): Centralizes lifecycle-trigger policy for save-on-background/quit and optional focus reload.
     * Runs: Runtime and editor tests.
     * Primary entry points:
     * - constructor (subscribes to ILifecycleEvents)
     * - Dispose() (unsubscribes)
     * Owns vs delegates:
     * - Owns the lifecycle policy matrix:
     *   pause(true) => request save, focus(false) => request save, quit => request save, focus(true) => optional reload.
     * - Delegates actual save/load work to injected callbacks.
     *
     * Interacts with:
     * - Systems.Save.ILifecycleEvents
     * - Expansion.Oracle (save/reload callbacks)
     * - Editor tests validating lifecycle permutations
     *
     * Change notes:
     * - Callback ordering materially affects persistence reliability; keep pause/focus/quit routing consistent.
     * - If focus-gain reload policy changes, update mobile behavior tests and Oracle integration docs together.
     */
    public sealed class OfflineLifecycleCoordinator : IDisposable
    {
        private readonly ILifecycleEvents _events;
        private readonly Action<string> _requestSaveForQuit;
        private readonly Action _requestReloadOnFocusGain;
        private readonly bool _reloadOnFocusGain;
        private bool _disposed;

        public OfflineLifecycleCoordinator(
            ILifecycleEvents lifecycleEvents,
            Action<string> requestSaveForQuit,
            Action requestReloadOnFocusGain,
            bool reloadOnFocusGain)
        {
            _events = lifecycleEvents ?? throw new ArgumentNullException(nameof(lifecycleEvents));
            _requestSaveForQuit = requestSaveForQuit ?? throw new ArgumentNullException(nameof(requestSaveForQuit));
            _requestReloadOnFocusGain = requestReloadOnFocusGain ?? throw new ArgumentNullException(nameof(requestReloadOnFocusGain));
            _reloadOnFocusGain = reloadOnFocusGain;

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
            _requestSaveForQuit("OnApplicationPause");
        }

        private void HandleFocusChanged(bool focused)
        {
            if (focused)
            {
                if (_reloadOnFocusGain)
                {
                    _requestReloadOnFocusGain();
                }

                return;
            }

            _requestSaveForQuit("OnApplicationFocusLost");
        }

        private void HandleQuitRequested()
        {
            _requestSaveForQuit("OnApplicationQuit");
        }
    }
}
