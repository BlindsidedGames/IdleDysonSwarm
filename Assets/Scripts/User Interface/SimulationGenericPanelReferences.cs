using IdleDysonSwarm.UI.Simulation;
using MPUIKIT;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

/// <summary>
/// Holds all UI element references for a Simulation Generic Panel prefab instance.
/// Attach this to the root of each Simulation panel to enable standardized access
/// to fill bars, buttons, and text elements.
/// </summary>
public class SimulationGenericPanelReferences : MonoBehaviour
{
    [Header("Panel Configuration")]
    [Tooltip("The type of panel - determines which UI elements are active and button text")]
    public SimulationPanelType panelType;

    [Header("Panel Title")]
    [Tooltip("Main title text (e.g., 'Hunters', 'Community')")]
    public TMP_Text titleText;

    [Header("Fill Bars")]
    [Tooltip("Container for all fill bars (for SetActive when hiding entire lower section)")]
    public GameObject fillBarArea;

    [Tooltip("Primary fill bar GameObject (for SetActive)")]
    public GameObject fillBar1;

    [Tooltip("Primary fill bar MPImage (for fillAmount)")]
    public MPImage fill1;

    [Tooltip("Primary fill bar text GameObject (for SetActive)")]
    public GameObject fillBar1TextObject;

    [Tooltip("Primary fill bar timer/value text")]
    public TMP_Text fillBar1Text;

    [Tooltip("Secondary fill bar GameObject (for SetActive)")]
    public GameObject fillBar2;

    [Tooltip("Secondary fill bar MPImage (for fillAmount)")]
    public MPImage fill2;

    [Tooltip("Secondary fill bar text GameObject (for SetActive)")]
    public GameObject fillBar2TextObject;

    [Tooltip("Secondary fill bar timer/value text")]
    public TMP_Text fillBar2Text;

    [Tooltip("Additional text in fill bar area (toggle via .gameObject.SetActive)")]
    public TMP_Text additionalText;

    [Header("Action Button")]
    [Tooltip("Main action button (Boost/Purchase/Start)")]
    public Button actionButton;

    [Tooltip("Action button label text")]
    public TMP_Text actionButtonText;

    [Header("Info Panel")]
    [Tooltip("Info panel title text")]
    public TMP_Text infoTitleText;

    [Tooltip("Info panel description text")]
    public TMP_Text infoDescriptionText;

    /// <summary>
    /// Configures which UI elements are active based on the panel type.
    /// Call this in Start() or when panel type changes.
    /// </summary>
    public void ConfigureUIElements()
    {
        bool hasButton = panelType == SimulationPanelType.ProductionBasic
                      || panelType == SimulationPanelType.ProductionBoost
                      || panelType == SimulationPanelType.LinearResearch
                      || panelType == SimulationPanelType.EnergyGenerator
                      || panelType == SimulationPanelType.SwarmStats;

        bool hasFillBar2 = panelType == SimulationPanelType.ProductionBoost
                        || panelType == SimulationPanelType.ConversionDual
                        || panelType == SimulationPanelType.SpaceFactoryCap
                        || panelType == SimulationPanelType.RailgunDual;

        // Hide fill bar text for panels that don't need it
        bool hasFillBar1Text = panelType != SimulationPanelType.EnergyGenerator
                            && panelType != SimulationPanelType.SwarmStats
                            && panelType != SimulationPanelType.RocketDisplay;

        // SwarmStats, EnergyGenerator, and RocketDisplay hide fill bars and show additionalText instead
        bool showFillBars = panelType != SimulationPanelType.SwarmStats
                         && panelType != SimulationPanelType.EnergyGenerator
                         && panelType != SimulationPanelType.RocketDisplay;
        bool showAdditionalText = panelType == SimulationPanelType.SwarmStats
                               || panelType == SimulationPanelType.EnergyGenerator
                               || panelType == SimulationPanelType.RocketDisplay;

        if (actionButton != null)
            actionButton.gameObject.SetActive(hasButton);

        // Fill bar 1 visibility
        if (fillBar1 != null)
            fillBar1.SetActive(showFillBars);

        if (fillBar1TextObject != null)
            fillBar1TextObject.SetActive(hasFillBar1Text && showFillBars);

        if (fill1 != null)
            fill1.gameObject.SetActive(showFillBars);

        // Fill bar 2 visibility
        if (fillBar2 != null)
            fillBar2.SetActive(hasFillBar2 && showFillBars);

        if (fillBar2TextObject != null)
            fillBar2TextObject.SetActive(hasFillBar2 && showFillBars);

        if (fill2 != null)
            fill2.gameObject.SetActive(hasFillBar2 && showFillBars);

        // Additional text (for SwarmStats)
        if (additionalText != null)
            additionalText.gameObject.SetActive(showAdditionalText);

        // Set action button text based on panel type
        if (actionButtonText != null && hasButton)
        {
            actionButtonText.text = panelType switch
            {
                SimulationPanelType.ProductionBasic => "+",
                SimulationPanelType.ProductionBoost => "Boost",
                SimulationPanelType.LinearResearch => "Start",
                SimulationPanelType.EnergyGenerator => "+",
                SimulationPanelType.SwarmStats => "Black Hole",
                _ => "+"
            };
        }
    }
}
