using UnityEngine;
using UnityEngine.UI;
using static Expansion.Oracle;

public class HidePurchasedToggle : MonoBehaviour
{
    [SerializeField] private Toggle _toggle;

    private void Start()
    {
        _toggle.isOn = !oracle.saveSettings.hidePurchased;
    }

    public void UpdateToggle(bool toggle)
    {
        oracle.saveSettings.hidePurchased = !toggle;
    }
}