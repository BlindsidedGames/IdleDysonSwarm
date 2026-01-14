using TMPro;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;
using Blindsided.Utilities;
using static Expansion.Oracle;
using static IdleDysonSwarm.Systems.Constants.QuantumConstants;

/// <summary>
/// Manages the Reality tab UI in the side panel.
/// Handles dual-mode display (locked progress bar vs unlocked worker bar),
/// visibility state, and first-run transitions.
/// </summary>
public class RealityPanelManager : MonoBehaviour
{
    [Header("UI References")]
    [SerializeField] private GameObject _realityUnlockFillObject;
    [SerializeField] private GameObject _realityFillBar;
    [SerializeField] private GameObject _realityFillBarWorkers;
    [SerializeField] private GameObject _reality;
    [SerializeField] private GameObject _realityToggle;
    [SerializeField] private GameObject _realityImage;
    [SerializeField] private GameObject _realityTextObject;
    [SerializeField] private GameObject _realityMenuButtonObject;
    [SerializeField] private GameObject _simulations;
    [SerializeField] private GameObject _simulationsToggle;

    private SlicedFilledImage _realityUnlockFill;
    private TMP_Text _realityText;
    private Button _realityMenuButton;

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
        bool show = PrestigePlus.points >= 1
            || PrestigeData.infinityPoints >= 1
            || oracle.saveSettings.unlockAllTabs;

        _reality.SetActive(show);
        if (!show) return;

        bool unlocked = PrestigePlus.points >= 1
            || PrestigeData.secretsOfTheUniverse >= MaxSecrets
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
