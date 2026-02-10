using System;
using Blindsided.Utilities;
using Blindsided.ProceduralUIImage;
using TMPro;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.UI;
using Systems.Stats;
using static Expansion.Oracle;
using IdleDysonSwarm.UI;

/// <summary>
/// ManualBotCreation
/// Runtime: yes (scene UI / button).
///
/// Purpose:
/// Drives the "tinker" click/hold UI that manually produces early-game units.
/// By default it produces Bots; once the Manual Labour skill is assigned and you have at least one AI Manager,
/// it switches to producing Assembly Lines instead.
///
/// Primary entry points:
/// - <see cref="Start"/>: initializes UI state and cached values.
/// - <see cref="Update"/>: handles input, cooldown timing, UI text, and award logic.
/// - <see cref="StartButton"/>: invoked by the UI Button and by hold-to-repeat when eligible.
///
/// Interacts with:
/// - Expansion.Oracle save graph (<see cref="DysonVerseSaveData"/>, <see cref="DysonVerseInfinityData"/>,
///   <see cref="DysonVerseSkillTreeData"/>)
/// - <see cref="GlobalStatPipeline"/> (tinker stats: yield/cooldown)
/// - IdleDysonSwarm.UI.UIThemeProvider (highlight color)
///
/// Change notes:
/// - Production target is gated by skill + manager count. If you change the "has manager" rule, keep it consistent
///   with other UI gates (e.g. <see cref="BotPanelManager"/> uses managers[1] to decide if you have a manager).
/// - This script writes to <see cref="DysonVerseSaveData.manualCreationTime"/>; changing its semantics can affect
///   other tinker/cooldown behaviors that read the same value.
/// </summary>
public class ManualBotCreation : MonoBehaviour
{
    [SerializeField] private TMP_Text counter;
    [SerializeField] private TMP_Text description;
    [SerializeField] private GameObject clickHere;
    [SerializeField] private Button _button;

    [SerializeField] private ProceduralUIImage fill;

    private DysonVerseInfinityData infinityData => oracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData;
    private DysonVerseSkillTreeData skillTreeData => oracle.saveSettings.dysonVerseSaveData.dysonVerseSkillTreeData;
    private DysonVersePrestigeData prestigeData => oracle.saveSettings.dysonVerseSaveData.dysonVersePrestigeData;
    private DysonVerseSaveData dvsd => oracle.saveSettings.dysonVerseSaveData;
    private PrestigePlus prestigePlus => oracle.saveSettings.prestigePlus;
    private bool running;
    private float time;
    private bool pointerHeld;
    [SerializeField] private float holdRepeatDelay = 0.5f;
    private float heldTime;
    private Color baseFillColor;
    private Color heldFillColor;
    private bool lastHeldVisual;
    private bool lastManualLabourEffective;
    private double lastCooldownSeconds;
    private const double HoldPermanentBarThresholdSeconds = 0.5;

    private void Start()
    {
        fill.fillAmount = 0;
        lastCooldownSeconds = GetTinkerCooldownSeconds();
        counter.text = $"{CalcUtils.FormatNumber(lastCooldownSeconds, useMspace: true)}s";
        clickHere.SetActive(true);
        baseFillColor = fill.color;
        var highlight = UIThemeProvider.ActiveTheme != null
            ? UIThemeProvider.ActiveTheme.highlightColor
            : new Color(0f, 0.882f, 1f);
        heldFillColor = new Color(highlight.r, highlight.g, highlight.b, 0.6f);
        lastManualLabourEffective = IsManualLabourEffective();
    }

    private void OnDisable()
    {
        pointerHeld = false;
    }

    private bool IsPointerHeld()
    {
        var mouse = Mouse.current;
        if (mouse != null && mouse.leftButton.isPressed)
            return true;

        var touchscreen = Touchscreen.current;
        if (touchscreen != null && touchscreen.primaryTouch.press.isPressed)
            return true;

        return false;
    }

    private void Update()
    {
        double botYield = 1;
        double assemblyProduction = 0;
        bool manualLabourSkillNow = skillTreeData.manualLabour;
        bool manualLabourEffectiveNow = IsManualLabourEffective();
        bool manualLabourModeChanged = manualLabourEffectiveNow != lastManualLabourEffective;
        if (manualLabourModeChanged)
        {
            if (manualLabourEffectiveNow)
            {
                dvsd.manualCreationTime = 0.2f;
            }
            else if (dvsd.manualCreationTime < 0.5f)
            {
                dvsd.manualCreationTime = 0.5f;
            }
        }

        double cooldownSeconds = GetTinkerCooldownSeconds();
        if (TryGetTinkerStats(out GlobalStatPipeline.TinkerResult tinker))
        {
            botYield = tinker.BotYield.Value;
            assemblyProduction = tinker.AssemblyYield.Value;
            cooldownSeconds = Math.Max(0.01, tinker.Cooldown.Value);
        }

        // Holding should always auto-repeat once it kicks in, but the "permanent" held visual (filled bar + tint)
        // should only be shown once the cooldown has reached 0.5s, or if Manual Labour is active.
        bool allowPermanentHeldVisual = manualLabourEffectiveNow || cooldownSeconds <= HoldPermanentBarThresholdSeconds;

        if (cooldownSeconds != lastCooldownSeconds || manualLabourModeChanged)
        {
            lastCooldownSeconds = cooldownSeconds;
            lastManualLabourEffective = manualLabourEffectiveNow;
            time = 0f;
            fill.fillAmount = 0f;
            counter.text = $"{CalcUtils.FormatNumber(cooldownSeconds, useMspace: true)}s";
        }

        if (manualLabourSkillNow)
        {
            if (manualLabourEffectiveNow)
            {
                // Manual labour is active and can actually create assembly lines now that a manager exists.
                string warning = assemblyProduction <= 0
                    ? " <color=#B0B0B0>(Requires an AI Manager!)</color>"
                    : string.Empty;
                description.text =
                    $"Having nothing better to do you decide to set up some more assembly lines. Masterfully made you will produce <color=#00E1FF>{CalcUtils.FormatNumber(assemblyProduction)}</color>{warning}";
            }
            else
            {
                // Avoid a dead tinker window: until the first manager exists, keep producing bots.
                description.text =
                    $"You have the knowledge to automate assembly lines, but without an AI Manager you still have to tinker together bots. You will produce <color=#00E1FF>{CalcUtils.FormatNumber(botYield)}</color> <color=#B0B0B0>(Get 1 AI Manager to unlock assembly line tinkering.)</color>";
            }
        }
        else
        {
            description.text =
                "Manually put together a new bot from parts in your shed. <br>There has to be a better way of going about this... <br><size=90%><color=#B0B0B0>Tip: The tinker panel goes away after you have 10 assembly lines and 1 manager (or any data center).</color></size>";
        }
        pointerHeld = IsPointerHeld();
        if (pointerHeld)
        {
            heldTime += Time.deltaTime;
        }
        else
        {
            heldTime = 0f;
        }

        bool autoRepeatActive = pointerHeld && heldTime >= holdRepeatDelay;

        if (!running && autoRepeatActive)
        {
            StartButton();
        }

        ApplyHeldVisuals(pointerHeld && allowPermanentHeldVisual);

        if (running)
        {
            if (time < cooldownSeconds)
            {
                time += Time.deltaTime;
                float pct = time / (float)cooldownSeconds;
                fill.fillAmount = (autoRepeatActive && allowPermanentHeldVisual) ? 1f : pct;
                counter.text = $"{CalcUtils.FormatNumber(cooldownSeconds - time, useMspace: true)}s";
            }
            else
            {
                if (manualLabourEffectiveNow)
                {
                    infinityData.assemblyLines[0] += assemblyProduction;
                }
                else
                {
                    infinityData.bots += botYield;
                }
                if (dvsd.manualCreationTime >= 1 && !manualLabourEffectiveNow)
                    dvsd.manualCreationTime -= 1;
                else
                {
                    dvsd.manualCreationTime = manualLabourEffectiveNow ? 0.2f : 0.5f;
                }

                if (autoRepeatActive)
                {
                    time = 0f;
                    fill.fillAmount = allowPermanentHeldVisual ? 1f : 0f;
                    counter.text = $"{CalcUtils.FormatNumber(cooldownSeconds, useMspace: true)}s";
                }
                else
                {
                    fill.fillAmount = 0f;
                    clickHere.SetActive(true);
                    _button.interactable = true;
                    running = false;
                    counter.text = $"{CalcUtils.FormatNumber(cooldownSeconds, useMspace: true)}s";
                }
            }
        }
    }

    private void ApplyHeldVisuals(bool isHeld)
    {
        if (fill == null || lastHeldVisual == isHeld)
            return;

        fill.color = isHeld ? heldFillColor : baseFillColor;
        lastHeldVisual = isHeld;
    }

    public void StartButton()
    {
        if (!running)
        {
            time = .1f;
            clickHere.SetActive(false);
            _button.interactable = false;
            running = true;
        }
    }

    private double GetTinkerCooldownSeconds()
    {
        double cooldown = dvsd.manualCreationTime;
        if (TryGetTinkerStats(out GlobalStatPipeline.TinkerResult tinker))
        {
            cooldown = tinker.Cooldown.Value;
        }

        return Math.Max(0.01, cooldown);
    }

    private bool TryGetTinkerStats(out GlobalStatPipeline.TinkerResult result)
    {
        return GlobalStatPipeline.TryCalculateTinkerStats(infinityData, skillTreeData, prestigeData, prestigePlus, dvsd.manualCreationTime, out result);
    }

    private bool HasAtLeastOneAiManager()
    {
        // Convention used elsewhere: managers[1] tracks owned/whole-count (see BotPanelManager click-panel gating).
        return infinityData.managers != null &&
               infinityData.managers.Length > 1 &&
               infinityData.managers[1] >= 1;
    }

    private bool IsManualLabourEffective()
    {
        // Manual Labour should not "dead-end" the tinker window: only switch to assembly line creation
        // once the first manager exists.
        return skillTreeData.manualLabour && HasAtLeastOneAiManager();
    }

}
