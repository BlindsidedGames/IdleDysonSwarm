using UnityEngine;

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
    public GameObject skillsToggle;
    public GameObject skillsTextObject;
    public GameObject skillsMenuButtonObject;

    [Header("Offline Time")]
    public GameObject offlineTimeFillBarObject;
}
