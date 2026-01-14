using System;
using Systems;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using Blindsided.Utilities;
using static Expansion.Oracle;
using static IdleDysonSwarm.Systems.Constants.Dream1Constants;

public class SpaceAgeManager : MonoBehaviour
{
    private SaveDataDream1 sd1 => oracle.saveSettings.sdSimulation;
    private SaveData sd => oracle.saveSettings.saveData;
    private SaveDataPrestige sdp => oracle.saveSettings.sdPrestige;

    private void Start()
    {
        solarBuyButton.onClick.AddListener(BuySolar);
        fusionBuyButton.onClick.AddListener(BuyFusion);
    }

    private void Update()
    {
        solarBuyButton.interactable = sd.influence >= sd1.solarCost;
        fusionBuyButton.interactable = sd.influence >= sd1.fusionCost;

        AddEnergy();
        SolarManagement();
        FusionManagement();


        SpaceFactoryManagement();
        RailgunManagement();
        FireRailGun();
    }

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

    #region Energy

    [SerializeField] private TMP_Text energyCategoryText;
    [SerializeField] private TMP_Text swarmStatsText;

    [Space(10), SerializeField]  private Button solarBuyButton;
    [SerializeField] private TMP_Text solarTitleText;
    [SerializeField] private SlicedFilledImage solarFillBar;

    [Space(10), SerializeField]  private Button fusionBuyButton;
    [SerializeField] private TMP_Text fusionTitleText;
    [SerializeField] private SlicedFilledImage fusionFillBar;

    #endregion

    #region Buildings

    [Space(10), SerializeField]  private TMP_Text factoriesTitleText;
    [SerializeField] private SlicedFilledImage factoriesFillBar;
    [SerializeField] private TMP_Text factoriesFillText;
    [SerializeField] private SlicedFilledImage factoriesInventoryFillBar;
    [SerializeField] private TMP_Text factoriesInventoryBarText;
    [SerializeField] private float _factoriesTime;
    [SerializeField] private float _factoriesDuration = 2;

    [Space(10), SerializeField]  private TMP_Text railgunsTitleText;
    [SerializeField] private SlicedFilledImage railgunsFillBar;
    [SerializeField] private SlicedFilledImage railgunsEnergyFillBar;
    private bool _firing;
    public float _fireTime;
    public float _TotalfireTime = 5;
    public int _timesToFire = 10;
    public int _fireTimes;

    #endregion

    #region EnergyFunctions

    private void AddEnergy()
    {
        double solarPanelEnergy = sd1.solarPanels * sd1.solarPanelGeneration;
        if (sd1.mathematicsComplete) solarPanelEnergy *= 2;
        double fusionEnergy = sd1.fusion * sd1.fusionGeneration;
        long dysonPanelEnergy = sd1.swarmPanels * sd1.swarmPanelGeneration;
        long doubleTimeMulti = sdp.doDoubleTime ? oracle.saveSettings.sdPrestige.doubleTimeRate + 1 : 1;

        sd1.energy += (solarPanelEnergy + fusionEnergy + dysonPanelEnergy) *
                      doubleTimeMulti * Time.deltaTime;
        swarmStatsText.text =
            $"You've launched {sd1.swarmPanels:N0} panels, They produce {CalcUtils.FormatEnergy(sd1.swarmPanels * sd1.swarmPanelGeneration * doubleTimeMulti, false)}";

        energyCategoryText.text = "Energy<size=70%>"; // - {CalcUtils.FormatEnergy(sd1.energy, true)}";
    }

    private void SolarManagement()
    {
        if (sd1.solarPanels == 0)
            solarFillBar.fillAmount = 0;
        else
            solarFillBar.fillAmount = 1;
        solarTitleText.text =
            $"Solar Panels <size=70%> {CalcUtils.FormatEnergy(sd1.solarPanels * sd1.solarPanelGeneration * (sd1.mathematicsComplete ? 2 : 1) * (sdp.doDoubleTime ? oracle.saveSettings.sdPrestige.doubleTimeRate + 1 : 1), false)}";
    }

    private void FusionManagement()
    {
        if (sd1.fusion == 0)
            fusionFillBar.fillAmount = 0;
        else
            fusionFillBar.fillAmount = 1;
        fusionTitleText.text =
            $"Fusion Generators <size=70%> {CalcUtils.FormatEnergy(sd1.fusion * sd1.fusionGeneration * (sd1.mathematicsComplete ? 2 : 1) * (sdp.doDoubleTime ? oracle.saveSettings.sdPrestige.doubleTimeRate + 1 : 1), false)}";
    }

    #endregion

    #region BuildingFunctions

    private void SpaceFactoryManagement()
    {
        if (sd1.spaceFactories == 0)
        {
            factoriesFillBar.fillAmount = 0;
            factoriesFillText.text = "";
        }

        factoriesTitleText.text = $"Space Factories <size=70%> {sd1.spaceFactories:N0}";
        if (sd1.spaceFactories < 1) return;

        double multi = 1 + (sd1.spaceFactories > 0 ? Math.Log10(sd1.spaceFactories) : 0);
        if (sdp.doDoubleTime) multi *= oracle.saveSettings.sdPrestige.doubleTimeRate + 1;
        if (sdp.sfActivator1) multi *= 2;
        if (sdp.sfActivator2) multi *= 2;
        if (sdp.sfActivator3) multi *= 2;

        if (sd1.dysonPanels < DysonPanelCap)
        {
            if (sd1.spaceFactories >= 1) _factoriesTime += Time.deltaTime * (float)multi;

            factoriesFillBar.fillAmount =
                (float)StaticMethods.FillBar(sd1.spaceFactories, _factoriesDuration, multi, _factoriesTime);
            factoriesFillText.text = StaticMethods.TimerText(sd1.spaceFactories, _factoriesDuration, multi, _factoriesTime);

            while (_factoriesTime >= _factoriesDuration)
            {
                _factoriesTime -= _factoriesDuration;
                sd1.dysonPanels++;
            }

            factoriesInventoryFillBar.fillAmount = sd1.dysonPanels / (float)DysonPanelCap;
            factoriesInventoryBarText.text = $"{sd1.dysonPanels}/{DysonPanelCap}";
        }
        else
        {
            factoriesInventoryFillBar.fillAmount = 1;
            factoriesInventoryBarText.text = $"{sd1.dysonPanels}/{DysonPanelCap}";
            factoriesFillBar.fillAmount = 1;
            factoriesFillText.text = StaticMethods.TimerText(sd1.spaceFactories, _factoriesDuration, multi, _factoriesTime);
        }
    }

    private void RailgunManagement()
    {
        if (sd1.energy > 0 && sd1.railgunCharge < sd1.railgunMaxCharge)
        {
            if (sdp.railgunActivator1) _TotalfireTime = 2.5f;
            if (sdp.railgunActivator2) _TotalfireTime = 1;
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

        railgunsTitleText.text = $"Railguns<size=70%> - {CalcUtils.FormatEnergy(sd1.railgunCharge, true)}/25MJ";
        railgunsEnergyFillBar.fillAmount = (float)sd1.railgunCharge / (float)sd1.railgunMaxCharge;
    }

    private void FireRailGun()
    {
        if (!_firing)
        {
            railgunsFillBar.fillAmount = 0;
            return;
        }

        float deltaCalc = _timesToFire / _TotalfireTime;
        float timeToFill = _TotalfireTime / _timesToFire;
        _fireTime += deltaCalc * Time.deltaTime;
        float fill = _fireTime / timeToFill;

        if (_fireTime >= timeToFill)
        {
            _fireTime = 0;
            sd1.railgunCharge -= sd1.railgunMaxCharge / 10f;
            sd1.dysonPanels -= oracle.saveSettings.sdPrestige.doubleTimeRate >= 1 && sdp.doDoubleTime
                ? 1 * oracle.saveSettings.sdPrestige.doubleTimeRate
                : 1;
            sd1.swarmPanels += oracle.saveSettings.sdPrestige.doubleTimeRate >= 1 && sdp.doDoubleTime
                ? 1 * oracle.saveSettings.sdPrestige.doubleTimeRate
                : 1;
            _fireTimes--;
        }

        if (sd1.railgunCharge < sd1.railgunMaxCharge / 10f || _fireTimes <= 0) _firing = false;

        railgunsFillBar.fillAmount = fill;
    }

    private int GetDysonPanelsRequiredToFire()
    {
        if (!sdp.doDoubleTime || sdp.doubleTimeRate < 1)
            return RailgunBasePanelsRequired;
        return RailgunBasePanelsRequired * (int)sdp.doubleTimeRate;
    }

    #endregion
}
