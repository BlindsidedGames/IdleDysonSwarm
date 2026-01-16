using TMPro;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;
using Blindsided.Utilities;
using IdleDysonSwarm.Services;
using static Expansion.Oracle;
using static IdleDysonSwarm.Systems.Constants.QuantumConstants;

/// <summary>
/// Manages the Reality tab UI in the side panel.
/// Shows unlock progress (secrets) before Reality is unlocked,
/// and worker batch progress after unlock.
/// </summary>
public class RealityPanelManager : MonoBehaviour
{
    private GameObject _realityFillObject;
    private GameObject _reality;
    private GameObject _realityToggle;
    private GameObject _realityImage;
    private GameObject _realityTextObject;
    private GameObject _realityMenuButtonObject;
    private GameObject _simulations;
    private GameObject _simulationsToggle;

    private SlicedFilledImage _realityFill;
    private TMP_Text _realityText;
    private Button _realityMenuButton;
    private IWorkerService _workerService;
    private bool _isPermanentPanel;

    /// <summary>
    /// Public accessor for backward compatibility with DebugOptions and Oracle.
    /// </summary>
    public GameObject RealityToggle => _realityToggle;

    /// <summary>
    /// Public accessor for backward compatibility with DebugOptions.
    /// </summary>
    public GameObject SimulationsToggle => _simulationsToggle;

    private DysonVersePrestigeData PrestigeData =>
        oracle.saveSettings.dysonVerseSaveData.dysonVersePrestigeData;
    private PrestigePlus PrestigePlus => oracle.saveSettings.prestigePlus;

    private void Awake()
    {
        _workerService = ServiceLocator.Get<IWorkerService>();
    }

    /// <summary>
    /// Sets UI references from a SidePanelReferences component.
    /// Called by SidePanelController when switching between panel variants.
    /// </summary>
    public void SetReferences(SidePanelReferences refs)
    {
        if (refs == null) return;

        _realityFillObject = refs.realityFillObject;
        _reality = refs.reality;
        _realityToggle = refs.realityToggle;
        _realityImage = refs.realityImage;
        _realityTextObject = refs.realityTextObject;
        _realityMenuButtonObject = refs.realityMenuButtonObject;
        _simulations = refs.simulations;
        _simulationsToggle = refs.simulationsToggle;
        _isPermanentPanel = refs.isPermanentPanel;

        CacheComponents();
    }

    private void CacheComponents()
    {
        _realityFill = null;
        _realityText = null;
        _realityMenuButton = null;

        if (_realityFillObject != null)
            _realityFill = _realityFillObject.GetComponent<SlicedFilledImage>();
        if (_realityTextObject != null)
            _realityText = _realityTextObject.GetComponent<TMP_Text>();
        if (_realityMenuButtonObject != null)
            _realityMenuButton = _realityMenuButtonObject.GetComponent<Button>();
    }

    private void Update()
    {
        UpdateRealityPanel();
    }

    private void UpdateRealityPanel()
    {
        // Skip update if references not yet set
        if (_reality == null || _realityToggle == null) return;

        bool show = PrestigePlus.points >= 1
            || PrestigeData.infinityPoints >= 1
            || oracle.saveSettings.unlockAllTabs;

        _reality.SetActive(show);
        if (!show) return;

        bool unlocked = _workerService.IsRealityUnlocked
            || oracle.saveSettings.unlockAllTabs;

        _realityImage.SetActive(unlocked);
        // Hide toggles in permanent mode since the panel is always visible
        _realityToggle.SetActive(!_isPermanentPanel && unlocked && SceneManager.GetActiveScene().buildIndex == 1);
        _simulations.SetActive(unlocked);
        _simulationsToggle.SetActive(!_isPermanentPanel && unlocked && SceneManager.GetActiveScene().buildIndex == 1);
        if (_realityMenuButton != null)
            _realityMenuButton.interactable = unlocked;

        if (_realityText != null)
        {
            _realityText.text = oracle.saveSettings.realityFirstRun
                ? "Reality"
                : "<align=\"center\"><sprite=4 color=#CCC2C5>";
        }

        UpdateFillBar(unlocked);
        HandleFirstRun(unlocked);
    }

    private void UpdateFillBar(bool unlocked)
    {
        if (_realityFill == null) return;

        if (unlocked)
        {
            // Show progress toward gathering Influence (128 workers needed)
            _realityFill.fillAmount = _workerService.WorkerFillPercent;
        }
        else
        {
            // Show progress toward unlocking Reality (secrets of the universe)
            _realityFill.fillAmount = (float)PrestigeData.secretsOfTheUniverse / MaxSecrets;
        }
    }

    private void HandleFirstRun(bool unlocked)
    {
        if (!unlocked || oracle.saveSettings.realityFirstRun) return;
        oracle.saveSettings.realityFirstRun = true;
        _realityToggle.GetComponent<Toggle>().isOn = false;
        _simulationsToggle.GetComponent<Toggle>().isOn = false;
    }
}
