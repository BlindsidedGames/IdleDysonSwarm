using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using static Expansion.Oracle;

/// <summary>
/// Binds bot auto-buy toggle UI to save settings, including mega-structure automation toggles.
/// </summary>
public class AutoBotsToggles : MonoBehaviour
{
    private const string MatrioshkaToggleRootName = "ARToggles Matrioshka Brains";
    private const string BirchToggleRootName = "ARToggles Birch Planets";
    private const string GalacticToggleRootName = "ARToggles Galactic Brains";

    [SerializeField] private Toggle[] _toggles;
    [SerializeField] private Toggle _autoMatrioshkaToggle;
    [SerializeField] private Toggle _autoBirchToggle;
    [SerializeField] private Toggle _autoGalacticToggle;
    private bool _wasMatrioshkaUnlocked;
    private bool _wasBirchUnlocked;
    private bool _wasGalacticUnlocked;

    private void Start()
    {
        if (_toggles != null && _toggles.Length > 0) _toggles[0].isOn = oracle.saveSettings.infinityAutoAssembly;
        if (_toggles != null && _toggles.Length > 1) _toggles[1].isOn = oracle.saveSettings.infinityAutoManagers;
        if (_toggles != null && _toggles.Length > 2) _toggles[2].isOn = oracle.saveSettings.infinityAutoServers;
        if (_toggles != null && _toggles.Length > 3) _toggles[3].isOn = oracle.saveSettings.infinityAutoDataCenters;
        if (_toggles != null && _toggles.Length > 4) _toggles[4].isOn = oracle.saveSettings.infinityAutoPlanets;

        if (_autoMatrioshkaToggle == null && _toggles != null && _toggles.Length > 5) _autoMatrioshkaToggle = _toggles[5];
        if (_autoBirchToggle == null && _toggles != null && _toggles.Length > 6) _autoBirchToggle = _toggles[6];
        if (_autoGalacticToggle == null && _toggles != null && _toggles.Length > 7) _autoGalacticToggle = _toggles[7];

        // Bind by explicit mega row names so setup remains robust if the legacy _toggles array stays at 5.
        _autoMatrioshkaToggle ??= FindToggleByRootName(MatrioshkaToggleRootName);
        _autoBirchToggle ??= FindToggleByRootName(BirchToggleRootName);
        _autoGalacticToggle ??= FindToggleByRootName(GalacticToggleRootName);

        RebindMegaToggle(_autoMatrioshkaToggle, ToggleMatrioshkaAB);
        RebindMegaToggle(_autoBirchToggle, ToggleBirchAB);
        RebindMegaToggle(_autoGalacticToggle, ToggleGalacticAB);

        if (_autoMatrioshkaToggle != null) _autoMatrioshkaToggle.isOn = oracle.saveSettings.infinityAutoMatrioshkaBrains;
        if (_autoBirchToggle != null) _autoBirchToggle.isOn = oracle.saveSettings.infinityAutoBirchPlanets;
        if (_autoGalacticToggle != null) _autoGalacticToggle.isOn = oracle.saveSettings.infinityAutoGalacticBrains;

        _wasMatrioshkaUnlocked = StaticPrestigeData != null && StaticPrestigeData.unlockedMatrioshkaBrains;
        _wasBirchUnlocked = StaticPrestigeData != null && StaticPrestigeData.unlockedBirchPlanets;
        _wasGalacticUnlocked = StaticPrestigeData != null && StaticPrestigeData.unlockedGalacticBrains;
    }

    private void Update()
    {
        bool matrioshkaUnlocked = StaticPrestigeData != null && StaticPrestigeData.unlockedMatrioshkaBrains;
        bool birchUnlocked = StaticPrestigeData != null && StaticPrestigeData.unlockedBirchPlanets;
        bool galacticUnlocked = StaticPrestigeData != null && StaticPrestigeData.unlockedGalacticBrains;

        SetMegaToggleState(_autoMatrioshkaToggle, matrioshkaUnlocked, ref _wasMatrioshkaUnlocked,
            ref oracle.saveSettings.infinityAutoMatrioshkaBrains);
        SetMegaToggleState(_autoBirchToggle, birchUnlocked, ref _wasBirchUnlocked,
            ref oracle.saveSettings.infinityAutoBirchPlanets);
        SetMegaToggleState(_autoGalacticToggle, galacticUnlocked, ref _wasGalacticUnlocked,
            ref oracle.saveSettings.infinityAutoGalacticBrains);
    }

    private static void SetMegaToggleState(Toggle toggle, bool unlocked, ref bool wasUnlocked, ref bool saveFlag)
    {
        if (toggle == null) return;

        if (!unlocked)
        {
            toggle.interactable = false;
            if (toggle.isOn) toggle.isOn = false;
            if (toggle.gameObject.activeSelf) toggle.gameObject.SetActive(false);
            wasUnlocked = false;
            return;
        }

        if (!wasUnlocked)
        {
            // Default to enabled when a mega structure is newly unlocked.
            saveFlag = true;
        }

        if (!toggle.gameObject.activeSelf) toggle.gameObject.SetActive(true);
        toggle.interactable = true;
        if (toggle.isOn != saveFlag) toggle.isOn = saveFlag;
        wasUnlocked = true;
    }

    private static void RebindMegaToggle(Toggle toggle, UnityEngine.Events.UnityAction<bool> handler)
    {
        if (toggle == null || handler == null)
        {
            return;
        }

        toggle.onValueChanged.RemoveAllListeners();
        toggle.onValueChanged.AddListener(handler);
    }

    private Toggle FindToggleByRootName(string rootName)
    {
        if (string.IsNullOrEmpty(rootName))
        {
            return null;
        }

        Transform root = transform.Find(rootName);
        if (root == null)
        {
            return null;
        }

        return root.GetComponentInChildren<Toggle>(true);
    }

    public void ToggleAssemblyAB(bool t)
    {
        oracle.saveSettings.infinityAutoAssembly = t;
    }

    public void ToggleAiAB(bool t)
    {
        oracle.saveSettings.infinityAutoManagers = t;
    }

    public void ToggleServerAB(bool t)
    {
        oracle.saveSettings.infinityAutoServers = t;
    }

    public void ToggleDataCenterAB(bool t)
    {
        oracle.saveSettings.infinityAutoDataCenters = t;
    }

    public void TogglePlanetAB(bool t)
    {
        oracle.saveSettings.infinityAutoPlanets = t;
    }

    public void ToggleMatrioshkaAB(bool t)
    {
        oracle.saveSettings.infinityAutoMatrioshkaBrains = t;
    }

    public void ToggleBirchAB(bool t)
    {
        oracle.saveSettings.infinityAutoBirchPlanets = t;
    }

    public void ToggleGalacticAB(bool t)
    {
        oracle.saveSettings.infinityAutoGalacticBrains = t;
    }
}
