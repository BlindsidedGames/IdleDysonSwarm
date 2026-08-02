using System;
using Systems;
using Systems.Numeric;
using Systems.Simulation;
using UnityEngine;
using Blindsided.Utilities;
using IdleDysonSwarm.Systems.Dream1;
using IdleDysonSwarm.UI;
using IdleDysonSwarm.UI.Simulation;
using static Expansion.Oracle;
using static IdleDysonSwarm.Systems.Constants.Dream1Constants;

/*
Purpose (runtime): Manages Simulation Space Age energy production, railgun/swarm flow, prestige trigger UI,
and Space Age panel updates.

Primary entry points:
- Unity: Start (panel setup/listeners), Update (production loops + UI refresh).
- Space Age loops: AddEnergy, SpaceFactoryManagement, RailgunManagement, FireRailGun.
- Prestige flow: OnBlackHoleClick -> Prestige -> canonical synchronous reset completion.

Owns vs delegates:
- Owns Space Age state mutation in SaveDataDream1 for solar/fusion/swarm systems.
- Delegates timer behavior to ProductionTimer and text formatting to CalcUtils/UIThemeProvider.

Interacts with:
- Calls Oracle save data (SaveDataDream1/SaveDataPrestige/SaveData), SimulationPrestigeManager.InvokeApplyResearch,
  and SimulationGenericPanelReferences.
- Called by Game scene update loop and UI button events wired in Start.

Change notes:
- Solar info text now reads sdSimulation.solarPanelGeneration directly; changing Mathematics parity in
  ResearchManager/InformationEraManager/Oracle.Migrations must keep this display path accurate.
- Black hole prestige completes the wipe, runtime reset, and persistent research reapplication in one
  transition phase before another fixed tick may run.
- Serialized panel references are scene-coupled and must stay aligned with Assets/Scenes/Game.unity.
*/
public class SpaceAgeManager : MonoBehaviour
{
    private const double TickSeconds = 0.1d;
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
    private bool _timersInitialized;
    private bool _firing;
    private double _fireTime;
    private int _fireTimes;

    // Info description update debounce
    private const float InfoUpdateInterval = 0.1f; // 10hz
    private double _infoUpdateTimer;
    private double _tickGlobalMultiplier = 1d;
    private double _tickSeconds = TickSeconds;
    private bool _updatePresentation = true;

    public bool SupportsAnalyticalOffline =>
        solarPanel != null &&
        fusionPanel != null &&
        spaceFactoriesPanel != null &&
        railgunsPanel != null &&
        swarmStatsPanel != null;
    public double SpaceFactoriesDurationSeconds => _factoriesDuration;
    public bool IsRailgunFiring =>
        oracle?.saveSettings?.sdSimulation?.railgunFiring ??
        _firing;

    private void OnEnable()
    {
        SimulationPrestigeManager.ResetSimulationRuntime += ResetSimulationRuntime;
        if (_timersInitialized)
            ResetSimulationRuntime();
    }

    private void OnDisable()
    {
        SimulationPrestigeManager.ResetSimulationRuntime -= ResetSimulationRuntime;
    }

    private void Start()
    {
        // Initialize timer with saved progress (must be in Start, after Oracle is initialized)
        _spaceFactoriesTimer = new ProductionTimer(_factoriesDuration, sd1.spaceFactoriesTimerProgress);
        _fireTime = sd1.railgunFireProgress;
        _firing = sd1.railgunFiring;
        _fireTimes = sd1.railgunShotsRemaining;
        _timersInitialized = true;

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
            solarPanel.actionButton.onClick.AddListener(
                () => QueuePlayerAction(
                    BuySolar,
                    SimulationInputKind.Purchase,
                    "dream_solar"));
        if (fusionPanel?.actionButton != null)
            fusionPanel.actionButton.onClick.AddListener(
                () => QueuePlayerAction(
                    BuyFusion,
                    SimulationInputKind.Purchase,
                    "dream_fusion"));
        if (swarmStatsPanel?.actionButton != null)
            swarmStatsPanel.actionButton.onClick.AddListener(
                () => QueuePlayerAction(
                    OnBlackHoleClick,
                    SimulationInputKind.BlackHoleAction,
                    "dream_swarm_black_hole"));

        // Set info title texts
        if (solarPanel?.infoTitleText != null) solarPanel.infoTitleText.text = "Solar Panels Info";
        if (fusionPanel?.infoTitleText != null) fusionPanel.infoTitleText.text = "Fusion Info";
        if (spaceFactoriesPanel?.infoTitleText != null) spaceFactoriesPanel.infoTitleText.text = "Space Factories Info";
        if (railgunsPanel?.infoTitleText != null) railgunsPanel.infoTitleText.text = "Railguns Info";
        if (swarmStatsPanel?.infoTitleText != null) swarmStatsPanel.infoTitleText.text = "Swarm Stats Info";
    }

    private void ResetSimulationRuntime()
    {
        _firing = sd1.railgunFiring;
        _fireTime = sd1.railgunFireProgress;
        _fireTimes = sd1.railgunShotsRemaining;
        _spaceFactoriesTimer =
            new ProductionTimer(_factoriesDuration, sd1.spaceFactoriesTimerProgress);
        _infoUpdateTimer = 0d;
        _tickGlobalMultiplier = 1d;
        _tickSeconds = TickSeconds;
    }

    private void Update()
    {
        UpdateVisibility();
        UpdateButtonsInteractable();
    }

    public void RunProductionTick(
        double globalMultiplier,
        double deltaSeconds = TickSeconds,
        bool updatePresentation = true)
    {
        _tickGlobalMultiplier = globalMultiplier;
        _tickSeconds = deltaSeconds;
        _updatePresentation = updatePresentation;
        AddEnergy();
        if (updatePresentation)
        {
            SolarManagement();
            FusionManagement();
        }
        SpaceFactoryManagement();
        if (updatePresentation) SwarmStatsManagement();
    }

    public void RunAutomationTick()
    {
        if (sdp.railgunActivator1) _totalFireTime = 2.5f;
        if (sdp.railgunActivator2) _totalFireTime = 1f;
        DreamAutomationTransactions.ApplyRailgun(
            sd1,
            sdp,
            _tickSeconds,
            _totalFireTime,
            _timesToFire,
            RailgunBasePanelsRequired);
        _firing = sd1.railgunFiring;
        _fireTime = sd1.railgunFireProgress;
        _fireTimes = sd1.railgunShotsRemaining;
        UpdateRailgunPresentation();
    }

    public void CompleteSimulationTick(bool updatePresentation = true)
    {
        SyncTimerProgress();

        _infoUpdateTimer += _tickSeconds;
        if (updatePresentation && _infoUpdateTimer >= InfoUpdateInterval)
        {
            _infoUpdateTimer = 0;
            UpdateInfoDescriptions();
        }
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
        return _tickGlobalMultiplier;
    }

    private void SyncTimerProgress()
    {
        sd1.spaceFactoriesTimerProgress = _spaceFactoriesTimer.currentTime;
        sd1.railgunFireProgress = _fireTime;
        sd1.railgunFiring = _firing;
        sd1.railgunShotsRemaining = _fireTimes;
    }

    private void UpdateRailgunPresentation()
    {
        if (!_updatePresentation || railgunsPanel == null)
            return;

        railgunsPanel.titleText.text =
            $"Railguns<size=70%> - {CalcUtils.FormatEnergy(sd1.railgunCharge, true, colourOverride: UIThemeProvider.TextColourBlue)} / {UIThemeProvider.TextColourBlue}25</color> MJ";
        railgunsPanel.fill2.fillAmount =
            (float)(sd1.railgunCharge /
                    sd1.railgunMaxCharge);
        railgunsPanel.fillBar2Text.text =
            $"{CalcUtils.FormatEnergy(sd1.railgunCharge, true, colourOverride: UIThemeProvider.TextColourBlue)} / {UIThemeProvider.TextColourBlue}25</color> MJ";
        double timeToFill = _totalFireTime /
                            Math.Max(1, _timesToFire);
        railgunsPanel.fill1.fillAmount = _firing
            ? (float)(_fireTime / timeToFill)
            : 0f;
        railgunsPanel.fillBar1Text.text =
            $"{UIThemeProvider.TextColourBlue}{Math.Max(0, _fireTimes)}</color> / {UIThemeProvider.TextColourBlue}{_timesToFire}</color>";
    }

    #region Energy

    private void AddEnergy()
    {
        double energyDelta = CalculateEnergyDelta(
            sd1,
            GetGlobalMultiplier(),
            _tickSeconds);
        sd1.energy = NumericSafety.Add(sd1.energy, energyDelta).Value;
    }

    public static double CalculateEnergyDelta(
        SaveDataDream1 simulation,
        double globalMultiplier,
        double deltaSeconds = TickSeconds)
    {
        if (simulation == null) return 0d;

        double solarPanelEnergy =
            NumericSafety.Multiply(
                simulation.solarPanels,
                simulation.solarPanelGeneration).Value;
        if (simulation.mathematicsComplete)
            solarPanelEnergy = NumericSafety.Multiply(solarPanelEnergy, 2d).Value;
        double fusionEnergy =
            NumericSafety.Multiply(simulation.fusion, simulation.fusionGeneration).Value;
        double dysonPanelEnergy =
            NumericSafety.Multiply(
                simulation.swarmPanels,
                simulation.swarmPanelGeneration).Value;
        double combined = NumericSafety.Add(
            NumericSafety.Add(solarPanelEnergy, fusionEnergy).Value,
            dysonPanelEnergy).Value;
        return NumericSafety.Multiply(
            NumericSafety.Multiply(combined, globalMultiplier).Value,
            deltaSeconds).Value;
    }

    private void SolarManagement()
    {
        if (solarPanel == null) return;

        solarPanel.titleText.text = $"Solar Panels <size=70%>{UIThemeProvider.TextColourBlue}{sd1.solarPanels:N0}</color>";
        if (solarPanel.additionalText != null)
            solarPanel.additionalText.text =
                CalcUtils.FormatEnergy(sd1.solarPanels * sd1.solarPanelGeneration * (sd1.mathematicsComplete ? 2 : 1) * _tickGlobalMultiplier, false, colourOverride: UIThemeProvider.TextColourBlue);
    }

    private void FusionManagement()
    {
        if (fusionPanel == null) return;

        fusionPanel.titleText.text = $"Fusion Generators <size=70%>{UIThemeProvider.TextColourBlue}{sd1.fusion:N0}</color>";
        if (fusionPanel.additionalText != null)
            fusionPanel.additionalText.text =
                CalcUtils.FormatEnergy(sd1.fusion * sd1.fusionGeneration * (sd1.mathematicsComplete ? 2 : 1) * _tickGlobalMultiplier, false, colourOverride: UIThemeProvider.TextColourBlue);
    }

    #endregion

    #region Space Factories

    private void SpaceFactoryManagement()
    {
        if (spaceFactoriesPanel == null) return;

        if (sd1.spaceFactories == 0)
        {
            if (!_updatePresentation) return;
            spaceFactoriesPanel.fill1.fillAmount = 0;
            spaceFactoriesPanel.fillBar1Text.text = "";
            return;
        }

        // Build global multiplier with space factory boosts
        double globalMulti = GetGlobalMultiplier();
        if (sdp.sfActivator1) globalMulti *= 2;
        if (sdp.sfActivator2) globalMulti *= 2;
        if (sdp.sfActivator3) globalMulti *= 2;

        double effectiveMulti = _spaceFactoriesTimer.GetEffectiveMultiplier(sd1.spaceFactories, globalMulti);

        if (sd1.dysonPanels < DysonPanelCap)
        {
            long produced = NumericSafety.ToLongFloor(
                _spaceFactoriesTimer.Update(
                    sd1.spaceFactories,
                    globalMulti,
                    _tickSeconds)).Value;
            sd1.dysonPanels = Math.Min(
                DysonPanelCap,
                NumericSafety.Add(sd1.dysonPanels, produced).Value);
            if (!_updatePresentation) return;

            spaceFactoriesPanel.titleText.text = $"Space Factories <size=70%>{UIThemeProvider.TextColourBlue}{sd1.spaceFactories:N0}</color>";
            spaceFactoriesPanel.fill1.fillAmount =
                (float)StaticMethods.FillBar(sd1.spaceFactories, _factoriesDuration, effectiveMulti, _spaceFactoriesTimer.currentTime);
            spaceFactoriesPanel.fillBar1Text.text = StaticMethods.TimerText(sd1.spaceFactories, _factoriesDuration, effectiveMulti, _spaceFactoriesTimer.currentTime, mspace: true, colourOverride: UIThemeProvider.TextColourBlue);

            spaceFactoriesPanel.fill2.fillAmount = sd1.dysonPanels / (float)DysonPanelCap;
            spaceFactoriesPanel.fillBar2Text.text = $"{UIThemeProvider.TextColourBlue}{sd1.dysonPanels}</color> / {UIThemeProvider.TextColourBlue}{DysonPanelCap}</color>";
        }
        else
        {
            if (!_updatePresentation) return;
            spaceFactoriesPanel.titleText.text = $"Space Factories <size=70%>{UIThemeProvider.TextColourBlue}{sd1.spaceFactories:N0}</color>";
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
                DebitResult debit = EconomyTransaction.TryDebit(sd1.energy, energyTillFill);
                if (!debit.Succeeded) return;
                sd1.energy = debit.Balance;
                sd1.railgunCharge =
                    NumericSafety.Add(sd1.railgunCharge, debit.Charged).Value;
            }
            else
            {
                double transferred = sd1.energy;
                sd1.railgunCharge = NumericSafety.Add(sd1.railgunCharge, transferred).Value;
                sd1.energy = 0d;
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
        if (!_updatePresentation) return;

        railgunsPanel.titleText.text = $"Railguns<size=70%> - {CalcUtils.FormatEnergy(sd1.railgunCharge, true, colourOverride: UIThemeProvider.TextColourBlue)} / {UIThemeProvider.TextColourBlue}25</color> MJ";
        railgunsPanel.fill2.fillAmount = (float)sd1.railgunCharge / (float)sd1.railgunMaxCharge;
        railgunsPanel.fillBar2Text.text = $"{CalcUtils.FormatEnergy(sd1.railgunCharge, true, colourOverride: UIThemeProvider.TextColourBlue)} / {UIThemeProvider.TextColourBlue}25</color> MJ";
    }

    private void FireRailGun()
    {
        if (railgunsPanel == null) return;

        if (!_firing)
        {
            if (!_updatePresentation) return;
            railgunsPanel.fill1.fillAmount = 0;
            railgunsPanel.fillBar1Text.text = $"{UIThemeProvider.TextColourBlue}0</color> / {UIThemeProvider.TextColourBlue}{_timesToFire}</color>";
            return;
        }

        double deltaCalc = _timesToFire / (double)_totalFireTime;
        double timeToFill = _totalFireTime / _timesToFire;
        _fireTime += deltaCalc * _tickSeconds;
        float fill = (float)(_fireTime / timeToFill);

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
            TransactionStatus fireStatus = EconomyTransaction.TryExchange(
                ref sd1.railgunCharge,
                chargePerShot,
                ref sd1.dysonPanels,
                panelsPerShot,
                ref sd1.swarmPanels,
                panelsPerShot);
            if (fireStatus != TransactionStatus.Success)
            {
                _firing = false;
                return;
            }
            _fireTimes--;
        }

        if (sd1.railgunCharge < chargePerShot || _fireTimes <= 0) _firing = false;
        if (!_updatePresentation) return;

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

        if (swarmStatsPanel.additionalText != null)
        {
            double panelGeneration = NumericSafety.Multiply(
                NumericSafety.Multiply(
                    (double)sd1.swarmPanels,
                    sd1.swarmPanelGeneration).Value,
                _tickGlobalMultiplier).Value;
            swarmStatsPanel.additionalText.text =
                $"You've launched {UIThemeProvider.TextColourBlue}{sd1.swarmPanels:N0}</color> panels\nThey produce {CalcUtils.FormatEnergy(panelGeneration, false, colourOverride: UIThemeProvider.TextColourBlue)}";
        }
    }

    private void OnBlackHoleClick()
    {
        // Capture swarm panels before wipe for display
        long earnedSM = sd1.swarmPanels;

        sdp.disasterStage = 0;
        if (blackHoleAlertEarningsText != null)
            blackHoleAlertEarningsText.text = $"Earned: {UIThemeProvider.TextColourBlue}{earnedSM:N0}</color> Strange Matter";

        Prestige(earnedSM);

        if (blackHoleAlert != null)
            blackHoleAlert.SetActive(true);
    }

    private void Prestige(long strangeMatter)
    {
        if (!DreamResetTransitions.TryApplyExplicit(
                oracle.saveSettings,
                DreamResetCause.BlackHole,
                strangeMatter,
                out _))
        {
            return;
        }
        SimulationPrestigeManager
            .InvokeResetSimulationRuntime();
        if (swarmStatsPanel != null)
            swarmStatsPanel.gameObject.SetActive(false);
        SimulationPrestigeManager.InvokeApplyResearch();
    }

    #endregion

    #region Button Methods

    private void BuySolar()
    {
        EconomyTransaction.TryPurchase(
            ref sd.influence,
            sd1.solarCost,
            ref sd1.solarPanels,
            1d);
    }

    private void BuyFusion()
    {
        EconomyTransaction.TryPurchase(
            ref sd.influence,
            sd1.fusionCost,
            ref sd1.fusion,
            1d);
    }

    private static void QueuePlayerAction(
        Action action,
        SimulationInputKind kind,
        string stableId)
    {
        if (!GameManager.RequestQueuedPlayerAction(
                kind,
                action,
                stableId))
        {
            action();
        }
    }

    #endregion

    #region Info Descriptions

    private void UpdateInfoDescriptions()
    {
        UpdateSolarInfoDescription();
        UpdateFusionInfoDescription();
        UpdateSpaceFactoriesInfoDescription();
        UpdateRailgunsInfoDescription();
        UpdateSwarmStatsInfoDescription();
    }

    private void UpdateSolarInfoDescription()
    {
        if (solarPanel?.infoDescriptionText == null) return;

        string blue = UIThemeProvider.TextColourBlue;
        double mathBonus = sd1.mathematicsComplete ? 2 : 1;
        double doubleTimeMulti = sdp.doDoubleTime ? sdp.doubleTimeRate + 1 : 1;
        double energyPerPanel = sd1.solarPanelGeneration * mathBonus * doubleTimeMulti;
        double totalEnergy = sd1.solarPanels * energyPerPanel;

        string activeMultipliers = "";
        if (sd1.mathematicsComplete) activeMultipliers += $" x Math {blue}x2</color>";
        if (sdp.doDoubleTime) activeMultipliers += $" x DoubleTime {blue}x{sdp.doubleTimeRate + 1}</color>";
        if (string.IsNullOrEmpty(activeMultipliers)) activeMultipliers = " none";

        solarPanel.infoDescriptionText.text =
            $"Harness the power of your local star with photovoltaic technology. In exchange for influence, you can purchase solar panels that steadily generate energy to fuel your growing infrastructure.\n\n" +
            $"Cost: {blue}{sd1.solarCost:N0}</color> Influence\n" +
            $"Base Output: {CalcUtils.FormatEnergy(sd1.solarPanelGeneration, false, colourOverride: blue)}/panel\n" +
            $"Active Multipliers:{activeMultipliers}\n" +
            $"Effective Output: {CalcUtils.FormatEnergy(energyPerPanel, false, colourOverride: blue)}/panel\n" +
            $"Owned: {blue}{sd1.solarPanels:N0}</color> panels\n" +
            $"Total Generation: {CalcUtils.FormatEnergy(totalEnergy, false, colourOverride: blue)}";
    }

    private void UpdateFusionInfoDescription()
    {
        if (fusionPanel?.infoDescriptionText == null) return;

        string blue = UIThemeProvider.TextColourBlue;
        double mathBonus = sd1.mathematicsComplete ? 2 : 1;
        double doubleTimeMulti = sdp.doDoubleTime ? sdp.doubleTimeRate + 1 : 1;
        double energyPerReactor = sd1.fusionGeneration * mathBonus * doubleTimeMulti;
        double totalEnergy = sd1.fusion * energyPerReactor;

        string mathBonusText = sd1.mathematicsComplete ? $" × Math {blue}×2</color>" : "";
        string doubleTimeText = sdp.doDoubleTime ? $" × DoubleTime {blue}×{sdp.doubleTimeRate + 1}</color>" : "";

        fusionPanel.infoDescriptionText.text =
            $"The pinnacle of terrestrial energy production. Drop {blue}100,000</color> influence down a well, get a fusion reactor that produces {blue}1.25</color>MW of energy. That's how it works okay? Don't question it.\n\n" +
            $"Cost: {blue}{sd1.fusionCost:N0}</color> Influence\n" +
            $"Output: {blue}1.25</color>MW/reactor{mathBonusText}{doubleTimeText}\n" +
            $"Owned: {blue}{sd1.fusion:N0}</color> reactors\n" +
            $"Total Generation: {CalcUtils.FormatEnergy(totalEnergy, false, colourOverride: blue)}";
    }

    private void UpdateSpaceFactoriesInfoDescription()
    {
        if (spaceFactoriesPanel?.infoDescriptionText == null) return;

        string blue = UIThemeProvider.TextColourBlue;
        double globalMulti = GetGlobalMultiplier();
        int boostCount = 0;
        if (sdp.sfActivator1) { globalMulti *= 2; boostCount++; }
        if (sdp.sfActivator2) { globalMulti *= 2; boostCount++; }
        if (sdp.sfActivator3) { globalMulti *= 2; boostCount++; }

        double effectiveMulti = _spaceFactoriesTimer.GetEffectiveMultiplier(sd1.spaceFactories, globalMulti);
        double rate = effectiveMulti > 0 ? effectiveMulti / _factoriesDuration : 0;

        string boostText = boostCount > 0 ? $" × Boost {blue}×{1 << boostCount}</color>" : "";

        spaceFactoriesPanel.infoDescriptionText.text =
            $"Orbital manufacturing at its finest. Space Factories produce specialized solar panels designed for extreme conditions, ready to be launched into the heart of your star system. Each factory can store up to {blue}1,000</color> panels awaiting launch.\n\n" +
            $"Output: {blue}1</color> panel/cycle\n" +
            $"Base Duration: {blue}{_factoriesDuration}</color>s\n" +
            $"Speed Multiplier: ({blue}1</color> + Log{blue}₁₀</color>({blue}{sd1.spaceFactories:N0}</color>)) × {blue}{globalMulti:N1}</color>{boostText} = {blue}{effectiveMulti:N2}</color>\n" +
            $"Current Rate: {blue}{CalcUtils.FormatNumber(rate)}</color> panels/s\n" +
            $"Storage: {blue}{sd1.dysonPanels:N0}</color> / {blue}{DysonPanelCap}</color>";
    }

    private void UpdateRailgunsInfoDescription()
    {
        if (railgunsPanel?.infoDescriptionText == null) return;

        string blue = UIThemeProvider.TextColourBlue;
        float fireTime = _totalFireTime;
        if (sdp.railgunActivator1) fireTime = 2.5f;
        if (sdp.railgunActivator2) fireTime = 1f;

        long panelsPerShot = sdp.doDoubleTime && sdp.doubleTimeRate >= 1 ? sdp.doubleTimeRate : 1;
        int panelsRequired = GetDysonPanelsRequiredToFire();

        string speedBonus = "";
        if (sdp.railgunActivator2) speedBonus = $" (Boosted {blue}×5</color>)";
        else if (sdp.railgunActivator1) speedBonus = $" (Boosted {blue}×2</color>)";

        // Calculate time till charged
        double energyNeeded = sd1.railgunMaxCharge - sd1.railgunCharge;
        double solarEnergy = sd1.solarPanels * sd1.solarPanelGeneration * (sd1.mathematicsComplete ? 2 : 1);
        double fusionEnergy = sd1.fusion * sd1.fusionGeneration;
        double swarmEnergy = sd1.swarmPanels * sd1.swarmPanelGeneration;
        double doubleTimeMulti = sdp.doDoubleTime ? sdp.doubleTimeRate + 1 : 1;
        double energyPerSecond = (solarEnergy + fusionEnergy + swarmEnergy) * doubleTimeMulti;

        string timeTillChargedText = "";
        if (sd1.railgunCharge < sd1.railgunMaxCharge && energyPerSecond > 0)
        {
            double timeTillCharged = energyNeeded / energyPerSecond;
            timeTillChargedText = $"\nTime Till Charged: {blue}{CalcUtils.FormatTime(timeTillCharged, shortForm: true)}</color>";
        }
        else if (sd1.railgunCharge >= sd1.railgunMaxCharge)
        {
            timeTillChargedText = $"\nTime Till Charged: {blue}Ready!</color>";
        }

        railgunsPanel.infoDescriptionText.text =
            $"Electromagnetic launch systems that convert raw energy into orbital velocity. Railguns absorb energy until fully charged, then unleash {blue}10</color> shots in rapid succession, hurling specialized solar panels toward their destiny in the swarm.\n\n" +
            $"Charge Required: {blue}25</color> MJ\n" +
            $"Panels Required: {blue}{panelsRequired}</color>\n" +
            $"Shots Per Volley: {blue}{_timesToFire}</color>\n" +
            $"Fire Time: {blue}{fireTime}</color>s{speedBonus}\n" +
            $"Panels Per Shot: {blue}{panelsPerShot}</color>\n" +
            $"Current Charge: {CalcUtils.FormatEnergy(sd1.railgunCharge, true, colourOverride: blue)} / {blue}25</color> MJ{timeTillChargedText}";
    }

    private void UpdateSwarmStatsInfoDescription()
    {
        if (swarmStatsPanel?.infoDescriptionText == null) return;

        string blue = UIThemeProvider.TextColourBlue;
        long doubleTimeMulti = sdp.doDoubleTime ? sdp.doubleTimeRate + 1 : 1;
        double totalEnergy = sd1.swarmPanels * sd1.swarmPanelGeneration * doubleTimeMulti;

        swarmStatsPanel.infoDescriptionText.text =
            $"The culmination of your civilization's efforts. Each panel orbiting your star generates energy while waiting to be converted. Influence the black hole to harvest Strange Matter equal to your launched panels.\n\n" +
            $"Panels Launched: {blue}{sd1.swarmPanels:N0}</color>\n" +
            $"Energy Per Panel: {CalcUtils.FormatEnergy(sd1.swarmPanelGeneration * doubleTimeMulti, false, colourOverride: blue)}\n" +
            $"Total Generation: {CalcUtils.FormatEnergy(totalEnergy, false, colourOverride: blue)}\n" +
            $"Strange Matter on Prestige: {blue}{sd1.swarmPanels:N0}</color> SM";
    }

    #endregion
}
