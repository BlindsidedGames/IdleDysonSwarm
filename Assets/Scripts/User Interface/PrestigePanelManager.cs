using TMPro;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;
using Blindsided.Utilities;
using static Expansion.Oracle;

/// <summary>
/// Manages the Prestige/Quantum tab UI in the side panel.
/// Handles visibility, fill bar progress toward 42 IP, and first-run state.
/// </summary>
public class PrestigePanelManager : MonoBehaviour
{
    private GameObject _prestigeFillObject;
    private GameObject _prestige;
    private GameObject _prestigeToggle;
    private GameObject _prestigeImage;
    private GameObject _prestigeTextObject;
    private GameObject _prestigeMenuButtonObject;

    private SlicedFilledImage _prestigeFill;
    private TMP_Text _prestigeText;
    private Button _prestigeMenuButton;
    private bool _isPermanentPanel;

    /// <summary>
    /// Public accessor for backward compatibility with DebugOptions and Oracle.
    /// </summary>
    public GameObject PrestigeToggle => _prestigeToggle;

    private DysonVersePrestigeData PrestigeData =>
        oracle.saveSettings.dysonVerseSaveData.dysonVersePrestigeData;
    private PrestigePlus PrestigePlus => oracle.saveSettings.prestigePlus;

    /// <summary>
    /// Sets UI references from a SidePanelReferences component.
    /// Called by SidePanelController when switching between panel variants.
    /// </summary>
    public void SetReferences(SidePanelReferences refs)
    {
        if (refs == null) return;

        _prestigeFillObject = refs.prestigeFillObject;
        _prestige = refs.prestige;
        _prestigeToggle = refs.prestigeToggle;
        _prestigeImage = refs.prestigeImage;
        _prestigeTextObject = refs.prestigeTextObject;
        _prestigeMenuButtonObject = refs.prestigeMenuButtonObject;
        _isPermanentPanel = refs.isPermanentPanel;

        CacheComponents();
    }

    private void CacheComponents()
    {
        _prestigeFill = null;
        _prestigeText = null;
        _prestigeMenuButton = null;

        if (_prestigeFillObject != null)
            _prestigeFill = _prestigeFillObject.GetComponent<SlicedFilledImage>();
        if (_prestigeTextObject != null)
            _prestigeText = _prestigeTextObject.GetComponent<TMP_Text>();
        if (_prestigeMenuButtonObject != null)
            _prestigeMenuButton = _prestigeMenuButtonObject.GetComponent<Button>();
    }

    private void Update()
    {
        UpdatePrestigePanel();
    }

    private void UpdatePrestigePanel()
    {
        // Skip update if references not yet set
        if (_prestige == null || _prestigeToggle == null) return;

        bool show = PrestigePlus.points >= 1
            || PrestigeData.infinityPoints >= 1
            || oracle.saveSettings.unlockAllTabs;

        _prestige.SetActive(show);
        if (!show) return;

        bool unlocked = PrestigePlus.points >= 1
            || PrestigeData.infinityPoints >= 42
            || oracle.saveSettings.unlockAllTabs;

        _prestigeImage.SetActive(unlocked);
        // Hide toggle in permanent mode since the panel is always visible
        _prestigeToggle.SetActive(!_isPermanentPanel && unlocked && SceneManager.GetActiveScene().buildIndex == 1);
        if (_prestigeMenuButton != null)
            _prestigeMenuButton.interactable = unlocked;

        if (_prestigeText != null)
        {
            _prestigeText.text = oracle.saveSettings.prestigeFirstRun
                ? "Quantum"
                : "<align=\"center\"><sprite=4 color=#C8B3FF>";
        }

        if (_prestigeFill != null)
            _prestigeFill.fillAmount = (float)PrestigeData.infinityPoints / 42;

        HandleFirstRun(unlocked);
    }

    private void HandleFirstRun(bool unlocked)
    {
        if (!unlocked || oracle.saveSettings.prestigeFirstRun) return;
        oracle.saveSettings.prestigeFirstRun = true;
        _prestigeToggle.GetComponent<Toggle>().isOn = false;
    }
}
