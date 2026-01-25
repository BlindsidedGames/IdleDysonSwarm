using System.Collections;
using Systems;
using UnityEngine;
using Blindsided.Utilities;
using IdleDysonSwarm.Systems.Dream1;
using IdleDysonSwarm.UI;
using IdleDysonSwarm.UI.Simulation;
using static Expansion.Oracle;
using static IdleDysonSwarm.Systems.Constants.Dream1Constants;

public class SpaceAgeManager : MonoBehaviour
{
    [Header("Energy Panel References")]
    [SerializeField] private SimulationGenericPanelReferences solarPanel;
    [SerializeField] private SimulationGenericPanelReferences fusionPanel;

    [Header("Space Age Panel References")]
    [SerializeField] private SimulationGenericPanelReferences spaceFactoriesPanel;
    [SerializeField] private SimulationGenericPanelReferences railgunsPanel;
    [SerializeField] private SimulationGenericPanelReferences swarmStatsPanel;

    [Header("Category Headers")]
    [SerializeField] private GameObject spaceAgeCategoryPanel;
    [SerializeField] private GameObject energyCategoryHeader;

    [Header("Black Hole Prestige")]
    [SerializeField] private GameObject blackHoleAlert;
    [SerializeField] private TMPro.TMP_Text blackHoleAlertEarningsText;

    [Header("Production Settings")]
    [SerializeField] private float _factoriesDuration = 2;
    [SerializeField] private float _totalFireTime = 5;
    [SerializeField] private int _timesToFire = 10;

    private SaveDataDream1 sd1 => oracle.saveSettings.sdSimulation;
    private SaveData sd => oracle.saveSettings.saveData;
    private SaveDataPrestige sdp => oracle.saveSettings.sdPrestige;

    // Production timer for space factories
    private ProductionTimer _spaceFactoriesTimer;
    private bool _firing;
    private float _fireTime;
    private int _fireTimes;

    private void Start()
    {
        // Initialize timer with saved progress (must be in Start, after Oracle is initialized)
        _spaceFactoriesTimer = new ProductionTimer(_factoriesDuration, sd1.spaceFactoriesTimerProgress);
        _fireTime = sd1.railgunFireProgress;

        // Set panel types and configure UI elements
        if (solarPanel != null)
        {
            solarPanel.panelType = SimulationPanelType.EnergyGenerator;
            solarPanel.ConfigureUIElements();
        }
        if (fusionPanel != null)
        {
            fusionPanel.panelType = SimulationPanelType.EnergyGenerator;
            fusionPanel.ConfigureUIElements();
        }
        if (spaceFactoriesPanel != null)
        {
            spaceFactoriesPanel.panelType = SimulationPanelType.SpaceFactoryCap;
            spaceFactoriesPanel.ConfigureUIElements();
        }
        if (railgunsPanel != null)
        {
            railgunsPanel.panelType = SimulationPanelType.RailgunDual;
            railgunsPanel.ConfigureUIElements();
        }
        if (swarmStatsPanel != null)
        {
            swarmStatsPanel.panelType = SimulationPanelType.SwarmStats;
            swarmStatsPanel.ConfigureUIElements();
        }

        // Setup button listeners
        if (solarPanel?.actionButton != null)
            solarPanel.actionButton.onClick.AddListener(BuySolar);
        if (fusionPanel?.actionButton != null)
            fusionPanel.actionButton.onClick.AddListener(BuyFusion);
        if (swarmStatsPanel?.actionButton != null)
            swarmStatsPanel.actionButton.onClick.AddListener(OnBlackHoleClick);
    }

    private void Update()
    {
        UpdateVisibility();
        UpdateButtonsInteractable();

        AddEnergy();
        SolarManagement();
        FusionManagement();

        SpaceFactoryManagement();
        RailgunManagement();
        FireRailGun();
        SwarmStatsManagement();
        SyncTimerProgress();
    }

    private void UpdateVisibility()
    {
        // Category header visibility
        if (spaceAgeCategoryPanel != null)
            spaceAgeCategoryPanel.SetActive(sd1.spaceFactories >= 1);
        if (energyCategoryHeader != null)
            energyCategoryHeader.SetActive(sd1.spaceFactories >= 1);

        // Visibility logic from Dream1BuildingEnabler
        if (solarPanel != null)
            solarPanel.gameObject.SetActive(sd1.spaceFactories >= 1);
        if (fusionPanel != null)
            fusionPanel.gameObject.SetActive(sd1.advancedPhysicsComplete && sd1.spaceFactories >= 1);
        if (spaceFactoriesPanel != null)
            spaceFactoriesPanel.gameObject.SetActive(sd1.spaceFactories >= 1);
        if (railgunsPanel != null)
            railgunsPanel.gameObject.SetActive((sd1.spaceFactories >= 1 && sd1.mathematicsComplete) || sd1.dysonPanels >= 1);
        if (swarmStatsPanel != null)
            swarmStatsPanel.gameObject.SetActive(sd1.spaceFactories >= 1 && sd1.swarmPanels >= 1);
    }

    private void UpdateButtonsInteractable()
    {
        if (solarPanel?.actionButton != null)
            solarPanel.actionButton.interactable = sd.influence >= sd1.solarCost;
        if (fusionPanel?.actionButton != null)
            fusionPanel.actionButton.interactable = sd.influence >= sd1.fusionCost;
    }

    private double GetGlobalMultiplier()
    {
        return sdp.doDoubleTime ? sdp.doubleTimeRate + 1 : 1;
    }

    private void SyncTimerProgress()
    {
        sd1.spaceFactoriesTimerProgress = _spaceFactoriesTimer.currentTime;
        sd1.railgunFireProgress = _fireTime;
    }

    #region Energy

    private void AddEnergy()
    {
        double solarPanelEnergy = sd1.solarPanels * sd1.solarPanelGeneration;
        if (sd1.mathematicsComplete) solarPanelEnergy *= 2;
        double fusionEnergy = sd1.fusion * sd1.fusionGeneration;
        long dysonPanelEnergy = sd1.swarmPanels * sd1.swarmPanelGeneration;
        long doubleTimeMulti = sdp.doDoubleTime ? sdp.doubleTimeRate + 1 : 1;

        sd1.energy += (solarPanelEnergy + fusionEnergy + dysonPanelEnergy) *
                      doubleTimeMulti * Time.deltaTime;
    }

    private void SolarManagement()
    {
        if (solarPanel == null) return;

        solarPanel.titleText.text = $"Solar Panels <size=70%>{UIThemeProvider.TextColourBlue}{sd1.solarPanels:N0}</color>";
        if (solarPanel.additionalText != null)
            solarPanel.additionalText.text =
                CalcUtils.FormatEnergy(sd1.solarPanels * sd1.solarPanelGeneration * (sd1.mathematicsComplete ? 2 : 1) * (sdp.doDoubleTime ? sdp.doubleTimeRate + 1 : 1), false, colourOverride: UIThemeProvider.TextColourBlue);
    }

    private void FusionManagement()
    {
        if (fusionPanel == null) return;

        fusionPanel.titleText.text = $"Fusion Generators <size=70%>{UIThemeProvider.TextColourBlue}{sd1.fusion:N0}</color>";
        if (fusionPanel.additionalText != null)
            fusionPanel.additionalText.text =
                CalcUtils.FormatEnergy(sd1.fusion * sd1.fusionGeneration * (sd1.mathematicsComplete ? 2 : 1) * (sdp.doDoubleTime ? sdp.doubleTimeRate + 1 : 1), false, colourOverride: UIThemeProvider.TextColourBlue);
    }

    #endregion

    #region Space Factories

    private void SpaceFactoryManagement()
    {
        if (spaceFactoriesPanel == null) return;

        if (sd1.spaceFactories == 0)
        {
            spaceFactoriesPanel.fill1.fillAmount = 0;
            spaceFactoriesPanel.fillBar1Text.text = "";
            return;
        }

        spaceFactoriesPanel.titleText.text = $"Space Factories <size=70%>{UIThemeProvider.TextColourBlue}{sd1.spaceFactories:N0}</color>";

        // Build global multiplier with space factory boosts
        double globalMulti = GetGlobalMultiplier();
        if (sdp.sfActivator1) globalMulti *= 2;
        if (sdp.sfActivator2) globalMulti *= 2;
        if (sdp.sfActivator3) globalMulti *= 2;

        double effectiveMulti = _spaceFactoriesTimer.GetEffectiveMultiplier(sd1.spaceFactories, globalMulti);

        if (sd1.dysonPanels < DysonPanelCap)
        {
            int produced = _spaceFactoriesTimer.Update(sd1.spaceFactories, globalMulti, Time.deltaTime);
            sd1.dysonPanels += produced;

            spaceFactoriesPanel.fill1.fillAmount =
                (float)StaticMethods.FillBar(sd1.spaceFactories, _factoriesDuration, effectiveMulti, _spaceFactoriesTimer.currentTime);
            spaceFactoriesPanel.fillBar1Text.text = StaticMethods.TimerText(sd1.spaceFactories, _factoriesDuration, effectiveMulti, _spaceFactoriesTimer.currentTime, mspace: true, colourOverride: UIThemeProvider.TextColourBlue);

            spaceFactoriesPanel.fill2.fillAmount = sd1.dysonPanels / (float)DysonPanelCap;
            spaceFactoriesPanel.fillBar2Text.text = $"{UIThemeProvider.TextColourBlue}{sd1.dysonPanels}</color> / {UIThemeProvider.TextColourBlue}{DysonPanelCap}</color>";
        }
        else
        {
            spaceFactoriesPanel.fill2.fillAmount = 1;
            spaceFactoriesPanel.fillBar2Text.text = $"{UIThemeProvider.TextColourBlue}{sd1.dysonPanels}</color> / {UIThemeProvider.TextColourBlue}{DysonPanelCap}</color>";
            spaceFactoriesPanel.fill1.fillAmount = 1;
            spaceFactoriesPanel.fillBar1Text.text = StaticMethods.TimerText(sd1.spaceFactories, _factoriesDuration, effectiveMulti, _spaceFactoriesTimer.currentTime, mspace: true, colourOverride: UIThemeProvider.TextColourBlue);
        }
    }

    #endregion

    #region Railguns

    private void RailgunManagement()
    {
        if (railgunsPanel == null) return;

        if (sd1.energy > 0 && sd1.railgunCharge < sd1.railgunMaxCharge)
        {
            if (sdp.railgunActivator1) _totalFireTime = 2.5f;
            if (sdp.railgunActivator2) _totalFireTime = 1;
            double energyTillFill = sd1.railgunMaxCharge - sd1.railgunCharge;
            if (energyTillFill < sd1.energy)
            {
                sd1.energy -= energyTillFill;
                sd1.railgunCharge += energyTillFill;
            }
            else
            {
                sd1.railgunCharge += sd1.energy;
                sd1.energy -= sd1.energy;
            }
        }

        int panelsRequired = GetDysonPanelsRequiredToFire();
        if (sd1.railgunCharge >= sd1.railgunMaxCharge &&
            sd1.dysonPanels >= panelsRequired &&
            !_firing)
        {
            _firing = true;
            _fireTime = 0;
            _fireTimes = _timesToFire;
        }

        railgunsPanel.titleText.text = $"Railguns<size=70%> - {CalcUtils.FormatEnergy(sd1.railgunCharge, true, colourOverride: UIThemeProvider.TextColourBlue)} / {UIThemeProvider.TextColourBlue}25</color> MJ";
        railgunsPanel.fill2.fillAmount = (float)sd1.railgunCharge / (float)sd1.railgunMaxCharge;
        railgunsPanel.fillBar2Text.text = $"{CalcUtils.FormatEnergy(sd1.railgunCharge, true, colourOverride: UIThemeProvider.TextColourBlue)} / {UIThemeProvider.TextColourBlue}25</color> MJ";
    }

    private void FireRailGun()
    {
        if (railgunsPanel == null) return;

        if (!_firing)
        {
            railgunsPanel.fill1.fillAmount = 0;
            railgunsPanel.fillBar1Text.text = $"{UIThemeProvider.TextColourBlue}0</color> / {UIThemeProvider.TextColourBlue}{_timesToFire}</color>";
            return;
        }

        float deltaCalc = _timesToFire / _totalFireTime;
        float timeToFill = _totalFireTime / _timesToFire;
        _fireTime += deltaCalc * Time.deltaTime;
        float fill = _fireTime / timeToFill;

        double chargePerShot = sd1.railgunMaxCharge / 10.0;
        long panelsPerShot = sdp.doubleTimeRate >= 1 && sdp.doDoubleTime
            ? 1 * sdp.doubleTimeRate
            : 1;

        if (_fireTime >= timeToFill)
        {
            // Guard: stop firing if insufficient charge or panels (prevents negative after prestige wipe)
            if (sd1.railgunCharge < chargePerShot || sd1.dysonPanels < panelsPerShot)
            {
                _firing = false;
                return;
            }

            _fireTime = 0;
            sd1.railgunCharge -= chargePerShot;
            sd1.dysonPanels -= panelsPerShot;
            sd1.swarmPanels += panelsPerShot;
            _fireTimes--;
        }

        if (sd1.railgunCharge < chargePerShot || _fireTimes <= 0) _firing = false;

        railgunsPanel.fill1.fillAmount = fill;
        railgunsPanel.fillBar1Text.text = $"{UIThemeProvider.TextColourBlue}{_fireTimes}</color> / {UIThemeProvider.TextColourBlue}{_timesToFire}</color>";
    }

    private int GetDysonPanelsRequiredToFire()
    {
        if (!sdp.doDoubleTime || sdp.doubleTimeRate < 1)
            return RailgunBasePanelsRequired;
        return RailgunBasePanelsRequired * (int)sdp.doubleTimeRate;
    }

    #endregion

    #region Swarm Stats

    private void SwarmStatsManagement()
    {
        if (swarmStatsPanel == null) return;

        swarmStatsPanel.titleText.text = $"Swarm Stats<size=70%> - {UIThemeProvider.TextColourBlue}{sd1.swarmPanels:N0}</color> Pending SM";

        long doubleTimeMulti = sdp.doDoubleTime ? sdp.doubleTimeRate + 1 : 1;
        if (swarmStatsPanel.additionalText != null)
            swarmStatsPanel.additionalText.text =
                $"You've launched {UIThemeProvider.TextColourBlue}{sd1.swarmPanels:N0}</color> panels\nThey produce {CalcUtils.FormatEnergy(sd1.swarmPanels * sd1.swarmPanelGeneration * doubleTimeMulti, false, colourOverride: UIThemeProvider.TextColourBlue)}";
    }

    private void OnBlackHoleClick()
    {
        // Capture swarm panels before wipe for display
        int earnedSM = (int)sd1.swarmPanels;

        sdp.disasterStage = 0;
        if (blackHoleAlertEarningsText != null)
            blackHoleAlertEarningsText.text = $"Earned: {UIThemeProvider.TextColourBlue}{earnedSM:N0}</color> Strange Matter";

        Prestige(earnedSM);

        if (blackHoleAlert != null)
            blackHoleAlert.SetActive(true);
    }

    private void Prestige(int strangeMatter)
    {
        sdp.simulationCount++;
        sdp.strangeMatter += strangeMatter;
        StartCoroutine(WipeForPrestige());
    }

    private IEnumerator WipeForPrestige()
    {
        oracle.WipeDream1Save();

        // Reset local firing state to prevent negative railgunCharge
        _firing = false;
        _fireTime = 0;
        _fireTimes = 0;

        // Reset production timer to match wiped save data
        _spaceFactoriesTimer = new ProductionTimer(_factoriesDuration, 0);

        // Explicitly hide the swarm stats panel after wipe
        if (swarmStatsPanel != null)
            swarmStatsPanel.gameObject.SetActive(false);

        yield return null;
        SimulationPrestigeManager.InvokeApplyResearch();
    }

    #endregion

    #region Button Methods

    private void BuySolar()
    {
        sd1.solarPanels++;
        sd.influence -= sd1.solarCost;
    }

    private void BuyFusion()
    {
        sd1.fusion++;
        sd.influence -= sd1.fusionCost;
    }

    #endregion
}
