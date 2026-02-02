using TMPro;
using UnityEngine;
using UnityEngine.UI;

/// <summary>
/// Holds all UI element references for a SidePanel instance.
/// This component lives on each panel variant (Overlay and Permanent)
/// and allows the manager scripts to dynamically switch which panel they control.
/// </summary>
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
    public GameObject skillsMenuButtonObject;
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

    [Header("Offline Time")]
    public GameObject offlineTimeFillBarObject;
}
