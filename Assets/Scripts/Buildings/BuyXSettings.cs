// BuyXSettings.cs
// Runtime MonoBehaviour that manages buy-quantity toggle buttons (x1, x10, x50, x100, Max).
// Parameterized via BuyModeTarget to serve both building and research buy-mode panels.
//
// Entry points: Start() (button listener wiring), OnEnable() (restore active button),
//               SetButton() (called externally to sync UI after settings change).
//
// Interacts with:
//   - Oracle (Expansion.Oracle): reads/writes oracle.saveSettings.buyMode or researchBuyMode.
//   - Attached in Game.unity on two GameObjects — one for buildings, one for research.
//
// Change notes:
//   - BuyModeTarget enum values are serialized in Game.unity; renaming/reordering breaks scene data.
//   - The five Button fields are wired in the Inspector; adding/removing fields requires scene updates.

using UnityEngine;
using UnityEngine.UI;
using Systems.Simulation;
using static Expansion.Oracle;

/// <summary>
/// Manages a set of buy-quantity toggle buttons (x1, x10, x50, x100, Max).
/// A single <see cref="BuyModeTarget"/> enum selects which save-settings field is read/written,
/// allowing one class to drive both building and research buy-mode panels.
/// </summary>
public class BuyXSettings : MonoBehaviour
{
    /// <summary>
    /// Determines which save-settings buy mode this instance controls.
    /// </summary>
    public enum BuyModeTarget
    {
        Buildings,
        Research
    }

    [SerializeField] private BuyModeTarget buyModeTarget = BuyModeTarget.Buildings;
    [SerializeField] private Button one;
    [SerializeField] private Button ten;
    [SerializeField] private Button fifty;
    [SerializeField] private Button onehundred;
    [SerializeField] private Button max;

    private BuyMode CurrentMode
    {
        get
        {
            if (!HasSaveSettings())
            {
                return BuyMode.Buy1;
            }

            return buyModeTarget == BuyModeTarget.Buildings
                ? oracle.saveSettings.buyMode
                : oracle.saveSettings.researchBuyMode;
        }
        set
        {
            if (!HasSaveSettings())
            {
                return;
            }

            if (buyModeTarget == BuyModeTarget.Buildings)
                oracle.saveSettings.buyMode = value;
            else
                oracle.saveSettings.researchBuyMode = value;
        }
    }

    private void Start()
    {
        if (one != null) one.onClick.AddListener(() => RequestMode(BuyMode.Buy1, one));
        if (ten != null) ten.onClick.AddListener(() => RequestMode(BuyMode.Buy10, ten));
        if (fifty != null) fifty.onClick.AddListener(() => RequestMode(BuyMode.Buy50, fifty));
        if (onehundred != null) onehundred.onClick.AddListener(() => RequestMode(BuyMode.Buy100, onehundred));
        if (max != null) max.onClick.AddListener(() => RequestMode(BuyMode.BuyMax, max));
    }

    private void OnEnable()
    {
        SetButton();
    }

    /// <summary>
    /// Syncs button interactability to reflect the currently saved buy mode.
    /// </summary>
    public void SetButton()
    {
        if (!HasSaveSettings())
        {
            return;
        }

        var current = CurrentMode;
        if (one != null) one.interactable = current != BuyMode.Buy1;
        if (ten != null) ten.interactable = current != BuyMode.Buy10;
        if (fifty != null) fifty.interactable = current != BuyMode.Buy50;
        if (onehundred != null) onehundred.interactable = current != BuyMode.Buy100;
        if (max != null) max.interactable = current != BuyMode.BuyMax;
    }

    private void SetMode(BuyMode m, Button b)
    {
        CurrentMode = m;
        if (one != null) one.interactable = true;
        if (ten != null) ten.interactable = true;
        if (fifty != null) fifty.interactable = true;
        if (onehundred != null) onehundred.interactable = true;
        if (max != null) max.interactable = true;
        if (b != null) b.interactable = false;
    }

    private void RequestMode(BuyMode mode, Button button)
    {
        if (!GameManager.RequestQueuedPlayerAction(
                SimulationInputKind.AutomationSetting,
                () => SetMode(mode, button),
                $"buy_mode:{buyModeTarget}"))
        {
            SetMode(mode, button);
        }
    }

    private static bool HasSaveSettings()
    {
        return oracle != null && oracle.saveSettings != null;
    }
}
