using System;
using System.Collections;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using Blindsided.Utilities;
using static Expansion.Oracle;

namespace Systems
{
    /*
     * OfflineProgressSystem
     * Purpose: Applies and simulates "away time" (offline/consumable time) progress for DysonVerse in fixed time steps.
     * Runs: Runtime (coroutines executed from GameManager when returning from idle or spending stored offline time).
     * Entry points:
     * - ApplyReturnValues(double, OfflineProgressContext, OfflineProgressUI): Updates saveSettings.offlineTime and UI text for "Welcome Back".
     * - CalculateAwayValues(double, OfflineProgressContext, OfflineProgressUI): Coroutine that advances production and resources, optionally updating UI.
     *
     * Interacts with:
     * - Expansion.Oracle (skill timers via AddSkillTimerSeconds; saveSettings via caller context)
     * - GameManager (creates context/UI; provides delegates like CalculateProduction, MoneyToAdd, etc.)
     * - ProductionSystem / other systems indirectly via GameManager delegates
     *
     * Change notes:
     * - Any changes to OfflineProgressContext fields/delegates require updating GameManager.CreateOfflineProgressContext().
     * - UI fields are optional; this system must not crash if return-screen UI is absent in a scene/prefab variant.
     */

    public sealed class OfflineProgressContext
    {
        public DysonVerseInfinityData infinityData;
        public DysonVersePrestigeData prestigeData;
        public DysonVerseSkillTreeData skillTreeData;
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

    /// <summary>
    /// Mutable accumulator for production totals during offline time processing.
    /// Passed by reference to <see cref="OfflineProgressSystem.ProcessTimeStep"/> so each
    /// tick (full-minute or remainder) adds to the running totals.
    /// </summary>
    internal struct OfflineAccumulator
    {
        public double planets;
        public double dataCenters;
        public double servers;
        public double managers;
        public double lines;
        public double bots;
        public double matrioshkaBrains;
        public double birchPlanets;
        public double galacticBrains;
        public double money;
        public double science;
        public double decayed;
    }

    public static class OfflineProgressSystem
    {
        private static bool ValidateContext(OfflineProgressContext context)
        {
            if (context == null)
            {
                Debug.LogError("OfflineProgressSystem: context is null.");
                return false;
            }

            if (context.infinityData == null || context.prestigeData == null || context.skillTreeData == null || context.saveSettings == null)
            {
                Debug.LogError(
                    "OfflineProgressSystem: missing required save references. " +
                    $"infinityData={(context.infinityData != null)}, prestigeData={(context.prestigeData != null)}, " +
                    $"skillTreeData={(context.skillTreeData != null)}, saveSettings={(context.saveSettings != null)}");
                return false;
            }

            if (context.SetBotDistribution == null ||
                context.CalculateShouldersSkills == null ||
                context.CalculateProduction == null ||
                context.MoneyToAdd == null ||
                context.ScienceToAdd == null)
            {
                Debug.LogError(
                    "OfflineProgressSystem: missing required delegates. " +
                    $"SetBotDistribution={(context.SetBotDistribution != null)}, " +
                    $"CalculateShouldersSkills={(context.CalculateShouldersSkills != null)}, " +
                    $"CalculateProduction={(context.CalculateProduction != null)}, " +
                    $"MoneyToAdd={(context.MoneyToAdd != null)}, ScienceToAdd={(context.ScienceToAdd != null)}");
                return false;
            }

            return true;
        }

        private static void EnsureArray2(ref double[] arr)
        {
            if (arr is { Length: >= 2 }) return;
            double a0 = 0;
            double a1 = 0;
            if (arr is { Length: 1 })
            {
                a0 = arr[0];
            }
            arr = new[] { a0, a1 };
        }

        private static void SanitizeInfinityData(DysonVerseInfinityData data)
        {
            if (data == null) return;

            // Older save versions or ES3 migrations can leave new arrays null; keep offline progression resilient.
            EnsureArray2(ref data.assemblyLines);
            EnsureArray2(ref data.managers);
            EnsureArray2(ref data.servers);
            EnsureArray2(ref data.dataCenters);
            EnsureArray2(ref data.planets);
            EnsureArray2(ref data.matrioshkaBrains);
            EnsureArray2(ref data.birchPlanets);
            EnsureArray2(ref data.galacticBrains);

            data.skillStateById ??= new System.Collections.Generic.Dictionary<string, SkillState>();
            data.skillOwnedById ??= new System.Collections.Generic.Dictionary<string, bool>();
            data.researchLevelsById ??= new System.Collections.Generic.Dictionary<string, double>();
        }

        /// <summary>
        /// Advances offline production for a single time step, accumulating results into <paramref name="acc"/>.
        /// Called once per minute in the main loop, then once more for the sub-minute remainder.
        /// </summary>
        private static void ProcessTimeStep(double seconds, OfflineProgressContext context, ref OfflineAccumulator acc)
        {
            if (context.skillTreeData.androids) AddSkillTimerSeconds(context.infinityData, "androids", seconds);
            if (context.skillTreeData.pocketAndroids) AddSkillTimerSeconds(context.infinityData, "pocketAndroids", seconds);

            // Mega-structures: process top-down (galactic → birch → matrioshka → planets)
            if (context.prestigeData.unlockedGalacticBrains)
            {
                double gb = context.infinityData.galacticBrainBirchProduction * seconds;
                acc.galacticBrains += gb;
                context.infinityData.birchPlanets[0] += gb;
                context.CalculateProduction();
            }

            if (context.prestigeData.unlockedBirchPlanets)
            {
                double bp = context.infinityData.birchPlanetMatrioshkaProduction * seconds;
                acc.birchPlanets += bp;
                context.infinityData.matrioshkaBrains[0] += bp;
                context.CalculateProduction();
            }

            if (context.prestigeData.unlockedMatrioshkaBrains)
            {
                double mb = context.infinityData.matrioshkaBrainPlanetProduction * seconds;
                acc.matrioshkaBrains += mb;
                context.infinityData.planets[0] += mb;
                context.CalculateProduction();
            }

            double p = context.infinityData.totalPlanetProduction * seconds;
            acc.planets += p;
            context.infinityData.planets[0] += p;
            context.CalculateShouldersSkills(seconds);
            context.CalculateProduction();

            double da = context.infinityData.dataCenterProduction * seconds;
            acc.dataCenters += da;
            context.infinityData.dataCenters[0] += da;
            context.CalculateProduction();

            double s = context.infinityData.serverProduction * seconds;
            acc.servers += s;
            context.infinityData.servers[0] += s;
            context.CalculateProduction();

            double m = context.infinityData.managerProduction * seconds;
            acc.managers += m;
            context.infinityData.managers[0] += m;
            context.CalculateProduction();

            double l = context.infinityData.assemblyLineProduction * seconds;
            acc.lines += l;
            context.infinityData.assemblyLines[0] += l;
            context.CalculateProduction();

            double b = context.infinityData.botProduction * seconds;
            acc.bots += b;
            context.infinityData.bots += b;
            context.CalculateProduction();

            context.SetBotDistribution();

            double mo = context.MoneyToAdd() * seconds;
            acc.money += mo;
            context.infinityData.money += mo;

            double sc = context.ScienceToAdd() * seconds;
            acc.science += sc;
            context.infinityData.science += sc;

            double d = context.infinityData.panelsPerSec * seconds;
            acc.decayed += d;
            context.infinityData.totalPanelsDecayed += d;
            context.CalculateProduction();
        }

        public static void ApplyReturnValues(double awayTime, OfflineProgressContext context, OfflineProgressUI ui)
        {
            if (!ValidateContext(context)) return;
            SanitizeInfinityData(context.infinityData);

            string color = "<color=#91DD8F>";
            string colorS = "<color=#00E1FF>";
            ui?.AwayForHeader?.gameObject.SetActive(true);
            if (ui?.AwayForHeader != null) ui.AwayForHeader.text = "Welcome Back!";
            ui?.ReturnScreen?.SetActive(awayTime >= 60 || awayTime < 0);
            ui?.OfflineTimeInstructions?.SetActive(true);
            if (awayTime < 0)
            {
                context.saveSettings.cheater = true;
                context.saveSettings.offlineTime = 0;
                context.saveSettings.maxOfflineTime = 0;
                string text = $"You were away for {color}{CalcUtils.FormatTimeLarge(awayTime)}</color>";
                text +=
                    "<br>You're probably cheating: Offline time disabled. <br>Please wipe your save to continue using offline time.";
                if (ui?.AwayFor != null) ui.AwayFor.text = text;
                return;
            }

            double calculatedAwayTime;
            if (awayTime >= context.saveSettings.maxOfflineTime - context.saveSettings.offlineTime)
            {
                calculatedAwayTime = context.saveSettings.maxOfflineTime - context.saveSettings.offlineTime;
                context.saveSettings.offlineTime = context.saveSettings.maxOfflineTime;
            }
            else
            {
                context.saveSettings.offlineTime += awayTime;
                calculatedAwayTime = awayTime;
            }

            string text1 = $"You gained {color}{CalcUtils.FormatTimeLarge(calculatedAwayTime)}</color> offline time ";
            text1 += $"<br>You have {colorS}{CalcUtils.FormatTimeLarge(context.saveSettings.offlineTime)}</color> stored";
            if (ui?.AwayFor != null) ui.AwayFor.text = text1;
            if (ui?.Amounts != null) ui.Amounts.text = "";
        }

        public static IEnumerator CalculateAwayValues(double awayTime, OfflineProgressContext context, OfflineProgressUI ui)
        {
            if (!ValidateContext(context)) yield break;
            SanitizeInfinityData(context.infinityData);

            string color = "<color=#91DD8F>";
            string colorS = "<color=#00E1FF>";
            ui?.AwayForHeader?.gameObject.SetActive(false);
            if (ui?.AwayFor != null) ui.AwayFor.text = $"Advanced {color}{CalcUtils.FormatTimeLarge(awayTime)}";

            long startingIP = context.prestigeData.infinityPoints;
            context.prestigeData.infinityPoints += context.saveSettings.lastInfinityPointsGained >= 1
                ? (long)Math.Floor(awayTime * context.saveSettings.lastInfinityPointsGained /
                                   context.saveSettings.timeLastInfinity / 10)
                : 0;

            if (context.skillTreeData.idleElectricSheep) awayTime *= 2;
            double remainder = awayTime % 60;
            double minutes = (awayTime - remainder) / 60;

            var acc = new OfflineAccumulator();

            if (minutes >= 1)
            {
                int sliderFill = 0;
                if (ui?.OfflineProgressLayoutElement != null) ui.OfflineProgressLayoutElement.minHeight = 7;
                ui?.ReturnScreenSliderParentGameObject?.SetActive(true);
                for (int i = 0; i < minutes; i++)
                {
                    ProcessTimeStep(60, context, ref acc);

                    sliderFill++;
                    if (ui?.ReturnScreenSlider != null)
                        ui.ReturnScreenSlider.fillAmount = (float)(sliderFill / minutes);

                    yield return 0;
                }
            }

            ProcessTimeStep(remainder, context, ref acc);
            yield return 0;

            string textBuilder = "";

            // Mega-structures (show if unlocked and produced any)
            if (context.prestigeData.unlockedGalacticBrains && acc.galacticBrains > 0)
                textBuilder +=
                    $"\nGalactic Brains produced {color}{CalcUtils.FormatNumber(acc.galacticBrains)}</color> Birch Planets";

            if (context.prestigeData.unlockedBirchPlanets && acc.birchPlanets > 0)
                textBuilder +=
                    $"\nBirch Planets produced {color}{CalcUtils.FormatNumber(acc.birchPlanets)}</color> Matrioshka Brains";

            if (context.prestigeData.unlockedMatrioshkaBrains && acc.matrioshkaBrains > 0)
                textBuilder +=
                    $"\nMatrioshka Brains produced {color}{CalcUtils.FormatNumber(acc.matrioshkaBrains)}</color> Planets";

            // Planets is the top of the standard facility chain, so both Planets and Data Centers
            // are shown once the player has any planets (intentional duplicate condition).
            if (context.infinityData.planets[0] + context.infinityData.planets[1] > 0)
                textBuilder +=
                    $"\nYou gained {color}{CalcUtils.FormatNumber(acc.planets)}</color> Planets ";

            if (context.infinityData.planets[0] + context.infinityData.planets[1] > 0)
                textBuilder +=
                    $"\nYou gained {color}{CalcUtils.FormatNumber(acc.dataCenters)}</color> Data Centers";

            if (context.infinityData.dataCenters[0] + context.infinityData.dataCenters[1] > 0)
                textBuilder +=
                    $"\nYou gained {color}{CalcUtils.FormatNumber(acc.servers)}</color> Servers";

            if (context.infinityData.servers[0] + context.infinityData.servers[1] > 0)
                textBuilder +=
                    $"\nYou gained {color}{CalcUtils.FormatNumber(acc.managers)}</color> Managers";

            if (context.infinityData.managers[0] + context.infinityData.managers[1] > 0)
                textBuilder +=
                    $"\nYou gained {color}{CalcUtils.FormatNumber(acc.lines)}</color> Assembly Lines";

            if (context.infinityData.assemblyLines[0] + context.infinityData.assemblyLines[1] > 0)
                textBuilder +=
                    $"\nYour assembly lines produced {color}{CalcUtils.FormatNumber(acc.bots)}</color> Bots";

            textBuilder +=
                $"\n\nYou earned {color}{CalcUtils.FormatNumber(acc.money)}</color> Cash";

            textBuilder +=
                $"\nYou earned {colorS}{CalcUtils.FormatNumber(acc.science)}</color> Research Points";

            textBuilder +=
                $"\n{colorS}{CalcUtils.FormatNumber(acc.decayed)}</color> Panels Decayed";

            if (context.prestigeData.infinityPoints > startingIP)
                textBuilder +=
                    $"<br>You gained: {colorS}{CalcUtils.FormatNumber(context.prestigeData.infinityPoints - startingIP)}</color> Infinity Points";

            textBuilder +=
                $"<br><br>{colorS}{CalcUtils.FormatTimeLarge(context.saveSettings.offlineTime)}</color> remaining";

            if (ui?.Amounts != null) ui.Amounts.text = textBuilder;

            if (ui?.OfflineProgressLayoutElement != null) ui.OfflineProgressLayoutElement.minHeight = 3;
            ui?.ReturnScreenSliderParentGameObject?.SetActive(false);
            ui?.OfflineTimeInstructions?.SetActive(false);
            ui?.ReturnScreen?.SetActive(true);
        }
    }
}
