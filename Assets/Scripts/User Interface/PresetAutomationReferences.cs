using TMPro;
using UnityEngine;
using UnityEngine.UI;

/// <summary>
/// References container for "preset automation" UI.
/// </summary>
/// <remarks>
/// Purpose:
/// - Groups the 6-toggle UI used by tab automation (Preset 1-5 + Off) so callers only need a single reference.
/// - Tab open detection is handled elsewhere (via <c>SidePanelReferences</c>) so this component can be reused per tab.
///
/// Where it runs:
/// - Runtime (scene/prefab component).
///
/// Primary entry points:
/// - None. This is a pure references component; logic is owned by <c>SkillTreeSettingsManager</c>.
///
/// Interacts with:
/// - Called by: <c>Assets/Scripts/User Interface/SkillTreeSettingsManager.cs</c>.
/// - Calls into: none.
///
/// Change notes:
/// - Serialized fields are wired in prefabs/scenes. Renaming or changing these fields requires updating the Unity
///   serialized references.
/// </remarks>
public sealed class PresetAutomationReferences : MonoBehaviour
{
    [Header("Preset Toggles (1-5)")]
    public Toggle presetToggle1;
    public Toggle presetToggle2;
    public Toggle presetToggle3;
    public Toggle presetToggle4;
    public Toggle presetToggle5;

    [Header("Off Toggle")]
    [Tooltip("When selected, tab automation is disabled for this tab.")]
    public Toggle offToggle;

    [Header("Preset Labels (1-5)")]
    [Tooltip("Label texts for Preset 1-5. Content is set in code based on preset names.")]
    public TMP_Text presetLabel1;
    public TMP_Text presetLabel2;
    public TMP_Text presetLabel3;
    public TMP_Text presetLabel4;
    public TMP_Text presetLabel5;

    [Header("Off Label")]
    [Tooltip("Label text for Off. The text content is authored in the prefab; code only hides/shows it.")]
    public TMP_Text offLabel;
}
