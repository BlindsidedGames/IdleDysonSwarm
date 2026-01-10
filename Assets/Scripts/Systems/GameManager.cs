using System;
using System.Collections;
using System.Globalization;
using TMPro;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;
using Systems;
using static Expansion.Oracle;


public class GameManager : MonoBehaviour
{
    #region SerializedFields

    private DysonVerseInfinityData dvid => oracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData;
    private DysonVersePrestigeData dvpd => oracle.saveSettings.dysonVerseSaveData.dysonVersePrestigeData;
    private DysonVerseSkillTreeData dvst => oracle.saveSettings.dysonVerseSaveData.dysonVerseSkillTreeData;
    private DysonVerseSaveData dvsd => oracle.saveSettings.dysonVerseSaveData;
    private SaveDataPrestige sdp => oracle.saveSettings.sdPrestige;
    private PrestigePlus pp => oracle.saveSettings.prestigePlus;

    [SerializeField] private GameObject store;

    [SerializeField] private SkillTreeManager skb;
    [SerializeField] private TMP_Text saveAge;

    [SerializeField] private TMP_Text skillTimers;

    [SerializeField] private TMP_Text runAge;
    [SerializeField] private TMP_Text runAgePrestigeScreen;
    private string sciencePerSec = "";
    [SerializeField] private TMP_Text skillTreePoints;
    [SerializeField] private GameObject prestigeScreen;

    [SerializeField] private GameObject[] infinityButton;

    [Space(10), SerializeField] private GameObject planetProductionDisplay;
    [SerializeField] private TMP_Text totalPlanetsProduction;
    [SerializeField] private GameObject dataCenterProductionDisplay;
    [SerializeField] private TMP_Text totalDataCenterText;
    [SerializeField] private GameObject serverProductionDisplay;
    [SerializeField] private TMP_Text totalServerProduction;


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

    [Header("SkillsMenuItems"), SerializeField]
    private SlicedFilledImage SkillsFill;

    [SerializeField] private GameObject skillsIcon;
    [SerializeField] private GameObject skillsToggle;
    [SerializeField] private GameObject[] skillsButton;
    [SerializeField] private GameObject skillsfillbar;
    [SerializeField] private TMP_Text skillsText;
    [SerializeField] private Button skillsMenubutton;
    [SerializeField] private double maxInfinityBuff = 1e44;

    [SerializeField] private SkillTreeConfirmationManager _skillTreeConfirmationManager;
    private readonly SecretBuffState _secretBuffState = new SecretBuffState();

    #endregion

    public static event Action UpdateSkills;
    public static event Action AssignSkills;

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
        if (dvid.bots < 0 || dvid.money < 0)
        {
            dvid.bots = 10;
            dvid.assemblyLines[0] = 0;
            dvid.assemblyLines[1] = 0;
            dvid.managers[0] = 0;
            dvid.managers[1] = 0;
            dvid.servers[0] = 0;
            dvid.servers[1] = 0;
            dvid.planets[0] = 0;
            dvid.planets[1] = 0;
            dvid.science = 10;
            dvid.money = 10;
            dvid.totalPanelsDecayed = 0;
        }
    }

    private void Update()
    {
        SetBotDistribution();
        CalculateProduction();
        ManageGoal();
        bool trigger = !pp.breakTheLoop && dvid.bots >=
            (pp.divisionsPurchased > 0 ? 4.2e19 / Math.Pow(10, pp.divisionsPurchased) : 4.2e19);
        if (trigger) Prestige();
    }

    public void CalculateProduction()
    {
        ProductionSystem.CalculateProduction(dvid, dvst, dvpd, Time.deltaTime);
    }

    private double CurrentRunTime()
    {
        DateTime dateStarted = string.IsNullOrEmpty(dvsd.lastCollapseDate)
            ? DateTime.Parse(oracle.saveSettings.dateStarted, CultureInfo.InvariantCulture)
            : DateTime.Parse(dvsd.lastCollapseDate, CultureInfo.InvariantCulture);
        DateTime dateNow = DateTime.UtcNow;
        TimeSpan timespan = dateNow - dateStarted;
        return timespan.TotalSeconds;
    }

    public void Prestige()
    {
        _skillTreeConfirmationManager.CloseConfirm();
        double seconds = CurrentRunTime();
        if (seconds <= 0) seconds = 10000;
        string lastCollapseInfo = "";

        lastCollapseInfo = seconds > 10
            ? $"You broke reality in: {CalcUtils.FormatTimeLarge(seconds)}"
            : $"You broke reality in: {seconds:F2} Seconds";
        lastCollapseInfo += $"\nYou have broken reality {dvpd.infinityPoints + 1} ";
        lastCollapseInfo += dvpd.infinityPoints > 1 ? "times" : "time";

        runAgePrestigeScreen.text = lastCollapseInfo;

        oracle.saveSettings.timeLastInfinity = seconds;

        dvsd.lastCollapseDate = DateTime.UtcNow.ToString(CultureInfo.InvariantCulture);
        if (!oracle.saveSettings.infinityFirstRunDone)
            foreach (GameObject VARIABLE in infinityButton)
                VARIABLE.SetActive(true);

        switch (pp.breakTheLoop)
        {
            case true:
                oracle.ManualDysonInfinity();
                break;
            default:
                oracle.DysonInfinity();
                break;
        }

        UpdateSkillsInvoke();

        if (dvpd.infinityPoints <= 42 && oracle.saveSettings.prestigePlus.points == 0) prestigeScreen.SetActive(true);
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
    //     if (dvid.goalSetter < 1) return;
    //     Achievements.tenbots.Unlock();
    //     if (dvid.goalSetter < 2) return;
    //     Achievements.fiveassemblylines.Unlock();
    //     if (dvid.goalSetter < 3) return;
    //     Achievements.twentykactivective.Unlock();
    //     if (dvid.goalSetter < 4) return;
    //     Achievements.twentyplanets.Unlock();
    //     if (dvid.goalSetter < 7) return;
    //     Achievements.surroundstarstenb.Unlock();
    //     if (dvid.goalSetter < 8) return;
    //     Achievements.engulfgalaxy.Unlock();
    //     if (dvid.goalSetter < 10) return;
    //     Achievements.galaxyonehundred.Unlock();
    // }

    #endregion

    #region AwayTime

    private OfflineProgressContext CreateOfflineProgressContext()
    {
        return new OfflineProgressContext
        {
            dvid = dvid,
            dvpd = dvpd,
            dvst = dvst,
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
        StartCoroutine(CalculateAwavValues(awayTime));
    }

    private IEnumerator CalculateAwavValues(double awayTime)
    {
        return OfflineProgressSystem.CalculateAwayValues(awayTime, CreateOfflineProgressContext(), CreateOfflineProgressUi());
    }

    #endregion


    private void SetBotDistribution()
    {
        ProductionSystem.SetBotDistribution(dvid, dvpd, pp);
    }

    #region GoalManagment

    private void ManageGoal()
    {
        //var colorSkillTree = "<color=#FFA45E>";
        string colorSkillTree2 = "<color=#91DD8F>";
        skillTreePoints.text =
            $"Skill points: {colorSkillTree2}{dvst.skillPointsTree}</color>";
        string color = "<color=#91DD8F>";
        skillsText.text = oracle.saveSettings.skillsFirstRunDone
            ? "Skills"
            : "<align=\"center\"><sprite=4 color=#C8B3FF>";
        if (dvst.skillPointsTree > 0 || dvpd.permanentSkillPoint > 0 || dvpd.infinityPoints > 0 ||
            dvpd.spentInfinityPoints > 0)
        {
            skillsIcon.SetActive(true);
            if (SceneManager.GetActiveScene().buildIndex == 1) skillsToggle.SetActive(true);
            skillsButton[0].SetActive(!oracle.saveSettings.skillsButtonToggle);
            if (!oracle.saveSettings.skillsFirstRunDone) skillsButton[1].SetActive(true);
            oracle.saveSettings.skillsFirstRunDone = true;
            skillsMenubutton.interactable = true;
        }
        else if (dvst.skillPointsTree == 0 && dvpd.permanentSkillPoint == 0 && dvpd.infinityPoints == 0 &&
                 dvpd.spentInfinityPoints == 0 && !oracle.saveSettings.skillsFirstRunDone)
        {
            skillsIcon.SetActive(oracle.saveSettings.skillsFirstRunDone);
            skillsToggle.SetActive(false);
            skillsButton[0].SetActive(false);
            skillsMenubutton.interactable = false;
        }

        switch (dvid.goalSetter)
        {
            case 0:
            {
                goal.text = $"{color}Goal: Create {CalcUtils.FormatNumber(10)} Bots";
                SkillsFill.fillAmount = (float)dvid.bots / 10;
                if (dvid.bots >= 10)
                {
                    skillsfillbar.SetActive(true);
                    dvid.goalSetter = 1;
                    dvst.skillPointsTree += 1;
                    AssignSkills?.Invoke();
                    if (skillsMenubutton.interactable == false)
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
                SkillsFill.fillAmount = (float)(dvid.assemblyLines[1] / 5);
                if (dvid.assemblyLines[1] >= 5)
                {
                    dvid.goalSetter = 2;
                    dvst.skillPointsTree += 1;
                    AssignSkills?.Invoke();
                    UpdateSkills?.Invoke();
                    skillsfillbar.SetActive(true);
                }

                break;
            }
            case 2:
            {
                goal.text = $"{color}Goal: Have {CalcUtils.FormatNumber(20000)} active Panels";
                SkillsFill.fillAmount = (float)(dvid.panelsPerSec * dvid.panelLifetime / 20000);
                if (dvid.panelsPerSec * dvid.panelLifetime >= 20000)
                {
                    dvid.goalSetter = 3;
                    dvst.skillPointsTree += 1;
                    AssignSkills?.Invoke();
                    UpdateSkills?.Invoke();
                    skillsfillbar.SetActive(true);
                }

                break;
            }
            case 3:
            {
                goal.text = $"{color}Goal: Own {CalcUtils.FormatNumber(20)} Planets";
                SkillsFill.fillAmount =
                    (float)(dvid.planets[0] + (dvst.terraIrradiant ? dvid.planets[1] * 12 : dvid.planets[1]) / 20);
                if (dvid.planets[0] + (dvst.terraIrradiant ? dvid.planets[1] * 12 : dvid.planets[1]) >= 20)
                {
                    dvid.goalSetter = 4;
                    dvst.skillPointsTree += 1;
                    AssignSkills?.Invoke();
                    UpdateSkills?.Invoke();
                    skillsfillbar.SetActive(true);
                }

                break;
            }
            case 4:
            {
                goal.text = $"{color}Goal: {CalcUtils.FormatNumber(1000000000000)} total panels decayed";

                SkillsFill.fillAmount = (float)dvid.totalPanelsDecayed / 1000000000000;
                if (dvid.totalPanelsDecayed >= 1000000000000)
                {
                    dvid.goalSetter = 5;
                    dvst.skillPointsTree += 1;
                    AssignSkills?.Invoke();
                    UpdateSkills?.Invoke();
                    skillsfillbar.SetActive(true);
                }

                break;
            }
            case 5:
            {
                goal.text = $"{color}Goal: Surround {CalcUtils.FormatNumber(1000000000)} Stars";
                SkillsFill.fillAmount = (float)(dvid.panelsPerSec * dvid.panelLifetime / 20000 / 1000000000);
                if (dvid.panelsPerSec * dvid.panelLifetime / 20000 >= 1000000000)
                {
                    dvid.goalSetter = 6;
                    dvst.skillPointsTree += 1;
                    AssignSkills?.Invoke();
                    UpdateSkills?.Invoke();
                    skillsfillbar.SetActive(true);
                }

                break;
            }
            case 6:
            {
                goal.text = $"{color}Goal: Surround {CalcUtils.FormatNumber(10000000000)} Stars";
                SkillsFill.fillAmount = (float)(dvid.panelsPerSec * dvid.panelLifetime / 20000 / 10000000000);
                if (dvid.panelsPerSec * dvid.panelLifetime / 20000 >= 10000000000)
                {
                    dvid.goalSetter = 7;
                    dvst.skillPointsTree += 1;
                    AssignSkills?.Invoke();
                    UpdateSkills?.Invoke();
                    skillsfillbar.SetActive(true);
                }

                break;
            }
            case 7:
            {
                goal.text = $"{color}Goal: Engulf a Galaxy";
                SkillsFill.fillAmount = (float)(dvid.panelsPerSec * dvid.panelLifetime / 20000 / 100000000000 / 1);
                if (dvid.panelsPerSec * dvid.panelLifetime / 20000 / 100000000000 > 1)
                {
                    dvid.goalSetter = 8;
                    dvst.skillPointsTree += 1;
                    AssignSkills?.Invoke();
                    UpdateSkills?.Invoke();
                    skillsfillbar.SetActive(true);
                }

                break;
            }
            case 8:
            {
                goal.text = $"{color}Goal: Engulf {CalcUtils.FormatNumber(10)} Galaxies";
                SkillsFill.fillAmount = (float)(dvid.panelsPerSec * dvid.panelLifetime / 20000 / 100000000000 / 10);
                if (dvid.panelsPerSec * dvid.panelLifetime / 20000 / 100000000000 > 10)
                {
                    dvid.goalSetter = 9;
                    dvst.skillPointsTree += 1;
                    AssignSkills?.Invoke();
                    UpdateSkills?.Invoke();
                    skillsfillbar.SetActive(true);
                }

                break;
            }
            case 9:
            {
                goal.text = $"{color}Goal: Engulf {CalcUtils.FormatNumber(100)} Galaxies";
                SkillsFill.fillAmount = (float)(dvid.panelsPerSec * dvid.panelLifetime / 20000 / 100000000000 / 100);
                if (dvid.panelsPerSec * dvid.panelLifetime / 20000 / 100000000000 > 100)
                {
                    dvid.goalSetter = 10;
                    dvst.skillPointsTree += 1;
                    AssignSkills?.Invoke();
                    UpdateSkills?.Invoke();
                    skillsfillbar.SetActive(false);
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
        ProductionSystem.CalculatePlanetsPerSecond(dvid, dvst, Time.deltaTime);
    }

    private void CalculateShouldersSkills(double time)
    {
        ProductionSystem.CalculateShouldersSkills(dvid, dvst, time);
    }

    private void CalculatePlanetProduction()
    {
        ProductionSystem.CalculatePlanetProduction(dvid, dvst, dvpd, Time.deltaTime);
    }

    private void CalculateDataCenterProduction()
    {
        ProductionSystem.CalculateDataCenterProduction(dvid, dvst, Time.deltaTime);
    }

    private void CalculateServerProduction()
    {
        ProductionSystem.CalculateServerProduction(dvid, dvst, Time.deltaTime);
    }

    private void CalculateManagerProduction()
    {
        ProductionSystem.CalculateManagerProduction(dvid, dvst, Time.deltaTime);
    }

    private void CalculateAssemblyLineProduction()
    {
        ProductionSystem.CalculateAssemblyLineProduction(dvid, dvst, Time.deltaTime);
    }

    private void CalculatePanelsPerSec()
    {
        ProductionSystem.CalculatePanelsPerSec(dvid, dvst, Time.deltaTime);
    }

    private void CalculateScience()
    {
        ProductionSystem.CalculateScience(dvid, dvst, Time.deltaTime);
    }

    public double ScienceToAdd() =>
        ProductionSystem.ScienceToAdd(dvid, dvst);

    private void CalculateMoney()
    {
        ProductionSystem.CalculateMoney(dvid, dvst, Time.deltaTime);
    }

    public double MoneyToAdd() =>
        ProductionSystem.MoneyToAdd(dvid, dvst);

    #endregion

    #region UpdateTextFields

    private void UpdateTextFields()
    {
        string color = "<color=#FFA45E>";
        string Scolor = "<color=#00E1FF>";

        totalBots.text = $"Total Bots: {CalcUtils.FormatNumber(dvid.bots)}";

        //research FF5A6E
        researchPoints.text = $"<sprite=0>{CalcUtils.FormatNumber(dvid.science)}";
        sciencePerSec = CalcUtils.FormatNumber(ScienceToAdd());

        researchPerSec.text = $"<sprite=0>{sciencePerSec} /s";
        //cash
        cash.text = $"${CalcUtils.FormatNumber(dvid.money)}";
        cashPerSec.text =
            $"${CalcUtils.FormatNumber(MoneyToAdd())} /s";
        //workerPanels
        //solarStats
        if (dvid.panelsPerSec * dvid.panelLifetime < 20000)
            activePanels.text =
                $"Active panels: {color}{CalcUtils.FormatNumber(dvid.panelsPerSec * dvid.panelLifetime)}";
        else if (dvid.panelsPerSec * dvid.panelLifetime / 20000 < 100000000000)
            activePanels.text =
                $"Stars Surrounded: {color}{CalcUtils.FormatNumber(dvid.panelsPerSec * dvid.panelLifetime / 20000)}";
        else
            activePanels.text =
                $"Galaxies Engulfed: {color}{CalcUtils.FormatNumber(dvid.panelsPerSec * dvid.panelLifetime / 20000 / 100000000000)}";
        panelLifetime.text = $"Panel lifetime: {color}{CalcUtils.FormatNumber(dvid.panelLifetime)}</color> seconds";
        lifetimePanels.text =
            $"Total panels decayed: {color}{CalcUtils.FormatNumber(dvid.totalPanelsDecayed)}";
        //Lower panel
        string workers = CalcUtils.FormatNumber(dvid.workers);

        string bots = CalcUtils.FormatNumber(Math.Floor(dvid.bots));
        workerStats.text =
            $"{color}{workers}</color> Worker Bots producing {color}{CalcUtils.FormatNumber(dvid.panelsPerSec)}</color> Panels /s ";
        //researcherPanels
        string scientists = CalcUtils.FormatNumber(dvid.researchers);
        scienceStats.text =
            $"{Scolor}{scientists}</color> Science Bots producing {Scolor}{sciencePerSec}</color><sprite=0>/s ";
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
        if (dvpd.infinityPoints >= 1)
            if (!string.IsNullOrEmpty(dvsd.lastCollapseDate))
            {
                DateTime dateStarted = DateTime.Parse(dvsd.lastCollapseDate, CultureInfo.InvariantCulture);
                DateTime dateNow = DateTime.UtcNow;
                TimeSpan timespan = dateNow - dateStarted;
                double seconds = timespan.TotalSeconds;
                if (seconds < 0) seconds = 0;
                runAge.text = $"Run time: {CalcUtils.FormatTimeLarge(seconds)}";
            }

//serverProduction
        bool coldFusion = dvst.rudimentarySingularity && dvid.managers[0] + dvid.managers[1] > 0;
        serverProductionDisplay.SetActive(coldFusion);

        /*coldFusionText.gameObject.SetActive(coldFusion);
        if (dvst.rudimentarySingularity)
            coldFusionText.text =
                $"Rudimentary Singularity <color=#FFA45E>+{CalcUtils.FormatNumber(dvid.rudimentrySingularityProduction)} </color>";*/

        totalServerProduction.text =
            $"Server Production <color=#FFA45E>+{CalcUtils.FormatNumber(dvid.rudimentrySingularityProduction)}";
//planetsProduction
        bool sciproduction = dvid.researchers > 1 && dvst.scientificPlanets;
        bool displayPlanetProduction =
            sciproduction || dvst.stellarSacrifices || dvst.planetAssembly || dvst.shellWorlds;
        planetProductionDisplay.SetActive(displayPlanetProduction);

        string tempText = "";
        bool makeLineBreak = false;
        if (dvst.scientificPlanets)
        {
            tempText +=
                dvid.researchers > 1
                    ? $"Scientific Planets <color=#FFA45E>+{CalcUtils.FormatNumber(dvid.scientificPlanetsProduction)} </color>"
                    : "Scientific Planets <color=#FFA45E>+0 </color>";
            makeLineBreak = true;
        }

        if (dvst.stellarSacrifices)
        {
            if (makeLineBreak) tempText += "<br>";
            makeLineBreak = true;

            string tempTextCost = dvid.bots > StellarSacrificesRequiredBots() && StellarGalaxies() > 0
                ? $"<color=#FFA45E>{CalcUtils.FormatNumber(StellarGalaxies())}</color> Stellar Galaxies sacrificing <color=#FFA45E>{CalcUtils.FormatNumber(StellarSacrificesRequiredBots())}</color> Bots/s</color>"
                : dvid.bots < StellarSacrificesRequiredBots()
                    ? $"You need <color=#FFA45E>{CalcUtils.FormatNumber(StellarSacrificesRequiredBots())}</color> Bots"
                    : "You have <color=#FFA45E>0</color> Stellar Galaxies.";
            tempText +=
                $"Stellar Sacrifices: {tempTextCost}";
        }

        if (dvst.planetAssembly)
        {
            if (makeLineBreak) tempText += "<br>";
            makeLineBreak = true;
            tempText +=
                $"Planet Assembly <color=#FFA45E>+{CalcUtils.FormatNumber(dvid.planetAssemblyProduction)} </color>";
        }

        if (dvst.shellWorlds)
        {
            if (makeLineBreak) tempText += "<br>";
            makeLineBreak = true;
            tempText +=
                $"Shell Worlds <color=#FFA45E>+{CalcUtils.FormatNumber(dvid.shellWorldsProduction)} </color>";
        }

        /*planetProductionText.text = tempText;*/
        totalPlanetsProduction.text =
            $"Planet Production <color=#FFA45E>+{CalcUtils.FormatNumber(dvid.totalPlanetProduction)}";
//DataCenterProduction
        bool dcproduction = dvid.workers > 1 && dvst.pocketDimensions || dvst.pocketProtectors;

        dataCenterProductionDisplay.SetActive(dcproduction);


        string tempTextDataCenters = "";
        bool makeLineBreakDataCenters = false;
        if (dvst.pocketDimensions)
        {
            tempTextDataCenters +=
                dvid.workers > 1
                    ? $"Pocket Dimensions <color=#FFA45E>+{CalcUtils.FormatNumber(dvid.pocketDimensionsWithoutAnythingElseProduction)} </color>"
                    : "Pocket Dimensions <color=#FFA45E>+0 </color>";
            makeLineBreakDataCenters = true;
        }

        if (dvst.pocketProtectors)
        {
            if (makeLineBreakDataCenters) tempTextDataCenters += "<br>";
            makeLineBreakDataCenters = true;
            tempTextDataCenters += dvst.pocketMultiverse
                ? $"Pocket Multiverse <color=#FFA45E>+{CalcUtils.FormatNumber(dvid.pocketMultiverseProduction)} </color>"
                : $"Pocket Protectors <color=#FFA45E>+{CalcUtils.FormatNumber(dvid.pocketProtectorsProduction)} </color>";
        }

        double multiplier = dvid.pocketDimensionsWithoutAnythingElseProduction + (dvst.pocketMultiverse
            ? dvid.pocketMultiverseProduction
            : dvid.pocketProtectorsProduction);
        if (dvst.dimensionalCatCables)
        {
            multiplier *= 5;
            if (makeLineBreakDataCenters) tempTextDataCenters += "<br>";
            makeLineBreakDataCenters = true;
            tempTextDataCenters +=
                $"Dimensional CAT Cables <color=#FFA45E>* 5 <color=#91DD8F>= {CalcUtils.FormatNumber(multiplier)}</color></color>";
        }

        if (dvst.solarBubbles)
        {
            double math = 1 + 0.01 * dvid.panelLifetime;
            multiplier *= math;
            if (makeLineBreakDataCenters) tempTextDataCenters += "<br>";
            makeLineBreakDataCenters = true;
            tempTextDataCenters +=
                $"Solar Bubbles <color=#FFA45E>* {CalcUtils.FormatNumber(math)} <color=#91DD8F>= {CalcUtils.FormatNumber(multiplier)} </color></color>";
        }

        if (dvst.pocketAndroids)
        {
            double math = dvpd.pocketAndroidsTimer > 3564 ? 100 : 1 + dvpd.pocketAndroidsTimer / 36;
            multiplier *= math;
            if (makeLineBreakDataCenters) tempTextDataCenters += "<br>";
            makeLineBreakDataCenters = true;
            tempTextDataCenters +=
                $"Pocket Androids <color=#FFA45E>* {CalcUtils.FormatNumber(math)} <color=#91DD8F>= {CalcUtils.FormatNumber(multiplier)} </color></color>";
        }

        if (dvst.quantumComputing)
        {
            double math = dvid.quantumComputingProduction;
            multiplier *= math;
            if (makeLineBreakDataCenters) tempTextDataCenters += "<br>";
            makeLineBreakDataCenters = true;
            tempTextDataCenters +=
                $"Quantum Computing <color=#FFA45E>* {CalcUtils.FormatNumber(math)} <color=#91DD8F>= {CalcUtils.FormatNumber(multiplier)} </color></color>";
        }


        /*pocketDimensionsText.text = tempTextDataCenters;*/
        totalDataCenterText.text =
            $"Data Center Production <color=#FFA45E>+{CalcUtils.FormatNumber(dvid.pocketDimensionsProduction)}";

        string skilltimersText = "";

        skilltimersText += $"Cash Multiplier: {Scolor}{CalcUtils.FormatNumber(MoneyMultipliers())}</color>";
        skilltimersText +=
            $"<br>Research Multiplier: {Scolor}{CalcUtils.FormatNumber(ScienceMultipliers())}</color>";
        skilltimersText +=
            $"<br>Panel Lifetime: {Scolor}{CalcUtils.FormatNumber(dvid.panelLifetime)} s</color><br>";

        skilltimersText +=
            $"<br>Current Infinity Time: {Scolor}{CalcUtils.FormatTimeLarge(CurrentRunTime())}</color><br>";
        if (oracle.saveSettings.timeLastInfinity > 0)
            skilltimersText +=
                $"Last Infinity Time: {Scolor}{CalcUtils.FormatTimeLarge(oracle.saveSettings.timeLastInfinity)}</color><br>";
        if (oracle.saveSettings.lastInfinityPointsGained > 0)
        {
            double ipPerSec = oracle.saveSettings.lastInfinityPointsGained / oracle.saveSettings.timeLastInfinity;
            skilltimersText += ipPerSec >= 1
                ? $"IP/s: {Scolor}{CalcUtils.FormatNumber(ipPerSec)}</color><br>"
                : $"s/IP: {Scolor}{CalcUtils.FormatNumber(1 / ipPerSec)}</color><br>";
        }

        skilltimersText +=
            $"<br>Active Panels: {Scolor}{CalcUtils.FormatNumber(dvid.panelsPerSec * dvid.panelLifetime)}</color>";
        skilltimersText +=
            $"<br>Stars Surrounded: {Scolor}{CalcUtils.FormatNumber(StarsSurrounded(false, false))}</color>";
        skilltimersText +=
            $"<br>Galaxies Engulfed: {Scolor}{CalcUtils.FormatNumber(GalaxiesEngulfed(false, false))}</color><br>";

        if (dvst.androids)
            skilltimersText +=
                $"<br>Androids: {Scolor}{CalcUtils.FormatTimeLarge(dvpd.androidsSkillTimer >= 600 ? 600 : dvpd.androidsSkillTimer)}</color><br><size=80%>Granting: {Scolor}{CalcUtils.FormatNumber(Math.Floor(dvpd.androidsSkillTimer > 600 ? 200 : dvpd.androidsSkillTimer / 3))}s Lifetime</color>.<br></size>";

        if (dvst.pocketAndroids)
            skilltimersText +=
                $"<br>Pocket Androids: {Scolor}{CalcUtils.FormatTimeLarge(dvpd.pocketAndroidsTimer >= 3600 ? 3600 : dvpd.pocketAndroidsTimer)}</color><br><size=80%>Multiplying Data Center Production by: {Scolor}{CalcUtils.FormatNumber(dvpd.pocketAndroidsTimer > 3564 ? 100 : 1 + dvpd.pocketAndroidsTimer / 36)}</color>.<br></size>";

        if (dvst.superRadiantScattering)
            skilltimersText +=
                $"<br>Scattering: {Scolor}{CalcUtils.FormatTimeLarge(dvst.superRadiantScatteringTimer)}</color><br><size=80%>Multiplying All Production by: {Scolor}{CalcUtils.FormatNumber(1 + 0.01f * dvst.superRadiantScatteringTimer)}</color>.<br></size>";


        skillTimers.text = skilltimersText;
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
        ModifierSystem.SecretBuffs(dvid, dvpd, _secretBuffState);
    }


    public void UpdatePanelLifetime()
    {
        ModifierSystem.UpdatePanelLifetime(dvid, dvst, dvpd, pp);
    }

    private void UpdatePlanetMulti()
    {
        ModifierSystem.UpdatePlanetMulti(dvid, dvst, dvpd, pp, _secretBuffState, maxInfinityBuff);
    }

    private void UpdateDataCenterMulti()
    {
        ModifierSystem.UpdateDataCenterMulti(dvid, dvst, dvpd, pp, maxInfinityBuff);
    }

    private void UpdateServerMulti()
    {
        ModifierSystem.UpdateServerMulti(dvid, dvst, dvpd, pp, _secretBuffState, maxInfinityBuff);
    }

    private void UpdateManagerMulti()
    {
        ModifierSystem.UpdateManagerMulti(dvid, dvst, dvpd, pp, _secretBuffState, maxInfinityBuff);
    }

    private void UpdateAssemblyLineMulti()
    {
        ModifierSystem.UpdateAssemblyLineMulti(dvid, dvst, dvpd, pp, _secretBuffState, maxInfinityBuff);
    }

    private void UpdateSciencePerSec()
    {
        ModifierSystem.UpdateSciencePerSec(dvid, dvst, dvpd, pp, _secretBuffState);
    }

    private void UpdateMoneyPerSecMulti()
    {
        ModifierSystem.UpdateMoneyPerSecMulti(dvid, dvst, dvpd, pp, _secretBuffState);
    }

    #endregion

    #region CalculationFunctions

    private double StellarGalaxies()
    {
        double galaxiesEngulfed = ProductionMath.GalaxiesEngulfed(dvid, false, false, Time.deltaTime);
        return ProductionMath.StellarGalaxies(dvst, galaxiesEngulfed);
    }

    private double StellarSacrificesRequiredBots()
    {
        double starsSurrounded = ProductionMath.StarsSurrounded(dvid, false, false, Time.deltaTime);
        return ProductionMath.StellarSacrificesRequiredBots(dvst, starsSurrounded);
    }

    public double GalaxiesEngulfed(bool multipliedByDeltaTime = false, bool floored = true)
    {
        return ProductionMath.GalaxiesEngulfed(dvid, multipliedByDeltaTime, floored, Time.deltaTime);
    }

    public double StarsSurrounded(bool multipliedByDeltaTime = false, bool floored = true)
    {
        return ProductionMath.StarsSurrounded(dvid, multipliedByDeltaTime, floored, Time.deltaTime);
    }

    private double GlobalBuff()
    {
        return ModifierSystem.GlobalBuff(dvst, pp);
    }

    private double AmountForBuildingBoostAfterX()
    {
        return ProductionMath.AmountForBuildingBoostAfterX(dvst);
    }

    private double DivisionForBoostAfterX()
    {
        return ProductionMath.DivisionForBoostAfterX(dvst);
    }

    private double MoneyMultipliers()
    {
        return ModifierSystem.MoneyMultipliers(dvid, dvst, dvpd, pp, _secretBuffState);
    }

    private double ScienceMultipliers()
    {
        return ModifierSystem.ScienceMultipliers(dvid, dvst, dvpd, pp, _secretBuffState);
    }

    #endregion
}
