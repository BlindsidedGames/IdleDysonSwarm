using UnityEngine;
using UnityEngine.InputSystem;

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

    private SidePanelReferences _currentReferences;

    /// <summary>
    /// Backward-compatible accessor for DebugOptions and Oracle.
    /// </summary>
    public GameObject InfinityToggle => _currentReferences?.infinityToggle;

    /// <summary>
    /// Backward-compatible accessor for DebugOptions and Oracle.
    /// </summary>
    public GameObject PrestigeToggle => _currentReferences?.prestigeToggle;

    /// <summary>
    /// Backward-compatible accessor for DebugOptions.
    /// Note: lowercase 'r' to match original field name.
    /// </summary>
    public GameObject realityToggle => _currentReferences?.realityToggle;

    /// <summary>
    /// Backward-compatible accessor for DebugOptions.
    /// </summary>
    public GameObject simulationsToggle => _currentReferences?.simulationsToggle;

    /// <summary>
    /// Sets the current panel references.
    /// Called by SidePanelController when switching between panel variants.
    /// </summary>
    public void SetReferences(SidePanelReferences refs)
    {
        _currentReferences = refs;
    }
}
