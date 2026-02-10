using Expansion;
using UnityEngine;
using UnityEngine.SceneManagement;
using static Expansion.Oracle;

/*
Purpose (runtime): Toggles a "debug tainted" icon based on whether debug has ever been enabled for the current save.

Primary entry points:
- Unity: OnEnable/OnDisable (subscribe), Start/HandleDebugOptionsChanged (refresh).

Interacts with:
- Expansion.Oracle.saveSettings.debugEverEnabled
- Expansion.Oracle.DebugOptionsChanged

Change notes:
- This is intentionally display-only. The source of truth is the save flag.
*/
public sealed class DebugEverEnabledIndicator : MonoBehaviour
{
    [SerializeField] private GameObject iconRoot;

    private void OnEnable()
    {
        DebugOptionsChanged += HandleDebugOptionsChanged;
        SceneManager.sceneLoaded += HandleSceneLoaded;
        Refresh();
    }

    private void OnDisable()
    {
        DebugOptionsChanged -= HandleDebugOptionsChanged;
        SceneManager.sceneLoaded -= HandleSceneLoaded;
    }

    private void Start()
    {
        // Oracle/saveSettings may not be ready on the first frame, so refresh again after the scene finishes loading.
        Refresh();
    }

    private void HandleSceneLoaded(Scene scene, LoadSceneMode mode)
    {
        Refresh();
    }

    private void HandleDebugOptionsChanged()
    {
        Refresh();
    }

    private void Refresh()
    {
        if (iconRoot == null) return;
        if (oracle == null || oracle.saveSettings == null)
        {
            iconRoot.SetActive(false);
            return;
        }

        iconRoot.SetActive(oracle.saveSettings.debugEverEnabled);
    }
}
