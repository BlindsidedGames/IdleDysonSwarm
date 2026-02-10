using UnityEngine;
using UnityEngine.UI;

/// <summary>
/// Toggles a target GameObject on and off.
/// Can optionally auto-wire a <see cref="Button"/> on the same GameObject to drive the toggle.
/// </summary>
public class MenuToggleController : MonoBehaviour
{
    [SerializeField] private GameObject toToggle;

    [Tooltip("When true, automatically finds or uses the assigned Button to toggle the target.")]
    [SerializeField] private bool useButton;

    [Tooltip("Optional manual button reference. If Use Button is true and this is null, " +
             "the component will look for a Button on the same GameObject.")]
    [SerializeField] private Button button;

    private void Awake()
    {
        if (!useButton) return;

        if (button == null)
            button = GetComponent<Button>();

        if (button != null)
            button.onClick.AddListener(Toggle);
    }

    private void OnDestroy()
    {
        if (button != null)
            button.onClick.RemoveListener(Toggle);
    }

    /// <summary>Toggles the target object based on its current active state.</summary>
    public void Toggle()
    {
        if (toToggle != null)
            toToggle.SetActive(!toToggle.activeSelf);
    }

    /// <summary>Explicitly sets the target object's active state.</summary>
    public void Toggle(bool hide)
    {
        if (toToggle != null)
            toToggle.SetActive(!hide);
    }
}