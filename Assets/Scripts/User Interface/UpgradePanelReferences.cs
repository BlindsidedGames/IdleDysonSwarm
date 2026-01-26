using TMPro;
using UnityEngine;
using UnityEngine.UI;

/// <summary>
/// Holds UI element references for an upgrade panel.
/// Attach this to the root of each upgrade panel to enable standardized access.
/// </summary>
public class UpgradePanelReferences : MonoBehaviour
{
    [Tooltip("Panel title text")]
    public TMP_Text titleText;

    [Tooltip("Panel description text")]
    public TMP_Text descriptionText;

    [Tooltip("Purchase button")]
    public Button purchaseButton;

    /// <summary>
    /// Sets the button interactable state based on whether the player can afford the upgrade.
    /// </summary>
    public void SetInteractable(bool canAfford)
    {
        if (purchaseButton != null)
            purchaseButton.interactable = canAfford;
    }

    /// <summary>
    /// Shows or hides this panel.
    /// </summary>
    public void SetVisible(bool visible)
    {
        gameObject.SetActive(visible);
    }
}
