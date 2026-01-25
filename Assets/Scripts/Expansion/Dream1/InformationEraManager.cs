using System;
using Systems;
using UnityEngine;
using Blindsided.Utilities;
using IdleDysonSwarm.Systems.Dream1;
using IdleDysonSwarm.UI;
using IdleDysonSwarm.UI.Simulation;
using static Expansion.Oracle;

public class InformationEraManager : MonoBehaviour
{
    [Header("Category Headers")]
    [SerializeField] private GameObject informationEraCategoryPanel;
    [SerializeField] private GameObject educationCategoryPanel;

    [Header("Education Panel References")]
    [SerializeField] private SimulationGenericPanelReferences engineeringPanel;
    [SerializeField] private SimulationGenericPanelReferences shippingPanel;
    [SerializeField] private SimulationGenericPanelReferences worldTradePanel;
    [SerializeField] private SimulationGenericPanelReferences worldPeacePanel;
    [SerializeField] private SimulationGenericPanelReferences mathematicsPanel;
    [SerializeField] private SimulationGenericPanelReferences advancedPhysicsPanel;

    [Header("Information Era Panel References")]
    [SerializeField] private SimulationGenericPanelReferences factoriesPanel;
    [SerializeField] private SimulationGenericPanelReferences botsPanel;
    [SerializeField] private SimulationGenericPanelReferences rocketsPanel;

    [Header("Production Durations")]
    [SerializeField] private float factoriesDuration = 30;
    [SerializeField] private float botsDuration = 20;

    private SaveDataDream1 sd1 => oracle.saveSettings.sdSimulation;
    private SaveData sd => oracle.saveSettings.saveData;
    private SaveDataPrestige sp => oracle.saveSettings.sdPrestige;

    // Production timers
    private ProductionTimer _factoriesTimer;
    private ProductionTimer _botsTimer;

    private void Start()
    {
        // Initialize timers with saved progress (must be in Start, after Oracle is initialized)
        _factoriesTimer = new ProductionTimer(factoriesDuration, sd1.factoriesTimerProgress);
        _botsTimer = new ProductionTimer(botsDuration, sd1.botsTimerProgress);

        // Set panel types and configure UI elements
        // Education research panels (LinearResearch - has "Start" button)
        if (engineeringPanel != null)
        {
            engineeringPanel.panelType = SimulationPanelType.LinearResearch;
            engineeringPanel.ConfigureUIElements();
        }
        if (shippingPanel != null)
        {
            shippingPanel.panelType = SimulationPanelType.LinearResearch;
            shippingPanel.ConfigureUIElements();
        }
        if (worldTradePanel != null)
        {
            worldTradePanel.panelType = SimulationPanelType.LinearResearch;
            worldTradePanel.ConfigureUIElements();
        }
        if (worldPeacePanel != null)
        {
            worldPeacePanel.panelType = SimulationPanelType.LinearResearch;
            worldPeacePanel.ConfigureUIElements();
        }
        if (mathematicsPanel != null)
        {
            mathematicsPanel.panelType = SimulationPanelType.LinearResearch;
            mathematicsPanel.ConfigureUIElements();
        }
        if (advancedPhysicsPanel != null)
        {
            advancedPhysicsPanel.panelType = SimulationPanelType.LinearResearch;
            advancedPhysicsPanel.ConfigureUIElements();
        }

        // Information Era production panels
        if (factoriesPanel != null)
        {
            factoriesPanel.panelType = SimulationPanelType.ProductionBoost;
            factoriesPanel.ConfigureUIElements();
        }
        if (botsPanel != null)
        {
            botsPanel.panelType = SimulationPanelType.InfoEraProduction;
            botsPanel.ConfigureUIElements();
        }
        if (rocketsPanel != null)
        {
            rocketsPanel.panelType = SimulationPanelType.RocketDisplay;
            rocketsPanel.ConfigureUIElements();
        }

        // Setup button listeners
        if (engineeringPanel?.actionButton != null)
            engineeringPanel.actionButton.onClick.AddListener(OnEngineeringButtonClick);
        if (shippingPanel?.actionButton != null)
            shippingPanel.actionButton.onClick.AddListener(OnShippingButtonClick);
        if (worldTradePanel?.actionButton != null)
            worldTradePanel.actionButton.onClick.AddListener(OnWorldTradeButtonClick);
        if (worldPeacePanel?.actionButton != null)
            worldPeacePanel.actionButton.onClick.AddListener(OnWorldPeaceButtonClick);
        if (mathematicsPanel?.actionButton != null)
            mathematicsPanel.actionButton.onClick.AddListener(OnMathematicsButtonClick);
        if (advancedPhysicsPanel?.actionButton != null)
            advancedPhysicsPanel.actionButton.onClick.AddListener(OnAdvancedPhysicsButtonClick);
        if (factoriesPanel?.actionButton != null)
            factoriesPanel.actionButton.onClick.AddListener(OnFactoriesBoost);
    }

    private void Update()
    {
        UpdateVisibility();
        EngineeringManager();
        ShippingManager();
        WorldTradeManager();
        WorldPeaceManager();
        MathematicsManager();
        AdvancedPhysicsManager();

        ManageFactoryBoost();
        FactoryManagement();
        BotsManagement();
        RocketsManagement();
        UpdateButtonsInteractable();
        SyncTimerProgress();
    }

    private void UpdateVisibility()
    {
        // Category header visibility
        if (informationEraCategoryPanel != null)
            informationEraCategoryPanel.SetActive(sd1.cities >= 1);
        if (educationCategoryPanel != null)
            educationCategoryPanel.SetActive(sd1.cities >= 1);

        // Visibility logic from Dream1BuildingEnabler
        if (engineeringPanel != null)
            engineeringPanel.gameObject.SetActive(sd1.cities >= 1);
        if (shippingPanel != null)
            shippingPanel.gameObject.SetActive(sd1.engineeringComplete && sd1.cities >= 1);
        if (worldTradePanel != null)
            worldTradePanel.gameObject.SetActive(sd1.shippingComplete && sd1.cities >= 1);
        if (worldPeacePanel != null)
            worldPeacePanel.gameObject.SetActive(sd1.worldTradeComplete && sd1.cities >= 1);
        if (mathematicsPanel != null)
            mathematicsPanel.gameObject.SetActive((sd1.rockets >= 1 && sd1.cities >= 1) || (sd1.spaceFactories >= 1 && sd1.cities >= 1));
        if (advancedPhysicsPanel != null)
            advancedPhysicsPanel.gameObject.SetActive(sd1.mathematicsComplete && sd1.spaceFactories >= 1 && sd1.cities >= 1);
        if (factoriesPanel != null)
            factoriesPanel.gameObject.SetActive(sd1.engineeringComplete && sd1.cities >= 1);
        if (botsPanel != null)
            botsPanel.gameObject.SetActive(sd1.bots >= 1);
        if (rocketsPanel != null)
            rocketsPanel.gameObject.SetActive(sd1.rockets >= 1 || sd1.spaceFactories >= 1);
    }

    private double GetGlobalMultiplier()
    {
        return sp.doDoubleTime ? sp.doubleTimeRate + 1 : 1;
    }

    private void SyncTimerProgress()
    {
        sd1.factoriesTimerProgress = _factoriesTimer.currentTime;
        sd1.botsTimerProgress = _botsTimer.currentTime;
    }

    private void UpdateButtonsInteractable()
    {
        if (engineeringPanel?.actionButton != null)
            engineeringPanel.actionButton.interactable = sd.influence >= sd1.engineeringCost;
        if (shippingPanel?.actionButton != null)
            shippingPanel.actionButton.interactable = sd.influence >= sd1.shippingCost;
        if (worldTradePanel?.actionButton != null)
            worldTradePanel.actionButton.interactable = sd.influence >= sd1.worldTradeCost;
        if (worldPeacePanel?.actionButton != null)
            worldPeacePanel.actionButton.interactable = sd.influence >= sd1.worldPeaceCost;
        if (mathematicsPanel?.actionButton != null)
            mathematicsPanel.actionButton.interactable = sd.influence >= sd1.mathematicsCost;
        if (advancedPhysicsPanel?.actionButton != null)
            advancedPhysicsPanel.actionButton.interactable = sd.influence >= sd1.advancedPhysicsCost;
        if (factoriesPanel?.actionButton != null)
            factoriesPanel.actionButton.interactable = sd.influence >= sd1.factoriesBoostCost;
    }

    #region Education Research

    private void EngineeringManager()
    {
        if (engineeringPanel == null) return;

        if (!sd1.engineeringComplete)
        {
            if (engineeringPanel.actionButton != null)
                engineeringPanel.actionButton.gameObject.SetActive(!sd1.engineering);
            engineeringPanel.titleText.text = !sd1.engineering
                ? $"Engineering<size=70%> - {UIThemeProvider.TextColourBlue}{sd1.engineeringCost:N0}</color> Influence"
                : "Engineering";
            engineeringPanel.fill1.fillAmount = !sd1.engineering
                ? 0
                : (float)(sd1.engineeringProgress / sd1.engineeringResearchTime);
            if (engineeringPanel.fillBar1Text != null)
                engineeringPanel.fillBar1Text.text = sd1.engineering
                    ? CalcUtils.FormatTime(sd1.engineeringResearchTime - sd1.engineeringProgress, shortForm: true, colourOverride: UIThemeProvider.TextColourBlue)
                    : CalcUtils.FormatTime(sd1.engineeringResearchTime, shortForm: true, colourOverride: UIThemeProvider.TextColourBlue);
        }
        else
        {
            if (engineeringPanel.actionButton != null)
                engineeringPanel.actionButton.gameObject.SetActive(false);
            if (engineeringPanel.fillBarArea != null)
                engineeringPanel.fillBarArea.SetActive(false);
            engineeringPanel.titleText.text = "Engineering<size=70%> - Complete";
        }

        if (!sd1.engineering || sd1.engineeringComplete) return;
        float multi = 1 * Time.deltaTime;
        if (sp.doDoubleTime) multi *= sp.doubleTimeRate + 1;
        sd1.engineeringProgress += multi;
        if (sd1.engineeringProgress >= sd1.engineeringResearchTime) sd1.engineeringComplete = true;
    }

    private void ShippingManager()
    {
        if (shippingPanel == null) return;

        if (!sd1.shippingComplete)
        {
            if (shippingPanel.actionButton != null)
                shippingPanel.actionButton.gameObject.SetActive(!sd1.shipping);
            shippingPanel.titleText.text = !sd1.shipping
                ? $"Shipping<size=70%> - {UIThemeProvider.TextColourBlue}{sd1.shippingCost:N0}</color> Influence"
                : "Shipping";
            shippingPanel.fill1.fillAmount = !sd1.shipping
                ? 0
                : (float)(sd1.shippingProgress / sd1.shippingResearchTime);
            if (shippingPanel.fillBar1Text != null)
                shippingPanel.fillBar1Text.text = sd1.shipping
                    ? CalcUtils.FormatTime(sd1.shippingResearchTime - sd1.shippingProgress, shortForm: true, colourOverride: UIThemeProvider.TextColourBlue)
                    : CalcUtils.FormatTime(sd1.shippingResearchTime, shortForm: true, colourOverride: UIThemeProvider.TextColourBlue);
        }
        else
        {
            if (shippingPanel.actionButton != null)
                shippingPanel.actionButton.gameObject.SetActive(false);
            if (shippingPanel.fillBarArea != null)
                shippingPanel.fillBarArea.SetActive(false);
            shippingPanel.titleText.text = "Shipping<size=70%> - Complete";
        }

        if (!sd1.shipping || sd1.shippingComplete) return;
        float multi = 1 * Time.deltaTime;
        if (sp.doDoubleTime) multi *= sp.doubleTimeRate + 1;
        sd1.shippingProgress += multi;
        if (sd1.shippingProgress >= sd1.shippingResearchTime) sd1.shippingComplete = true;
    }

    private void WorldTradeManager()
    {
        if (worldTradePanel == null) return;

        if (!sd1.worldTradeComplete)
        {
            if (worldTradePanel.actionButton != null)
                worldTradePanel.actionButton.gameObject.SetActive(!sd1.worldTrade);
            worldTradePanel.titleText.text = !sd1.worldTrade
                ? $"World Trade<size=70%> - {UIThemeProvider.TextColourBlue}{sd1.worldTradeCost:N0}</color> Influence"
                : "World Trade";
            worldTradePanel.fill1.fillAmount = !sd1.worldTrade
                ? 0
                : (float)(sd1.worldTradeProgress / sd1.worldTradeResearchTime);
            if (worldTradePanel.fillBar1Text != null)
                worldTradePanel.fillBar1Text.text = sd1.worldTrade
                    ? CalcUtils.FormatTime(sd1.worldTradeResearchTime - sd1.worldTradeProgress, shortForm: true, colourOverride: UIThemeProvider.TextColourBlue)
                    : CalcUtils.FormatTime(sd1.worldTradeResearchTime, shortForm: true, colourOverride: UIThemeProvider.TextColourBlue);
        }
        else
        {
            if (worldTradePanel.actionButton != null)
                worldTradePanel.actionButton.gameObject.SetActive(false);
            if (worldTradePanel.fillBarArea != null)
                worldTradePanel.fillBarArea.SetActive(false);
            worldTradePanel.titleText.text = "World Trade<size=70%> - Complete";
        }

        if (!sd1.worldTrade || sd1.worldTradeComplete) return;
        float multi = 1 * Time.deltaTime;
        if (sp.doDoubleTime) multi *= sp.doubleTimeRate + 1;
        sd1.worldTradeProgress += multi;
        if (sd1.worldTradeProgress >= sd1.worldTradeResearchTime) sd1.worldTradeComplete = true;
    }

    private void WorldPeaceManager()
    {
        if (worldPeacePanel == null) return;

        if (!sd1.worldPeaceComplete)
        {
            if (worldPeacePanel.actionButton != null)
                worldPeacePanel.actionButton.gameObject.SetActive(!sd1.worldPeace);
            worldPeacePanel.titleText.text = !sd1.worldPeace
                ? $"World Peace<size=70%> - {UIThemeProvider.TextColourBlue}{sd1.worldPeaceCost:N0}</color> Influence"
                : "World Peace";
            worldPeacePanel.fill1.fillAmount = !sd1.worldPeace
                ? 0
                : (float)(sd1.worldPeaceProgress / sd1.worldPeaceResearchTime);
            if (worldPeacePanel.fillBar1Text != null)
                worldPeacePanel.fillBar1Text.text = sd1.worldPeace
                    ? CalcUtils.FormatTime(sd1.worldPeaceResearchTime - sd1.worldPeaceProgress, shortForm: true, colourOverride: UIThemeProvider.TextColourBlue)
                    : CalcUtils.FormatTime(sd1.worldPeaceResearchTime, shortForm: true, colourOverride: UIThemeProvider.TextColourBlue);
        }
        else
        {
            if (worldPeacePanel.actionButton != null)
                worldPeacePanel.actionButton.gameObject.SetActive(false);
            if (worldPeacePanel.fillBarArea != null)
                worldPeacePanel.fillBarArea.SetActive(false);
            worldPeacePanel.titleText.text = "World Peace<size=70%> - Complete";
        }

        if (!sd1.worldPeace || sd1.worldPeaceComplete) return;
        float multi = 1 * Time.deltaTime;
        if (sp.doDoubleTime) multi *= sp.doubleTimeRate + 1;
        sd1.worldPeaceProgress += multi;
        if (sd1.worldPeaceProgress >= sd1.worldPeaceResearchTime) sd1.worldPeaceComplete = true;
    }

    private void MathematicsManager()
    {
        if (mathematicsPanel == null) return;

        if (!sd1.mathematicsComplete)
        {
            if (mathematicsPanel.actionButton != null)
                mathematicsPanel.actionButton.gameObject.SetActive(!sd1.mathematics);
            mathematicsPanel.titleText.text = !sd1.mathematics
                ? $"Mathematics<size=70%> - {UIThemeProvider.TextColourBlue}{sd1.mathematicsCost:N0}</color> Influence"
                : "Mathematics";
            mathematicsPanel.fill1.fillAmount = !sd1.mathematics
                ? 0
                : (float)(sd1.mathematicsProgress / sd1.mathematicsResearchTime);
            if (mathematicsPanel.fillBar1Text != null)
                mathematicsPanel.fillBar1Text.text = sd1.mathematics
                    ? CalcUtils.FormatTime(sd1.mathematicsResearchTime - sd1.mathematicsProgress, shortForm: true, colourOverride: UIThemeProvider.TextColourBlue)
                    : CalcUtils.FormatTime(sd1.mathematicsResearchTime, shortForm: true, colourOverride: UIThemeProvider.TextColourBlue);
        }
        else
        {
            if (mathematicsPanel.actionButton != null)
                mathematicsPanel.actionButton.gameObject.SetActive(false);
            if (mathematicsPanel.fillBarArea != null)
                mathematicsPanel.fillBarArea.SetActive(false);
            mathematicsPanel.titleText.text = "Mathematics<size=70%> - Complete";
        }

        if (!sd1.mathematics || sd1.mathematicsComplete) return;
        float multi = 1 * Time.deltaTime;
        if (sp.doDoubleTime) multi *= sp.doubleTimeRate + 1;
        sd1.mathematicsProgress += multi;
        if (sd1.mathematicsProgress >= sd1.mathematicsResearchTime)
        {
            sd1.solarPanelGeneration *= 2;
            sd1.mathematicsComplete = true;
        }
    }

    private void AdvancedPhysicsManager()
    {
        if (advancedPhysicsPanel == null) return;

        if (!sd1.advancedPhysicsComplete)
        {
            if (advancedPhysicsPanel.actionButton != null)
                advancedPhysicsPanel.actionButton.gameObject.SetActive(!sd1.advancedPhysics);
            advancedPhysicsPanel.titleText.text = !sd1.advancedPhysics
                ? $"Advanced Physics<size=70%> - {UIThemeProvider.TextColourBlue}{sd1.advancedPhysicsCost:N0}</color> Influence"
                : "Advanced Physics";
            advancedPhysicsPanel.fill1.fillAmount = !sd1.advancedPhysics
                ? 0
                : (float)(sd1.advancedPhysicsProgress / sd1.advancedPhysicsResearchTime);
            if (advancedPhysicsPanel.fillBar1Text != null)
                advancedPhysicsPanel.fillBar1Text.text = sd1.advancedPhysics
                    ? CalcUtils.FormatTime(sd1.advancedPhysicsResearchTime - sd1.advancedPhysicsProgress, shortForm: true, colourOverride: UIThemeProvider.TextColourBlue)
                    : CalcUtils.FormatTime(sd1.advancedPhysicsResearchTime, shortForm: true, colourOverride: UIThemeProvider.TextColourBlue);
        }
        else
        {
            if (advancedPhysicsPanel.actionButton != null)
                advancedPhysicsPanel.actionButton.gameObject.SetActive(false);
            if (advancedPhysicsPanel.fillBarArea != null)
                advancedPhysicsPanel.fillBarArea.SetActive(false);
            advancedPhysicsPanel.titleText.text = "Advanced Physics<size=70%> - Complete";
        }

        if (!sd1.advancedPhysics || sd1.advancedPhysicsComplete) return;
        float multi = 1 * Time.deltaTime;
        if (sp.doDoubleTime) multi *= sp.doubleTimeRate + 1;
        sd1.advancedPhysicsProgress += multi;
        if (sd1.advancedPhysicsProgress >= sd1.advancedPhysicsResearchTime) sd1.advancedPhysicsComplete = true;
    }

    #endregion

    #region Information Era Production

    private void ManageFactoryBoost()
    {
        if (factoriesPanel == null) return;

        if (sd1.factoriesBoostTime > 0)
        {
            sd1.factoriesBoostTime -= Time.deltaTime;
            factoriesPanel.fill2.fillAmount = (float)(sd1.factoriesBoostTime / sd1.factoriesBoostDuration);
            factoriesPanel.fillBar2Text.text = CalcUtils.FormatTime(sd1.factoriesBoostTime, shortForm: true, colourOverride: UIThemeProvider.TextColourBlue);
        }
        else
        {
            sd1.factoriesBoostTime = 0;
            factoriesPanel.fill2.fillAmount = 0;
            factoriesPanel.fillBar2Text.text = "0s";
        }
    }

    private void FactoryManagement()
    {
        if (factoriesPanel == null) return;

        // Hide boost button when boost is active (time remaining > 10s)
        if (factoriesPanel.actionButton != null)
            factoriesPanel.actionButton.gameObject.SetActive(sd1.factoriesBoostTime < 10);

        factoriesPanel.titleText.text = $"Factories <size=70%>{UIThemeProvider.TextColourBlue}{sd1.factories:N0}</color>";

        // Build custom multiplier (factories has extra bonuses)
        double globalMulti = GetGlobalMultiplier();
        if (sd1.factoriesBoostTime > 0) globalMulti *= 2;
        if (sd1.shippingComplete) globalMulti *= 2;
        if (sd1.worldTradeComplete) globalMulti *= 2;

        // Use standard Log10 multiplier via ProductionTimer
        int produced = _factoriesTimer.Update(sd1.factories, globalMulti, Time.deltaTime);

        // Apply production
        for (int i = 0; i < produced; i++)
        {
            sd1.bots += sp.factoriesBoostActivator ? sd1.factories * 9 : sd1.factories;
        }

        double effectiveMulti = _factoriesTimer.GetEffectiveMultiplier(sd1.factories, globalMulti);
        factoriesPanel.fill1.fillAmount =
            (float)StaticMethods.FillBar(sd1.factories, factoriesDuration, effectiveMulti, _factoriesTimer.currentTime);
        factoriesPanel.fillBar1Text.text = StaticMethods.TimerText(sd1.factories, factoriesDuration, effectiveMulti, _factoriesTimer.currentTime, mspace: true, colourOverride: UIThemeProvider.TextColourBlue);
    }

    private double _botsFillSpeed;

    private void BotsManagement()
    {
        if (botsPanel == null) return;

        botsPanel.titleText.text = $"Bots <size=70%>{UIThemeProvider.TextColourBlue}{sd1.bots:N0}</color>";

        // Guard: no production without bots
        if (sd1.bots < 1)
        {
            botsPanel.fill1.fillAmount = 0;
            botsPanel.fillBar1Text.text = "";
            _botsFillSpeed = 0;
            return;
        }

        // Bots has special soft-start: reduced production when bots < 100
        double baseMulti = 1 + Math.Log10(sd1.bots);
        if (sd1.bots < 100) baseMulti *= sd1.bots / 100.0;

        double globalMulti = GetGlobalMultiplier();
        if (sd1.worldPeaceComplete) globalMulti *= 2;
        if (sp.botsBoost1Activator) globalMulti *= 2;

        // Use custom multiplier since bots has special soft-start logic
        double effectiveMulti = baseMulti * globalMulti;
        int produced = _botsTimer.UpdateWithCustomMultiplier(baseMulti, globalMulti, Time.deltaTime);

        // Apply production
        for (int i = 0; i < produced; i++)
        {
            sd1.rockets += sp.botsBoost2Activator ? 2 : 1;
        }

        _botsFillSpeed = effectiveMulti > 0 ? effectiveMulti / botsDuration : 0;

        botsPanel.fill1.fillAmount = (float)StaticMethods.FillBar(sd1.bots, botsDuration, effectiveMulti, _botsTimer.currentTime);
        botsPanel.fillBar1Text.text = StaticMethods.TimerText(sd1.bots, botsDuration, effectiveMulti, _botsTimer.currentTime, mspace: true, colourOverride: UIThemeProvider.TextColourBlue);
    }

    private void RocketsManagement()
    {
        if (rocketsPanel == null) return;

        double factoriesPerSecond = _botsFillSpeed / sd1.rocketsPerSpaceFactory;
        rocketsPanel.titleText.text = "Rockets";

        if (rocketsPanel.additionalText != null)
            rocketsPanel.additionalText.text =
                $"Launching {UIThemeProvider.TextColourBlue}{CalcUtils.FormatNumber(factoriesPerSecond, useMspace: true)}</color> Factories/s";

        // Convert rockets to space factories
        while (sd1.rockets >= sd1.rocketsPerSpaceFactory && sd1.factories >= 1)
        {
            sd1.rockets -= sd1.rocketsPerSpaceFactory;
            sd1.factories--;
            sd1.spaceFactories++;
        }
    }

    #endregion

    #region Button Methods

    private void OnFactoriesBoost()
    {
        if (sd.influence <= sd1.factoriesBoostCost) return;

        sd.influence -= (int)sd1.factoriesBoostCost;
        sd1.factoriesBoostTime = sd1.factoriesBoostDuration;
    }

    private void OnEngineeringButtonClick()
    {
        if (sd1.engineeringCost <= sd.influence)
        {
            sd.influence -= (long)sd1.engineeringCost;
            sd1.engineering = true;
        }
    }

    private void OnShippingButtonClick()
    {
        if (sd1.shippingCost <= sd.influence)
        {
            sd.influence -= (long)sd1.shippingCost;
            sd1.shipping = true;
        }
    }

    private void OnWorldTradeButtonClick()
    {
        if (sd1.worldTradeCost <= sd.influence)
        {
            sd.influence -= (long)sd1.worldTradeCost;
            sd1.worldTrade = true;
        }
    }

    private void OnWorldPeaceButtonClick()
    {
        if (sd1.worldPeaceCost <= sd.influence)
        {
            sd.influence -= (long)sd1.worldPeaceCost;
            sd1.worldPeace = true;
        }
    }

    private void OnMathematicsButtonClick()
    {
        if (sd1.mathematicsCost <= sd.influence)
        {
            sd.influence -= (long)sd1.mathematicsCost;
            sd1.mathematics = true;
        }
    }

    private void OnAdvancedPhysicsButtonClick()
    {
        if (sd1.advancedPhysicsCost <= sd.influence)
        {
            sd.influence -= (long)sd1.advancedPhysicsCost;
            sd1.advancedPhysics = true;
        }
    }

    #endregion
}
