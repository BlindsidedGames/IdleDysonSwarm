using System;
using Systems;
using TMPro;
using Unity.Mathematics;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;
using static Expansion.Oracle;

public class SidePanelManager : MonoBehaviour
{
    private DysonVerseInfinityData dvid => oracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData;
    private DysonVersePrestigeData dvpd => oracle.saveSettings.dysonVerseSaveData.dysonVersePrestigeData;
    private SaveDataPrestige sdp => oracle.saveSettings.sdPrestige;
    private PrestigePlus pp => oracle.saveSettings.prestigePlus;

    [Header("Infinity"), SerializeField] private SlicedFilledImage InfinityFill;
    [SerializeField] public GameObject InfinityToggle;
    [SerializeField] public GameObject InfinityImage;
    [SerializeField] public TMP_Text InfinityText;
    [SerializeField] public Button InfinityMenubutton;

    [Header("Infinity"), SerializeField] private SlicedFilledImage PrestigeFill;
    [SerializeField] public GameObject prestige;
    [SerializeField] public GameObject PrestigeToggle;
    [SerializeField] public GameObject PrestigeImage;
    [SerializeField] public TMP_Text PrestigeText;
    [SerializeField] public Button PrestigeMenubutton;

    [Header("Reality"), SerializeField] private SlicedFilledImage RealityUnlockfill;
    [SerializeField] public GameObject realityFillBar;
    [SerializeField] public GameObject realityFillBarWorkers;
    [SerializeField] public GameObject reality;
    [SerializeField] public GameObject realityToggle;
    [SerializeField] public GameObject realityImage;
    [SerializeField] public TMP_Text realityText;
    [SerializeField] public Button realityMenuButton;
    [SerializeField] public GameObject simulations;
    [SerializeField] public GameObject simulationsToggle;

    [Header("OfflineTime"), SerializeField]
    private SlicedFilledImage OfflineTimeFillBar;

    private double percent;

    private void Update()
    {
        HandlePrestige();
        HandleInfinity();
        HandleReality();
        #if UNITY_IOS || UNITY_ANDROID
        if (Input.GetKeyDown(KeyCode.Escape))
            gameObject.SetActive(false);
        #endif
        OfflineTimeFillBar.fillAmount = (float)(oracle.saveSettings.offlineTime / oracle.saveSettings.maxOfflineTime);
    }

    private void HandleReality()
    {
        bool show = oracle.saveSettings.prestigePlus.points >= 1 || dvpd.infinityPoints >= 1 ||
                    oracle.saveSettings.unlockAllTabs;
        reality.SetActive(show);
        if (!show) return;
        bool unlocked = oracle.saveSettings.prestigePlus.points >= 1 || dvpd.secretsOfTheUniverse >= 27 ||
                        oracle.saveSettings.unlockAllTabs;
        realityImage.SetActive(unlocked);
        realityToggle.SetActive(unlocked && SceneManager.GetActiveScene().buildIndex == 1);
        simulations.SetActive(unlocked);
        realityMenuButton.interactable = unlocked;
        realityText.text = oracle.saveSettings.realityFirstRun
            ? "Reality"
            : "<align=\"center\"><sprite=4 color=#CCC2C5>";

        switch (unlocked)
        {
            case true:
            {
                realityFillBar.SetActive(false);
                realityFillBarWorkers.SetActive(true);
            }
                break;
            case false:
            {
                realityFillBar.SetActive(true);
                realityFillBarWorkers.SetActive(false);
                RealityUnlockfill.fillAmount = (float)dvpd.secretsOfTheUniverse / 27;
            }
                break;
        }


        if (!unlocked || oracle.saveSettings.realityFirstRun) return;
        oracle.saveSettings.realityFirstRun = true;
        realityToggle.GetComponent<Toggle>().isOn = false;
        simulationsToggle.GetComponent<Toggle>().isOn = false;
    }

    private void HandlePrestige()
    {
        bool show = oracle.saveSettings.prestigePlus.points >= 1 || dvpd.infinityPoints >= 1 ||
                    oracle.saveSettings.unlockAllTabs;
        prestige.SetActive(show);
        if (!show) return;
        bool unlocked = oracle.saveSettings.prestigePlus.points >= 1 || dvpd.infinityPoints >= 42 ||
                        oracle.saveSettings.unlockAllTabs;
        PrestigeImage.SetActive(unlocked);
        PrestigeToggle.SetActive(unlocked && SceneManager.GetActiveScene().buildIndex == 1);
        PrestigeMenubutton.interactable = unlocked;
        PrestigeText.text = oracle.saveSettings.prestigeFirstRun
            ? "Quantum"
            : "<align=\"center\"><sprite=4 color=#C8B3FF>";
        PrestigeFill.fillAmount = (float)dvpd.infinityPoints / 42;

        if (!unlocked || oracle.saveSettings.prestigeFirstRun) return;
        oracle.saveSettings.prestigeFirstRun = true;
        PrestigeToggle.GetComponent<Toggle>().isOn = false;
    }

    private void HandleInfinity()
    {
        bool autoPrestige = !pp.breakTheLoop;
        double amount = pp.divisionsPurchased > 0 ? 4.2e19 / Math.Pow(10, pp.divisionsPurchased) : 4.2e19;
        bool unlocked = dvpd.infinityPoints >= 1 || oracle.saveSettings.prestigePlus.points >= 1 ||
                        oracle.saveSettings.unlockAllTabs;
        InfinityImage.SetActive(unlocked);
        InfinityToggle.SetActive(unlocked && SceneManager.GetActiveScene().buildIndex == 1);
        InfinityMenubutton.interactable = unlocked;
        int ipToGain = StaticMethods.InfinityPointsToGain(amount, dvid.bots);
        InfinityText.text = oracle.saveSettings.infinityFirstRunDone
            ? !autoPrestige
                ? $"Infinity <size=70%>+{(pp.doubleIP ? ipToGain * 2 : ipToGain)}"
                : "Infinity"
            : "<align=\"center\"><sprite=4 color=#C8B3FF>";


        if (autoPrestige)
        {
            percent = math.log10(dvid.bots) / math.log10(amount);
            if (dvid.bots < 1) percent = 0;
            InfinityFill.fillAmount = (float)percent;
        }
        else
        {
            double amountForNextPoint =
                BuyMultiple.BuyX(StaticMethods.InfinityPointsToGain(amount, dvid.bots) + 1, amount,
                    oracle.infinityExponent, 0);

            percent = (dvid.bots -
                       BuyMultiple.BuyX(StaticMethods.InfinityPointsToGain(amount, dvid.bots), amount,
                           oracle.infinityExponent, 0)) /
                      (amountForNextPoint - BuyMultiple.BuyX(StaticMethods.InfinityPointsToGain(amount, dvid.bots),
                          amount, oracle.infinityExponent, 0));
            if (dvid.bots < 1) percent = 0;
            InfinityFill.fillAmount = (float)percent;
        }

        if (!unlocked || oracle.saveSettings.infinityFirstRunDone) return;
        oracle.saveSettings.infinityFirstRunDone = true;
        InfinityToggle.GetComponent<Toggle>().isOn = false;
    }
}