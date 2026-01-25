using System;
using Systems;
using UnityEngine;
using Blindsided.Utilities;
using IdleDysonSwarm.Systems.Dream1;
using IdleDysonSwarm.UI;
using IdleDysonSwarm.UI.Simulation;
using static Expansion.Oracle;

public class FoundationalEraManager : MonoBehaviour
{
    [Header("Panel References")]
    [SerializeField] private SimulationGenericPanelReferences hunterPanel;
    [SerializeField] private SimulationGenericPanelReferences gathererPanel;
    [SerializeField] private SimulationGenericPanelReferences communityPanel;
    [SerializeField] private SimulationGenericPanelReferences housingPanel;
    [SerializeField] private SimulationGenericPanelReferences villagesPanel;
    [SerializeField] private SimulationGenericPanelReferences workersPanel;
    [SerializeField] private SimulationGenericPanelReferences citiesPanel;

    [Header("Production Durations")]
    [SerializeField] private float hunterDuration = 3;
    [SerializeField] private float gatherDuration = 3;
    [SerializeField] private float communityDuration = 3;
    [SerializeField] private float housingDuration = 20;
    [SerializeField] private float villagesDuration = 12;
    [SerializeField] private float workersDuration = 4;
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

    private const int HousingToVillageCost = 10;
    private const int VillageToCitiesCost = 25;
    private const float InfoUpdateInterval = 0.1f; // 10hz debounce for info descriptions

    private float _infoUpdateTimer;

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

        // Set panel types and configure UI elements
        if (hunterPanel != null)
        {
            hunterPanel.panelType = SimulationPanelType.ProductionBasic;
            hunterPanel.ConfigureUIElements();
            if (hunterPanel.infoTitleText != null) hunterPanel.infoTitleText.text = "Hunters Info";
        }
        if (gathererPanel != null)
        {
            gathererPanel.panelType = SimulationPanelType.ProductionBasic;
            gathererPanel.ConfigureUIElements();
            if (gathererPanel.infoTitleText != null) gathererPanel.infoTitleText.text = "Gatherers Info";
        }
        if (communityPanel != null)
        {
            communityPanel.panelType = SimulationPanelType.ProductionBoost;
            communityPanel.ConfigureUIElements();
            if (communityPanel.infoTitleText != null) communityPanel.infoTitleText.text = "Community Info";
        }
        if (housingPanel != null)
        {
            housingPanel.panelType = SimulationPanelType.ConversionDual;
            housingPanel.ConfigureUIElements();
            if (housingPanel.infoTitleText != null) housingPanel.infoTitleText.text = "Housing Info";
        }
        if (villagesPanel != null)
        {
            villagesPanel.panelType = SimulationPanelType.ConversionDual;
            villagesPanel.ConfigureUIElements();
            if (villagesPanel.infoTitleText != null) villagesPanel.infoTitleText.text = "Villages Info";
        }
        if (workersPanel != null)
        {
            workersPanel.panelType = SimulationPanelType.ConversionDisplay;
            workersPanel.ConfigureUIElements();
            if (workersPanel.infoTitleText != null) workersPanel.infoTitleText.text = "Workers Info";
        }
        if (citiesPanel != null)
        {
            citiesPanel.panelType = SimulationPanelType.ConversionDisplay;
            citiesPanel.ConfigureUIElements();
            if (citiesPanel.infoTitleText != null) citiesPanel.infoTitleText.text = "Cities Info";
        }

        // Setup button listeners
        if (hunterPanel?.actionButton != null)
            hunterPanel.actionButton.onClick.AddListener(OnHunterBuy);
        if (gathererPanel?.actionButton != null)
            gathererPanel.actionButton.onClick.AddListener(OnGathererBuy);
        if (communityPanel?.actionButton != null)
            communityPanel.actionButton.onClick.AddListener(OnCommunityBoost);
    }

    private void Update()
    {
        UpdateVisibility();
        BuildingConversions();
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
        UpdateInfoDescriptions();
    }

    private void UpdateVisibility()
    {
        // Visibility logic from Dream1BuildingEnabler
        if (communityPanel != null)
            communityPanel.gameObject.SetActive(sd1.hunters >= 1 || sd1.gatherers >= 1);
        if (housingPanel != null)
            housingPanel.gameObject.SetActive(sd1.housing >= 1 || sd1.villages >= 1 || sd1.cities >= 1);
        if (villagesPanel != null)
            villagesPanel.gameObject.SetActive(sd1.villages >= 1 || sd1.cities >= 1);
        if (workersPanel != null)
            workersPanel.gameObject.SetActive(sd1.workers >= 1);
        if (citiesPanel != null)
            citiesPanel.gameObject.SetActive(sd1.cities >= 1);
    }

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

    private double GetGlobalMultiplier()
    {
        return sp.doDoubleTime ? sp.doubleTimeRate + 1 : 1;
    }

    private void SetButtonsInteractable()
    {
        if (hunterPanel?.actionButton != null)
            hunterPanel.actionButton.interactable = sd.influence >= sd1.hunterCost;
        if (gathererPanel?.actionButton != null)
            gathererPanel.actionButton.interactable = sd.influence >= sd1.gathererCost;
        if (communityPanel?.actionButton != null)
            communityPanel.actionButton.interactable = sd.influence >= sd1.communityBoostCost;
    }

    private void BuildingConversions()
    {
        // Housing to Villages conversion
        if (sd1.housing >= HousingToVillageCost)
        {
            sd1.housing -= HousingToVillageCost;
            sd1.villages++;
        }

        // Villages to Cities conversion
        if (sd1.villages >= VillageToCitiesCost)
        {
            sd1.villages -= VillageToCitiesCost;
            sd1.cities++;
        }
    }

    private double _communityProduction;

    private void HunterManagement()
    {
        if (hunterPanel == null) return;

        hunterPanel.titleText.text = $"Hunters <size=70%>{UIThemeProvider.TextColourBlue}{sd1.hunters:N0}</color>";

        double globalMulti = GetGlobalMultiplier();
        int produced = _hunterTimer.Update(sd1.hunters, globalMulti, Time.deltaTime);
        sd1.community += produced;

        double effectiveMulti = _hunterTimer.GetEffectiveMultiplier(sd1.hunters, globalMulti);
        hunterPanel.fill1.fillAmount = (float)StaticMethods.FillBar(sd1.hunters, hunterDuration, effectiveMulti, _hunterTimer.currentTime);
        hunterPanel.fillBar1Text.text = StaticMethods.TimerText(sd1.hunters, hunterDuration, effectiveMulti, _hunterTimer.currentTime, mspace: true, colourOverride: UIThemeProvider.TextColourBlue);
    }

    private void GathererManagement()
    {
        if (gathererPanel == null) return;

        gathererPanel.titleText.text = $"Gatherers <size=70%>{UIThemeProvider.TextColourBlue}{sd1.gatherers:N0}</color>";

        double globalMulti = GetGlobalMultiplier();
        int produced = _gathererTimer.Update(sd1.gatherers, globalMulti, Time.deltaTime);
        sd1.community += produced;

        double effectiveMulti = _gathererTimer.GetEffectiveMultiplier(sd1.gatherers, globalMulti);
        gathererPanel.fill1.fillAmount = (float)StaticMethods.FillBar(sd1.gatherers, gatherDuration, effectiveMulti, _gathererTimer.currentTime);
        gathererPanel.fillBar1Text.text = StaticMethods.TimerText(sd1.gatherers, gatherDuration, effectiveMulti, _gathererTimer.currentTime, mspace: true, colourOverride: UIThemeProvider.TextColourBlue);
    }

    private void ManageCommunityBoost()
    {
        if (communityPanel == null) return;

        if (sd1.communityBoostTime > 0)
        {
            sd1.communityBoostTime -= Time.deltaTime;
            communityPanel.fill2.fillAmount = (float)(sd1.communityBoostTime / sd1.communityBoostDuration);
            communityPanel.fillBar2Text.text = CalcUtils.FormatTime(sd1.communityBoostTime, shortForm: true, colourOverride: UIThemeProvider.TextColourBlue);
        }
        else
        {
            sd1.communityBoostTime = 0;
            communityPanel.fill2.fillAmount = 0;
            communityPanel.fillBar2Text.text = "0s";
        }
    }

    private void CommunityManagement()
    {
        if (communityPanel == null) return;

        // Hide boost button when boost is active (time remaining > 10s)
        if (communityPanel.actionButton != null)
            communityPanel.actionButton.gameObject.SetActive(sd1.communityBoostTime < 10);

        communityPanel.titleText.text = $"Community <size=70%>{UIThemeProvider.TextColourBlue}{sd1.community:N0}</color>";

        // Community has special boost from communityBoostTime
        double globalMulti = GetGlobalMultiplier();
        if (sd1.communityBoostTime > 0) globalMulti *= 2;

        int produced = _communityTimer.Update(sd1.community, globalMulti, Time.deltaTime);
        sd1.housing += produced;

        double effectiveMulti = _communityTimer.GetEffectiveMultiplier(sd1.community, globalMulti);
        _communityProduction = effectiveMulti > 0 ? effectiveMulti / communityDuration : 0;

        communityPanel.fill1.fillAmount = (float)StaticMethods.FillBar(sd1.community, communityDuration, effectiveMulti, _communityTimer.currentTime);
        communityPanel.fillBar1Text.text = StaticMethods.TimerText(sd1.community, communityDuration, effectiveMulti, _communityTimer.currentTime, mspace: true, colourOverride: UIThemeProvider.TextColourBlue);
    }

    private void HousingManagement()
    {
        if (housingPanel == null) return;

        // Title shows count and conversion info
        string housingText = _communityProduction > 10
            ? $"{CalcUtils.FormatNumber(_communityProduction / HousingToVillageCost, colourOverride: UIThemeProvider.TextColourBlue)} Villages/s"
            : $"{UIThemeProvider.TextColourBlue}{sd1.housing:N0}</color>";
        housingPanel.titleText.text = $"Housing <size=70%>{housingText}";

        // Secondary fill bar shows conversion progress to villages
        housingPanel.fill2.fillAmount = _communityProduction > 10 ? 1 :
            sd1.housing >= 1 ? (float)sd1.housing / HousingToVillageCost : 0;
        housingPanel.fillBar2Text.text = $"{UIThemeProvider.TextColourBlue}{(int)sd1.housing % HousingToVillageCost}</color> / {UIThemeProvider.TextColourBlue}{HousingToVillageCost}</color>";

        double globalMulti = GetGlobalMultiplier();
        int produced = _housingTimer.Update(sd1.housing, globalMulti, Time.deltaTime);
        sd1.workers += produced;

        // When housing is 0, keep fill bar and timer text at last value to prevent flickering
        if (sd1.housing == 0)
            return;

        double effectiveMulti = _housingTimer.GetEffectiveMultiplier(sd1.housing, globalMulti);
        housingPanel.fill1.fillAmount = (float)StaticMethods.FillBar(sd1.housing, housingDuration, effectiveMulti, _housingTimer.currentTime);
        housingPanel.fillBar1Text.text = StaticMethods.TimerText(sd1.housing, housingDuration, effectiveMulti, _housingTimer.currentTime, mspace: true, colourOverride: UIThemeProvider.TextColourBlue);
    }

    private void VillageManagement()
    {
        if (villagesPanel == null) return;

        villagesPanel.titleText.text = $"Villages <size=70%>{UIThemeProvider.TextColourBlue}{sd1.villages:N0}</color>";

        // Secondary fill bar shows conversion progress to cities
        villagesPanel.fill2.fillAmount = (float)sd1.villages / VillageToCitiesCost;
        villagesPanel.fillBar2Text.text = $"{UIThemeProvider.TextColourBlue}{(int)sd1.villages % VillageToCitiesCost}</color> / {UIThemeProvider.TextColourBlue}{VillageToCitiesCost}</color>";

        if (sd1.villages == 0)
        {
            villagesPanel.fill1.fillAmount = 0;
            villagesPanel.fillBar1Text.text = "";
            return;
        }

        double globalMulti = GetGlobalMultiplier();
        int produced = _villagesTimer.Update(sd1.villages, globalMulti, Time.deltaTime);
        sd1.workers += produced * 2; // Villages produce 2 workers per tick

        double effectiveMulti = _villagesTimer.GetEffectiveMultiplier(sd1.villages, globalMulti);
        villagesPanel.fill1.fillAmount = (float)StaticMethods.FillBar(sd1.villages, villagesDuration, effectiveMulti, _villagesTimer.currentTime);
        villagesPanel.fillBar1Text.text = StaticMethods.TimerText(sd1.villages, villagesDuration, effectiveMulti, _villagesTimer.currentTime, mspace: true, colourOverride: UIThemeProvider.TextColourBlue);
    }

    private void WorkerManagement()
    {
        if (workersPanel == null) return;

        workersPanel.titleText.text = $"Workers <size=70%>{UIThemeProvider.TextColourBlue}{sd1.workers:N0}</color>";

        // Workers have special boost from workerBoostActivator
        double globalMulti = GetGlobalMultiplier();
        if (sp.workerBoostAcivator && sd1.workers > 0)
            globalMulti *= 1 + Math.Log10(sd1.workers);

        int produced = _workersTimer.Update(sd1.workers, globalMulti, Time.deltaTime);
        sd1.housing += produced;

        double effectiveMulti = _workersTimer.GetEffectiveMultiplier(sd1.workers, globalMulti);
        workersPanel.fill1.fillAmount = (float)StaticMethods.FillBar(sd1.workers, workersDuration, effectiveMulti, _workersTimer.currentTime);
        workersPanel.fillBar1Text.text = StaticMethods.TimerText(sd1.workers, workersDuration, effectiveMulti, _workersTimer.currentTime, mspace: true, colourOverride: UIThemeProvider.TextColourBlue);
    }

    private void CityManagement()
    {
        if (citiesPanel == null) return;

        citiesPanel.titleText.text = $"Cities <size=70%>{UIThemeProvider.TextColourBlue}{sd1.cities:N0}</color>";

        double globalMulti = GetGlobalMultiplier();
        int produced = _citiesTimer.Update(sd1.cities, globalMulti, Time.deltaTime);

        // Apply production per tick
        for (int i = 0; i < produced; i++)
        {
            sd1.workers += 5;
            if (sd1.engineeringComplete) sd1.factories += sp.citiesBoostActivator ? 10 : 1;
        }

        double effectiveMulti = _citiesTimer.GetEffectiveMultiplier(sd1.cities, globalMulti);
        citiesPanel.fill1.fillAmount = (float)StaticMethods.FillBar(sd1.cities, citiesDuration, effectiveMulti, _citiesTimer.currentTime);
        citiesPanel.fillBar1Text.text = StaticMethods.TimerText(sd1.cities, citiesDuration, effectiveMulti, _citiesTimer.currentTime, mspace: true, colourOverride: UIThemeProvider.TextColourBlue);
    }

    #region Info Descriptions

    private void UpdateInfoDescriptions()
    {
        _infoUpdateTimer += Time.deltaTime;
        if (_infoUpdateTimer < InfoUpdateInterval) return;
        _infoUpdateTimer = 0;

        UpdateHunterInfoDescription();
        UpdateGathererInfoDescription();
        UpdateCommunityInfoDescription();
        UpdateHousingInfoDescription();
        UpdateVillagesInfoDescription();
        UpdateWorkersInfoDescription();
        UpdateCitiesInfoDescription();
    }

    private void UpdateHunterInfoDescription()
    {
        if (hunterPanel?.infoDescriptionText == null) return;

        double globalMulti = GetGlobalMultiplier();
        double effectiveMulti = _hunterTimer.GetEffectiveMultiplier(sd1.hunters, globalMulti);
        double rate = effectiveMulti > 0 ? effectiveMulti / hunterDuration : 0;

        string blue = UIThemeProvider.TextColourBlue;
        hunterPanel.infoDescriptionText.text =
            $"Influence heroic hunters to gather meat for your communities.\n\n" +
            $"Output: {blue}1</color> community/cycle\n" +
            $"Base Duration: {blue}{hunterDuration}</color>s\n" +
            $"Speed Multiplier: ({blue}1</color> + Log{blue}₁₀</color>({blue}{sd1.hunters:N0}</color>)) × {blue}{globalMulti:N1}</color>\n" +
            $"Current Rate: {blue}{CalcUtils.FormatNumber(rate)}</color> community/s";
    }

    private void UpdateGathererInfoDescription()
    {
        if (gathererPanel?.infoDescriptionText == null) return;

        double globalMulti = GetGlobalMultiplier();
        double effectiveMulti = _gathererTimer.GetEffectiveMultiplier(sd1.gatherers, globalMulti);
        double rate = effectiveMulti > 0 ? effectiveMulti / gatherDuration : 0;

        string blue = UIThemeProvider.TextColourBlue;
        gathererPanel.infoDescriptionText.text =
            $"Influence villagers to gather greens for your communities.\n\n" +
            $"Output: {blue}1</color> community/cycle\n" +
            $"Base Duration: {blue}{gatherDuration}</color>s\n" +
            $"Speed Multiplier: ({blue}1</color> + Log{blue}₁₀</color>({blue}{sd1.gatherers:N0}</color>)) × {blue}{globalMulti:N1}</color>\n" +
            $"Current Rate: {blue}{CalcUtils.FormatNumber(rate)}</color> community/s";
    }

    private void UpdateCommunityInfoDescription()
    {
        if (communityPanel?.infoDescriptionText == null) return;

        double globalMulti = GetGlobalMultiplier();
        if (sd1.communityBoostTime > 0) globalMulti *= 2;
        double effectiveMulti = _communityTimer.GetEffectiveMultiplier(sd1.community, globalMulti);
        double rate = effectiveMulti > 0 ? effectiveMulti / communityDuration : 0;

        string blue = UIThemeProvider.TextColourBlue;
        string boostStatus = sd1.communityBoostTime > 0 ? $" (Boosted {blue}×2</color>)" : "";
        communityPanel.infoDescriptionText.text =
            $"Over time community brings people closer together, some decide to settle and build houses! Boosting community is free and doubles the speed of community.\n\n" +
            $"Output: {blue}1</color> housing/cycle\n" +
            $"Base Duration: {blue}{communityDuration}</color>s\n" +
            $"Speed Multiplier: ({blue}1</color> + Log{blue}₁₀</color>({blue}{sd1.community:N0}</color>)) × {blue}{globalMulti:N1}</color>{boostStatus}\n" +
            $"Current Rate: {blue}{CalcUtils.FormatNumber(rate)}</color> housing/s";
    }

    private void UpdateHousingInfoDescription()
    {
        if (housingPanel?.infoDescriptionText == null) return;

        double globalMulti = GetGlobalMultiplier();
        double effectiveMulti = _housingTimer.GetEffectiveMultiplier(sd1.housing, globalMulti);
        double rate = effectiveMulti > 0 ? effectiveMulti / housingDuration : 0;

        string blue = UIThemeProvider.TextColourBlue;
        housingPanel.infoDescriptionText.text =
            $"Housing produces workers. Reaching {blue}{HousingToVillageCost}</color> housing automatically converts into a village.\n\n" +
            $"Output: {blue}1</color> worker/cycle\n" +
            $"Base Duration: {blue}{housingDuration}</color>s\n" +
            $"Speed Multiplier: ({blue}1</color> + Log{blue}₁₀</color>({blue}{sd1.housing:N0}</color>)) × {blue}{globalMulti:N1}</color>\n" +
            $"Current Rate: {blue}{CalcUtils.FormatNumber(rate)}</color> worker/s\n" +
            $"Conversion: {blue}{HousingToVillageCost}</color> housing → {blue}1</color> village";
    }

    private void UpdateVillagesInfoDescription()
    {
        if (villagesPanel?.infoDescriptionText == null) return;

        double globalMulti = GetGlobalMultiplier();
        double effectiveMulti = _villagesTimer.GetEffectiveMultiplier(sd1.villages, globalMulti);
        double rate = effectiveMulti > 0 ? effectiveMulti * 2 / villagesDuration : 0; // Villages produce 2 workers per cycle

        string blue = UIThemeProvider.TextColourBlue;
        villagesPanel.infoDescriptionText.text =
            $"As settlements expand into villages, more workers join the cause. When enough villages unite, they form a bustling city.\n\n" +
            $"Output: {blue}2</color> workers/cycle\n" +
            $"Base Duration: {blue}{villagesDuration}</color>s\n" +
            $"Speed Multiplier: ({blue}1</color> + Log{blue}₁₀</color>({blue}{sd1.villages:N0}</color>)) × {blue}{globalMulti:N1}</color>\n" +
            $"Current Rate: {blue}{CalcUtils.FormatNumber(rate)}</color> workers/s\n" +
            $"Conversion: {blue}{VillageToCitiesCost}</color> villages → {blue}1</color> city";
    }

    private void UpdateWorkersInfoDescription()
    {
        if (workersPanel?.infoDescriptionText == null) return;

        double globalMulti = GetGlobalMultiplier();
        bool hasBoost = sp.workerBoostAcivator && sd1.workers > 0;
        double boostMulti = hasBoost ? 1 + Math.Log10(sd1.workers) : 1;
        double adjustedGlobalMulti = globalMulti * boostMulti;
        double effectiveMulti = _workersTimer.GetEffectiveMultiplier(sd1.workers, adjustedGlobalMulti);
        double rate = effectiveMulti > 0 ? effectiveMulti / workersDuration : 0;

        string blue = UIThemeProvider.TextColourBlue;
        // When boosted, formula is (1 + Log₁₀(workers))² × globalMulti
        string speedFormula = hasBoost
            ? $"({blue}1</color> + Log{blue}₁₀</color>({blue}{sd1.workers:N0}</color>))² × {blue}{globalMulti:N1}</color>"
            : $"({blue}1</color> + Log{blue}₁₀</color>({blue}{sd1.workers:N0}</color>)) × {blue}{globalMulti:N1}</color>";
        workersPanel.infoDescriptionText.text =
            $"The workforce builds new housing, expanding civilization's reach. A larger workforce builds exponentially faster.\n\n" +
            $"Output: {blue}1</color> housing/cycle\n" +
            $"Base Duration: {blue}{workersDuration}</color>s\n" +
            $"Speed Multiplier: {speedFormula}\n" +
            $"Current Rate: {blue}{CalcUtils.FormatNumber(rate)}</color> housing/s";
    }

    private void UpdateCitiesInfoDescription()
    {
        if (citiesPanel?.infoDescriptionText == null) return;

        double globalMulti = GetGlobalMultiplier();
        double effectiveMulti = _citiesTimer.GetEffectiveMultiplier(sd1.cities, globalMulti);
        double rate = effectiveMulti > 0 ? effectiveMulti / citiesDuration : 0;
        int factoriesPerCycle = sp.citiesBoostActivator ? 10 : 1;

        string blue = UIThemeProvider.TextColourBlue;
        string factoryLine = sd1.engineeringComplete
            ? $"Output: {blue}{factoriesPerCycle}</color> factories/cycle\n"
            : "Complete Engineering to unlock factory production.\n";
        string factoryRate = sd1.engineeringComplete
            ? $"Current Rate: {blue}{CalcUtils.FormatNumber(rate * factoriesPerCycle)}</color> factories/s\n"
            : "";
        citiesPanel.infoDescriptionText.text =
            $"Great cities are centers of production, training workers for the cause.\n\n" +
            $"Output: {blue}5</color> workers/cycle\n" +
            factoryLine +
            $"Base Duration: {blue}{citiesDuration}</color>s\n" +
            $"Speed Multiplier: ({blue}1</color> + Log{blue}₁₀</color>({blue}{sd1.cities:N0}</color>)) × {blue}{globalMulti:N1}</color>\n" +
            $"Current Rate: {blue}{CalcUtils.FormatNumber(rate * 5)}</color> workers/s\n" +
            factoryRate;
    }

    #endregion

    #region Button Methods

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
