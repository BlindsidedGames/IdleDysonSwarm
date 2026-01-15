using System;
using Systems;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using Blindsided.Utilities;
using IdleDysonSwarm.Systems.Dream1;
using static Expansion.Oracle;

public class FoundationalEraManager : MonoBehaviour
{
    [Space(10), SerializeField]  private Button hunterBuyButton;
    [SerializeField] private TMP_Text hunterTitleText;
    [SerializeField] private TMP_Text hunterTimerText;
    [SerializeField] private SlicedFilledImage hunterFillBar;
    [SerializeField] private float hunterDuration = 3;

    [Space(10), SerializeField]  private Button gathererBuyButton;
    [SerializeField] private TMP_Text gathererTitleText;
    [SerializeField] private TMP_Text gathererTimerText;
    [SerializeField] private SlicedFilledImage gathererFillBar;
    [SerializeField] private float gatherDuration = 3;

    [Space(10), SerializeField]  private Button communityBoostButton;
    [SerializeField] private GameObject communityBoostButtonGO;
    [SerializeField] private TMP_Text communityTitleText;
    [SerializeField] private TMP_Text communityTimerText;
    [SerializeField] private TMP_Text communityBoostTimerText;
    [SerializeField] private SlicedFilledImage communityFillBar;
    [SerializeField] private SlicedFilledImage communityBoostFillBar;
    [SerializeField] private float communityDuration = 3;

    [Space(10), SerializeField]  private TMP_Text housingTitleText;
    [SerializeField] private TMP_Text housingTimerText;
    [SerializeField] private SlicedFilledImage housingFillBar;
    [SerializeField] private SlicedFilledImage housingToVillageFillBar;
    [SerializeField] private float housingDuration = 20;

    [Space(10), SerializeField]  private TMP_Text villagesTitleText;
    [SerializeField] private TMP_Text villagesTimerText;
    [SerializeField] private SlicedFilledImage villagesFillBar;
    [SerializeField] private SlicedFilledImage villagesToCityFillBar;
    [SerializeField] private float villagesDuration = 12;

    [Space(10), SerializeField]  private TMP_Text workersTitleText;
    [SerializeField] private TMP_Text workersTimerText;
    [SerializeField] private SlicedFilledImage workersFillBar;
    [SerializeField] private float workersDuration = 4;

    [Space(10), SerializeField]  private TMP_Text citiesTitleText;
    [SerializeField] private TMP_Text citiesTimerText;
    [SerializeField] private SlicedFilledImage citiesFillBar;
    [SerializeField] private float citiesDuration = 3;

    // Production timers (use ProductionTimer utility for consistency)
    private ProductionTimer _hunterTimer;
    private ProductionTimer _gathererTimer;
    private ProductionTimer _communityTimer;
    private ProductionTimer _housingTimer;
    private ProductionTimer _villagesTimer;
    private ProductionTimer _workersTimer;
    private ProductionTimer _citiesTimer;

    private SaveDataDream1 sd1 => oracle.saveSettings.sdSimulation;
    private SaveData sd => oracle.saveSettings.saveData;
    private SaveDataPrestige sp => oracle.saveSettings.sdPrestige;

    private void Start()
    {
        // Initialize timers with saved progress (must be in Start, after Oracle is initialized)
        _hunterTimer = new ProductionTimer(hunterDuration, sd1.hunterTimerProgress);
        _gathererTimer = new ProductionTimer(gatherDuration, sd1.gathererTimerProgress);
        _communityTimer = new ProductionTimer(communityDuration, sd1.communityTimerProgress);
        _housingTimer = new ProductionTimer(housingDuration, sd1.housingTimerProgress);
        _villagesTimer = new ProductionTimer(villagesDuration, sd1.villagesTimerProgress);
        _workersTimer = new ProductionTimer(workersDuration, sd1.workersTimerProgress);
        _citiesTimer = new ProductionTimer(citiesDuration, sd1.citiesTimerProgress);

        hunterBuyButton.onClick.AddListener(OnHunterBuy);
        gathererBuyButton.onClick.AddListener(OnGathererBuy);
        communityBoostButton.onClick.AddListener(OnCommunityBoost);
    }

    private void Update()
    {
        BuildingManagement();
        HunterManagement();
        GathererManagement();
        ManageCommunityBoost();
        CommunityManagement();
        HousingManagement();
        VillageManagement();
        WorkerManagement();
        CityManagement();
        SetButtonsInteractable();
        SyncTimerProgress();
    }

    /// <summary>
    /// Syncs timer progress to save data for persistence.
    /// </summary>
    private void SyncTimerProgress()
    {
        sd1.hunterTimerProgress = _hunterTimer.currentTime;
        sd1.gathererTimerProgress = _gathererTimer.currentTime;
        sd1.communityTimerProgress = _communityTimer.currentTime;
        sd1.housingTimerProgress = _housingTimer.currentTime;
        sd1.villagesTimerProgress = _villagesTimer.currentTime;
        sd1.workersTimerProgress = _workersTimer.currentTime;
        sd1.citiesTimerProgress = _citiesTimer.currentTime;
    }

    /// <summary>
    /// Gets the global multiplier from DoubleTime.
    /// </summary>
    private double GetGlobalMultiplier()
    {
        return sp.doDoubleTime ? sp.doubleTimeRate + 1 : 1;
    }

    private void SetButtonsInteractable()
    {
        hunterBuyButton.interactable = sd.influence >= sd1.hunterCost;
        gathererBuyButton.interactable = sd.influence >= sd1.gathererCost;
        communityBoostButton.interactable = sd.influence >= sd1.communityBoostCost;
    }

    private void BuildingManagement()
    {
        const int housingToVillageCost = 10;
        if (sd1.housing >= housingToVillageCost)
        {
            sd1.housing -= housingToVillageCost;
            sd1.villages++;
        }

        housingToVillageFillBar.fillAmount = _communityProduction > 10 ? 1 :
            sd1.housing >= 1                                           ? (float)sd1.housing / housingToVillageCost : 0;
        string housingText = _communityProduction > 10
            ? $"{CalcUtils.FormatNumber(_communityProduction / housingToVillageCost)} Villages/s"
            : $"{sd1.housing:N0}";
        housingTitleText.text = $"Housing <size=70%> {housingText}";

        const int villageToCitiesCost = 25;
        if (sd1.villages >= villageToCitiesCost)
        {
            sd1.villages -= villageToCitiesCost;
            sd1.cities++;
        }

        villagesToCityFillBar.fillAmount = (float)sd1.villages / villageToCitiesCost;
        villagesTitleText.text = $"Villages <size=70%> {sd1.villages:N0}";
    }


    private void HunterManagement()
    {
        hunterTitleText.text = $"Hunters <size=70%> {sd1.hunters:N0}";

        double globalMulti = GetGlobalMultiplier();
        int produced = _hunterTimer.Update(sd1.hunters, globalMulti, Time.deltaTime);
        sd1.community += produced;

        double effectiveMulti = _hunterTimer.GetEffectiveMultiplier(sd1.hunters, globalMulti);
        hunterFillBar.fillAmount = (float)StaticMethods.FillBar(sd1.hunters, hunterDuration, effectiveMulti, _hunterTimer.currentTime);
        hunterTimerText.text = StaticMethods.TimerText(sd1.hunters, hunterDuration, effectiveMulti, _hunterTimer.currentTime);
    }

    private void GathererManagement()
    {
        gathererTitleText.text = $"Gatherers <size=70%> {sd1.gatherers:N0}";

        double globalMulti = GetGlobalMultiplier();
        int produced = _gathererTimer.Update(sd1.gatherers, globalMulti, Time.deltaTime);
        sd1.community += produced;

        double effectiveMulti = _gathererTimer.GetEffectiveMultiplier(sd1.gatherers, globalMulti);
        gathererFillBar.fillAmount = (float)StaticMethods.FillBar(sd1.gatherers, gatherDuration, effectiveMulti, _gathererTimer.currentTime);
        gathererTimerText.text = StaticMethods.TimerText(sd1.gatherers, gatherDuration, effectiveMulti, _gathererTimer.currentTime);
    }

    private void ManageCommunityBoost()
    {
        if (sd1.communityBoostTime > 0)
        {
            sd1.communityBoostTime -= Time.deltaTime;
            communityBoostFillBar.fillAmount =
                (float)(sd1.communityBoostTime / sd1.communityBoostDuration);
            communityBoostTimerText.text = $"{CalcUtils.FormatTimeLarge(sd1.communityBoostTime)}";
        }
        else
        {
            sd1.communityBoostTime = 0;
            communityBoostFillBar.fillAmount = 0;
            communityBoostTimerText.text = "0s";
        }
    }

    private double _communityProduction;

    private void CommunityManagement()
    {
        communityBoostButtonGO.SetActive(sd1.communityBoostTime < 10);

        communityTitleText.text = $"Community <size=70%> {sd1.community:N0}";

        // Community has special boost from communityBoostTime
        double globalMulti = GetGlobalMultiplier();
        if (sd1.communityBoostTime > 0) globalMulti *= 2;

        int produced = _communityTimer.Update(sd1.community, globalMulti, Time.deltaTime);
        sd1.housing += produced;

        double effectiveMulti = _communityTimer.GetEffectiveMultiplier(sd1.community, globalMulti);
        _communityProduction = effectiveMulti > 0 ? effectiveMulti / communityDuration : 0;

        communityFillBar.fillAmount =
            communityDuration / effectiveMulti < 0.2f ? 1 : _communityTimer.FillAmount;
        communityTimerText.text = communityDuration / effectiveMulti < 0.2f
            ? $"{CalcUtils.FormatNumber(_communityProduction)}/s"
            : sd1.community > 0
                ? $"{_communityTimer.GetTimeRemaining(effectiveMulti):F1}s"
                : "";
    }

    private void HousingManagement()
    {
        if (sd1.housing == 0)
        {
            housingFillBar.fillAmount = 0;
            housingTimerText.text = "";
            return;
        }

        double globalMulti = GetGlobalMultiplier();
        int produced = _housingTimer.Update(sd1.housing, globalMulti, Time.deltaTime);
        sd1.workers += produced;

        double effectiveMulti = _housingTimer.GetEffectiveMultiplier(sd1.housing, globalMulti);
        housingFillBar.fillAmount = _housingTimer.FillAmount;
        housingTimerText.text = $"{_housingTimer.GetTimeRemaining(effectiveMulti):F1}s";
    }

    private void VillageManagement()
    {
        if (sd1.villages == 0)
        {
            villagesFillBar.fillAmount = 0;
            villagesTimerText.text = "";
            return;
        }

        double globalMulti = GetGlobalMultiplier();
        int produced = _villagesTimer.Update(sd1.villages, globalMulti, Time.deltaTime);
        sd1.workers += produced * 2; // Villages produce 2 workers per tick

        double effectiveMulti = _villagesTimer.GetEffectiveMultiplier(sd1.villages, globalMulti);
        villagesFillBar.fillAmount = _villagesTimer.FillAmount;
        villagesTimerText.text = $"{_villagesTimer.GetTimeRemaining(effectiveMulti):F1}s";
    }

    private void WorkerManagement()
    {
        workersTitleText.text = $"Workers <size=70%> {sd1.workers:N0}";

        // Workers have special boost from workerBoostActivator
        double globalMulti = GetGlobalMultiplier();
        if (sp.workerBoostAcivator && sd1.workers > 0)
            globalMulti *= 1 + Math.Log10(sd1.workers);

        int produced = _workersTimer.Update(sd1.workers, globalMulti, Time.deltaTime);
        sd1.housing += produced;

        double effectiveMulti = _workersTimer.GetEffectiveMultiplier(sd1.workers, globalMulti);
        workersFillBar.fillAmount = (float)StaticMethods.FillBar(sd1.workers, workersDuration, effectiveMulti, _workersTimer.currentTime);
        workersTimerText.text = StaticMethods.TimerText(sd1.workers, workersDuration, effectiveMulti, _workersTimer.currentTime);
    }

    private void CityManagement()
    {
        citiesTitleText.text = $"Cities <size=70%> {sd1.cities:N0}";

        double globalMulti = GetGlobalMultiplier();
        int produced = _citiesTimer.Update(sd1.cities, globalMulti, Time.deltaTime);

        // Apply production per tick
        for (int i = 0; i < produced; i++)
        {
            sd1.workers += 5;
            if (sd1.engineeringComplete) sd1.factories += sp.citiesBoostActivator ? 10 : 1;
        }

        double effectiveMulti = _citiesTimer.GetEffectiveMultiplier(sd1.cities, globalMulti);
        citiesFillBar.fillAmount = (float)StaticMethods.FillBar(sd1.cities, citiesDuration, effectiveMulti, _citiesTimer.currentTime);
        citiesTimerText.text = StaticMethods.TimerText(sd1.cities, citiesDuration, effectiveMulti, _citiesTimer.currentTime);
    }

    #region buttonMethods

    private void OnCommunityBoost()
    {
        sd.influence -= (int)sd1.communityBoostCost;
        sd1.communityBoostTime = sd1.communityBoostDuration;
    }

    private void OnGathererBuy()
    {
        sd.influence -= sd1.gathererCost;
        sd1.gatherers += sd.gatherersPerPurchase;
    }

    private void OnHunterBuy()
    {
        sd.influence -= sd1.hunterCost;
        sd1.hunters += sd.huntersPerPurchase;
    }

    #endregion
}
