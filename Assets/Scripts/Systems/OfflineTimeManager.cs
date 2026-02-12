using System;
using System.Collections.Generic;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using Blindsided.Utilities;
using static Expansion.Oracle;

/// <summary>
/// Manages the offline-time spend UI and actions, including modal controls and side-panel quick-spend buttons.
/// </summary>
/// <remarks>
/// Purpose:
/// - Displays available stored offline time, configures slider/button states, and spends offline time by running
///   away-time simulation through <see cref="GameManager"/>.
///
/// Where it runs:
/// - Runtime (scene component).
///
/// Primary entry points:
/// - <see cref="Start"/>: Initializes button wiring and max values.
/// - <see cref="SpendTime"/> / <see cref="SpendAgain"/>: Confirmed spend flow from the modal.
/// - <see cref="SetTimeDisplay"/>: Refreshes availability/interactability state.
///
/// Interacts with:
/// - Calls: <see cref="GameManager.RunAwayTime(double)"/> to apply spent time.
/// - Reads/writes: <see cref="Expansion.Oracle.SaveDataSettings.offlineTime"/> and max values.
/// - Called by: UI Button/Slider events from offline-time modal and side-panel quick-spend buttons via
///   <see cref="SidePanelReferences"/>.
///
/// Change notes:
/// - Changing spend behavior or caps impacts all offline-time entry points (modal, spend-again, and side-panel quick buttons).
/// - Renaming serialized fields requires re-wiring scene/prefab references, including both overlay and permanent panel refs.
/// - If this component is hosted outside the offline-time modal, <see cref="_offlineTimeWindowRoot"/> should point at
///   the modal root so spend actions hide the window without disabling this manager.
/// - Modal slider/button events are also bound in code so behavior survives object moves/ref swaps.
/// </remarks>
public class OfflineTimeManager : MonoBehaviour
{
    [SerializeField] private TMP_Text timeDisplay;
    [SerializeField] private Button allTime;
    [SerializeField] private Button oneHour;
    [SerializeField] private Button tenMinutes;
    [SerializeField] private Slider timeSlider;
    [SerializeField] private TMP_Text sliderText;
    [SerializeField] private Button spendTimeButton;
    [SerializeField] private Button spendAgainButton;
    [SerializeField] private GameObject spendAgain;
    [SerializeField] private TMP_Text spendAgainButtonText;
    [SerializeField] private TMP_Text doublerText;
    [SerializeField] private Button doublerButton;
    [SerializeField] private GameObject doublerButtonObj;
    [SerializeField] private bool doubleTap;

    [SerializeField] private GameManager _gameManager;
    [SerializeField] private GameObject _offlineTimeWindowRoot;
    [SerializeField] private SidePanelReferences _overlaySidePanelReferences;
    [SerializeField] private SidePanelReferences _permanentSidePanelReferences;
    private SaveDataSettings ss => oracle.saveSettings;
    private bool _initialized;
    private double _lastKnownOfflineTime = -1d;
    private bool _modalListenersBound;
    private bool _wasOfflineWindowOpen;

    private void Start()
    {
        doubleTap = false;
        TryInitialize();
    }

    private void Update()
    {
        if (!_initialized)
        {
            TryInitialize();
            return;
        }

        if (!HasSaveSettings()) return;

        bool isOfflineWindowOpen = _offlineTimeWindowRoot != null && _offlineTimeWindowRoot.activeInHierarchy;
        if (isOfflineWindowOpen && !_wasOfflineWindowOpen)
        {
            RefreshOfflineTimeWindowState();
        }

        _wasOfflineWindowOpen = isOfflineWindowOpen;

        if (Math.Abs(ss.offlineTime - _lastKnownOfflineTime) < 0.0001d) return;

        _lastKnownOfflineTime = ss.offlineTime;
        SetQuickButtonsInteractable();
    }

    public void SetDoublerActive()
    {
        if (!HasSaveSettings()) return;
        doublerText.gameObject.SetActive(ss.offlineTime >= ss.maxOfflineTime);
        doublerButtonObj.SetActive(ss.offlineTime >= ss.maxOfflineTime);
    }

    private void DoubleOfflineTime()
    {
        if (!HasSaveSettings()) return;
        if (ss.offlineTime < ss.maxOfflineTime) return;
        ss.maxOfflineTime *= 2;
        ss.offlineTime = 0;
        SetTimeDisplay();
        SetSliderMaxToAll();
        doublerText.text = $"New Max: {CalcUtils.FormatTimeLarge(ss.maxOfflineTime)}";
        doublerButtonObj.SetActive(ss.offlineTime >= ss.maxOfflineTime);
    }

    public void SetTimeDisplay()
    {
        if (!HasSaveSettings()) return;
        string colorS = "<color=#00E1FF>";
        timeDisplay.text =
            $"You have {colorS}{CalcUtils.FormatTimeLarge(ss.offlineTime)}</color> stored";
        oneHour.interactable = ss.offlineTime >= 3600;
        tenMinutes.interactable = ss.offlineTime >= 600;
        allTime.interactable = ss.offlineTime > 0;
        SetQuickButtonsInteractable();
    }

    public void SpendTime()
    {
        if (!HasSaveSettings()) return;
        if (doubleTap == false)
        {
            sliderText.text = "Tap again to confirm";
            doubleTap = true;
            return;
        }

        HideOfflineTimeWindow();
        _gameManager.RunAwayTime(timeSlider.value > ss.offlineTime ? ss.offlineTime : timeSlider.value);
        ss.offlineTime -= timeSlider.value > ss.offlineTime ? ss.offlineTime : timeSlider.value;
        spendAgain.SetActive(timeSlider.value < ss.offlineTime);
        spendAgainButtonText.text = CalcUtils.FormatTimeLarge(timeSlider.value);
        sliderText.text = CalcUtils.FormatTimeLarge(timeSlider.value);
        doubleTap = false;
    }

    public void SpendAgain()
    {
        if (!HasSaveSettings()) return;
        HideOfflineTimeWindow();
        _gameManager.RunAwayTime(timeSlider.value > ss.offlineTime ? ss.offlineTime : timeSlider.value);
        ss.offlineTime -= timeSlider.value > ss.offlineTime ? ss.offlineTime : timeSlider.value;
        spendAgain.SetActive(timeSlider.value < ss.offlineTime);
        spendAgainButtonText.text = CalcUtils.FormatTimeLarge(timeSlider.value);
        sliderText.text = CalcUtils.FormatTimeLarge(timeSlider.value);
        doubleTap = false;
    }

    public void SetSliderMaxToAll()
    {
        if (!HasSaveSettings()) return;
        float time = (float)ss.offlineTime;
        timeSlider.maxValue = time;
        timeSlider.value = time;
    }

    public void SetSliderToSixty()
    {
        if (!HasSaveSettings()) return;
        timeSlider.value = Math.Min(60f, (float)ss.offlineTime);
    }

    public void SetSliderMax(float time)
    {
        if (!HasSaveSettings()) return;
        timeSlider.maxValue = time;
        timeSlider.value = time;
        doubleTap = false;
    }

    public void Slide(float amount)
    {
        sliderText.text = CalcUtils.FormatTimeLarge(amount);
        doubleTap = false;
    }

    private void BindQuickOfflineTimeButtons()
    {
        HashSet<Button> boundButtons = new HashSet<Button>();
        BindQuickOfflineTimeButtons(_overlaySidePanelReferences, boundButtons);
        BindQuickOfflineTimeButtons(_permanentSidePanelReferences, boundButtons);
    }

    private void BindQuickOfflineTimeButtons(SidePanelReferences refs, HashSet<Button> boundButtons)
    {
        if (refs == null) return;

        BindQuickButton(refs.quickOfflineTwoMinutesButton, 120d, boundButtons);
        BindQuickButton(refs.quickOfflineTenMinutesButton, 600d, boundButtons);
        BindQuickButton(refs.quickOfflineOneHourButton, 3600d, boundButtons);
    }

    private void BindQuickButton(Button button, double seconds, HashSet<Button> boundButtons)
    {
        if (button == null || !boundButtons.Add(button)) return;
        button.onClick.AddListener(() => SpendOfflineTime(seconds));
    }

    private void SpendOfflineTime(double requestedSeconds)
    {
        if (!HasSaveSettings()) return;
        if (requestedSeconds <= 0 || ss.offlineTime < requestedSeconds) return;

        _gameManager.RunAwayTime(requestedSeconds);
        ss.offlineTime -= requestedSeconds;

        SetTimeDisplay();
        SetSliderMaxToAll();
        SetDoublerActive();
        doubleTap = false;
    }

    private void SetQuickButtonsInteractable()
    {
        SetQuickButtonsInteractable(_overlaySidePanelReferences);
        SetQuickButtonsInteractable(_permanentSidePanelReferences);
    }

    private void SetQuickButtonsInteractable(SidePanelReferences refs)
    {
        if (refs == null) return;
        bool hasSave = HasSaveSettings();
        if (refs.quickOfflineTwoMinutesButton != null) refs.quickOfflineTwoMinutesButton.interactable = hasSave && ss.offlineTime >= 120d;
        if (refs.quickOfflineTenMinutesButton != null) refs.quickOfflineTenMinutesButton.interactable = hasSave && ss.offlineTime >= 600d;
        if (refs.quickOfflineOneHourButton != null) refs.quickOfflineOneHourButton.interactable = hasSave && ss.offlineTime >= 3600d;
    }

    private void TryInitialize()
    {
        if (_initialized || !HasSaveSettings()) return;

        doublerButton.onClick.AddListener(DoubleOfflineTime);
        BindQuickOfflineTimeButtons();
        BindModalControls();
        if (ss.maxOfflineTime >= 8640000) ss.maxOfflineTime = 86400;
        _lastKnownOfflineTime = ss.offlineTime;
        SetQuickButtonsInteractable();
        _initialized = true;
    }

    private void BindModalControls()
    {
        if (_modalListenersBound) return;

        if (allTime != null) allTime.onClick.AddListener(SetSliderMaxToAll);
        if (oneHour != null) oneHour.onClick.AddListener(SetSliderToOneHour);
        if (tenMinutes != null) tenMinutes.onClick.AddListener(SetSliderToTenMinutes);
        if (spendTimeButton != null) spendTimeButton.onClick.AddListener(SpendTime);
        if (spendAgainButton != null) spendAgainButton.onClick.AddListener(SpendAgain);
        if (timeSlider != null) timeSlider.onValueChanged.AddListener(Slide);

        _modalListenersBound = true;
    }

    private void SetSliderToTenMinutes()
    {
        if (!HasSaveSettings()) return;
        SetSliderMax((float)Math.Min(600d, ss.offlineTime));
    }

    private void SetSliderToOneHour()
    {
        if (!HasSaveSettings()) return;
        SetSliderMax((float)Math.Min(3600d, ss.offlineTime));
    }

    private bool HasSaveSettings()
    {
        return oracle != null && oracle.saveSettings != null;
    }

    private void HideOfflineTimeWindow()
    {
        if (_offlineTimeWindowRoot != null)
        {
            _offlineTimeWindowRoot.SetActive(false);
            return;
        }

        gameObject.SetActive(false);
    }

    private void RefreshOfflineTimeWindowState()
    {
        SetTimeDisplay();
        SetSliderMaxToAll();
        SetDoublerActive();
        Slide(timeSlider != null ? timeSlider.value : 0f);
    }
}
