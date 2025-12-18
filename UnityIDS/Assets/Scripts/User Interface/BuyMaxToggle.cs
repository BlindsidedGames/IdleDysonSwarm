using UnityEngine;
using UnityEngine.UI;
using static Expansion.Oracle;

public class BuyMaxToggle : MonoBehaviour
{
    [SerializeField] private Toggle _researchToggle;
    [SerializeField] private Toggle _botsToggle;


    private void Start()
    {
        _researchToggle.isOn = oracle.saveSettings.researchRoundedBulkBuy;
        _botsToggle.isOn = oracle.saveSettings.roundedBulkBuy;
    }

    public void UpdateResearchToggle(bool toggle)
    {
        oracle.saveSettings.researchRoundedBulkBuy = toggle;
    }

    public void UpdateRoundedBulkToggle(bool toggle)
    {
        oracle.saveSettings.roundedBulkBuy = toggle;
    }
}