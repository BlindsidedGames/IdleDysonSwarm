using System;
using System.Collections;
using Stopwatch = System.Diagnostics.Stopwatch;
using System.Globalization;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using Blindsided.Utilities;
using Systems.Debugging;
using Systems.Skills;
using Systems.Numeric;
using Systems.Simulation;
using static Expansion.Oracle;

namespace Systems
{
    /*
     * OfflineProgressSystem
     * Purpose: Applies and simulates "away time" (offline/consumable time) progress for DysonVerse in fixed time steps.
     * Runs: Runtime (coroutines executed from GameManager when returning from idle or spending stored offline time).
     * Diagnostics: emits a single tagged warning in ApplyReturnValues for each return grant.
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
        public PrestigePlus prestigePlus;
        public SaveDataSettings saveSettings;
        public Action SetBotDistribution;
        public Action<double> CalculateShouldersSkills;
        public Action CalculateProduction;
        public Func<double> MoneyToAdd;
        public Func<double> ScienceToAdd;
        /// <summary>
        /// Optional offline automation phase. The runtime binding uses one deterministic
        /// Buy Max attempt per enabled target. Tests and non-gameplay callers may omit it.
        /// </summary>
        public Action RunAutomationTick;
        /// <summary>
        /// Canonical whole-game 0.1-second tick. Runtime supplies Dyson and Dream
        /// production, forced Buy Max automation, timer synchronization, Double Time,
        /// and reset evaluation in the same order as active play.
        /// </summary>
        public Action RunCanonicalWholeGameTick;
        public Action<double> RunCanonicalWholeGameRemainder;
        /// <summary>
        /// Attempts a verified analytical interval and returns the exact number of
        /// canonical ticks consumed. Returning zero selects the time-sliced fallback.
        /// </summary>
        public Func<long, long> RunAnalyticalTicks;
        /// <summary>
        /// Preferred shared event-time path. The returned result may yield with
        /// unconsumed simulated time and is safe to resume.
        /// </summary>
        public Func<double, SimulationAdvanceResult> RunUnifiedSimulation;
        /// <summary>
        /// Reconciles partition-independent clocks after the full requested
        /// interval has completed. It is not called for cancellation or an
        /// invalid/no-progress exit.
        /// </summary>
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

    internal readonly struct OfflineStateSnapshot
    {
        public OfflineStateSnapshot(DysonVerseInfinityData data)
        {
            planets = data.planets[0];
            dataCenters = data.dataCenters[0];
            servers = data.servers[0];
            managers = data.managers[0];
            lines = data.assemblyLines[0];
            bots = data.bots;
            matrioshkaBrains = data.matrioshkaBrains[0];
            birchPlanets = data.birchPlanets[0];
            galacticBrains = data.galacticBrains[0];
            money = data.money;
            science = data.science;
            decayed = data.totalPanelsDecayed;
        }

        public readonly double planets;
        public readonly double dataCenters;
        public readonly double servers;
        public readonly double managers;
        public readonly double lines;
        public readonly double bots;
        public readonly double matrioshkaBrains;
        public readonly double birchPlanets;
        public readonly double galacticBrains;
        public readonly double money;
        public readonly double science;
        public readonly double decayed;
    }

    public static class OfflineProgressSystem
    {
        public static SimulationWorkMetrics LastSimulationWorkMetrics
        {
            get;
            private set;
        } = new();
        public static double LastMaximumSimulationSliceMilliseconds
        {
            get;
            private set;
        }

        private const double SimulationTickSeconds = 0.1d;
        private const double DefaultStoredTimeCapacitySeconds = 86400d;
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

            context.prestigePlus ??= context.saveSettings.prestigePlus ?? new PrestigePlus();

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
            data.researchProgressById ??= new System.Collections.Generic.Dictionary<string, double>();
        }

        /// <summary>
        /// Advances offline production for one canonical simulation tick, accumulating
        /// results into <paramref name="acc"/>.
        /// </summary>
        private static void ProcessTimeStep(
            double seconds,
            OfflineProgressContext context,
            ref OfflineAccumulator acc,
            bool runAutomation = true)
        {
            DysonVerseInfinityData data = context.infinityData;
            double beforePlanets = data.planets[0];
            double beforeDataCenters = data.dataCenters[0];
            double beforeServers = data.servers[0];
            double beforeManagers = data.managers[0];
            double beforeLines = data.assemblyLines[0];
            double beforeBots = data.bots;
            double beforeMatrioshka = data.matrioshkaBrains[0];
            double beforeBirch = data.birchPlanets[0];
            double beforeGalactic = data.galacticBrains[0];
            double beforeMoney = data.money;
            double beforeScience = data.science;
            double beforeDecayed = data.totalPanelsDecayed;

            bool canonicalWholeTick =
                runAutomation &&
                Math.Abs(seconds - SimulationTickSeconds) <= SimulationTickSeconds * 1e-9d &&
                context.RunCanonicalWholeGameTick != null;
            if (canonicalWholeTick)
            {
                context.RunCanonicalWholeGameTick();
            }
            else if (!runAutomation &&
                     seconds > 0d &&
                     seconds < SimulationTickSeconds &&
                     context.RunCanonicalWholeGameRemainder != null)
            {
                context.RunCanonicalWholeGameRemainder(seconds);
            }
            else
            {
                context.SetBotDistribution();
                ProductionSystem.CalculateProduction(
                    data,
                    context.skillTreeData,
                    context.prestigeData,
                    context.prestigePlus,
                    seconds,
                    recomputeDerivedState: false);
                if (runAutomation)
                    context.RunAutomationTick?.Invoke();
                ProductionSystem.RecalculateDerivedState(
                    data,
                    context.skillTreeData,
                    context.prestigeData,
                    context.prestigePlus);
            }

            acc.planets += Math.Max(0d, data.planets[0] - beforePlanets);
            acc.dataCenters += Math.Max(0d, data.dataCenters[0] - beforeDataCenters);
            acc.servers += Math.Max(0d, data.servers[0] - beforeServers);
            acc.managers += Math.Max(0d, data.managers[0] - beforeManagers);
            acc.lines += Math.Max(0d, data.assemblyLines[0] - beforeLines);
            acc.bots += Math.Max(0d, data.bots - beforeBots);
            acc.matrioshkaBrains += Math.Max(0d, data.matrioshkaBrains[0] - beforeMatrioshka);
            acc.birchPlanets += Math.Max(0d, data.birchPlanets[0] - beforeBirch);
            acc.galacticBrains += Math.Max(0d, data.galacticBrains[0] - beforeGalactic);
            acc.money += Math.Max(0d, data.money - beforeMoney);
            acc.science += Math.Max(0d, data.science - beforeScience);
            acc.decayed += Math.Max(0d, data.totalPanelsDecayed - beforeDecayed);
        }

        public static void ApplyReturnValues(double awayTime, OfflineProgressContext context, OfflineProgressUI ui)
        {
            if (!ValidateContext(context)) return;
            SanitizeInfinityData(context.infinityData);
            if (!NumericSafety.IsFinite(context.saveSettings.maxOfflineTime) ||
                context.saveSettings.maxOfflineTime <= 0d)
            {
                context.saveSettings.maxOfflineTime = DefaultStoredTimeCapacitySeconds;
                NumericDiagnostics.Report("NS-OFFLINE-CAP", "source=apply_return");
            }

            double effectiveCapacity = Math.Min(
                context.saveSettings.maxOfflineTime,
                NumericSafety.StoredTimeMaximumSeconds);
            if (double.IsPositiveInfinity(context.saveSettings.offlineTime))
            {
                context.saveSettings.offlineTime = effectiveCapacity;
                context.saveSettings.cheater = true;
                NumericDiagnostics.Report("NS-OFFLINE-BANK-CAP", "source=apply_return");
            }
            else if (!NumericSafety.IsFinite(context.saveSettings.offlineTime) ||
                     context.saveSettings.offlineTime < 0d)
            {
                context.saveSettings.offlineTime = 0d;
                NumericDiagnostics.Report("NS-OFFLINE-BANK", "source=apply_return");
            }
            else if (context.saveSettings.offlineTime > effectiveCapacity)
            {
                bool exceedsGlobalCap =
                    context.saveSettings.offlineTime > NumericSafety.StoredTimeMaximumSeconds;
                context.saveSettings.offlineTime = effectiveCapacity;
                if (exceedsGlobalCap) context.saveSettings.cheater = true;
            }

            double beforeOfflineTime = context.saveSettings.offlineTime;
            bool capApplied = false;
            double calculatedAwayTime;
            string result = "ok";

            string color = "<color=#91DD8F>";
            string colorS = "<color=#00E1FF>";
            ui?.AwayForHeader?.gameObject.SetActive(true);
            if (ui?.AwayForHeader != null) ui.AwayForHeader.text = "Welcome Back!";
            ui?.ReturnScreen?.SetActive(awayTime >= 120 || awayTime < 0);
            ui?.OfflineTimeInstructions?.SetActive(true);
            if (!NumericSafety.IsFinite(awayTime))
            {
                result = "invalid_duration_zero_grant";
                awayTime = 0d;
                NumericDiagnostics.Report("NS-OFFLINE-DURATION", "source=apply_return");
            }
            if (awayTime < 0)
            {
                result = "backward_clock_zero_grant";
                context.saveSettings.cheater = true;
                awayTime = 0d;
                NumericDiagnostics.Report("NS-CLOCK-BACKWARD", "source=offline_progress");
                string text = "The device clock moved backward. No stored time was granted for this interval.";
                if (ui?.AwayFor != null) ui.AwayFor.text = text;
                Debug.LogWarning(
                    "[OfflineTimeDiag] ApplyReturnValues | " +
                    $"platform={Application.platform}, " +
                    $"result={result}, awayRaw={awayTime.ToString("F3", CultureInfo.InvariantCulture)}, " +
                    $"beforeOfflineTime={beforeOfflineTime.ToString(CultureInfo.InvariantCulture)}, " +
                    $"afterOfflineTime={context.saveSettings.offlineTime.ToString(CultureInfo.InvariantCulture)}, " +
                    $"maxOfflineTime={context.saveSettings.maxOfflineTime.ToString(CultureInfo.InvariantCulture)}");
            }

            double capacity = effectiveCapacity;
            double availableCapacity = Math.Max(0d, capacity - context.saveSettings.offlineTime);
            if (awayTime >= availableCapacity)
            {
                calculatedAwayTime = availableCapacity;
                context.saveSettings.offlineTime = capacity;
                capApplied = true;
            }
            else
            {
                context.saveSettings.offlineTime =
                    NumericSafety.Add(context.saveSettings.offlineTime, awayTime).Value;
                calculatedAwayTime = awayTime;
            }

            SaveDataPrestige dreamPrestige = context.saveSettings.sdPrestige;
            if (dreamPrestige != null)
            {
                double currentDreamBank = NumericSafety.ClampContinuous(dreamPrestige.doubleTime);
                dreamPrestige.doubleTime = Math.Min(
                    NumericSafety.StoredTimeMaximumSeconds,
                    NumericSafety.Add(currentDreamBank, calculatedAwayTime).Value);
            }

            string text1 = $"You gained {color}{CalcUtils.FormatTimeLarge(calculatedAwayTime)}</color> offline time ";
            text1 += $"<br>You have {colorS}{CalcUtils.FormatTimeLarge(context.saveSettings.offlineTime)}</color> stored";
            if (ui?.AwayFor != null) ui.AwayFor.text = text1;
            if (ui?.Amounts != null) ui.Amounts.text = "";
            Debug.LogWarning(
                "[OfflineTimeDiag] ApplyReturnValues | " +
                $"platform={Application.platform}, " +
                $"result={result}, awayRaw={awayTime.ToString("F3", CultureInfo.InvariantCulture)}, " +
                $"applied={calculatedAwayTime.ToString("F3", CultureInfo.InvariantCulture)}, " +
                $"beforeOfflineTime={beforeOfflineTime.ToString(CultureInfo.InvariantCulture)}, " +
                $"afterOfflineTime={context.saveSettings.offlineTime.ToString(CultureInfo.InvariantCulture)}, " +
                $"capApplied={capApplied.ToString().ToLowerInvariant()}, " +
                $"maxOfflineTime={context.saveSettings.maxOfflineTime.ToString(CultureInfo.InvariantCulture)}");
        }

        public static IEnumerator CalculateAwayValues(double awayTime, OfflineProgressContext context, OfflineProgressUI ui)
        {
            LastSimulationWorkMetrics =
                new SimulationWorkMetrics();
            LastMaximumSimulationSliceMilliseconds = 0d;
            if (!ValidateContext(context)) yield break;
            SanitizeInfinityData(context.infinityData);
            if (!NumericSafety.IsFinite(awayTime) || awayTime <= 0d)
            {
                if (!NumericSafety.IsFinite(awayTime))
                    NumericDiagnostics.Report("NS-OFFLINE-DURATION", "source=calculate_away");
                yield break;
            }

            string color = "<color=#91DD8F>";
            string colorS = "<color=#00E1FF>";
            ui?.AwayForHeader?.gameObject.SetActive(false);
            if (ui?.AwayFor != null) ui.AwayFor.text = $"Advanced {color}{CalcUtils.FormatTimeLarge(awayTime)}";

            long startingIP = context.prestigeData.infinityPoints;

            if (context.skillTreeData.idleElectricSheep)
                awayTime = NumericSafety.Multiply(awayTime, 2d).Value;
            double tickEpsilon = SimulationTickSeconds * 1e-9d;
            NumericResult<long> fixedTickResult = NumericSafety.ToLongFloor(
                Math.Floor((awayTime + tickEpsilon) / SimulationTickSeconds));
            if (!fixedTickResult.IsSuccess)
            {
                NumericDiagnostics.Report(
                    "NS-OFFLINE-TICK-COUNT",
                    $"status={fixedTickResult.Status}");
                yield break;
            }
            long fixedTicks = fixedTickResult.Value;
            double remainder = awayTime - fixedTicks * SimulationTickSeconds;
            if (remainder < tickEpsilon) remainder = 0d;

            var acc = new OfflineAccumulator();
            var simulationSummary =
                new SimulationPresentationSummary();
            bool usedUnifiedTimeline =
                context.RunUnifiedSimulation != null;

            if (usedUnifiedTimeline)
            {
                double remainingSeconds = awayTime;
                double originalSeconds = awayTime;
                while (remainingSeconds > tickEpsilon)
                {
                    var before = new OfflineStateSnapshot(
                        context.infinityData);
                    SimulationAdvanceResult result =
                        context.RunUnifiedSimulation(remainingSeconds);
                    LastMaximumSimulationSliceMilliseconds = Math.Max(
                        LastMaximumSimulationSliceMilliseconds,
                        result?.Work?.ProcessingMilliseconds ?? 0d);
                    simulationSummary.Merge(result?.Summary);
                    LastSimulationWorkMetrics.Merge(result?.Work);
                    double consumed = Math.Max(
                        0d,
                        Math.Min(
                            remainingSeconds,
                            result?.ConsumedSeconds ?? 0d));
                    if (consumed <= 0d)
                    {
                        if (result?.ValidationStatus ==
                            SimulationValidationStatus.Yielded)
                        {
                            yield return 0;
                            continue;
                        }
                        NumericDiagnostics.Report(
                            "NS-OFFLINE-EVENT-NO-PROGRESS",
                            $"status={result?.ValidationStatus}");
                        yield break;
                    }

                    CaptureAnalyticalDelta(
                        before,
                        context.infinityData,
                        ref acc);
                    remainingSeconds = Math.Max(
                        0d,
                        remainingSeconds - consumed);
                    if (ui?.ReturnScreenSlider != null)
                        ui.ReturnScreenSlider.fillAmount = (float)Math.Min(
                            1d,
                            (originalSeconds - remainingSeconds) /
                            originalSeconds);

                    if (result.ValidationStatus !=
                            SimulationValidationStatus.Valid &&
                        result.ValidationStatus !=
                            SimulationValidationStatus.Yielded)
                    {
                        NumericDiagnostics.Report(
                            "NS-OFFLINE-EVENT-INVALID",
                            $"status={result.ValidationStatus};code={result.DiagnosticCode}");
                        yield break;
                    }

                    if (result.ValidationStatus ==
                        SimulationValidationStatus.Yielded)
                    {
                        yield return 0;
                    }
                }
            }
            else if (fixedTicks >= 1)
            {
                long sliderFill = 0;
                var sliceTimer = Stopwatch.StartNew();
                if (ui?.OfflineProgressLayoutElement != null) ui.OfflineProgressLayoutElement.minHeight = 7;
                ui?.ReturnScreenSliderParentGameObject?.SetActive(true);
                long processedTicks = 0L;
                while (processedTicks < fixedTicks)
                {
                    long remainingTicks = fixedTicks - processedTicks;
                    var beforeAnalytical =
                        new OfflineStateSnapshot(context.infinityData);
                    long analyticallyProcessed =
                        context.RunAnalyticalTicks?.Invoke(remainingTicks) ?? 0L;
                    if (analyticallyProcessed > 0L &&
                        analyticallyProcessed <= remainingTicks)
                    {
                        CaptureAnalyticalDelta(
                            beforeAnalytical,
                            context.infinityData,
                            ref acc);
                        processedTicks += analyticallyProcessed;
                    }
                    else
                    {
                        ProcessTimeStep(SimulationTickSeconds, context, ref acc);
                        processedTicks++;
                    }

                    if (sliceTimer.Elapsed.TotalMilliseconds >= 4d)
                    {
                        sliderFill = processedTicks;
                        if (ui?.ReturnScreenSlider != null)
                            ui.ReturnScreenSlider.fillAmount =
                                (float)((double)sliderFill / fixedTicks);
                        sliceTimer.Restart();
                        yield return 0;
                    }
                }
                if (ui?.ReturnScreenSlider != null)
                    ui.ReturnScreenSlider.fillAmount = 1f;
            }

            if (!usedUnifiedTimeline && remainder > 0d)
                ProcessTimeStep(remainder, context, ref acc, runAutomation: false);
            yield return 0;

            string textBuilder = "";

            if (simulationSummary.CombinedInfinityCount > 0L)
            {
                textBuilder +=
                    $"\nInfinity resets: {color}" +
                    $"{simulationSummary.CombinedInfinityCount:N0}</color>" +
                    $" for {color}" +
                    $"{simulationSummary.CombinedInfinityPoints:N0}</color> IP";
            }
            if (simulationSummary.CombinedDreamResets > 0L)
            {
                textBuilder +=
                    $"\nDream resets: {color}" +
                    $"{simulationSummary.CombinedDreamResets:N0}</color>" +
                    $" for {color}" +
                    $"{simulationSummary.StrangeMatter:N0}</color> Strange Matter";
            }
            if (simulationSummary.RealityWorkers > 0L ||
                simulationSummary.AutomaticInfluence > 0L)
            {
                textBuilder +=
                    $"\nReality workers: {color}" +
                    $"{simulationSummary.RealityWorkers:N0}</color>";
                if (simulationSummary.AutomaticInfluence > 0L)
                {
                    textBuilder +=
                        $" ({color}" +
                        $"{simulationSummary.AutomaticInfluence:N0}</color> Influence)";
                }
            }

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

        private static void CaptureAnalyticalDelta(
            OfflineStateSnapshot before,
            DysonVerseInfinityData data,
            ref OfflineAccumulator acc)
        {
            acc.planets += Math.Max(0d, data.planets[0] - before.planets);
            acc.dataCenters += Math.Max(0d, data.dataCenters[0] - before.dataCenters);
            acc.servers += Math.Max(0d, data.servers[0] - before.servers);
            acc.managers += Math.Max(0d, data.managers[0] - before.managers);
            acc.lines += Math.Max(0d, data.assemblyLines[0] - before.lines);
            acc.bots += Math.Max(0d, data.bots - before.bots);
            acc.matrioshkaBrains +=
                Math.Max(0d, data.matrioshkaBrains[0] - before.matrioshkaBrains);
            acc.birchPlanets += Math.Max(0d, data.birchPlanets[0] - before.birchPlanets);
            acc.galacticBrains +=
                Math.Max(0d, data.galacticBrains[0] - before.galacticBrains);
            acc.money += Math.Max(0d, data.money - before.money);
            acc.science += Math.Max(0d, data.science - before.science);
            acc.decayed += Math.Max(0d, data.totalPanelsDecayed - before.decayed);
        }
    }
}
