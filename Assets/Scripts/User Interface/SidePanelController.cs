using UnityEngine;

/// <summary>
/// Controls which SidePanel variant is active based on screen width.
/// Switches between overlay (collapsible) and permanent (always visible) modes.
/// </summary>
/// <remarks>
/// Purpose:
/// - Chooses between overlay vs permanent side panel layouts based on safe-area width and updates dependent managers
///   with the correct <see cref="SidePanelReferences"/>.
///
/// Where it runs:
/// - Runtime (scene component; evaluates in <see cref="Start"/> and <see cref="Update"/>).
///
/// Primary entry points:
/// - <see cref="Start"/>: Initializes based on current width.
/// - <see cref="Update"/>: Swaps layouts when crossing the width threshold.
///
/// Interacts with:
/// - <see cref="SidePanelManager"/>, <see cref="InfinityPanelManager"/>, <see cref="PrestigePanelManager"/>,
///   <see cref="RealityPanelManager"/>, <see cref="OfflineTimeFillBar"/> (rebinds active references).
/// - <see cref="GameManager"/> (rebinds skill UI references for the active panel).
///
/// Change notes:
/// - Serialized references must be wired for both overlay and permanent variants.
/// - The bottom panel lip is intentionally kept active in both modes to support the offline time display.
/// </remarks>
public class SidePanelController : MonoBehaviour
{
    [Header("Panel Variants")]
    [SerializeField] private GameObject _overlayPanel;
    [SerializeField] private GameObject _permanentPanel;
    [SerializeField] private SidePanelReferences _overlayReferences;
    [SerializeField] private SidePanelReferences _permanentReferences;

    [Header("Related UI")]
    [SerializeField] private GameObject _bottomPanel;
    [SerializeField] private GameObject _bottomPanelLip;

    [Header("Managers")]
    [SerializeField] private SidePanelManager _sidePanelManager;
    [SerializeField] private InfinityPanelManager _infinityPanelManager;
    [SerializeField] private PrestigePanelManager _prestigePanelManager;
    [SerializeField] private RealityPanelManager _realityPanelManager;
    [SerializeField] private OfflineTimeFillBar _offlineTimeFillBar;
    [SerializeField] private GameManager _gameManager;

    [Header("Settings")]
    [SerializeField] private float _widthThreshold = 900f;

    [Header("Size Reference")]
    [SerializeField] private RectTransform _safeAreaRect;

    private bool _isPermanentActive;
    private bool _initialized;

    /// <summary>
    /// Gets the currently active panel's references.
    /// </summary>
    public SidePanelReferences ActiveReferences => _isPermanentActive ? _permanentReferences : _overlayReferences;

    private void Start()
    {
        // Determine initial state based on current width
        float currentWidth = GetCurrentWidth();
        _isPermanentActive = currentWidth >= _widthThreshold;

        // Apply initial state
        ApplyPanelState(_isPermanentActive);
        _initialized = true;
    }

    private void Update()
    {
        if (!_initialized) return;

        float currentWidth = GetCurrentWidth();
        bool shouldBePermanent = currentWidth >= _widthThreshold;

        if (shouldBePermanent != _isPermanentActive)
        {
            _isPermanentActive = shouldBePermanent;
            ApplyPanelState(_isPermanentActive);
        }
    }

    private float GetCurrentWidth()
    {
        if (_safeAreaRect != null)
            return _safeAreaRect.rect.width;

        // Fallback to screen width
        return Screen.width;
    }

    private void ApplyPanelState(bool usePermanent)
    {
        // Toggle permanent panel visibility
        if (_permanentPanel != null)
            _permanentPanel.SetActive(usePermanent);

        // Toggle bottom bar (show when in overlay mode)
        // Note: We don't activate the overlay panel here - it's controlled by the bottom bar button
        if (_bottomPanel != null)
            _bottomPanel.SetActive(!usePermanent);

        if (_bottomPanelLip != null)
            _bottomPanelLip.SetActive(true);

        // When switching to permanent mode, hide the overlay if it was open
        if (usePermanent && _overlayPanel != null)
            _overlayPanel.SetActive(false);

        // Update managers with new references
        var refs = usePermanent ? _permanentReferences : _overlayReferences;
        SetManagerReferences(refs);
    }

    private void SetManagerReferences(SidePanelReferences refs)
    {
        if (refs == null) return;

        _sidePanelManager?.SetReferences(refs);
        _infinityPanelManager?.SetReferences(refs);
        _prestigePanelManager?.SetReferences(refs);
        _realityPanelManager?.SetReferences(refs);
        _offlineTimeFillBar?.SetReferences(refs);
        _gameManager?.SetSkillsReferences(refs);
    }
}
