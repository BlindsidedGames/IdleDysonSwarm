using System;
using Systems;
using TMPro;
using Unity.Mathematics;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;
using Blindsided.Utilities;
using static Expansion.Oracle;

/// <summary>
/// Manages the Infinity tab UI in the side panel.
/// Handles visibility, fill bar progress, and first-run state.
/// </summary>
public class InfinityPanelManager : MonoBehaviour
{
    [Header("UI References")]
    [SerializeField] private GameObject _infinityFillObject;
    [SerializeField] private GameObject _infinityToggle;
    [SerializeField] private GameObject _infinityImage;
    [SerializeField] private GameObject _infinityTextObject;
    [SerializeField] private GameObject _infinityMenuButtonObject;

    private SlicedFilledImage _infinityFill;
    private TMP_Text _infinityText;
    private Button _infinityMenuButton;

    /// <summary>
    /// Public accessor for backward compatibility with DebugOptions and Oracle.
    /// </summary>
    public GameObject InfinityToggle => _infinityToggle;

    private DysonVerseInfinityData InfinityData =>
        oracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData;
    private DysonVersePrestigeData PrestigeData =>
        oracle.saveSettings.dysonVerseSaveData.dysonVersePrestigeData;
    private PrestigePlus PrestigePlus => oracle.saveSettings.prestigePlus;

    private double _percent;

    private void Awake()
    {
        if (_infinityFillObject != null)
            _infinityFill = _infinityFillObject.GetComponent<SlicedFilledImage>();
        if (_infinityTextObject != null)
            _infinityText = _infinityTextObject.GetComponent<TMP_Text>();
        if (_infinityMenuButtonObject != null)
            _infinityMenuButton = _infinityMenuButtonObject.GetComponent<Button>();
    }

    private void Update()
    {
        UpdateInfinityPanel();
    }

    private void UpdateInfinityPanel()
    {
        bool autoPrestige = !PrestigePlus.breakTheLoop;
        double amount = PrestigePlus.divisionsPurchased > 0
            ? 4.2e19 / Math.Pow(10, PrestigePlus.divisionsPurchased)
            : 4.2e19;
        bool unlocked = PrestigeData.infinityPoints >= 1
            || oracle.saveSettings.prestigePlus.points >= 1
            || oracle.saveSettings.unlockAllTabs;

        _infinityImage.SetActive(unlocked);
        _infinityToggle.SetActive(unlocked && SceneManager.GetActiveScene().buildIndex == 1);
        if (_infinityMenuButton != null)
            _infinityMenuButton.interactable = unlocked;

        int ipToGain = StaticMethods.InfinityPointsToGain(amount, InfinityData.bots);
        if (_infinityText != null)
        {
            _infinityText.text = oracle.saveSettings.infinityFirstRunDone
                ? !autoPrestige
                    ? $"Infinity <size=70%>+{(PrestigePlus.doubleIP ? ipToGain * 2 : ipToGain)}"
                    : "Infinity"
                : "<align=\"center\"><sprite=4 color=#C8B3FF>";
        }

        UpdateFillBar(autoPrestige, amount);
        HandleFirstRun(unlocked);
    }

    private void UpdateFillBar(bool autoPrestige, double amount)
    {
        if (_infinityFill == null) return;

        if (autoPrestige)
        {
            _percent = math.log10(InfinityData.bots) / math.log10(amount);
            if (InfinityData.bots < 1) _percent = 0;
        }
        else
        {
            int currentIp = StaticMethods.InfinityPointsToGain(amount, InfinityData.bots);
            double amountForNextPoint = BuyMultiple.BuyX(currentIp + 1, amount, oracle.infinityExponent, 0);
            double amountForCurrentPoint = BuyMultiple.BuyX(currentIp, amount, oracle.infinityExponent, 0);

            _percent = (InfinityData.bots - amountForCurrentPoint) / (amountForNextPoint - amountForCurrentPoint);
            if (InfinityData.bots < 1) _percent = 0;
        }
        _infinityFill.fillAmount = (float)_percent;
    }

    private void HandleFirstRun(bool unlocked)
    {
        if (!unlocked || oracle.saveSettings.infinityFirstRunDone) return;
        oracle.saveSettings.infinityFirstRunDone = true;
        _infinityToggle.GetComponent<Toggle>().isOn = false;
    }
}
