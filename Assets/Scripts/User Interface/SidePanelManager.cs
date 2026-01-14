using UnityEngine;

/// <summary>
/// Coordinator for side panel managers. Provides backward-compatible access
/// to panel toggle GameObjects for DebugOptions and Oracle references.
/// </summary>
/// <remarks>
/// The actual panel logic has been split into:
/// - InfinityPanelManager: Handles Infinity tab UI
/// - PrestigePanelManager: Handles Prestige/Quantum tab UI
/// - RealityPanelManager: Handles Reality tab UI
/// - OfflineTimeFillBar: Handles offline time display
/// </remarks>
public class SidePanelManager : MonoBehaviour
{
    [Header("Panel Managers")]
    [SerializeField] private InfinityPanelManager _infinityPanelManager;
    [SerializeField] private PrestigePanelManager _prestigePanelManager;
    [SerializeField] private RealityPanelManager _realityPanelManager;

    /// <summary>
    /// Backward-compatible accessor for DebugOptions and Oracle.
    /// </summary>
    public GameObject InfinityToggle => _infinityPanelManager.InfinityToggle;

    /// <summary>
    /// Backward-compatible accessor for DebugOptions and Oracle.
    /// </summary>
    public GameObject PrestigeToggle => _prestigePanelManager.PrestigeToggle;

    /// <summary>
    /// Backward-compatible accessor for DebugOptions.
    /// Note: lowercase 'r' to match original field name.
    /// </summary>
    public GameObject realityToggle => _realityPanelManager.RealityToggle;

    /// <summary>
    /// Backward-compatible accessor for DebugOptions.
    /// </summary>
    public GameObject simulationsToggle => _realityPanelManager.SimulationsToggle;

    private void Update()
    {
#if UNITY_IOS || UNITY_ANDROID
        if (Input.GetKeyDown(KeyCode.Escape))
            gameObject.SetActive(false);
#endif
    }
}
