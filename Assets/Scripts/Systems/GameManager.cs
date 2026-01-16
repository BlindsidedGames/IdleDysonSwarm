using System;
using System.Collections;
using System.Globalization;
using TMPro;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;
using UnityEngine.Serialization;
using Systems;
using Systems.Stats;
using Blindsided.Utilities;
using static Expansion.Oracle;


public class GameManager : MonoBehaviour
{
    #region SerializedFields

    private DysonVerseInfinityData infinityData => oracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData;
    private DysonVersePrestigeData prestigeData => oracle.saveSettings.dysonVerseSaveData.dysonVersePrestigeData;
    private DysonVerseSkillTreeData skillTreeData => oracle.saveSettings.dysonVerseSaveData.dysonVerseSkillTreeData;
    private DysonVerseSaveData dysonVerseSaveData => oracle.saveSettings.dysonVerseSaveData;
    private PrestigePlus prestigePlus => oracle.saveSettings.prestigePlus;

    [SerializeField] private GameObject store;

    [SerializeField, FormerlySerializedAs("skb")] private SkillTreeManager skillTreeManager;
    [SerializeField] private TMP_Text saveAge;

    [SerializeField, FormerlySerializedAs("skillTimers")] private TMP_Text skillTimersText;

    [SerializeField] private TMP_Text runAge;
    [SerializeField] private TMP_Text runAgePrestigeScreen;
    private string sciencePerSecondText = "";
    [SerializeField] private TMP_Text skillTreePoints;
    [SerializeField] private GameObject prestigeScreen;

    [SerializeField] private GameObject[] infinityButton;



    [Header("ReturnScreen"), SerializeField]
    private TMP_Text awayForHeader;

    [SerializeField] private TMP_Text awayFor;

    [SerializeField] private GameObject offlineTimeInstructions;
    [SerializeField] private LayoutElement offlineProgressLayoutElement;
    [SerializeField] private GameObject returnScreen;
    [SerializeField] private SlicedFilledImage returnScreenSlider;
    [SerializeField] private GameObject returnScreenSliderParentGameObject;
    [SerializeField] private Button returnScreenConfirmButton;

    [SerializeField] private TMP_Text amounts;

    [Header("Resource Amounts"), SerializeField]
    private TMP_Text cash;

    [SerializeField] private TMP_Text totalBots;

    [SerializeField] private TMP_Text cashPerSec;
    [SerializeField] private TMP_Text researchPoints;
    [SerializeField] private TMP_Text researchPerSec;
    [SerializeField] private TMP_Text workerStats;
    [SerializeField] private TMP_Text scienceStats;

    [Header("WorkerStatPanel"), SerializeField]
    private TMP_Text lifetimePanels;

    [SerializeField] private TMP_Text activePanels;
    [SerializeField] private TMP_Text panelLifetime;
    [SerializeField] private TMP_Text goal;

    [Header("SkillsMenuItems"), SerializeField, FormerlySerializedAs("SkillsFill")]
    private SlicedFilledImage skillsFill;

    [SerializeField] private GameObject skillsIcon;
    [SerializeField] private GameObject skillsToggle;
    [SerializeField] private GameObject[] skillsButton;
    [SerializeField, FormerlySerializedAs("skillsfillbar")] private GameObject skillsFillBar;
    [SerializeField] private TMP_Text skillsText;
    [SerializeField, FormerlySerializedAs("skillsMenubutton")] private Button skillsMenuButton;
    [SerializeField] private double maxInfinityBuff = 1e44;

    [SerializeField, FormerlySerializedAs("_skillTreeConfirmationManager")]
    private SkillTreeConfirmationManager skillTreeConfirmationManager;
    private readonly SecretBuffState _secretBuffState = new SecretBuffState();
    private bool _isPermanentPanel;

    #endregion

    public static event Action UpdateSkills;
    public static event Action AssignSkills;

    /// <summary>
    /// Sets Skills UI references from a SidePanelReferences component.
    /// Called by SidePanelController when switching between panel variants.
    /// </summary>
    public void SetSkillsReferences(SidePanelReferences refs)
    {
        if (refs == null) return;

        _isPermanentPanel = refs.isPermanentPanel;

        // Update fill bar references
        if (refs.skillsFillObject != null)
            skillsFill = refs.skillsFillObject.GetComponent<SlicedFilledImage>();
        if (refs.skillsFillBar != null)
            skillsFillBar = refs.skillsFillBar;

        // Update other Skills UI references
        if (refs.skillsIcon != null)
            skillsIcon = refs.skillsIcon;
        if (refs.skillsToggle != null)
            skillsToggle = refs.skillsToggle;
        if (refs.skillsTextObject != null)
            skillsText = refs.skillsTextObject.GetComponent<TMP_Text>();
        if (refs.skillsMenuButtonObject != null)
            skillsMenuButton = refs.skillsMenuButtonObject.GetComponent<Button>();
    }

    #region Main

    #region Initialization

    public void UpdateSkillsInvoke()
    {
        UpdateSkills?.Invoke();
    }

    public void AutoAssignSkillsInvoke()
    {
        AssignSkills?.Invoke();
        CalculateModifiers();
    }

    private void Start()
    {
        CalculateModifiers();
        CalculateProduction();
        InvokeRepeating(nameof(UpdateTextFields), 0, 0.1f);
        InvokeRepeating(nameof(CalculateModifiers), 0, 1f);
        // InvokeRepeating(nameof(SubmitHighScores), 10, 10f);
        InvokeRepeating(nameof(CheckIfValuesNegative), 0, 10);
        if (Application.platform == RuntimePlatform.WindowsPlayer)
        {
            store.SetActive(false);
        }
    }

    private void CheckIfValuesNegative()
    {
        if (infinityData.bots < 0 || infinityData.money < 0)
        {
            infinityData.bots = 10;
            infinityData.assemblyLines[0] = 0;
            infinityData.assemblyLines[1] = 0;
            infinityData.managers[0] = 0;
            infinityData.managers[1] = 0;
            infinityData.servers[0] = 0;
            infinityData.servers[1] = 0;
            infinityData.planets[0] = 0;
            infinityData.planets[1] = 0;
            infinityData.science = 10;
            infinityData.money = 10;
            infinityData.totalPanelsDecayed = 0;
        }
    }

    private void Update()
    {
        SetBotDistribution();
        CalculateProduction();
        ManageGoal();
        bool trigger = !prestigePlus.breakTheLoop && infinityData.bots >=
            (prestigePlus.divisionsPurchased > 0 ? 4.2e19 / Math.Pow(10, prestigePlus.divisionsPurchased) : 4.2e19);
        if (trigger) Prestige();
    }

    public void CalculateProduction()
    {
        ProductionSystem.CalculateProduction(infinityData, skillTreeData, prestigeData, prestigePlus, Time.deltaTime);
    }

    private double CurrentRunTime()
    {
        DateTime dateStarted = string.IsNullOrEmpty(dysonVerseSaveData.lastCollapseDate)
            ? DateTime.Parse(oracle.saveSettings.dateStarted, CultureInfo.InvariantCulture)
            : DateTime.Parse(dysonVerseSaveData.lastCollapseDate, CultureInfo.InvariantCulture);
        DateTime dateNow = DateTime.UtcNow;
        TimeSpan timespan = dateNow - dateStarted;
        return timespan.TotalSeconds;
    }

    public void Prestige()
    {
        skillTreeConfirmationManager.CloseConfirm();
        double seconds = CurrentRunTime();
        if (seconds <= 0) seconds = 10000;
        string lastCollapseInfo = "";

        lastCollapseInfo = seconds > 10
            ? $"You broke reality in: {CalcUtils.FormatTimeLarge(seconds)}"
            : $"You broke reality in: {seconds:F2} Seconds";
        lastCollapseInfo += $"\nYou have broken reality {prestigeData.infinityPoints + 1} ";
        lastCollapseInfo += prestigeData.infinityPoints > 1 ? "times" : "time";

        runAgePrestigeScreen.text = lastCollapseInfo;

        oracle.saveSettings.timeLastInfinity = seconds;

        dysonVerseSaveData.lastCollapseDate = DateTime.UtcNow.ToString(CultureInfo.InvariantCulture);
        if (!oracle.saveSettings.infinityFirstRunDone)
            foreach (GameObject VARIABLE in infinityButton)
                VARIABLE.SetActive(true);

        switch (prestigePlus.breakTheLoop)
        {
            case true:
                oracle.ManualDysonInfinity();
                break;
            default:
                oracle.DysonInfinity();
                break;
        }

        UpdateSkillsInvoke();

        if (prestigeData.infinityPoints <= 42 && oracle.saveSettings.prestigePlus.points == 0) prestigeScreen.SetActive(true);
    }

    private void OnEnable()
    {
        AwayFor += ApplyReturnValues;
    }

    private void OnDisable()
    {
        AwayFor -= ApplyReturnValues;
    }

    // private void SubmitHighScores()
    // {
    //     if (infinityData.goalSetter < 1) return;
    //     Achievements.tenbots.Unlock();
    //     if (infinityData.goalSetter < 2) return;
    //     Achievements.fiveassemblylines.Unlock();
    //     if (infinityData.goalSetter < 3) return;
    //     Achievements.twentykactivective.Unlock();
    //     if (infinityData.goalSetter < 4) return;
    //     Achievements.twentyplanets.Unlock();
    //     if (infinityData.goalSetter < 7) return;
    //     Achievements.surroundstarstenb.Unlock();
    //     if (infinityData.goalSetter < 8) return;
    //     Achievements.engulfgalaxy.Unlock();
    //     if (infinityData.goalSetter < 10) return;
    //     Achievements.galaxyonehundred.Unlock();
    // }

    #endregion

    #region AwayTime

    private OfflineProgressContext CreateOfflineProgressContext()
    {
        return new OfflineProgressContext
        {
            infinityData = infinityData,
            prestigeData = prestigeData,
            skillTreeData = skillTreeData,
            saveSettings = oracle.saveSettings,
            SetBotDistribution = SetBotDistribution,
            CalculateShouldersSkills = CalculateShouldersSkills,
            CalculateProduction = CalculateProduction,
            MoneyToAdd = MoneyToAdd,
            ScienceToAdd = ScienceToAdd
        };
    }

    private OfflineProgressUI CreateOfflineProgressUi()
    {
        return new OfflineProgressUI
        {
            AwayForHeader = awayForHeader,
            AwayFor = awayFor,
            OfflineTimeInstructions = offlineTimeInstructions,
            OfflineProgressLayoutElement = offlineProgressLayoutElement,
            ReturnScreen = returnScreen,
            ReturnScreenSlider = returnScreenSlider,
            ReturnScreenSliderParentGameObject = returnScreenSliderParentGameObject,
            Amounts = amounts
        };
    }

    public void ApplyReturnValues(double awayTime)
    {
        OfflineProgressSystem.ApplyReturnValues(awayTime, CreateOfflineProgressContext(), CreateOfflineProgressUi());
    }

    public void RunAwayTime(double awayTime)
    {
        if (oracle.saveSettings.cheater) return;
        StartCoroutine(CalculateAwayValues(awayTime));
    }

    private IEnumerator CalculateAwayValues(double awayTime)
    {
        return OfflineProgressSystem.CalculateAwayValues(awayTime, CreateOfflineProgressContext(), CreateOfflineProgressUi());
    }

    #endregion


    private void SetBotDistribution()
    {
        ProductionSystem.SetBotDistribution(infinityData, prestigeData, prestigePlus);
    }

    #region GoalManagment

    private void ManageGoal()
    {
        //var colorSkillTree = "<color=#FFA45E>";
        string skillPointColor = "<color=#91DD8F>";
        skillTreePoints.text =
            $"Skill points: {skillPointColor}{skillTreeData.skillPointsTree}</color>";
        string color = "<color=#91DD8F>";
        if (skillsText != null)
        {
            skillsText.text = oracle.saveSettings.skillsFirstRunDone
                ? "Skills"
                : "<align=\"center\"><sprite=4 color=#C8B3FF>";
        }
        if (skillTreeData.skillPointsTree > 0 || prestigeData.permanentSkillPoint > 0 || prestigeData.infinityPoints > 0 ||
            prestigeData.spentInfinityPoints > 0)
        {
            if (skillsIcon != null) skillsIcon.SetActive(true);
            // Hide toggle in permanent mode since the panel is always visible
            if (skillsToggle != null && !_isPermanentPanel && SceneManager.GetActiveScene().buildIndex == 1)
                skillsToggle.SetActive(true);
            skillsButton[0].SetActive(!oracle.saveSettings.skillsButtonToggle);
            if (!oracle.saveSettings.skillsFirstRunDone) skillsButton[1].SetActive(true);
            oracle.saveSettings.skillsFirstRunDone = true;
            if (skillsMenuButton != null) skillsMenuButton.interactable = true;
        }
        else if (skillTreeData.skillPointsTree == 0 && prestigeData.permanentSkillPoint == 0 && prestigeData.infinityPoints == 0 &&
                 prestigeData.spentInfinityPoints == 0 && !oracle.saveSettings.skillsFirstRunDone)
        {
            if (skillsIcon != null) skillsIcon.SetActive(oracle.saveSettings.skillsFirstRunDone);
            if (skillsToggle != null) skillsToggle.SetActive(false);
            skillsButton[0].SetActive(false);
            if (skillsMenuButton != null) skillsMenuButton.interactable = false;
        }

        switch (infinityData.goalSetter)
        {
            case 0:
            {
                goal.text = $"{color}Goal: Create {CalcUtils.FormatNumber(10)} Bots";
                if (skillsFill != null) skillsFill.fillAmount = (float)infinityData.bots / 10;
                if (infinityData.bots >= 10)
                {
                    if (skillsFillBar != null) skillsFillBar.SetActive(true);
                    infinityData.goalSetter = 1;
                    skillTreeData.skillPointsTree += 1;
                    AssignSkills?.Invoke();
                    if (skillsMenuButton != null && skillsMenuButton.interactable == false)
                    {
                        oracle.saveSettings.skillsButtonToggle = false;
                        skillsButton[0].SetActive(true);
                    }

                    UpdateSkills?.Invoke();
                }

                break;
            }
            case 1:
            {
                goal.text = $"{color}Goal: Build {CalcUtils.FormatNumber(5)} Assembly Lines";
                if (skillsFill != null) skillsFill.fillAmount = (float)(infinityData.assemblyLines[1] / 5);
                if (infinityData.assemblyLines[1] >= 5)
                {
                    infinityData.goalSetter = 2;
                    skillTreeData.skillPointsTree += 1;
                    AssignSkills?.Invoke();
                    UpdateSkills?.Invoke();
                    if (skillsFillBar != null) skillsFillBar.SetActive(true);
                }

                break;
            }
            case 2:
            {
                goal.text = $"{color}Goal: Have {CalcUtils.FormatNumber(20000)} active Panels";
                if (skillsFill != null) skillsFill.fillAmount = (float)(infinityData.panelsPerSec * infinityData.panelLifetime / 20000);
                if (infinityData.panelsPerSec * infinityData.panelLifetime >= 20000)
                {
                    infinityData.goalSetter = 3;
                    skillTreeData.skillPointsTree += 1;
                    AssignSkills?.Invoke();
                    UpdateSkills?.Invoke();
                    if (skillsFillBar != null) skillsFillBar.SetActive(true);
                }

                break;
            }
            case 3:
            {
                goal.text = $"{color}Goal: Own {CalcUtils.FormatNumber(20)} Planets";
                if (skillsFill != null) skillsFill.fillAmount =
                    (float)(infinityData.planets[0] + (skillTreeData.terraIrradiant ? infinityData.planets[1] * 12 : infinityData.planets[1]) / 20);
                if (infinityData.planets[0] + (skillTreeData.terraIrradiant ? infinityData.planets[1] * 12 : infinityData.planets[1]) >= 20)
                {
                    infinityData.goalSetter = 4;
                    skillTreeData.skillPointsTree += 1;
                    AssignSkills?.Invoke();
                    UpdateSkills?.Invoke();
                    if (skillsFillBar != null) skillsFillBar.SetActive(true);
                }

                break;
            }
            case 4:
            {
                goal.text = $"{color}Goal: {CalcUtils.FormatNumber(1000000000000)} total panels decayed";

                if (skillsFill != null) skillsFill.fillAmount = (float)infinityData.totalPanelsDecayed / 1000000000000;
                if (infinityData.totalPanelsDecayed >= 1000000000000)
                {
                    infinityData.goalSetter = 5;
                    skillTreeData.skillPointsTree += 1;
                    AssignSkills?.Invoke();
                    UpdateSkills?.Invoke();
                    if (skillsFillBar != null) skillsFillBar.SetActive(true);
                }

                break;
            }
            case 5:
            {
                goal.text = $"{color}Goal: Surround {CalcUtils.FormatNumber(1000000000)} Stars";
                if (skillsFill != null) skillsFill.fillAmount = (float)(infinityData.panelsPerSec * infinityData.panelLifetime / 20000 / 1000000000);
                if (infinityData.panelsPerSec * infinityData.panelLifetime / 20000 >= 1000000000)
                {
                    infinityData.goalSetter = 6;
                    skillTreeData.skillPointsTree += 1;
                    AssignSkills?.Invoke();
                    UpdateSkills?.Invoke();
                    if (skillsFillBar != null) skillsFillBar.SetActive(true);
                }

                break;
            }
            case 6:
            {
                goal.text = $"{color}Goal: Surround {CalcUtils.FormatNumber(10000000000)} Stars";
                if (skillsFill != null) skillsFill.fillAmount = (float)(infinityData.panelsPerSec * infinityData.panelLifetime / 20000 / 10000000000);
                if (infinityData.panelsPerSec * infinityData.panelLifetime / 20000 >= 10000000000)
                {
                    infinityData.goalSetter = 7;
                    skillTreeData.skillPointsTree += 1;
                    AssignSkills?.Invoke();
                    UpdateSkills?.Invoke();
                    if (skillsFillBar != null) skillsFillBar.SetActive(true);
                }

                break;
            }
            case 7:
            {
                goal.text = $"{color}Goal: Engulf a Galaxy";
                if (skillsFill != null) skillsFill.fillAmount = (float)(infinityData.panelsPerSec * infinityData.panelLifetime / 20000 / 100000000000 / 1);
                if (infinityData.panelsPerSec * infinityData.panelLifetime / 20000 / 100000000000 > 1)
                {
                    infinityData.goalSetter = 8;
                    skillTreeData.skillPointsTree += 1;
                    AssignSkills?.Invoke();
                    UpdateSkills?.Invoke();
                    if (skillsFillBar != null) skillsFillBar.SetActive(true);
                }

                break;
            }
            case 8:
            {
                goal.text = $"{color}Goal: Engulf {CalcUtils.FormatNumber(10)} Galaxies";
                if (skillsFill != null) skillsFill.fillAmount = (float)(infinityData.panelsPerSec * infinityData.panelLifetime / 20000 / 100000000000 / 10);
                if (infinityData.panelsPerSec * infinityData.panelLifetime / 20000 / 100000000000 > 10)
                {
                    infinityData.goalSetter = 9;
                    skillTreeData.skillPointsTree += 1;
                    AssignSkills?.Invoke();
                    UpdateSkills?.Invoke();
                    if (skillsFillBar != null) skillsFillBar.SetActive(true);
                }

                break;
            }
            case 9:
            {
                goal.text = $"{color}Goal: Engulf {CalcUtils.FormatNumber(100)} Galaxies";
                if (skillsFill != null) skillsFill.fillAmount = (float)(infinityData.panelsPerSec * infinityData.panelLifetime / 20000 / 100000000000 / 100);
                if (infinityData.panelsPerSec * infinityData.panelLifetime / 20000 / 100000000000 > 100)
                {
                    infinityData.goalSetter = 10;
                    skillTreeData.skillPointsTree += 1;
                    AssignSkills?.Invoke();
                    UpdateSkills?.Invoke();
                    if (skillsFillBar != null) skillsFillBar.SetActive(false);
                }

                break;
            }
            default:
                goal.text = $"{color}Reach {CalcUtils.FormatNumber(42000000000000000000D)} Bots.";
                break;
        }
    }

    #endregion

    #region ApplyProduction

    private void CalculatePlanetsPerSecond()
    {
        ProductionSystem.CalculatePlanetsPerSecond(infinityData, skillTreeData, Time.deltaTime);
    }

    private void CalculateShouldersSkills(double time)
    {
        ProductionSystem.CalculateShouldersSkills(infinityData, skillTreeData, prestigeData, time);
    }

    private void CalculatePlanetProduction()
    {
        ProductionSystem.CalculatePlanetProduction(infinityData, skillTreeData, prestigeData, Time.deltaTime);
    }

    private void CalculateDataCenterProduction()
    {
        ProductionSystem.CalculateDataCenterProduction(infinityData, skillTreeData, prestigeData, prestigePlus, Time.deltaTime);
    }

    private void CalculateServerProduction()
    {
        ProductionSystem.CalculateServerProduction(infinityData, skillTreeData, prestigeData, prestigePlus, Time.deltaTime);
    }

    private void CalculateManagerProduction()
    {
        ProductionSystem.CalculateManagerProduction(infinityData, skillTreeData, prestigeData, prestigePlus, Time.deltaTime);
    }

    private void CalculateAssemblyLineProduction()
    {
        ProductionSystem.CalculateAssemblyLineProduction(infinityData, skillTreeData, prestigeData, prestigePlus, Time.deltaTime);
    }

    private void CalculatePanelsPerSec()
    {
        ProductionSystem.CalculatePanelsPerSec(infinityData, skillTreeData, Time.deltaTime);
    }

    private void CalculateScience()
    {
        ProductionSystem.CalculateScience(infinityData, skillTreeData, Time.deltaTime);
    }

    public double ScienceToAdd() =>
        ProductionSystem.ScienceToAdd(infinityData, skillTreeData);

    private void CalculateMoney()
    {
        ProductionSystem.CalculateMoney(infinityData, skillTreeData, Time.deltaTime);
    }

    public double MoneyToAdd() =>
        ProductionSystem.MoneyToAdd(infinityData, skillTreeData);

    #endregion

    #region UpdateTextFields

    private void UpdateTextFields()
    {
        string color = "<color=#FFA45E>";
        string scienceColor = "<color=#00E1FF>";

        totalBots.text = $"Total Bots: {CalcUtils.FormatNumber(infinityData.bots)}";

        //research FF5A6E
        researchPoints.text = $"<sprite=0>{CalcUtils.FormatNumber(infinityData.science)}";
        sciencePerSecondText = CalcUtils.FormatNumber(ScienceToAdd());

        researchPerSec.text = $"<sprite=0>{sciencePerSecondText} /s";
        //cash
        cash.text = $"${CalcUtils.FormatNumber(infinityData.money)}";
        cashPerSec.text =
            $"${CalcUtils.FormatNumber(MoneyToAdd())} /s";
        //workerPanels
        //solarStats
        if (infinityData.panelsPerSec * infinityData.panelLifetime < 20000)
            activePanels.text =
                $"Active panels: {color}{CalcUtils.FormatNumber(infinityData.panelsPerSec * infinityData.panelLifetime)}";
        else if (infinityData.panelsPerSec * infinityData.panelLifetime / 20000 < 100000000000)
            activePanels.text =
                $"Stars Surrounded: {color}{CalcUtils.FormatNumber(infinityData.panelsPerSec * infinityData.panelLifetime / 20000)}";
        else
            activePanels.text =
                $"Galaxies Engulfed: {color}{CalcUtils.FormatNumber(infinityData.panelsPerSec * infinityData.panelLifetime / 20000 / 100000000000)}";
        panelLifetime.text = $"Panel lifetime: {color}{CalcUtils.FormatNumber(infinityData.panelLifetime)}</color> seconds";
        lifetimePanels.text =
            $"Total panels decayed: {color}{CalcUtils.FormatNumber(infinityData.totalPanelsDecayed)}";
        //Lower panel
        string workers = CalcUtils.FormatNumber(infinityData.workers);

        string bots = CalcUtils.FormatNumber(Math.Floor(infinityData.bots));
        workerStats.text =
            $"{color}{workers}</color> Worker Bots producing {color}{CalcUtils.FormatNumber(infinityData.panelsPerSec)}</color> Panels /s ";
        //researcherPanels
        string scientists = CalcUtils.FormatNumber(infinityData.researchers);
        scienceStats.text =
            $"{scienceColor}{scientists}</color> Science Bots producing {scienceColor}{sciencePerSecondText}</color><sprite=0>/s ";
        if (string.IsNullOrEmpty(oracle.saveSettings.dateStarted))
            oracle.saveSettings.dateStarted = DateTime.UtcNow.ToString(CultureInfo.InvariantCulture);
        if (!string.IsNullOrEmpty(oracle.saveSettings.dateStarted))
        {
            DateTime dateStarted = DateTime.Parse(oracle.saveSettings.dateStarted, CultureInfo.InvariantCulture);
            DateTime dateNow = DateTime.UtcNow;
            TimeSpan timespan = dateNow - dateStarted;
            double seconds = timespan.TotalSeconds;
            if (seconds < 0) seconds = 0;
            saveAge.text = $"Save age: {CalcUtils.FormatTimeLarge(seconds)}";
        }

        runAge.text = "";
        if (prestigeData.infinityPoints >= 1)
            if (!string.IsNullOrEmpty(dysonVerseSaveData.lastCollapseDate))
            {
                DateTime dateStarted = DateTime.Parse(dysonVerseSaveData.lastCollapseDate, CultureInfo.InvariantCulture);
                DateTime dateNow = DateTime.UtcNow;
                TimeSpan timespan = dateNow - dateStarted;
                double seconds = timespan.TotalSeconds;
                if (seconds < 0) seconds = 0;
                runAge.text = $"Run time: {CalcUtils.FormatTimeLarge(seconds)}";
            }


        string planetProductionDetailText = "";
        bool addPlanetLineBreak = false;
        if (skillTreeData.scientificPlanets)
        {
            planetProductionDetailText +=
                infinityData.researchers > 1
                    ? $"Scientific Planets <color=#FFA45E>+{CalcUtils.FormatNumber(infinityData.scientificPlanetsProduction)} </color>"
                    : "Scientific Planets <color=#FFA45E>+0 </color>";
            addPlanetLineBreak = true;
        }

        if (skillTreeData.stellarSacrifices)
        {
            if (addPlanetLineBreak) planetProductionDetailText += "<br>";
            addPlanetLineBreak = true;

            string stellarSacrificeText = infinityData.bots > StellarSacrificesRequiredBots() && StellarGalaxies() > 0
                ? $"<color=#FFA45E>{CalcUtils.FormatNumber(StellarGalaxies())}</color> Stellar Galaxies sacrificing <color=#FFA45E>{CalcUtils.FormatNumber(StellarSacrificesRequiredBots())}</color> Bots/s</color>"
                : infinityData.bots < StellarSacrificesRequiredBots()
                    ? $"You need <color=#FFA45E>{CalcUtils.FormatNumber(StellarSacrificesRequiredBots())}</color> Bots"
                    : "You have <color=#FFA45E>0</color> Stellar Galaxies.";
            planetProductionDetailText +=
                $"Stellar Sacrifices: {stellarSacrificeText}";
        }

        if (skillTreeData.planetAssembly)
        {
            if (addPlanetLineBreak) planetProductionDetailText += "<br>";
            addPlanetLineBreak = true;
            planetProductionDetailText +=
                $"Planet Assembly <color=#FFA45E>+{CalcUtils.FormatNumber(infinityData.planetAssemblyProduction)} </color>";
        }

        if (skillTreeData.shellWorlds)
        {
            if (addPlanetLineBreak) planetProductionDetailText += "<br>";
            addPlanetLineBreak = true;
            planetProductionDetailText +=
                $"Shell Worlds <color=#FFA45E>+{CalcUtils.FormatNumber(infinityData.shellWorldsProduction)} </color>";
        }

        /*planetProductionText.text = planetProductionDetailText;*/


        string dataCenterProductionDetailText = "";
        bool addDataCenterLineBreak = false;
        if (skillTreeData.pocketDimensions)
        {
            dataCenterProductionDetailText +=
                infinityData.workers > 1
                    ? $"Pocket Dimensions <color=#FFA45E>+{CalcUtils.FormatNumber(infinityData.pocketDimensionsWithoutAnythingElseProduction)} </color>"
                    : "Pocket Dimensions <color=#FFA45E>+0 </color>";
            addDataCenterLineBreak = true;
        }

        if (skillTreeData.pocketProtectors)
        {
            if (addDataCenterLineBreak) dataCenterProductionDetailText += "<br>";
            addDataCenterLineBreak = true;
            dataCenterProductionDetailText += skillTreeData.pocketMultiverse
                ? $"Pocket Multiverse <color=#FFA45E>+{CalcUtils.FormatNumber(infinityData.pocketMultiverseProduction)} </color>"
                : $"Pocket Protectors <color=#FFA45E>+{CalcUtils.FormatNumber(infinityData.pocketProtectorsProduction)} </color>";
        }

        double multiplier = infinityData.pocketDimensionsWithoutAnythingElseProduction + (skillTreeData.pocketMultiverse
            ? infinityData.pocketMultiverseProduction
            : infinityData.pocketProtectorsProduction);
        if (skillTreeData.dimensionalCatCables)
        {
            multiplier *= 5;
            if (addDataCenterLineBreak) dataCenterProductionDetailText += "<br>";
            addDataCenterLineBreak = true;
            dataCenterProductionDetailText +=
                $"Dimensional CAT Cables <color=#FFA45E>* 5 <color=#91DD8F>= {CalcUtils.FormatNumber(multiplier)}</color></color>";
        }

        if (skillTreeData.solarBubbles)
        {
            double solarBubblesMultiplier = 1 + 0.01 * infinityData.panelLifetime;
            multiplier *= solarBubblesMultiplier;
            if (addDataCenterLineBreak) dataCenterProductionDetailText += "<br>";
            addDataCenterLineBreak = true;
            dataCenterProductionDetailText +=
                $"Solar Bubbles <color=#FFA45E>* {CalcUtils.FormatNumber(solarBubblesMultiplier)} <color=#91DD8F>= {CalcUtils.FormatNumber(multiplier)} </color></color>";
        }

        if (skillTreeData.pocketAndroids)
        {
            double pocketAndroidsTimer = GetSkillTimerSeconds(infinityData, "pocketAndroids");
            double pocketAndroidsMultiplier = pocketAndroidsTimer > 3564 ? 100 : 1 + pocketAndroidsTimer / 36;
            multiplier *= pocketAndroidsMultiplier;
            if (addDataCenterLineBreak) dataCenterProductionDetailText += "<br>";
            addDataCenterLineBreak = true;
            dataCenterProductionDetailText +=
                $"Pocket Androids <color=#FFA45E>* {CalcUtils.FormatNumber(pocketAndroidsMultiplier)} <color=#91DD8F>= {CalcUtils.FormatNumber(multiplier)} </color></color>";
        }

        if (skillTreeData.quantumComputing)
        {
            double quantumComputingMultiplier = infinityData.quantumComputingProduction;
            multiplier *= quantumComputingMultiplier;
            if (addDataCenterLineBreak) dataCenterProductionDetailText += "<br>";
            addDataCenterLineBreak = true;
            dataCenterProductionDetailText +=
                $"Quantum Computing <color=#FFA45E>* {CalcUtils.FormatNumber(quantumComputingMultiplier)} <color=#91DD8F>= {CalcUtils.FormatNumber(multiplier)} </color></color>";
        }


        /*pocketDimensionsText.text = dataCenterProductionDetailText;*/

        string skillTimersDisplayText = "";

        skillTimersDisplayText += $"Cash Multiplier: {scienceColor}{CalcUtils.FormatNumber(MoneyMultipliers())}</color>";
        skillTimersDisplayText +=
            $"<br>Research Multiplier: {scienceColor}{CalcUtils.FormatNumber(ScienceMultipliers())}</color>";
        skillTimersDisplayText +=
            $"<br>Panel Lifetime: {scienceColor}{CalcUtils.FormatNumber(infinityData.panelLifetime)} s</color><br>";

        skillTimersDisplayText +=
            $"<br>Current Infinity Time: {scienceColor}{CalcUtils.FormatTimeLarge(CurrentRunTime())}</color><br>";
        if (oracle.saveSettings.timeLastInfinity > 0)
            skillTimersDisplayText +=
                $"Last Infinity Time: {scienceColor}{CalcUtils.FormatTimeLarge(oracle.saveSettings.timeLastInfinity)}</color><br>";
        if (oracle.saveSettings.lastInfinityPointsGained > 0)
        {
            double ipPerSec = oracle.saveSettings.lastInfinityPointsGained / oracle.saveSettings.timeLastInfinity;
            skillTimersDisplayText += ipPerSec >= 1
                ? $"IP/s: {scienceColor}{CalcUtils.FormatNumber(ipPerSec)}</color><br>"
                : $"s/IP: {scienceColor}{CalcUtils.FormatNumber(1 / ipPerSec)}</color><br>";
        }

        skillTimersDisplayText +=
            $"<br>Active Panels: {scienceColor}{CalcUtils.FormatNumber(infinityData.panelsPerSec * infinityData.panelLifetime)}</color>";
        skillTimersDisplayText +=
            $"<br>Stars Surrounded: {scienceColor}{CalcUtils.FormatNumber(StarsSurrounded(false, false))}</color>";
        skillTimersDisplayText +=
            $"<br>Galaxies Engulfed: {scienceColor}{CalcUtils.FormatNumber(GalaxiesEngulfed(false, false))}</color><br>";

        if (skillTreeData.androids)
        {
            double androidsTimer = GetSkillTimerSeconds(infinityData, "androids");
            skillTimersDisplayText +=
                $"<br>Androids: {scienceColor}{CalcUtils.FormatTimeLarge(androidsTimer >= 600 ? 600 : androidsTimer)}</color><br><size=80%>Granting: {scienceColor}{CalcUtils.FormatNumber(Math.Floor(androidsTimer > 600 ? 200 : androidsTimer / 3))}s Lifetime</color>.<br></size>";
        }

        if (skillTreeData.pocketAndroids)
        {
            double pocketAndroidsTimer = GetSkillTimerSeconds(infinityData, "pocketAndroids");
            skillTimersDisplayText +=
                $"<br>Pocket Androids: {scienceColor}{CalcUtils.FormatTimeLarge(pocketAndroidsTimer >= 3600 ? 3600 : pocketAndroidsTimer)}</color><br><size=80%>Multiplying Data Center Production by: {scienceColor}{CalcUtils.FormatNumber(pocketAndroidsTimer > 3564 ? 100 : 1 + pocketAndroidsTimer / 36)}</color>.<br></size>";
        }

        if (skillTreeData.superRadiantScattering)
        {
            double scatteringTimer = GetSkillTimerSeconds(infinityData, "superRadiantScattering");
            skillTimersDisplayText +=
                $"<br>Scattering: {scienceColor}{CalcUtils.FormatTimeLarge(scatteringTimer)}</color><br><size=80%>Multiplying All Production by: {scienceColor}{CalcUtils.FormatNumber(1 + 0.01f * scatteringTimer)}</color>.<br></size>";
        }


        skillTimersText.text = skillTimersDisplayText;
    }

    #endregion

    #endregion

    #region Modifier Calcs

    public void CalculateModifiers()
    {
        UpdateSciencePerSec();
        UpdateMoneyPerSecMulti();
        UpdateAssemblyLineMulti();
        UpdateManagerMulti();
        UpdateServerMulti();
        UpdateDataCenterMulti();
        UpdatePlanetMulti();
        SecretBuffs();
        UpdatePanelLifetime();
    }

    private void SecretBuffs()
    {
        ModifierSystem.SecretBuffs(infinityData, prestigeData, _secretBuffState);
    }


    public void UpdatePanelLifetime()
    {
        ModifierSystem.UpdatePanelLifetime(infinityData, skillTreeData, prestigeData, prestigePlus);
    }

    private void UpdatePlanetMulti()
    {
        ModifierSystem.UpdatePlanetMulti(infinityData, skillTreeData, prestigeData, prestigePlus, _secretBuffState, maxInfinityBuff);
    }

    private void UpdateDataCenterMulti()
    {
        ModifierSystem.UpdateDataCenterMulti(infinityData, skillTreeData, prestigeData, prestigePlus, maxInfinityBuff);
    }

    private void UpdateServerMulti()
    {
        ModifierSystem.UpdateServerMulti(infinityData, skillTreeData, prestigeData, prestigePlus, _secretBuffState, maxInfinityBuff);
    }

    private void UpdateManagerMulti()
    {
        ModifierSystem.UpdateManagerMulti(infinityData, skillTreeData, prestigeData, prestigePlus, _secretBuffState, maxInfinityBuff);
    }

    private void UpdateAssemblyLineMulti()
    {
        ModifierSystem.UpdateAssemblyLineMulti(infinityData, skillTreeData, prestigeData, prestigePlus, _secretBuffState, maxInfinityBuff);
    }

    private void UpdateSciencePerSec()
    {
        ModifierSystem.UpdateSciencePerSec(infinityData, skillTreeData, prestigeData, prestigePlus, _secretBuffState);
    }

    private void UpdateMoneyPerSecMulti()
    {
        ModifierSystem.UpdateMoneyPerSecMulti(infinityData, skillTreeData, prestigeData, prestigePlus, _secretBuffState);
    }

    #endregion

    #region CalculationFunctions

    private double StellarGalaxies()
    {
        double galaxiesEngulfed = ProductionMath.GalaxiesEngulfed(infinityData, false, false, Time.deltaTime);
        return ProductionMath.StellarGalaxies(skillTreeData, galaxiesEngulfed);
    }

    private double StellarSacrificesRequiredBots()
    {
        double starsSurrounded = ProductionMath.StarsSurrounded(infinityData, false, false, Time.deltaTime);
        return ProductionMath.StellarSacrificesRequiredBots(skillTreeData, starsSurrounded);
    }

    public double GalaxiesEngulfed(bool multipliedByDeltaTime = false, bool floored = true)
    {
        return ProductionMath.GalaxiesEngulfed(infinityData, multipliedByDeltaTime, floored, Time.deltaTime);
    }

    public double StarsSurrounded(bool multipliedByDeltaTime = false, bool floored = true)
    {
        return ProductionMath.StarsSurrounded(infinityData, multipliedByDeltaTime, floored, Time.deltaTime);
    }

    private double GlobalBuff()
    {
        return ModifierSystem.GlobalBuff(infinityData, skillTreeData, prestigePlus);
    }

    private double AmountForBuildingBoostAfterX()
    {
        return ProductionMath.AmountForBuildingBoostAfterX(skillTreeData);
    }

    private double DivisionForBoostAfterX()
    {
        return ProductionMath.DivisionForBoostAfterX(skillTreeData);
    }

    private double MoneyMultipliers()
    {
        if (GlobalStatPipeline.TryCalculateMoneyMultiplier(infinityData, skillTreeData, prestigeData, prestigePlus, _secretBuffState,
                out StatResult result))
        {
            return result.Value;
        }

        return ModifierSystem.MoneyMultipliers(infinityData, skillTreeData, prestigeData, prestigePlus, _secretBuffState);
    }

    private double ScienceMultipliers()
    {
        if (GlobalStatPipeline.TryCalculateScienceMultiplier(infinityData, skillTreeData, prestigeData, prestigePlus, _secretBuffState,
                out StatResult result))
        {
            return result.Value;
        }

        return ModifierSystem.ScienceMultipliers(infinityData, skillTreeData, prestigeData, prestigePlus, _secretBuffState);
    }

    #endregion
}






