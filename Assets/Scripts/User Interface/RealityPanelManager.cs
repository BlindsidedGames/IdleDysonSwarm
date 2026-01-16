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
/// Handles dual-mode display (locked progress bar vs unlocked worker bar),
/// visibility state, and first-run transitions.
/// </summary>
public class RealityPanelManager : MonoBehaviour
{
    private GameObject _realityUnlockFillObject;
    private GameObject _realityFillBar;
    private GameObject _realityFillBarWorkers;
    private GameObject _reality;
    private GameObject _realityToggle;
    private GameObject _realityImage;
    private GameObject _realityTextObject;
    private GameObject _realityMenuButtonObject;
    private GameObject _simulations;
    private GameObject _simulationsToggle;

    private SlicedFilledImage _realityUnlockFill;
    private TMP_Text _realityText;
    private Button _realityMenuButton;
    private IWorkerService _workerService;

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

        _realityUnlockFillObject = refs.realityUnlockFillObject;
        _realityFillBar = refs.realityFillBar;
        _realityFillBarWorkers = refs.realityFillBarWorkers;
        _reality = refs.reality;
        _realityToggle = refs.realityToggle;
        _realityImage = refs.realityImage;
        _realityTextObject = refs.realityTextObject;
        _realityMenuButtonObject = refs.realityMenuButtonObject;
        _simulations = refs.simulations;
        _simulationsToggle = refs.simulationsToggle;

        CacheComponents();
    }

    private void CacheComponents()
    {
        _realityUnlockFill = null;
        _realityText = null;
        _realityMenuButton = null;

        if (_realityUnlockFillObject != null)
            _realityUnlockFill = _realityUnlockFillObject.GetComponent<SlicedFilledImage>();
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
        _realityToggle.SetActive(unlocked && SceneManager.GetActiveScene().buildIndex == 1);
        _simulations.SetActive(unlocked);
        if (_realityMenuButton != null)
            _realityMenuButton.interactable = unlocked;

        if (_realityText != null)
        {
            _realityText.text = oracle.saveSettings.realityFirstRun
                ? "Reality"
                : "<align=\"center\"><sprite=4 color=#CCC2C5>";
        }

        UpdateFillBarMode(unlocked);
        HandleFirstRun(unlocked);
    }

    private void UpdateFillBarMode(bool unlocked)
    {
        if (_realityFillBar == null || _realityFillBarWorkers == null) return;

        if (unlocked)
        {
            _realityFillBar.SetActive(false);
            _realityFillBarWorkers.SetActive(true);
        }
        else
        {
            _realityFillBar.SetActive(true);
            _realityFillBarWorkers.SetActive(false);
            if (_realityUnlockFill != null)
                _realityUnlockFill.fillAmount = (float)PrestigeData.secretsOfTheUniverse / MaxSecrets;
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
