using System;

namespace Systems.Save
{
    /*
     * ILifecycleEvents / ManualLifecycleEvents
     * Purpose (runtime): Testable signal surface for app lifecycle transitions (pause/focus/quit).
     * Runs: Runtime and editor tests.
     * Primary entry points:
     * - ILifecycleEvents.PauseChanged
     * - ILifecycleEvents.FocusChanged
     * - ILifecycleEvents.QuitRequested
     * - ManualLifecycleEvents.Raise* methods (used by Oracle callbacks/tests)
     * Owns vs delegates:
     * - Owns event dispatch contract only.
     * - Delegates lifecycle policy decisions to consumers such as OfflineLifecycleCoordinator.
     *
     * Interacts with:
     * - Systems.Save.OfflineLifecycleCoordinator
     * - Expansion.Oracle (OnApplicationPause/Focus/Quit bridges)
     * - Editor tests in Assets/Editor/Tests/Systems/**
     *
     * Change notes:
     * - Renaming/removing events requires synchronized updates across Oracle and lifecycle tests.
     * - Event ordering assumptions are validated by tests; preserve deterministic dispatch semantics.
     */
    public interface ILifecycleEvents
    {
        event Action<bool> PauseChanged;
        event Action<bool> FocusChanged;
        event Action QuitRequested;
    }

    public sealed class ManualLifecycleEvents : ILifecycleEvents
    {
        public event Action<bool> PauseChanged;
        public event Action<bool> FocusChanged;
        public event Action QuitRequested;

        public void RaisePauseChanged(bool paused)
        {
            PauseChanged?.Invoke(paused);
        }

        public void RaiseFocusChanged(bool focused)
        {
            FocusChanged?.Invoke(focused);
        }

        public void RaiseQuitRequested()
        {
            QuitRequested?.Invoke();
        }
    }
}
