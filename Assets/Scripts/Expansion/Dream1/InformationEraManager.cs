using System;
using Systems;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using Blindsided.Utilities;
using IdleDysonSwarm.Systems.Dream1;
using static Expansion.Oracle;

public class InformationEraManager : MonoBehaviour
{
    private SaveDataDream1 sd1 => oracle.saveSettings.sdSimulation;
    private SaveData sd => oracle.saveSettings.saveData;
    private SaveDataPrestige sp => oracle.saveSettings.sdPrestige;

    // Production timers
    private ProductionTimer _factoriesTimer;
    private ProductionTimer _botsTimer;

    private void Awake()
    {
        // Initialize timers with saved progress
        _factoriesTimer = new ProductionTimer(factoriesDuration, sd1.factoriesTimerProgress);
        _botsTimer = new ProductionTimer(botsDuration, sd1.botsTimerProgress);
    }

    private void Start()
    {
        engineeringButton.onClick.AddListener(OnEngineeringButtonClick);
        shippingButton.onClick.AddListener(OnShippingButtonClick);
        worldTradeButton.onClick.AddListener(OnWorldTradeButtonClick);
        worldPeaceButton.onClick.AddListener(OnWorldPeaceButtonClick);
        mathematicsButton.onClick.AddListener(OnMathematicsButtonClick);
        advancedPhysicsButton.onClick.AddListener(OnAdvancedPhysicsButtonClick);
        factoriesBoost.onClick.AddListener(OnFactoriesBoost);
    }

    // Update is called once per frame
    private void Update()
    {
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

    /// <summary>
    /// Gets the global multiplier from DoubleTime.
    /// </summary>
    private double GetGlobalMultiplier()
    {
        return sp.doDoubleTime ? sp.doubleTimeRate + 1 : 1;
    }

    /// <summary>
    /// Syncs timer progress to save data for persistence.
    /// </summary>
    private void SyncTimerProgress()
    {
        sd1.factoriesTimerProgress = _factoriesTimer.currentTime;
        sd1.botsTimerProgress = _botsTimer.currentTime;
    }

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

    private void UpdateButtonsInteractable()
    {
        engineeringButton.interactable = sd.influence >= sd1.engineeringCost;
        shippingButton.interactable = sd.influence >= sd1.shippingCost;
        worldTradeButton.interactable = sd.influence >= sd1.worldTradeCost;
        worldPeaceButton.interactable = sd.influence >= sd1.worldPeaceCost;
        mathematicsButton.interactable = sd.influence >= sd1.mathematicsCost;
        advancedPhysicsButton.interactable = sd.influence >= sd1.advancedPhysicsCost;
        factoriesBoost.interactable = sd.influence >= sd1.factoriesBoostCost;
    }

    #region EducationFields

    [Space(10), SerializeField]  private Button engineeringButton;
    [SerializeField] private GameObject engineeringButtonGO;
    [SerializeField] private TMP_Text engineeringTitleText;
    [SerializeField] private SlicedFilledImage engineeringFillBar;

    [Space(10), SerializeField]  private Button shippingButton;
    [SerializeField] private GameObject shippingButtonGO;
    [SerializeField] private TMP_Text shippingTitleText;
    [SerializeField] private SlicedFilledImage shippingFillBar;

    [Space(10), SerializeField]  private Button worldTradeButton;
    [SerializeField] private GameObject worldTradeButtonGO;
    [SerializeField] private TMP_Text worldTradeTitleText;
    [SerializeField] private SlicedFilledImage worldTradeFillBar;

    [Space(10), SerializeField]  private Button worldPeaceButton;
    [SerializeField] private GameObject worldPeaceButtonGO;
    [SerializeField] private TMP_Text worldPeaceTitleText;
    [SerializeField] private SlicedFilledImage worldPeaceFillBar;

    [Space(10), SerializeField]  private Button mathematicsButton;
    [SerializeField] private GameObject mathematicsButtonGO;
    [SerializeField] private TMP_Text mathematicsTitleText;
    [SerializeField] private SlicedFilledImage mathematicsFillBar;

    [Space(10), SerializeField]  private Button advancedPhysicsButton;
    [SerializeField] private GameObject advancedPhysicsButtonGO;
    [SerializeField] private TMP_Text advancedPhysicsTitleText;
    [SerializeField] private SlicedFilledImage advancedPhysicsFillBar;

    #endregion

    #region InformationEraFields

    [Space(10), SerializeField]  private Button factoriesBoost;
    [SerializeField] private GameObject factoriesBoostButtonGO;
    [SerializeField] private TMP_Text factoriesTitleText;
    [SerializeField] private SlicedFilledImage factoriesFillBar;
    [SerializeField] private TMP_Text factoriesFillText;
    [SerializeField] private SlicedFilledImage factoriesBoostFillBar;
    [SerializeField] private TMP_Text factoriesBoostBarText;
    [SerializeField] private float factoriesDuration = 30;

    [Space(10), SerializeField]  private TMP_Text botsTitleText;
    [SerializeField] private SlicedFilledImage botsFillBar;
    [SerializeField] private TMP_Text botsFillText;
    [SerializeField] private float botsDuration = 20;

    [Space(10), SerializeField]  private TMP_Text rocketsTitleText;
    [SerializeField] private SlicedFilledImage rocketsFillBar;

    #endregion


    #region Education

    private void EngineeringManager()
    {
        if (!sd1.engineeringComplete)
        {
            engineeringButtonGO.SetActive(!sd1.engineering);
            engineeringTitleText.text = !sd1.engineering
                ? $"Engineering<size=70%> - {sd1.engineeringCost} Influence"
                : $"Engineering<size=70%> - {CalcUtils.FormatTimeLarge(sd1.engineeringResearchTime - sd1.engineeringProgress)}";
            engineeringFillBar.fillAmount = !sd1.engineering
                ? 0
                : (float)(sd1.engineeringProgress / sd1.engineeringResearchTime);
        }
        else
        {
            engineeringButtonGO.SetActive(false);
            engineeringTitleText.text = "Engineering<size=70%> - Complete";
            engineeringFillBar.fillAmount = 1;
        }

        if (!sd1.engineering || sd1.engineeringComplete) return;
        float multi = 1 * Time.deltaTime;
        if (sp.doDoubleTime) multi *= sp.doubleTimeRate + 1;
        sd1.engineeringProgress += multi;
        if (sd1.engineeringProgress >= sd1.engineeringResearchTime) sd1.engineeringComplete = true;
    }

    private void ShippingManager()
    {
        if (!sd1.shippingComplete)
        {
            shippingButtonGO.SetActive(!sd1.shipping);
            shippingTitleText.text = !sd1.shipping
                ? $"Shipping<size=70%> - {sd1.shippingCost} Influence"
                : $"Shipping<size=70%> - {CalcUtils.FormatTimeLarge(sd1.shippingResearchTime - sd1.shippingProgress)}";
            shippingFillBar.fillAmount = !sd1.shipping
                ? 0
                : (float)(sd1.shippingProgress / sd1.shippingResearchTime);
        }
        else
        {
            shippingButtonGO.SetActive(false);
            shippingTitleText.text = "Shipping<size=70%> - Complete";
            shippingFillBar.fillAmount = 1;
        }

        if (!sd1.shipping || sd1.shippingComplete) return;
        float multi = 1 * Time.deltaTime;
        if (sp.doDoubleTime) multi *= sp.doubleTimeRate + 1;
        sd1.shippingProgress += multi;
        if (sd1.shippingProgress >= sd1.shippingResearchTime) sd1.shippingComplete = true;
    }

    private void WorldTradeManager()
    {
        if (!sd1.worldTradeComplete)
        {
            worldTradeButtonGO.SetActive(!sd1.worldTrade);
            worldTradeTitleText.text = !sd1.worldTrade
                ? $"World Trade<size=70%> - {sd1.worldTradeCost} Influence"
                : $"World Trade<size=70%> - {CalcUtils.FormatTimeLarge(sd1.worldTradeResearchTime - sd1.worldTradeProgress)}";
            worldTradeFillBar.fillAmount = !sd1.worldTrade
                ? 0
                : (float)(sd1.worldTradeProgress / sd1.worldTradeResearchTime);
        }
        else
        {
            worldTradeButtonGO.SetActive(false);
            worldTradeTitleText.text = "World Trade<size=70%> - Complete";
            worldTradeFillBar.fillAmount = 1;
        }

        if (!sd1.worldTrade || sd1.worldTradeComplete) return;
        float multi = 1 * Time.deltaTime;
        if (sp.doDoubleTime) multi *= sp.doubleTimeRate + 1;
        sd1.worldTradeProgress += multi;
        if (sd1.worldTradeProgress >= sd1.worldTradeResearchTime) sd1.worldTradeComplete = true;
    }

    private void WorldPeaceManager()
    {
        if (!sd1.worldPeaceComplete)
        {
            worldPeaceButtonGO.SetActive(!sd1.worldPeace);
            worldPeaceTitleText.text = !sd1.worldPeace
                ? $"World Peace<size=70%> - {sd1.worldPeaceCost} Influence"
                : $"World Peace<size=70%> - {CalcUtils.FormatTimeLarge(sd1.worldPeaceResearchTime - sd1.worldPeaceProgress)}";
            worldPeaceFillBar.fillAmount = !sd1.worldPeace
                ? 0
                : (float)(sd1.worldPeaceProgress / sd1.worldPeaceResearchTime);
        }
        else
        {
            worldPeaceButtonGO.SetActive(false);
            worldPeaceTitleText.text = "World Peace<size=70%> - Complete";
            worldPeaceFillBar.fillAmount = 1;
        }

        if (!sd1.worldPeace || sd1.worldPeaceComplete) return;
        float multi = 1 * Time.deltaTime;
        if (sp.doDoubleTime) multi *= sp.doubleTimeRate + 1;
        sd1.worldPeaceProgress += multi;
        if (sd1.worldPeaceProgress >= sd1.worldPeaceResearchTime) sd1.worldPeaceComplete = true;
    }

    private void MathematicsManager()
    {
        if (!sd1.mathematicsComplete)
        {
            mathematicsButtonGO.SetActive(!sd1.mathematics);
            mathematicsTitleText.text = !sd1.mathematics
                ? $"Mathematics<size=70%> - {sd1.mathematicsCost} Influence"
                : $"Mathematics<size=70%> - {CalcUtils.FormatTimeLarge(sd1.mathematicsResearchTime - sd1.mathematicsProgress)}";
            mathematicsFillBar.fillAmount = !sd1.mathematics
                ? 0
                : (float)(sd1.mathematicsProgress / sd1.mathematicsResearchTime);
        }
        else
        {
            mathematicsButtonGO.SetActive(false);
            mathematicsTitleText.text = "Mathematics<size=70%> - Complete";
            mathematicsFillBar.fillAmount = 1;
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
        if (!sd1.advancedPhysicsComplete)
        {
            advancedPhysicsButtonGO.SetActive(!sd1.advancedPhysics);
            advancedPhysicsTitleText.text = !sd1.advancedPhysics
                ? $"Advanced Physics<size=70%> - {sd1.advancedPhysicsCost} Influence"
                : $"Advanced Physics<size=70%> - {CalcUtils.FormatTimeLarge(sd1.advancedPhysicsResearchTime - sd1.advancedPhysicsProgress)}";
            advancedPhysicsFillBar.fillAmount = !sd1.advancedPhysics
                ? 0
                : (float)(sd1.advancedPhysicsProgress / sd1.advancedPhysicsResearchTime);
        }
        else
        {
            advancedPhysicsButtonGO.SetActive(false);
            advancedPhysicsTitleText.text = "Advanced Physics<size=70%> - Complete";
            advancedPhysicsFillBar.fillAmount = 1;
        }

        if (!sd1.advancedPhysics || sd1.advancedPhysicsComplete) return;
        float multi = 1 * Time.deltaTime;
        if (sp.doDoubleTime) multi *= sp.doubleTimeRate + 1;
        sd1.advancedPhysicsProgress += multi;
        if (sd1.advancedPhysicsProgress >= sd1.advancedPhysicsResearchTime) sd1.advancedPhysicsComplete = true;
    }

    #endregion

    #region InformationEra

    private void ManageFactoryBoost()
    {
        if (sd1.factoriesBoostTime > 0)
        {
            sd1.factoriesBoostTime -= Time.deltaTime;
            factoriesBoostFillBar.fillAmount =
                (float)(sd1.factoriesBoostTime / sd1.factoriesBoostDuration);
            factoriesBoostBarText.text = $"{CalcUtils.FormatTimeLarge(sd1.factoriesBoostTime)}";
        }
        else
        {
            sd1.factoriesBoostTime = 0;
            factoriesBoostFillBar.fillAmount = 0;
            factoriesBoostBarText.text = "0s";
        }
    }

    private void FactoryManagement()
    {
        factoriesBoostButtonGO.SetActive(sd1.factoriesBoostTime < 10);

        factoriesTitleText.text = $"Factories <size=70%> {sd1.factories:N0}";

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
        factoriesFillBar.fillAmount =
            (float)StaticMethods.FillBar(sd1.factories, factoriesDuration, effectiveMulti, _factoriesTimer.currentTime);
        factoriesFillText.text = StaticMethods.TimerText(sd1.factories, factoriesDuration, effectiveMulti, _factoriesTimer.currentTime);
    }

    private double _botsFillSpeed;

    private void BotsManagement()
    {
        botsTitleText.text = $"Bots <size=70%> {sd1.bots:N0}";

        // Bots has special soft-start: reduced production when bots < 100
        double baseMulti = 1 + (sd1.bots > 0 ? Math.Log10(sd1.bots) : 0);
        if (sd1.bots < 100 && sd1.bots > 0) baseMulti *= sd1.bots / 100.0;

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

        botsFillBar.fillAmount = (float)StaticMethods.FillBar(sd1.bots, botsDuration, effectiveMulti, _botsTimer.currentTime);
        botsFillText.text = StaticMethods.TimerText(sd1.bots, botsDuration, effectiveMulti, _botsTimer.currentTime);
    }

    private void RocketsManagement()
    {
        rocketsTitleText.text =
            $"Rockets <size=70%> Launching <color=#A3FFFE>{_botsFillSpeed / sd1.rocketsPerSpaceFactory:F1}</color> Factories/s";
        if (sd1.rockets < 1) return;

        rocketsFillBar.fillAmount =
            sd1.rocketsPerSpaceFactory > 1 ? sd1.rockets < 1 ? 0 : (float)sd1.rockets / sd1.rocketsPerSpaceFactory : 1;

        //potential fault point if the user doesn't have any factories for a reallllyyyy long time. (probably wont ever happen.)
        while (sd1.rockets >= sd1.rocketsPerSpaceFactory && sd1.factories >= 1)
        {
            sd1.rockets -= sd1.rocketsPerSpaceFactory;
            sd1.factories--;
            sd1.spaceFactories++;
        }
    }

    #endregion
}
