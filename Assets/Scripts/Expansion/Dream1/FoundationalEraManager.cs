using System;
using Systems;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using static Oracle;

public class FoundationalEraManager : MonoBehaviour
{
    [Space(10)] [SerializeField] private Button hunterBuyButton;
    [SerializeField] private TMP_Text hunterTitleText;
    [SerializeField] private TMP_Text hunterTimerText;
    [SerializeField] private SlicedFilledImage hunterFillBar;
    [SerializeField] private float hunterTime;
    [SerializeField] private float hunterDuration = 3;


    [Space(10)] [SerializeField] private Button gathererBuyButton;
    [SerializeField] private TMP_Text gathererTitleText;
    [SerializeField] private TMP_Text gathererTimerText;
    [SerializeField] private SlicedFilledImage gathererFillBar;
    [SerializeField] private float gatherTime;
    [SerializeField] private float gatherDuration = 3;

    [Space(10)] [SerializeField] private Button communityBoostButton;
    [SerializeField] private GameObject communityBoostButtonGO;
    [SerializeField] private TMP_Text communityTitleText;
    [SerializeField] private TMP_Text communityTimerText;
    [SerializeField] private TMP_Text communityBoostTimerText;
    [SerializeField] private SlicedFilledImage communityFillBar;
    [SerializeField] private SlicedFilledImage communityBoostFillBar;
    [SerializeField] private float communityTime;
    [SerializeField] private float communityDuration = 3;

    [Space(10)] [SerializeField] private TMP_Text housingTitleText;
    [SerializeField] private TMP_Text housingTimerText;
    [SerializeField] private SlicedFilledImage housingFillBar;
    [SerializeField] private SlicedFilledImage housingToVillageFillBar;
    [SerializeField] private float housingTime;
    [SerializeField] private float housingDuration = 20;

    [Space(10)] [SerializeField] private TMP_Text villagesTitleText;
    [SerializeField] private TMP_Text villagesTimerText;
    [SerializeField] private SlicedFilledImage villagesFillBar;
    [SerializeField] private SlicedFilledImage villagesToCityFillBar;
    [SerializeField] private float villagesTime;
    [SerializeField] private float villagesDuration = 12;

    [Space(10)] [SerializeField] private TMP_Text workersTitleText;
    [SerializeField] private TMP_Text workersTimerText;
    [SerializeField] private SlicedFilledImage workersFillBar;
    [SerializeField] private float workersTime;
    [SerializeField] private float workersDuration = 4;

    [Space(10)] [SerializeField] private TMP_Text citiesTitleText;
    [SerializeField] private TMP_Text citiesTimerText;
    [SerializeField] private SlicedFilledImage citiesFillBar;
    [SerializeField] private float citiesTime;
    [SerializeField] private float citiesDuration = 3;

    private SaveDataDream1 sd1 => oracle.saveSettings.sdSimulation;
    private SaveData sd => oracle.saveSettings.saveData;
    private SaveDataPrestige sp => oracle.saveSettings.sdPrestige;


    private void Start()
    {
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
            sd1.housing >= 1 ? (float)sd1.housing / housingToVillageCost : 0;
        var housingText = _communityProduction > 10
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


        var multi = 1 + (sd1.hunters > 0 ? Math.Log10(sd1.hunters) : 0);
        if (sp.doDoubleTime) multi *= sp.doubleTimeRate + 1;

        if (sd1.hunters >= 1) hunterTime += Time.deltaTime * (float)multi;

        hunterFillBar.fillAmount = (float)StaticMethods.FillBar(sd1.hunters, hunterDuration, multi, hunterTime);
        hunterTimerText.text = StaticMethods.TimerText(sd1.hunters, hunterDuration, multi, hunterTime);

        while (hunterTime >= hunterDuration)
        {
            hunterTime -= hunterDuration;
            sd1.community++;
        }
    }

    private void GathererManagement()
    {
        gathererTitleText.text = $"Gatherers <size=70%> {sd1.gatherers:N0}";


        var multi = 1 + (sd1.gatherers > 0 ? Math.Log10(sd1.gatherers) : 0);
        if (sp.doDoubleTime) multi *= sp.doubleTimeRate + 1;
        if (sd1.gatherers >= 1) gatherTime += Time.deltaTime * (float)multi;

        gathererFillBar.fillAmount = (float)StaticMethods.FillBar(sd1.gatherers, gatherDuration, multi, gatherTime);
        gathererTimerText.text = StaticMethods.TimerText(sd1.gatherers, gatherDuration, multi, gatherTime);


        while (gatherTime >= gatherDuration)
        {
            gatherTime -= gatherDuration;
            sd1.community++;
        }
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


        var multi = 1 + (sd1.community > 0 ? Math.Log10(sd1.community) : 0);
        if (sp.doDoubleTime) multi *= sp.doubleTimeRate + 1;
        if (sd1.communityBoostTime > 0) multi *= 2;
        if (sd1.community >= 1) communityTime += Time.deltaTime * (float)multi;

        _communityProduction = 1 / (communityDuration / multi);

        communityFillBar.fillAmount =
            communityTime / multi < 0.2f ? 1 : communityTime > 0 ? communityTime / communityDuration : 0;
        communityTimerText.text = communityDuration / multi < 0.2f
            ? $"{CalcUtils.FormatNumber(_communityProduction)}/s"
            : sd1.community > 0
                ? $"{communityDuration / multi - communityTime / multi:F1}s"
                : "";

        while (communityTime >= communityDuration)
        {
            communityTime -= communityDuration;
            sd1.housing++;
        }
    }

    private void HousingManagement()
    {
        if (sd1.housing == 0)
        {
            housingFillBar.fillAmount = 0;
            housingTimerText.text = "";
        }

        if (sd1.housing < 1) return;

        var multi = 1 + (sd1.housing > 0 ? Math.Log10(sd1.housing) : 0);
        if (sp.doDoubleTime) multi *= sp.doubleTimeRate + 1;

        if (sd1.housing >= 1) housingTime += Time.deltaTime * (float)multi;
        housingFillBar.fillAmount = housingTime / housingDuration;
        housingTimerText.text = $"{housingDuration / multi - housingTime / multi:F1}s";

        while (housingTime >= housingDuration)
        {
            housingTime -= housingDuration;
            sd1.workers++;
        }
    }

    private void VillageManagement()
    {
        if (sd1.villages == 0)
        {
            villagesFillBar.fillAmount = 0;
            villagesTimerText.text = "";
        }

        if (sd1.villages < 1) return;

        var multi = 1 + Math.Log10(sd1.villages);
        if (sp.doDoubleTime) multi *= sp.doubleTimeRate + 1;

        villagesTime += Time.deltaTime * (float)multi;
        villagesFillBar.fillAmount = villagesTime / villagesDuration;
        villagesTimerText.text = $"{villagesDuration / multi - villagesTime / multi:F1}s";

        while (villagesTime >= villagesDuration)
        {
            villagesTime -= villagesDuration;
            sd1.workers += 2;
        }
    }

    private void WorkerManagement()
    {
        workersTitleText.text = $"Workers <size=70%> {sd1.workers:N0}";


        var multi = 1 + (sd1.workers > 0 ? Math.Log10(sd1.workers) : 0);
        if (sp.doDoubleTime) multi *= sp.doubleTimeRate + 1;
        if (sp.workerBoostAcivator) multi *= 1 + Math.Log10(sd1.workers);

        if (sd1.workers >= 1) workersTime += Time.deltaTime * (float)multi;

        workersFillBar.fillAmount = (float)StaticMethods.FillBar(sd1.workers, workersDuration, multi, workersTime);
        workersTimerText.text = StaticMethods.TimerText(sd1.workers, workersDuration, multi, workersTime);

        while (workersTime >= workersDuration)
        {
            workersTime -= workersDuration;
            sd1.housing++;
        }
    }

    private void CityManagement()
    {
        citiesTitleText.text = $"Cities <size=70%> {sd1.cities:N0}";

        var multi = 1 + (sd1.cities > 0 ? Math.Log10(sd1.cities) : 0);
        if (sp.doDoubleTime) multi *= sp.doubleTimeRate + 1;

        if (sd1.cities >= 1) citiesTime += Time.deltaTime * (float)multi;

        citiesFillBar.fillAmount = (float)StaticMethods.FillBar(sd1.cities, citiesDuration, multi, citiesTime);
        citiesTimerText.text = StaticMethods.TimerText(sd1.cities, citiesDuration, multi, citiesTime);


        while (citiesTime >= citiesDuration)
        {
            citiesTime -= citiesDuration;
            sd1.workers += 5;
            if (sd1.engineeringComplete) sd1.factories += sp.citiesBoostActivator ? 10 : 1;
        }
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