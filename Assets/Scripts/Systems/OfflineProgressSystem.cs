using System;
using System.Collections;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using static Expansion.Oracle;

namespace Systems
{
    public sealed class OfflineProgressContext
    {
        public DysonVerseInfinityData dvid;
        public DysonVersePrestigeData dvpd;
        public DysonVerseSkillTreeData dvst;
        public SaveDataSettings saveSettings;
        public Action SetBotDistribution;
        public Action<double> CalculateShouldersSkills;
        public Action CalculateProduction;
        public Func<double> MoneyToAdd;
        public Func<double> ScienceToAdd;
    }

    public sealed class OfflineProgressUI
    {
        public TMP_Text AwayForHeader;
        public TMP_Text AwayFor;
        public GameObject OfflineTimeInstructions;
        public LayoutElement OfflineProgressLayoutElement;
        public GameObject ReturnScreen;
        public SlicedFilledImage ReturnScreenSlider;
        public GameObject ReturnScreenSliderParentGameObject;
        public TMP_Text Amounts;
    }

    public static class OfflineProgressSystem
    {
        public static void ApplyReturnValues(double awayTime, OfflineProgressContext context, OfflineProgressUI ui)
        {
            string color = "<color=#91DD8F>";
            string colorS = "<color=#00E1FF>";
            ui.AwayForHeader.gameObject.SetActive(true);
            ui.AwayForHeader.text = "Welcome Back!";
            ui.ReturnScreen.SetActive(awayTime >= 60 || awayTime < 0);
            ui.OfflineTimeInstructions.SetActive(true);
            if (awayTime < 0)
            {
                context.saveSettings.cheater = true;
                context.saveSettings.offlineTime = 0;
                context.saveSettings.maxOfflineTime = 0;
                string text = $"You were away for {color}{CalcUtils.FormatTimeLarge(awayTime)}</color>";
                text +=
                    "<br>You're probably cheating: Offline time disabled. <br>Please wipe your save to continue using offline time.";
                ui.AwayFor.text = text;
                return;
            }

            double calculatedAwayTime = 0f;
            switch (awayTime >= context.saveSettings.maxOfflineTime - context.saveSettings.offlineTime)
            {
                case true:
                    calculatedAwayTime = context.saveSettings.maxOfflineTime - context.saveSettings.offlineTime;
                    context.saveSettings.offlineTime = context.saveSettings.maxOfflineTime;
                    break;
                case false:
                    context.saveSettings.offlineTime += awayTime;
                    calculatedAwayTime = awayTime;
                    break;
            }

            string text1 = $"You gained {color}{CalcUtils.FormatTimeLarge(calculatedAwayTime)}</color> offline time ";
            text1 += $"<br>You have {colorS}{CalcUtils.FormatTimeLarge(context.saveSettings.offlineTime)}</color> stored";
            ui.AwayFor.text = text1;
            ui.Amounts.text = "";
        }

        public static IEnumerator CalculateAwayValues(double awayTime, OfflineProgressContext context, OfflineProgressUI ui)
        {
            string color = "<color=#91DD8F>";
            string colorS = "<color=#00E1FF>";
            ui.AwayForHeader.gameObject.SetActive(false);
            ui.AwayFor.text = $"Advanced {color}{CalcUtils.FormatTimeLarge(awayTime)}";

            long startingIP = context.dvpd.infinityPoints;
            context.dvpd.infinityPoints += context.saveSettings.lastInfinityPointsGained >= 1
                ? (long)Math.Floor(awayTime * context.saveSettings.lastInfinityPointsGained /
                                   context.saveSettings.timeLastInfinity / 10)
                : 0;

            if (context.dvst.idleElectricSheep) awayTime *= 2;
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
                ui.OfflineProgressLayoutElement.minHeight = 7;
                ui.ReturnScreenSliderParentGameObject.SetActive(true);
                for (int i = 0; i < minutes; i++)
                {
                    if (context.dvst.androids) context.dvpd.androidsSkillTimer += 60;
                    if (context.dvst.pocketAndroids) context.dvpd.pocketAndroidsTimer += 60;


                    double p = context.dvid.totalPlanetProduction * 60;
                    planets += p;

                    context.dvid.planets[0] += p;
                    context.CalculateShouldersSkills(60);
                    context.CalculateProduction();

                    double da = context.dvid.dataCenterProduction * 60;
                    dataCenters += da;
                    context.dvid.dataCenters[0] += da;
                    context.CalculateProduction();

                    double s = context.dvid.serverProduction * 60;
                    servers += s;
                    context.dvid.servers[0] += s;
                    context.CalculateProduction();

                    double m = context.dvid.managerProduction * 60;
                    managers += m;
                    context.dvid.managers[0] += m;
                    context.CalculateProduction();

                    double l = context.dvid.assemblyLineProduction * 60;
                    lines += l;
                    context.dvid.assemblyLines[0] += l;
                    context.CalculateProduction();

                    double b = context.dvid.botProduction * 60;
                    bots += b;

                    context.dvid.bots += b;
                    context.CalculateProduction();

                    context.SetBotDistribution();

                    double mo = context.MoneyToAdd() * 60;
                    money += mo;
                    context.dvid.money += mo;

                    double sc = context.ScienceToAdd() * 60;
                    science += sc;
                    context.dvid.science += sc;

                    double d = context.dvid.panelsPerSec * 60;
                    decayed += d;
                    context.dvid.totalPanelsDecayed += d;
                    context.CalculateProduction();


                    sliderFill++;
                    ui.ReturnScreenSlider.fillAmount = (float)(sliderFill / minutes);

                    yield return 0;
                }
            }

            if (context.dvst.androids) context.dvpd.androidsSkillTimer += remainder;
            if (context.dvst.pocketAndroids) context.dvpd.pocketAndroidsTimer += remainder;


            double p1 = context.dvid.totalPlanetProduction * remainder;
            planets += p1;
            context.dvid.planets[0] += p1;
            context.CalculateShouldersSkills(remainder);
            context.CalculateProduction();

            double da1 = context.dvid.dataCenterProduction * remainder;
            dataCenters += da1;
            context.dvid.dataCenters[0] += da1;
            context.CalculateProduction();

            double s1 = context.dvid.serverProduction * remainder;
            servers += s1;
            context.dvid.servers[0] += s1;
            context.CalculateProduction();

            double m1 = context.dvid.managerProduction * remainder;
            managers += m1;
            context.dvid.managers[0] += m1;
            context.CalculateProduction();

            double l1 = context.dvid.assemblyLineProduction * remainder;
            lines += l1;
            context.dvid.assemblyLines[0] += l1;
            context.CalculateProduction();

            double b1 = context.dvid.botProduction * remainder;
            bots += b1;
            context.dvid.bots += b1;
            context.CalculateProduction();

            context.SetBotDistribution();

            double mo1 = context.MoneyToAdd() * remainder;
            money += mo1;
            context.dvid.money += mo1;

            double sc1 = context.ScienceToAdd() * remainder;
            science += sc1;
            context.dvid.science += sc1;

            double d1 = context.dvid.panelsPerSec * remainder;
            decayed += d1;
            context.dvid.totalPanelsDecayed += d1;
            yield return 0;

            string textBuilder = "";

            if (context.dvid.planets[0] + context.dvid.planets[1] > 0)
                textBuilder +=
                    $"\nYou gained {color}{CalcUtils.FormatNumber(planets)}</color> Planets ";

            if (context.dvid.planets[0] + context.dvid.planets[1] > 0)
                textBuilder +=
                    $"\nYou gained {color}{CalcUtils.FormatNumber(dataCenters)}</color> Data Centers";

            if (context.dvid.dataCenters[0] + context.dvid.dataCenters[1] > 0)
                textBuilder +=
                    $"\nYou gained {color}{CalcUtils.FormatNumber(servers)}</color> Servers";

            if (context.dvid.servers[0] + context.dvid.servers[1] > 0)
                textBuilder +=
                    $"\nYou gained {color}{CalcUtils.FormatNumber(managers)}</color> Managers";

            if (context.dvid.managers[0] + context.dvid.managers[1] > 0)
                textBuilder +=
                    $"\nYou gained {color}{CalcUtils.FormatNumber(lines)}</color> Assembly Lines";

            if (context.dvid.assemblyLines[0] + context.dvid.assemblyLines[1] > 0)
                textBuilder +=
                    $"\nYour assembly lines produced {color}{CalcUtils.FormatNumber(bots)}</color> Bots";

            textBuilder +=
                $"\n\nYou earned {color}{CalcUtils.FormatNumber(money)}</color> Cash";

            textBuilder +=
                $"\nYou earned {colorS}{CalcUtils.FormatNumber(science)}</color> Research Points";

            textBuilder +=
                $"\n{colorS}{CalcUtils.FormatNumber(decayed)}</color> Panels Decayed";

            if (context.dvpd.infinityPoints > startingIP)
                textBuilder +=
                    $"<br>You gained: {colorS}{CalcUtils.FormatNumber(context.dvpd.infinityPoints - startingIP)}</color> Infinity Points";

            textBuilder +=
                $"<br><br>{colorS}{CalcUtils.FormatTimeLarge(context.saveSettings.offlineTime)}</color> remaining";

            ui.Amounts.text = textBuilder;

            ui.OfflineProgressLayoutElement.minHeight = 3;
            ui.ReturnScreenSliderParentGameObject.SetActive(false);
            ui.OfflineTimeInstructions.SetActive(false);
            ui.ReturnScreen.SetActive(true);
        }
    }
}
