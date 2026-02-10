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
        get => buyModeTarget == BuyModeTarget.Buildings
            ? oracle.saveSettings.buyMode
            : oracle.saveSettings.researchBuyMode;
        set
        {
            if (buyModeTarget == BuyModeTarget.Buildings)
                oracle.saveSettings.buyMode = value;
            else
                oracle.saveSettings.researchBuyMode = value;
        }
    }

    private void Start()
    {
        one.onClick.AddListener(() => SetMode(BuyMode.Buy1, one));
        ten.onClick.AddListener(() => SetMode(BuyMode.Buy10, ten));
        fifty.onClick.AddListener(() => SetMode(BuyMode.Buy50, fifty));
        onehundred.onClick.AddListener(() => SetMode(BuyMode.Buy100, onehundred));
        max.onClick.AddListener(() => SetMode(BuyMode.BuyMax, max));
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
        var current = CurrentMode;
        one.interactable = current != BuyMode.Buy1;
        ten.interactable = current != BuyMode.Buy10;
        fifty.interactable = current != BuyMode.Buy50;
        onehundred.interactable = current != BuyMode.Buy100;
        max.interactable = current != BuyMode.BuyMax;
    }

    private void SetMode(BuyMode m, Button b)
    {
        CurrentMode = m;
        one.interactable = true;
        ten.interactable = true;
        fifty.interactable = true;
        onehundred.interactable = true;
        max.interactable = true;
        b.interactable = false;
    }
}
