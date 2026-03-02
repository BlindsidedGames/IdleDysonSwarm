using Expansion;
using Systems.Facilities;
using UnityEngine;
using UnityEngine.UI;
using static Expansion.Oracle;

/*
 * AutoResearchToglles
 * Purpose: Binds research auto-buy toggle UI to save settings, including mega-structure research toggles.
 * Runs: Runtime (Research tab settings panel in Game scene).
 * Primary entry points: Start(), Update(), and Toggle*AR callbacks wired from UI Toggle components.
 * Owns vs delegates: Owns toggle visibility/interactable state + first-unlock defaults; delegates unlock-state
 * checks to save/prestige data and FacilityCountAccessor.
 *
 * Interacts with:
 * - Assets/Scripts/Research/ResearchPresenter.cs (consumes save toggle flags by auto-buy group).
 * - Assets/Scripts/Research/ResearchAutoBuy.cs (auto purchase loop respects presenter CanAutoBuy).
 * - Assets/Scripts/Expansion/Oracle.cs (SaveDataSettings persistence fields).
 *
 * Change notes:
 * - Toggle index ordering must stay aligned with the scene wiring under AutoResearchToggles.
 * - Renaming any Toggle*AR method requires updating UnityEvent bindings on toggle objects in Game.unity.
 * - Mega research toggles intentionally default ON only on runtime transition from locked->unlocked.
 */
public class AutoResearchToglles : MonoBehaviour
{
    private const string MatrioshkaToggleRootName = "ARToggles Matrioshka Brains Research";
    private const string BirchToggleRootName = "ARToggles Birch Planets Research";
    private const string GalacticToggleRootName = "ARToggles Galactic Brains Research";

    [SerializeField] private Toggle[] _toggles;
    [SerializeField] private Toggle _autoMatrioshkaToggle;
    [SerializeField] private Toggle _autoBirchToggle;
    [SerializeField] private Toggle _autoGalacticToggle;

    private bool _wasMatrioshkaUnlocked;
    private bool _wasBirchUnlocked;
    private bool _wasGalacticUnlocked;

    /// <summary>
    /// Initializes toggle values from save settings and resolves fallback references.
    /// </summary>
    private void Start()
    {
        if (_toggles != null && _toggles.Length > 0) _toggles[0].isOn = oracle.saveSettings.infinityAutoResearchToggleScience;
        if (_toggles != null && _toggles.Length > 1) _toggles[1].isOn = oracle.saveSettings.infinityAutoResearchToggleMoney;
        if (_toggles != null && _toggles.Length > 2) _toggles[2].isOn = oracle.saveSettings.infinityAutoResearchToggleAssembly;
        if (_toggles != null && _toggles.Length > 3) _toggles[3].isOn = oracle.saveSettings.infinityAutoResearchToggleAi;
        if (_toggles != null && _toggles.Length > 4) _toggles[4].isOn = oracle.saveSettings.infinityAutoResearchToggleServer;
        if (_toggles != null && _toggles.Length > 5) _toggles[5].isOn = oracle.saveSettings.infinityAutoResearchToggleDataCenter;
        if (_toggles != null && _toggles.Length > 6) _toggles[6].isOn = oracle.saveSettings.infinityAutoResearchTogglePlanet;

        if (_autoMatrioshkaToggle == null && _toggles != null && _toggles.Length > 7) _autoMatrioshkaToggle = _toggles[7];
        if (_autoBirchToggle == null && _toggles != null && _toggles.Length > 8) _autoBirchToggle = _toggles[8];
        if (_autoGalacticToggle == null && _toggles != null && _toggles.Length > 9) _autoGalacticToggle = _toggles[9];

        _autoMatrioshkaToggle ??= FindToggleByRootName(MatrioshkaToggleRootName);
        _autoBirchToggle ??= FindToggleByRootName(BirchToggleRootName);
        _autoGalacticToggle ??= FindToggleByRootName(GalacticToggleRootName);

        RebindMegaToggle(_autoMatrioshkaToggle, ToggleMatrioshkaAR);
        RebindMegaToggle(_autoBirchToggle, ToggleBirchAR);
        RebindMegaToggle(_autoGalacticToggle, ToggleGalacticAR);

        if (_autoMatrioshkaToggle != null) _autoMatrioshkaToggle.isOn = oracle.saveSettings.infinityAutoResearchToggleMatrioshkaBrains;
        if (_autoBirchToggle != null) _autoBirchToggle.isOn = oracle.saveSettings.infinityAutoResearchToggleBirchPlanets;
        if (_autoGalacticToggle != null) _autoGalacticToggle.isOn = oracle.saveSettings.infinityAutoResearchToggleGalacticBrains;

        _wasMatrioshkaUnlocked = IsMegaResearchUnlocked("matrioshka_brains");
        _wasBirchUnlocked = IsMegaResearchUnlocked("birch_planets");
        _wasGalacticUnlocked = IsMegaResearchUnlocked("galactic_brains");
    }

    /// <summary>
    /// Updates mega research toggle visibility/interaction based on unlock state.
    /// </summary>
    private void Update()
    {
        // Keep canonical save flags aligned with the visible base-category toggle states.
        if (_toggles != null)
        {
            if (_toggles.Length > 0 && _toggles[0] != null) oracle.saveSettings.infinityAutoResearchToggleScience = _toggles[0].isOn;
            if (_toggles.Length > 1 && _toggles[1] != null) oracle.saveSettings.infinityAutoResearchToggleMoney = _toggles[1].isOn;
            if (_toggles.Length > 2 && _toggles[2] != null) oracle.saveSettings.infinityAutoResearchToggleAssembly = _toggles[2].isOn;
            if (_toggles.Length > 3 && _toggles[3] != null) oracle.saveSettings.infinityAutoResearchToggleAi = _toggles[3].isOn;
            if (_toggles.Length > 4 && _toggles[4] != null) oracle.saveSettings.infinityAutoResearchToggleServer = _toggles[4].isOn;
            if (_toggles.Length > 5 && _toggles[5] != null) oracle.saveSettings.infinityAutoResearchToggleDataCenter = _toggles[5].isOn;
            if (_toggles.Length > 6 && _toggles[6] != null) oracle.saveSettings.infinityAutoResearchTogglePlanet = _toggles[6].isOn;
        }

        bool matrioshkaUnlocked = IsMegaResearchUnlocked("matrioshka_brains");
        bool birchUnlocked = IsMegaResearchUnlocked("birch_planets");
        bool galacticUnlocked = IsMegaResearchUnlocked("galactic_brains");

        SetMegaToggleState(_autoMatrioshkaToggle, matrioshkaUnlocked, ref _wasMatrioshkaUnlocked,
            ref oracle.saveSettings.infinityAutoResearchToggleMatrioshkaBrains);
        SetMegaToggleState(_autoBirchToggle, birchUnlocked, ref _wasBirchUnlocked,
            ref oracle.saveSettings.infinityAutoResearchToggleBirchPlanets);
        SetMegaToggleState(_autoGalacticToggle, galacticUnlocked, ref _wasGalacticUnlocked,
            ref oracle.saveSettings.infinityAutoResearchToggleGalacticBrains);
    }

    /// <summary>
    /// Applies per-toggle lock/unlock behavior and first-unlock default state.
    /// </summary>
    /// <param name="toggle">Toggle to update.</param>
    /// <param name="unlocked">Whether feature is unlocked.</param>
    /// <param name="wasUnlocked">Cached previous unlock state.</param>
    /// <param name="saveFlag">Bound save flag.</param>
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
            saveFlag = true;
            if (toggle.isOn != saveFlag) toggle.isOn = saveFlag;
        }
        else
        {
            saveFlag = toggle.isOn;
        }

        if (!toggle.gameObject.activeSelf) toggle.gameObject.SetActive(true);
        toggle.interactable = true;
        wasUnlocked = true;
    }

    /// <summary>
    /// Determines whether mega research for a facility is unlocked by ownership.
    /// </summary>
    /// <param name="facilityId">Facility ID.</param>
    /// <returns>True when at least one unit has been created/purchased.</returns>
    private static bool IsMegaResearchUnlocked(string facilityId)
    {
        if (StaticInfinityData == null || string.IsNullOrEmpty(facilityId))
        {
            return false;
        }

        if (!FacilityCountAccessor.TryGetCount(StaticInfinityData, facilityId, out double[] counts) || counts == null || counts.Length < 2)
        {
            return false;
        }

        return counts[0] + counts[1] > 0;
    }

    /// <summary>
    /// Finds a toggle under a named direct child root.
    /// </summary>
    /// <param name="rootName">Direct child transform name.</param>
    /// <returns>Resolved toggle, or null.</returns>
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

    /// <summary>
    /// Rebinds a mega toggle to its authoritative save-setting callback.
    /// </summary>
    /// <param name="toggle">Toggle component.</param>
    /// <param name="handler">Value-changed callback.</param>
    private static void RebindMegaToggle(Toggle toggle, UnityEngine.Events.UnityAction<bool> handler)
    {
        if (toggle == null || handler == null)
        {
            return;
        }

        toggle.onValueChanged.RemoveAllListeners();
        toggle.onValueChanged.AddListener(handler);
    }

    /// <summary>
    /// Updates science-research auto flag.
    /// </summary>
    /// <param name="t">New toggle value.</param>
    public void ToggleScienceAR(bool t)
    {
        oracle.saveSettings.infinityAutoResearchToggleScience = t;
    }

    /// <summary>
    /// Updates money-research auto flag.
    /// </summary>
    /// <param name="t">New toggle value.</param>
    public void ToggleMoneyAR(bool t)
    {
        oracle.saveSettings.infinityAutoResearchToggleMoney = t;
    }

    /// <summary>
    /// Updates assembly-line research auto flag.
    /// </summary>
    /// <param name="t">New toggle value.</param>
    public void ToggleAssemblyAR(bool t)
    {
        oracle.saveSettings.infinityAutoResearchToggleAssembly = t;
    }

    /// <summary>
    /// Updates AI-manager research auto flag.
    /// </summary>
    /// <param name="t">New toggle value.</param>
    public void ToggleAiAR(bool t)
    {
        oracle.saveSettings.infinityAutoResearchToggleAi = t;
    }

    /// <summary>
    /// Updates server research auto flag.
    /// </summary>
    /// <param name="t">New toggle value.</param>
    public void ToggleServerAR(bool t)
    {
        oracle.saveSettings.infinityAutoResearchToggleServer = t;
    }

    /// <summary>
    /// Updates data-center research auto flag.
    /// </summary>
    /// <param name="t">New toggle value.</param>
    public void ToggleDataCenterAR(bool t)
    {
        oracle.saveSettings.infinityAutoResearchToggleDataCenter = t;
    }

    /// <summary>
    /// Updates planet research auto flag.
    /// </summary>
    /// <param name="t">New toggle value.</param>
    public void TogglePlanetAR(bool t)
    {
        oracle.saveSettings.infinityAutoResearchTogglePlanet = t;
    }

    /// <summary>
    /// Updates Matrioshka Brains research auto flag.
    /// </summary>
    /// <param name="t">New toggle value.</param>
    public void ToggleMatrioshkaAR(bool t)
    {
        oracle.saveSettings.infinityAutoResearchToggleMatrioshkaBrains = t;
    }

    /// <summary>
    /// Updates Birch Planets research auto flag.
    /// </summary>
    /// <param name="t">New toggle value.</param>
    public void ToggleBirchAR(bool t)
    {
        oracle.saveSettings.infinityAutoResearchToggleBirchPlanets = t;
    }

    /// <summary>
    /// Updates Galactic Brains research auto flag.
    /// </summary>
    /// <param name="t">New toggle value.</param>
    public void ToggleGalacticAR(bool t)
    {
        oracle.saveSettings.infinityAutoResearchToggleGalacticBrains = t;
    }
}
