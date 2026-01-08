using System;
using System.Collections;
using System.Globalization;
using CloudOnce;
using TMPro;
using Unity.Mathematics;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;
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
        InvokeRepeating(nameof(SubmitHighScores), 10, 10f);
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
        CalculateMoney();
        CalculateScience();
        CalculatePanelsPerSec();
        CalculateAssemblyLineProduction();
        CalculateManagerProduction();
        CalculateServerProduction();
        CalculateDataCenterProduction();
        CalculatePlanetProduction();
        CalculatePlanetsPerSecond();
        CalculateShouldersSkills(Time.deltaTime);
        if (dvst.androids) dvpd.androidsSkillTimer += Time.deltaTime;
        if (dvst.pocketAndroids) dvpd.pocketAndroidsTimer += Time.deltaTime;
        if (dvst.superRadiantScattering) dvst.superRadiantScatteringTimer += Time.deltaTime;
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

    private void SubmitHighScores()
    {
        if (dvid.goalSetter < 1) return;
        Achievements.tenbots.Unlock();
        if (dvid.goalSetter < 2) return;
        Achievements.fiveassemblylines.Unlock();
        if (dvid.goalSetter < 3) return;
        Achievements.twentykactivective.Unlock();
        if (dvid.goalSetter < 4) return;
        Achievements.twentyplanets.Unlock();
        if (dvid.goalSetter < 7) return;
        Achievements.surroundstarstenb.Unlock();
        if (dvid.goalSetter < 8) return;
        Achievements.engulfgalaxy.Unlock();
        if (dvid.goalSetter < 10) return;
        Achievements.galaxyonehundred.Unlock();
    }

    #endregion

    #region AwayTime

    public void ApplyReturnValues(double awayTime)
    {
        string color = "<color=#91DD8F>";
        string colorS = "<color=#00E1FF>";
        awayForHeader.gameObject.SetActive(true);
        awayForHeader.text = "Welcome Back!";
        returnScreen.SetActive(awayTime >= 60 || awayTime < 0);
        offlineTimeInstructions.SetActive(true);
        if (awayTime < 0)
        {
            oracle.saveSettings.cheater = true;
            oracle.saveSettings.offlineTime = 0;
            oracle.saveSettings.maxOfflineTime = 0;
            string text = $"You were away for {color}{CalcUtils.FormatTimeLarge(awayTime)}</color>";
            text +=
                "<br>You're probably cheating: Offline time disabled. <br>Please wipe your save to continue using offline time.";
            awayFor.text = text;
            return;
        }

        double calculatedAwayTime = 0f;
        switch (awayTime >= oracle.saveSettings.maxOfflineTime - oracle.saveSettings.offlineTime)
        {
            case true:
                calculatedAwayTime = oracle.saveSettings.maxOfflineTime - oracle.saveSettings.offlineTime;
                oracle.saveSettings.offlineTime = oracle.saveSettings.maxOfflineTime;
                break;
            case false:
                oracle.saveSettings.offlineTime += awayTime;
                calculatedAwayTime = awayTime;
                break;
        }

        string text1 = $"You gained {color}{CalcUtils.FormatTimeLarge(calculatedAwayTime)}</color> offline time ";
        text1 += $"<br>You have {colorS}{CalcUtils.FormatTimeLarge(oracle.saveSettings.offlineTime)}</color> stored";
        awayFor.text = text1;
        amounts.text = "";
    }

    public void RunAwayTime(double awayTime)
    {
        if (oracle.saveSettings.cheater) return;
        StartCoroutine(CalculateAwavValues(awayTime));
    }

    private IEnumerator CalculateAwavValues(double awayTime)
    {
        string color = "<color=#91DD8F>";
        string colorS = "<color=#00E1FF>";
        awayForHeader.gameObject.SetActive(false);
        awayFor.text = $"Advanced {color}{CalcUtils.FormatTimeLarge(awayTime)}";

        long startingIP = dvpd.infinityPoints;
        dvpd.infinityPoints += oracle.saveSettings.lastInfinityPointsGained >= 1 ? (long)Math.Floor(awayTime * oracle.saveSettings.lastInfinityPointsGained /
                                                                                                    oracle.saveSettings.timeLastInfinity / 10) : 0;

        if (dvst.idleElectricSheep) awayTime *= 2;
        double remainder = awayTime % 60;
        double minutes = (awayTime - remainder) / 60;

        double planets = 0;
        double dataCenters = 0;
        double servers = 0;
        double managers = 0;
        double lines = 0;
        double bots = 0;

        double money = 0;
        double science = 0;
        double decayed = 0;

        if (minutes >= 1)
        {
            int sliderFill = 0;
            offlineProgressLayoutElement.minHeight = 7;
            returnScreenSliderParentGameObject.SetActive(true);
            for (int i = 0; i < minutes; i++)
            {
                if (dvst.androids) dvpd.androidsSkillTimer += 60;
                if (dvst.pocketAndroids) dvpd.pocketAndroidsTimer += 60;


                double p = dvid.totalPlanetProduction * 60;
                planets += p;

                dvid.planets[0] += p;
                CalculateShouldersSkills(60);
                CalculateProduction();

                double da = dvid.dataCenterProduction * 60;
                dataCenters += da;
                dvid.dataCenters[0] += da;
                CalculateProduction();

                double s = dvid.serverProduction * 60;
                servers += s;
                dvid.servers[0] += s;
                CalculateProduction();

                double m = dvid.managerProduction * 60;
                managers += m;
                dvid.managers[0] += m;
                CalculateProduction();

                double l = dvid.assemblyLineProduction * 60;
                lines += l;
                dvid.assemblyLines[0] += l;
                CalculateProduction();

                double b = dvid.botProduction * 60;
                bots += b;

                dvid.bots += b;
                CalculateProduction();

                SetBotDistribution();

                double mo = MoneyToAdd() * 60;
                money += mo;
                dvid.money += mo;

                double sc = ScienceToAdd() * 60;
                science += sc;
                dvid.science += sc;

                double d = dvid.panelsPerSec * 60;
                decayed += d;
                dvid.totalPanelsDecayed += d;
                CalculateProduction();


                sliderFill++;
                returnScreenSlider.fillAmount = (float)(sliderFill / minutes);

                yield return 0;
            }
        }

        if (dvst.androids) dvpd.androidsSkillTimer += remainder;
        if (dvst.pocketAndroids) dvpd.pocketAndroidsTimer += remainder;


        double p1 = dvid.totalPlanetProduction * remainder;
        planets += p1;
        dvid.planets[0] += p1;
        CalculateShouldersSkills(remainder);
        CalculateProduction();

        double da1 = dvid.dataCenterProduction * remainder;
        dataCenters += da1;
        dvid.dataCenters[0] += da1;
        CalculateProduction();

        double s1 = dvid.serverProduction * remainder;
        servers += s1;
        dvid.servers[0] += s1;
        CalculateProduction();

        double m1 = dvid.managerProduction * remainder;
        managers += m1;
        dvid.managers[0] += m1;
        CalculateProduction();

        double l1 = dvid.assemblyLineProduction * remainder;
        lines += l1;
        dvid.assemblyLines[0] += l1;
        CalculateProduction();

        double b1 = dvid.botProduction * remainder;
        bots += b1;
        dvid.bots += b1;
        CalculateProduction();

        SetBotDistribution();

        double mo1 = MoneyToAdd() * remainder;
        money += mo1;
        dvid.money += mo1;

        double sc1 = ScienceToAdd() * remainder;
        science += sc1;
        dvid.science += sc1;

        double d1 = dvid.panelsPerSec * remainder;
        decayed += d1;
        dvid.totalPanelsDecayed += d1;

        yield return 0;

        string textBuilder = "";

        if (dvid.planets[0] + dvid.planets[1] > 0)
            textBuilder +=
                $"\nYou gained {color}{CalcUtils.FormatNumber(planets)}</color> Planets ";

        if (dvid.planets[0] + dvid.planets[1] > 0)
            textBuilder +=
                $"\nYou gained {color}{CalcUtils.FormatNumber(dataCenters)}</color> Data Centers";

        if (dvid.dataCenters[0] + dvid.dataCenters[1] > 0)
            textBuilder +=
                $"\nYou gained {color}{CalcUtils.FormatNumber(servers)}</color> Servers";

        if (dvid.servers[0] + dvid.servers[1] > 0)
            textBuilder +=
                $"\nYou gained {color}{CalcUtils.FormatNumber(managers)}</color> Managers";

        if (dvid.managers[0] + dvid.managers[1] > 0)
            textBuilder +=
                $"\nYou gained {color}{CalcUtils.FormatNumber(lines)}</color> Assembly Lines";

        if (dvid.assemblyLines[0] + dvid.assemblyLines[1] > 0)
            textBuilder +=
                $"\nYour assembly lines produced {color}{CalcUtils.FormatNumber(bots)}</color> Bots";

        textBuilder +=
            $"\n\nYou earned {color}{CalcUtils.FormatNumber(money)}</color> Cash";

        textBuilder +=
            $"\nYou earned {colorS}{CalcUtils.FormatNumber(science)}</color> Research Points";

        textBuilder +=
            $"\n{colorS}{CalcUtils.FormatNumber(decayed)}</color> Panels Decayed";

        if (dvpd.infinityPoints > startingIP)
            textBuilder +=
                $"<br>You gained: {colorS}{CalcUtils.FormatNumber(dvpd.infinityPoints - startingIP)}</color> Infinity Points";

        textBuilder +=
            $"<br><br>{colorS}{CalcUtils.FormatTimeLarge(oracle.saveSettings.offlineTime)}</color> remaining";

        amounts.text = textBuilder;

        offlineProgressLayoutElement.minHeight = 3;
        returnScreenSliderParentGameObject.SetActive(false);
        offlineTimeInstructions.SetActive(false);
        returnScreen.SetActive(true);
    }

    #endregion


    private void SetBotDistribution()
    {
        if (!oracle.saveSettings.prestigePlus.botMultitasking)
        {
            dvid.workers =
                Math.Ceiling(Math.Floor(dvid.bots) / 100f * ((1f - dvpd.botDistribution) * 100f));
            dvid.researchers =
                Math.Floor(Math.Floor(dvid.bots) / 100f * dvpd.botDistribution * 100f);
        }
        else
        {
            dvid.workers = dvid.bots;
            dvid.researchers = dvid.bots;
        }
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
        dvid.totalPlanetProduction = 0;
        dvid.scientificPlanetsProduction = dvid.researchers > 1 && dvst.scientificPlanets
            ? Math.Log10(dvid.researchers)
            : 0;
        if (dvst.hubbleTelescope)
            dvid.scientificPlanetsProduction *= 2f;
        if (dvst.jamesWebbTelescope)
            dvid.scientificPlanetsProduction *= 4f;
        dvid.scientificPlanetsProduction += dvst.terraformingProtocols ? dvst.fragments : 0;

        if (dvst.scientificPlanets) dvid.totalPlanetProduction += dvid.scientificPlanetsProduction;

        //Planet Assembly
        dvid.planetAssemblyProduction = dvst.planetAssembly && dvid.assemblyLines[0] + dvid.assemblyLines[1] >= 10
            ? Math.Log10(dvid.assemblyLines[0] + dvid.assemblyLines[1])
            : 0;
        if (dvst.planetAssembly)
            dvid.totalPlanetProduction += dvid.planetAssemblyProduction;
        //Shell Worlds
        dvid.shellWorldsProduction = dvst.planetAssembly && dvid.planets[0] + dvid.planets[1] >= 2
            ? Math.Log(dvid.planets[0] + dvid.planets[1], 2)
            : 0;
        if (dvst.shellWorlds)
            dvid.totalPlanetProduction += dvid.shellWorldsProduction;

        //StellarSacrifices


        dvid.stellarSacrificesProduction = dvst.stellarSacrifices && dvid.bots >= StellarSacrificesRequiredBots() &&
                                           StellarGalaxies() > 0
            ? StellarGalaxies()
            : 0;
        if (dvst.stellarSacrifices)
            dvid.totalPlanetProduction += dvid.stellarSacrificesProduction;


        //ApplyPlanetProduction
        dvid.planets[0] += dvid.totalPlanetProduction * Time.deltaTime;


        //Shoulders
        if (dvst.shouldersOfTheFallen && dvid.scienceBoostOwned > 0)
        {
            dvid.scientificPlanetsProduction += math.log2(dvid.scienceBoostOwned);
            if (dvst.shoulderSurgery) dvid.pocketDimensionsProduction += Math.Log(dvid.scienceBoostOwned, 2);
        }
    }

    private void CalculateShouldersSkills(double time)
    {
        if (dvst.shouldersOfGiants && dvst.scientificPlanets)
        {
            dvid.scienceBoostOwned += dvid.scientificPlanetsProduction * time;
            if (dvst.whatCouldHaveBeen) dvid.scienceBoostOwned += dvid.pocketDimensionsProduction * time;
        }

        if (dvst.shouldersOfTheEnlightened && dvst.scientificPlanets)
            dvid.moneyMultiUpgradeOwned += dvid.scientificPlanetsProduction * time;
    }

    private void CalculatePlanetProduction()
    {
        dvid.dataCenterProduction =
            (dvid.planets[0] + dvid.planets[1]) * .0002777777777777778f * dvid.planetModifier;
        if (dvst.rule34 && dvid.planets[1] >= 69) dvid.dataCenterProduction *= 2;
        if (dvst.superchargedPower) dvid.dataCenterProduction *= 1.5f;

        dvid.planetsDataCenterProduction = dvid.dataCenterProduction;

        //pocketDimensions
        double dataCenterProductionTemp = dvst.pocketDimensions && dvid.workers > 1
            ? Math.Log10(dvid.workers)
            : 0;
        dvid.pocketDimensionsWithoutAnythingElseProduction = dataCenterProductionTemp;

        if (dvst.pocketMultiverse)
        {
            double multiplyBy = 1;
            multiplyBy *= dvst.pocketDimensions && dvid.researchers > 1f
                ? Math.Log10(dvid.researchers)
                : 0;
            dvid.pocketMultiverseProduction = dvid.researchers > 0
                ? dataCenterProductionTemp * multiplyBy - dvid.pocketDimensionsWithoutAnythingElseProduction
                : 0;
            if (multiplyBy > 0) dataCenterProductionTemp *= multiplyBy;
        }
        else
        {
            double add = 0;
            if (dvst.pocketProtectors)
                add += dvst.pocketDimensions && dvid.researchers > 1f
                    ? Math.Log10(dvid.researchers)
                    : 0;
            dvid.pocketProtectorsProduction =
                dataCenterProductionTemp + add - dvid.pocketDimensionsWithoutAnythingElseProduction;

            dataCenterProductionTemp += add;
        }

        if (dvst.dimensionalCatCables) dataCenterProductionTemp *= 5;

        if (dvst.solarBubbles) dataCenterProductionTemp *= 1 + 0.01 * dvid.panelLifetime;

        if (dvst.pocketAndroids)
            dataCenterProductionTemp *=
                dvpd.pocketAndroidsTimer > 3564 ? 100 : 1 + dvpd.pocketAndroidsTimer / 36;

        if (dvst.quantumComputing)
        {
            double quantumMulti = 1 + (dvid.rudimentrySingularityProduction >= 1
                ? Math.Log(dvid.rudimentrySingularityProduction, 2)
                : 0);
            dvid.quantumComputingProduction = quantumMulti;
            dataCenterProductionTemp *= quantumMulti;
        }

        dvid.pocketDimensionsProduction = dataCenterProductionTemp;
        if (dvst.pocketDimensions) dvid.dataCenterProduction += dvid.pocketDimensionsProduction;

        dvid.dataCenters[0] += dvid.dataCenterProduction * Time.deltaTime;
    }

    private void CalculateDataCenterProduction()
    {
        dvid.serverProduction =
            (dvid.dataCenters[0] + dvid.dataCenters[1]) * 0.0011111111f * dvid.dataCenterModifier;
        if (dvst.rule34 && dvid.dataCenters[1] >= 69) dvid.serverProduction *= 2;
        if (dvst.superchargedPower) dvid.serverProduction *= 1.5f;
        dvid.dataCenterServerProduction = dvid.serverProduction;

        dvid.serverProduction += dvid.rudimentrySingularityProduction;
        dvid.servers[0] += dvst.parallelComputation && dvid.servers[0] + dvid.servers[1] > 1
            ? dvid.serverProduction * Time.deltaTime * 1 +
              0.1f * Math.Log(dvid.servers[0] + dvid.servers[1], 2)
            : dvid.serverProduction * Time.deltaTime;
    }

    private void CalculateServerProduction()
    {
        dvid.managerProduction =
            (dvid.servers[0] + dvid.servers[1]) * 0.0016666666666667f * dvid.serverModifier;
        if (dvst.rule34 && dvid.servers[1] >= 69) dvid.managerProduction *= 2;

        if (dvst.superchargedPower) dvid.managerProduction *= 1.5f;
        dvid.serverManagerProduction = dvid.managerProduction;

        dvid.managers[0] += dvid.managerProduction * Time.deltaTime;
    }

    private void CalculateManagerProduction()
    {
        dvid.assemblyLineProduction =
            (dvid.managers[0] + dvid.managers[1]) * 0.0166666666666667f * dvid.managerModifier;
        if (dvst.rule34 && dvid.managers[1] >= 69) dvid.assemblyLineProduction *= 2;

        if (dvst.superchargedPower) dvid.assemblyLineProduction *= 1.5f;

        double rudimentaryProduction = 0;
        if (dvst.rudimentarySingularity && dvid.assemblyLineProduction > 1)
            rudimentaryProduction = dvst.unsuspiciousAlgorithms
                ? 10 * Math.Pow(Math.Log(dvid.assemblyLineProduction, 2),
                    1 + Math.Log10(dvid.assemblyLineProduction) / 10)
                : Math.Pow(Math.Log(dvid.assemblyLineProduction, 2),
                    1 + Math.Log10(dvid.assemblyLineProduction) / 10);
        if (dvst.clusterNetworking)
            rudimentaryProduction *= 1 + (dvid.servers[0] + dvid.servers[1] > 1
                ? 0.05f * Math.Log10(dvid.servers[0] + dvid.servers[1])
                : 0);

        dvid.rudimentrySingularityProduction = rudimentaryProduction;
        dvid.managerAssemblyLineProduction = dvid.assemblyLineProduction;
        dvid.assemblyLines[0] += dvid.assemblyLineProduction * Time.deltaTime;
    }

    private void CalculateAssemblyLineProduction()
    {
        dvid.botProduction =
            (dvid.assemblyLines[0] + dvid.assemblyLines[1]) * 0.1f * dvid.assemblyLineModifier;
        if (dvst.stayingPower)
            dvid.botProduction *= 1 + 0.01f * dvid.panelLifetime;
        if (dvst.rule34 && dvid.assemblyLines[1] >= 69) dvid.botProduction *= 2;
        if (dvst.superchargedPower) dvid.botProduction *= 1.5f;
        dvid.assemblyLineBotProduction = dvid.botProduction;

        dvid.bots += dvid.botProduction * Time.deltaTime;

        //StellarSacrifices


        if (dvst.stellarSacrifices && dvid.bots >= StellarSacrificesRequiredBots() && StellarGalaxies() > 0)
            dvid.bots -= StellarSacrificesRequiredBots() * Time.deltaTime;
    }

    private void CalculatePanelsPerSec()
    {
        double panels = 1;
        double mult = dvid.panelsPerSecMulti;
        if (dvst.burnOut)
            mult *= 3;
        if (dvst.workerEfficiencyTree)
            panels = dvid.workers / 50 * mult;
        else
            panels = dvid.workers / 100 * mult;

        if (dvst.reapers && dvid.totalPanelsDecayed > 2)
            panels *= 1 + math.log2(dvid.totalPanelsDecayed) / 10;
        if (dvst.rocketMania && dvid.panelsPerSec > 20)
            panels *= Math.Log(dvid.panelsPerSec, 20);
        if (dvst.saren) panels *= 40;

        if (dvst.fusionReactors)
            panels *= 5f;
        dvid.panelsPerSec = panels;

        dvid.totalPanelsDecayed += dvid.panelsPerSec * Time.deltaTime;
    }

    private void CalculateScience()
    {
        dvid.science += ScienceToAdd() * Time.deltaTime;
    }

    public double ScienceToAdd() =>
        dvst.powerUnderwhelming
            ? Math.Pow(dvid.researchers * dvid.scienceMulti, 1.05)
            : dvid.researchers * dvid.scienceMulti;

    private void CalculateMoney()
    {
        dvid.money += MoneyToAdd() * Time.deltaTime;
    }

    public double MoneyToAdd() =>
        dvst.powerOverwhelming
            ? Math.Pow(dvid.panelsPerSec * dvid.panelLifetime * dvid.moneyMulti, 1.03)
            : dvid.panelsPerSec * dvid.panelLifetime * dvid.moneyMulti;

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

    private double _secretPlanetMulti = 1;
    private double _secretServerMulti = 1;
    private double _secretAIMulti = 1;
    private double _secretAssemblyMulti = 1;
    private double _secretCashMulti = 1;
    private double _secretScienceMulti = 1;

    private void SecretBuffs()
    {
        switch (dvpd.secretsOfTheUniverse)
        {
            case 27:
                _secretAIMulti = 42;
                goto case 26;
            case 26:
                _secretAIMulti = 3;
                goto case 25;
            case 25:
                _secretCashMulti = 8;
                goto case 24;
            case 24:
                _secretAIMulti = 2.5f;
                goto case 23;
            case 23:
                _secretAssemblyMulti = 7;
                goto case 22;
            case 22:
                _secretScienceMulti = 10;
                goto case 21;
            case 21:
                _secretServerMulti = 3;
                goto case 20;
            case 20:
                _secretServerMulti = 2;
                goto case 19;
            case 19:
                _secretCashMulti = 6;
                goto case 18;
            case 18:
                _secretPlanetMulti = 5;
                goto case 17;
            case 17:
                _secretPlanetMulti = 2;
                goto case 16;
            case 16:
                _secretAssemblyMulti = 2;
                goto case 15;
            case 15:
                _secretScienceMulti = 8;
                goto case 14;
            case 14:
                dvid.planetUpgradePercent = 0.09f;
                goto case 13;
            case 13:
                dvid.aiManagerUpgradePercent = 0.09f;
                goto case 12;
            case 12:
                dvid.assemblyLineUpgradePercent = 0.12f;
                goto case 11;
            case 11:
                _secretScienceMulti = 6;
                goto case 10;
            case 10:
                _secretScienceMulti = 4;
                goto case 9;
            case 9:
                dvid.serverUpgradePercent = 0.09f;
                goto case 8;
            case 8:
                _secretCashMulti = 4;
                goto case 7;
            case 7:
                dvid.planetUpgradePercent = 0.06f;
                goto case 6;
            case 6:
                _secretScienceMulti = 2;
                goto case 5;
            case 5:
                dvid.aiManagerUpgradePercent = 0.06f;
                goto case 4;
            case 4:
                dvid.assemblyLineUpgradePercent = 0.09f;
                goto case 3;
            case 3:
                dvid.serverUpgradePercent = 0.06f;
                goto case 2;
            case 2:
                _secretCashMulti = 2;
                goto case 1;
            case 1:
                dvid.assemblyLineUpgradePercent = 0.06f;
                break;
        }
    }


    public void UpdatePanelLifetime()
    {
        double lifetime = 10;
        if (dvid.panelLifetime1) lifetime += 1;
        if (dvid.panelLifetime2) lifetime += 2;
        if (dvid.panelLifetime3) lifetime += 3;
        if (dvid.panelLifetime4) lifetime += 4;
        if (dvst.panelMaintenance)
            lifetime += oracle.saveSettings.prestigePlus.botMultitasking ? 100 : (1 - dvpd.botDistribution) * 100;

        if (dvst.shepherd) lifetime += 600;

        if (dvst.citadelCouncil && dvid.totalPanelsDecayed > 1) lifetime += Math.Log(dvid.totalPanelsDecayed, 1.2);

        if (dvst.panelWarranty) lifetime += 5 * dvst.fragments > 1 ? Math.Pow(2, dvst.fragments - 1) : 1;

        if (dvst.panelLifetime20Tree) lifetime += 20;
        if (dvst.burnOut) lifetime -= 5;
        if (dvst.artificiallyEnhancedPanels && dvid.managers[0] + dvid.managers[1] >= 1)
            lifetime += 5 * Math.Log10(dvid.managers[0] + dvid.managers[1]);
        if (dvst.androids) lifetime += Math.Floor(dvpd.androidsSkillTimer > 600 ? 200 : dvpd.androidsSkillTimer / 3);
        //multipliers
        if (dvst.renewableEnergy && dvid.workers >= 1e7f) lifetime *= 1 + 0.1 * Math.Log10(dvid.workers / 1e6f);
        if (dvst.stellarDominance && dvid.bots > StellarSacrificesRequiredBots()) lifetime *= 10;
        //dividers
        if (dvst.worthySacrifice) lifetime /= 2;
        dvid.panelLifetime = lifetime;
    }

    private void UpdatePlanetMulti()
    {
        double boost1 = dvid.planetUpgradeOwned * dvid.planetUpgradePercent;
        double totalBoost = 1 + boost1;
        totalBoost *= GlobalBuff();
        if (dvst.planetsTree) totalBoost *= 2;
        if ((dvst.terraIrradiant ? dvid.planets[1] * 12 : dvid.planets[1]) >= 50 && !dvst.supernova) totalBoost *= 2;
        if ((dvst.terraIrradiant ? dvid.planets[1] * 12 : dvid.planets[1]) >= 100 && !dvst.supernova) totalBoost *= 2;
        if (dvst.fragmentAssembly && dvst.fragments > 4) totalBoost *= 3;

        if ((dvst.terraIrradiant ? dvid.planets[1] * 12 : dvid.planets[1]) > AmountForBuildingBoostAfterX() &&
            !dvst.supernova)
        {
            double perExtraBoost =
                ((dvst.terraIrradiant ? dvid.planets[1] * 12 : dvid.planets[1]) - AmountForBuildingBoostAfterX()) /
                DivisionForBoostAfterX();
            perExtraBoost += 1;
            totalBoost *= perExtraBoost;
        }

        if (dvst.galacticPradigmShift) totalBoost *= GalaxiesEngulfed() > 1 ? 3 : 1.5f;

        if (dvst.tasteOfPower) totalBoost *= 1.5f;
        if (dvst.indulgingInPower) totalBoost *= 2;
        if (dvst.addictionToPower) totalBoost *= 3f;

        if (dvst.dimensionalCatCables) totalBoost *= 0.75f;

        if (dvpd.infinityPoints >= 5) totalBoost *= 1 + Math.Clamp(dvpd.infinityPoints, 0f, maxInfinityBuff);
        totalBoost *= _secretPlanetMulti;

        //dividers
        if (dvst.endOfTheLine) totalBoost /= 2;
        if (dvst.agressiveAlgorithms) totalBoost /= 3;

        dvid.planetModifier = totalBoost;
    }

    private void UpdateDataCenterMulti()
    {
        double terraAmount = dvst.terraFirma
            ? dvid.dataCenters[1] + (dvst.terraIrradiant ? dvid.planets[1] * 12 : dvid.planets[1])
            : dvid.dataCenters[1];
        double boost1 = dvid.dataCenterUpgradeOwned * dvid.dataCenterUpgradePercent;
        double totalBoost = 1 + boost1;
        totalBoost *= GlobalBuff();
        if (dvst.dataCenterTree) totalBoost *= 2;
        if (terraAmount >= 50 && !dvst.supernova) totalBoost *= 2;
        if (terraAmount >= 100 && !dvst.supernova) totalBoost *= 2;
        if (dvst.fragmentAssembly && dvst.fragments > 4) totalBoost *= 3;

        if (terraAmount > AmountForBuildingBoostAfterX() && !dvst.supernova)
        {
            double perExtraBoost = (terraAmount - AmountForBuildingBoostAfterX()) / DivisionForBoostAfterX();
            perExtraBoost += 1;
            totalBoost *= perExtraBoost;
        }

        if (dvst.tasteOfPower) totalBoost *= 1.5f;
        if (dvst.indulgingInPower) totalBoost *= 2f;
        if (dvst.addictionToPower) totalBoost *= 3f;
        if (dvst.whatWillComeToPass) totalBoost *= 1 + 0.01 * dvid.dataCenters[1];
        if (dvst.hypercubeNetworks && dvid.servers[0] + dvid.servers[1] > 1)
            totalBoost *= 1 + 0.1f * Math.Log10(dvid.servers[0] + dvid.servers[1]);


        if (dvpd.infinityPoints >= 4) totalBoost *= 1 + Math.Clamp(dvpd.infinityPoints, 0f, maxInfinityBuff);

        if (dvst.agressiveAlgorithms) totalBoost /= 3;

        dvid.dataCenterModifier = totalBoost;
    }

    private void UpdateServerMulti()
    {
        double terraAmount = dvst.terraEculeo
            ? dvid.servers[1] + (dvst.terraIrradiant ? dvid.planets[1] * 12 : dvid.planets[1])
            : dvid.servers[1];
        double boost1 = dvid.serverUpgradeOwned * dvid.serverUpgradePercent;
        double totalBoost = 1 + boost1;
        totalBoost *= GlobalBuff();
        if (dvst.serverTree) totalBoost *= 2;
        if (terraAmount >= 50 && !dvst.supernova) totalBoost *= 2;
        if (terraAmount >= 100 && !dvst.supernova) totalBoost *= 2;
        if (dvst.fragmentAssembly && dvst.fragments > 4) totalBoost *= 3;

        if (terraAmount > AmountForBuildingBoostAfterX() && !dvst.supernova)
        {
            double perExtraBoost = (terraAmount - AmountForBuildingBoostAfterX()) / DivisionForBoostAfterX();
            perExtraBoost += 1;
            totalBoost *= perExtraBoost;
        }

        if (dvst.tasteOfPower) totalBoost *= 1.5f;
        if (dvst.indulgingInPower) totalBoost *= 2f;
        if (dvst.addictionToPower) totalBoost *= 3f;
        if (dvst.agressiveAlgorithms) totalBoost *= 3;

        if (dvst.clusterNetworking)
            totalBoost *= 1 + (dvid.servers[0] + dvid.servers[1] > 1
                ? 0.05f * Math.Log10(dvid.servers[0] + dvid.servers[1])
                : 0);

        if (dvpd.infinityPoints >= 3) totalBoost *= 1 + Math.Clamp(dvpd.infinityPoints, 0f, maxInfinityBuff);
        totalBoost *= _secretServerMulti;
        if (dvst.parallelProcessing && dvid.servers[0] + dvid.servers[1] > 1)
            totalBoost *= 1f + 0.05f * Math.Log(dvid.servers[0] + dvid.servers[1], 2);
        dvid.serverModifier = totalBoost;
    }

    private void UpdateManagerMulti()
    {
        double terraAmount = dvst.terraInfirma
            ? dvid.managers[1] + (dvst.terraIrradiant ? dvid.planets[1] * 12 : dvid.planets[1])
            : dvid.managers[1];
        double boost1 = dvid.aiManagerUpgradeOwned * dvid.aiManagerUpgradePercent;
        double totalBoost = 1 + boost1;
        totalBoost *= GlobalBuff();
        if (dvst.aiManagerTree) totalBoost *= 2;
        if (terraAmount >= 50 && !dvst.supernova) totalBoost *= 2;
        if (terraAmount >= 100 && !dvst.supernova) totalBoost *= 2;
        if (dvst.fragmentAssembly && dvst.fragments > 4) totalBoost *= 3;

        if (terraAmount > AmountForBuildingBoostAfterX() && !dvst.supernova)
        {
            double perExtraBoost = (terraAmount - AmountForBuildingBoostAfterX()) / DivisionForBoostAfterX();
            perExtraBoost += 1;
            totalBoost *= perExtraBoost;
        }

        if (dvst.tasteOfPower) totalBoost *= 1.5f;
        if (dvst.indulgingInPower) totalBoost *= 2f;
        if (dvst.addictionToPower) totalBoost *= 3f;
        if (dvst.agressiveAlgorithms) totalBoost *= 3;

        if (dvpd.infinityPoints >= 2) totalBoost *= 1 + Math.Clamp(dvpd.infinityPoints, 0f, maxInfinityBuff);
        totalBoost *= _secretAIMulti;

        dvid.managerModifier = totalBoost;
    }

    private void UpdateAssemblyLineMulti()
    {
        double terraAmount = dvst.terraNullius
            ? dvid.assemblyLines[1] + (dvst.terraIrradiant ? dvid.planets[1] * 12 : dvid.planets[1])
            : dvid.assemblyLines[1];

        double boost1 = dvid.assemblyLineUpgradeOwned * dvid.assemblyLineUpgradePercent;
        double totalBoost = 1 + boost1;
        totalBoost *= GlobalBuff();
        if (dvst.assemblyLineTree) totalBoost *= 2;
        if (terraAmount >= 50 && !dvst.supernova) totalBoost *= 2;
        if (terraAmount >= 100 && !dvst.supernova) totalBoost *= 2;
        if (dvst.fragmentAssembly && dvst.fragments > 4) totalBoost *= 3;
        if (dvst.worthySacrifice) totalBoost *= 2.5f;
        if (dvst.endOfTheLine) totalBoost *= 5;

        if (dvst.versatileProductionTactics)
            totalBoost *= dvid.planets[0] + (dvst.terraIrradiant ? dvid.planets[1] * 12 : dvid.planets[1]) >= 100
                ? 2
                : 1.5f;
        if (terraAmount > AmountForBuildingBoostAfterX() && !dvst.supernova)
        {
            double perExtraBoost = (terraAmount - AmountForBuildingBoostAfterX()) / DivisionForBoostAfterX();
            perExtraBoost += 1;
            totalBoost *= perExtraBoost;
        }

        if (dvst.oneMinutePlan) totalBoost *= dvid.panelLifetime > 60 ? 5 : 1.5f;
        if (dvst.progressiveAssembly) totalBoost *= 1 + 0.5f * dvst.fragments;

        if (dvst.tasteOfPower) totalBoost *= 1.5f;
        if (dvst.indulgingInPower) totalBoost *= 2f;
        if (dvst.addictionToPower) totalBoost *= 3f;
        if (dvst.agressiveAlgorithms) totalBoost *= 3;
        if (dvst.dysonSubsidies && StarsSurrounded() > 1) totalBoost *= 2;

        if (dvst.purityOfBody && dvst.skillPointsTree > 0) totalBoost *= 1.25f * dvst.skillPointsTree;

        totalBoost *= 1 + Math.Clamp(dvpd.infinityPoints, 0f, maxInfinityBuff);
        totalBoost *= _secretAssemblyMulti;

        dvid.assemblyLineModifier = totalBoost;
    }

    private void UpdateSciencePerSec()
    {
        dvid.scienceMulti = ScienceMultipliers();
    }

    private void UpdateMoneyPerSecMulti()
    {
        dvid.moneyMulti = dvst.shouldersOfPrecursors ? ScienceMultipliers() : MoneyMultipliers();
    }

    #endregion

    #region CalculationFunctions

    private double StellarGalaxies()
    {
        double stellarSacrificesGalaxies = GalaxiesEngulfed(false, false);
        if (dvst.stellarObliteration) stellarSacrificesGalaxies *= 1000;
        if (dvst.supernova) stellarSacrificesGalaxies *= 1000;

        double stellarSacAmount = stellarSacrificesGalaxies > 10
            ? Math.Pow(Math.Log10(stellarSacrificesGalaxies), 2)
            : stellarSacrificesGalaxies > 1
                ? Math.Log10(stellarSacrificesGalaxies)
                : 0;
        return stellarSacAmount;
    }

    private double StellarSacrificesRequiredBots()
    {
        double botsNeeded = dvst.supernova
            ? StarsSurrounded(false, false) * 1000000
            : dvst.stellarObliteration
                ? StarsSurrounded(false, false) * 1000
                : StarsSurrounded(false, false);

        if (botsNeeded < 1) botsNeeded = 1;
        if (dvst.stellarDominance) botsNeeded *= 100;
        if (dvst.stellarImprovements) botsNeeded /= 1000;
        return botsNeeded;
    }

    public double GalaxiesEngulfed(bool multipliedByDeltaTime = false, bool floored = true)
    {
        double engulfed;
        if (floored)
            engulfed = math.floor(dvid.panelsPerSec * dvid.panelLifetime / 20000 / 100000000000);
        else
            engulfed = dvid.panelsPerSec * dvid.panelLifetime / 20000 / 100000000000;
        if (multipliedByDeltaTime) return engulfed * Time.deltaTime;
        return engulfed;
    }

    public double StarsSurrounded(bool multipliedByDeltaTime = false, bool floored = true)
    {
        double surrounded;
        if (floored)
            surrounded = math.floor(dvid.panelsPerSec * dvid.panelLifetime / 20000);
        else
            surrounded = dvid.panelsPerSec * dvid.panelLifetime / 20000;
        if (multipliedByDeltaTime) return surrounded * Time.deltaTime;
        return surrounded;
    }

    private double GlobalBuff()
    {
        double multi = 1f;
        if (dvst.purityOfSEssence && dvst.skillPointsTree > 0) multi *= 1.42f * dvst.skillPointsTree;
        if (dvst.superRadiantScattering) multi *= 1 + 0.01f * dvst.superRadiantScatteringTimer;
        if (pp.avocatoPurchased)
        {
            if (pp.avocatoIP >= 10)
                multi *= Math.Log10(pp.avocatoIP);
            if (pp.avocatoInfluence >= 10)
                multi *= Math.Log10(pp.avocatoInfluence);
            if (pp.avocatoStrangeMatter >= 10)
                multi *= Math.Log10(pp.avocatoStrangeMatter);
            if (pp.avocatoOverflow >= 1)
                multi *= 1 + pp.avocatoOverflow;
        }

        return multi;
    }

    private double AmountForBuildingBoostAfterX()
    {
        int amountForBoost = dvst.productionScaling ? 90 : 100;

        return amountForBoost;
    }

    private double DivisionForBoostAfterX()
    {
        int value = dvst.superSwarm ? dvst.megaSwarm ? dvst.ultimateSwarm ? 20 : 100 / 3 : 50 : 100;


        return value;
    }

    private double MoneyMultipliers()
    {
        double moneyBoost = dvid.moneyMultiUpgradeOwned * dvid.moneyMultiUpgradePercent;
        if (dvst.regulatedAcademia) moneyBoost *= 1.02f + 1.01f * (dvst.fragments - 1);
        double totalBoost = 1 + moneyBoost;
        totalBoost *= GlobalBuff();
        if (dvst.startHereTree) totalBoost *= 1.2f;
        totalBoost *= 1 + oracle.saveSettings.prestigePlus.cash * 5 / 100;
        totalBoost *= _secretCashMulti;
        if (dvst.economicRevolution && dvpd.botDistribution <= .5f ||
            dvst.economicRevolution && oracle.saveSettings.prestigePlus.botMultitasking) totalBoost *= 5;
        if (dvst.superchargedPower) totalBoost *= 1.5f;
        if (dvst.higgsBoson && GalaxiesEngulfed() >= 1) totalBoost *= 1 + 0.1f * GalaxiesEngulfed();
        if (dvst.workerBoost)
        {
            if (!oracle.saveSettings.prestigePlus.botMultitasking)
                totalBoost *= (1f - dvpd.botDistribution) * 100f;
            else
                totalBoost *= 100;
        }

        if (dvst.economicDominance)
            totalBoost *= 20f;

        if (dvst.renegade) totalBoost *= 50f;

        if (dvst.shouldersOfTheRevolution) totalBoost *= 1 + 0.01f * dvid.scienceBoostOwned;
        if (dvst.dysonSubsidies && StarsSurrounded() < 1) totalBoost *= 3;

        if (dvst.purityOfMind && dvst.skillPointsTree > 0) totalBoost *= 1.5f * dvst.skillPointsTree;
        if (dvst.monetaryPolicy) totalBoost *= 1f + 0.75f * dvst.fragments;
        totalBoost *= dvst.tasteOfPower ? dvst.indulgingInPower ? dvst.addictionToPower ? 0.5f : 0.6f : 0.75f : 1;

        //Dividers
        if (dvst.stellarObliteration && GalaxiesEngulfed() >= 1) totalBoost /= GalaxiesEngulfed(false, false);
        if (dvst.fusionReactors)
            totalBoost *= 0.75f;
        if (dvst.coldFusion)
            totalBoost *= 0.5f;
        if (dvst.scientificDominance) totalBoost /= 4f;
        if (dvst.stellarDominance && dvid.bots > StellarSacrificesRequiredBots()) totalBoost /= 100;
        return totalBoost;
    }

    private double ScienceMultipliers()
    {
        double scienceBoost = dvid.scienceBoostOwned * dvid.scienceBoostPercent;
        if (dvst.regulatedAcademia) scienceBoost *= 1.02f + 1.01f * (dvst.fragments - 1);
        double totalBoost = 1 + scienceBoost;
        totalBoost *= GlobalBuff();
        if (dvst.doubleScienceTree) totalBoost *= 2;
        if (dvst.startHereTree) totalBoost *= 1.2f;
        if (dvst.producedAsScienceTree)
        {
            if (!oracle.saveSettings.prestigePlus.botMultitasking)
                totalBoost *= dvpd.botDistribution * 100;
            else
                totalBoost *= 100;
        }

        if (dvst.idleSpaceFlight)
            totalBoost += 0.01 * (dvid.panelsPerSec * dvid.panelLifetime) / 100000000;

        if (dvst.scientificRevolution && dvpd.botDistribution >= .5f ||
            dvst.scientificRevolution && oracle.saveSettings.prestigePlus.botMultitasking) totalBoost *= 5;
        if (dvst.superchargedPower) totalBoost *= 1.5;
        if (dvst.purityOfMind && dvst.skillPointsTree > 0) totalBoost *= 1.5 * dvst.skillPointsTree;
        totalBoost *= 1 + oracle.saveSettings.prestigePlus.science * 5 / 100;
        totalBoost *= _secretScienceMulti;
        if (dvst.coldFusion)
            totalBoost *= 10f;
        if (dvst.scientificDominance)
            totalBoost *= 20f;
        if (dvst.paragon) totalBoost *= 50f;
        totalBoost *= dvst.tasteOfPower ? dvst.indulgingInPower ? dvst.addictionToPower ? 0.5f : 0.6f : 0.75f : 1;

        //Dividers
        if (dvst.stellarObliteration && GalaxiesEngulfed() >= 1) totalBoost /= GalaxiesEngulfed(false, false);
        if (dvst.economicDominance) totalBoost /= 4f;

        return totalBoost;
    }

    #endregion
}