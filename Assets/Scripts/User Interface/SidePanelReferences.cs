using TMPro;
using UnityEngine;
using UnityEngine.UI;

/// <summary>
/// Holds all UI element references for a SidePanel instance.
/// </summary>
/// <remarks>
/// Purpose:
/// - A single serialized "bundle" of references that lets manager scripts target whichever SidePanel variant
///   (overlay vs permanent) is active without hardcoding hierarchy lookups.
///
/// Where it runs:
/// - Runtime (scene/prefab component).
///
/// Primary entry points:
/// - None. This is a pure references component; logic lives in the various managers.
///
/// Interacts with:
/// - Read by: <c>Assets/Scripts/User Interface/SidePanelController.cs</c> (selects active refs),
///   <c>Assets/Scripts/Systems/GameManager.cs</c> (skills fill/preset section refs),
///   <c>Assets/Scripts/User Interface/SkillTreeSettingsManager.cs</c> (preset toggles + tab preset automation via
///   Bots/Research tab buttons).
///
/// Change notes:
/// - Adding/removing fields requires updating prefab/scene wiring for both overlay and permanent variants.
/// - <see cref="botsTabButton"/> / <see cref="researchTabButton"/> are used to detect tab opens for preset automation.
/// </remarks>
public class SidePanelReferences : MonoBehaviour
{
    [Header("Panel Mode")]
    [Tooltip("When true, toggles are hidden since the panel is always visible")]
    public bool isPermanentPanel;

    [Header("Infinity Panel")]
    public GameObject infinityFillObject;
    public GameObject infinityToggle;
    public GameObject infinityImage;
    public GameObject infinityTextObject;
    public GameObject infinityMenuButtonObject;

    [Header("Prestige Panel")]
    public GameObject prestigeFillObject;
    public GameObject prestige;
    public GameObject prestigeToggle;
    public GameObject prestigeImage;
    public GameObject prestigeTextObject;
    public GameObject prestigeMenuButtonObject;

    [Header("Reality Panel")]
    public GameObject realityFillObject;
    public GameObject reality;
    public GameObject realityToggle;
    public GameObject realityImage;
    public GameObject realityTextObject;
    public GameObject realityMenuButtonObject;
    public GameObject simulations;
    public GameObject simulationsToggle;

    [Header("Skills Panel")]
    public GameObject skillsFillObject;
    public GameObject skillsFillBar;
    public GameObject skillsIcon;
    public Image skillsIconImage;
    public GameObject skillsToggle;
    public GameObject skillsTextObject;
    public TMP_Text skillTimersText;
    public GameObject skillsMenuButtonObject;
    public GameObject skillsPresetSwitchingSection;
    public TMP_Text skillsPresetFeedbackText;
    [Header("Skills Presets")]
    public GameObject skillsPresetTogglesRoot;
    public Toggle skillsPresetToggle1;
    public Toggle skillsPresetToggle2;
    public Toggle skillsPresetToggle3;
    public Toggle skillsPresetToggle4;
    public Toggle skillsPresetToggle5;
    public TMP_Text skillsPresetToggleText1;
    public TMP_Text skillsPresetToggleText2;
    public TMP_Text skillsPresetToggleText3;
    public TMP_Text skillsPresetToggleText4;
    public TMP_Text skillsPresetToggleText5;

    [Header("Main Tab Buttons")]
    [Tooltip("Main tab button that opens the Bots screen (used for preset automation).")]
    public Button botsTabButton;

    [Tooltip("Main tab button that opens the Research screen (used for preset automation).")]
    public Button researchTabButton;

    [Header("Offline Time")]
    public GameObject offlineTimeFillBarObject;
}
