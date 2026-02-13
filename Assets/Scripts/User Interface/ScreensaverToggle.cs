using UnityEngine;
using UnityEngine.UI;
using static Expansion.Oracle;

/// <summary>
/// Syncs a UI Toggle with the screensaver-enabled setting.
/// Registers its own listener — no Inspector wiring needed for On Value Changed.
/// </summary>
public class ScreensaverToggle : MonoBehaviour
{
    [SerializeField] private Toggle _toggle;

    private void Start()
    {
        _toggle.isOn = oracle.saveSettings.screensaverEnabled;
        _toggle.onValueChanged.AddListener(UpdateToggle);
    }

    private void OnDestroy()
    {
        _toggle.onValueChanged.RemoveListener(UpdateToggle);
    }

    private void UpdateToggle(bool value)
    {
        oracle.saveSettings.screensaverEnabled = value;
    }
}
