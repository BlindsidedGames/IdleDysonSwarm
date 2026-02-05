using TMPro;
using UnityEngine;
using UnityEngine.UI;
using static Expansion.Oracle;

public class DebugPurchaseHandler : MonoBehaviour
{
    [SerializeField] private GameObject debugCategrory;

    [SerializeField] private GameObject Store;

    [SerializeField] private Button currencyButton;
    [SerializeField] private Button purchaseDebugButton;
    [SerializeField] private TMP_Text purchasedDebugText;

    [SerializeField] private Button purchaseDoubleIpButton;
    [SerializeField] private TMP_Text purchasedDoubleIpText;

    [SerializeField] private TMP_Text purchasedTip1Text;
    [SerializeField] private TMP_Text purchasedTip2Text;
    [SerializeField] private TMP_Text purchasedTip3Text;
    private const string DebugPrefKey = "debug";
    private const string DoubleIpPrefKey = "doubleip";

    private void Start()
    {
        SetDebugState();
        SetDoubleIpState();
        SetTipTextUnavailable();
    }

    private void Update()
    {
        currencyButton.interactable = false;
    }

    public void SetDebugState()
    {
        bool debugUnlocked = oracle.saveSettings.debugOptions || PlayerPrefs.GetInt(DebugPrefKey, 0) == 1;
        debugCategrory.SetActive(debugUnlocked);
        purchaseDebugButton.interactable = false;
        currencyButton.interactable = false;
        purchasedDebugText.text = debugUnlocked ? "Purchased" : "Unavailable";

        //purchasedText.text = (PlayerPrefs.GetInt("debug", 0) == 1) ? "Purchased" : "100k Quantum shards and 500k Strange Matter";
        //purchaseCategory.SetActive(!debugUnlocked);
    }

    public void SetDoubleIpState()
    {
        bool doubleIpUnlocked = oracle.saveSettings.doubleIp || PlayerPrefs.GetInt(DoubleIpPrefKey, 0) == 1;
        purchaseDoubleIpButton.interactable = false;
        purchasedDoubleIpText.text = doubleIpUnlocked ? "Purchased" : "Unavailable";
    }

    public void PurshaseWithInGameCurrency()
    {
        if (oracle.saveSettings.prestigePlus.points >= 100000 && oracle.saveSettings.sdPrestige.strangeMatter >= 500000)
        {
            oracle.saveSettings.prestigePlus.points -= 100000;
            oracle.saveSettings.sdPrestige.strangeMatter -= 500000;
            PurchaseDevOptionsSuccessful();
        }
    }

    public void PurchaseDevOptionsSuccessful()
    {
        oracle.saveSettings.debugOptions = true;
        PlayerPrefs.SetInt(DebugPrefKey, 1);
        SetDebugState();
    }
    public void PurchaseDoubleIpSuccessful()
    {
        oracle.saveSettings.doubleIp = true;
        PlayerPrefs.SetInt(DoubleIpPrefKey, 1);
        SetDoubleIpState();
    }

    private void SetTipTextUnavailable()
    {
        if (purchasedTip1Text != null) purchasedTip1Text.text = "Unavailable";
        if (purchasedTip2Text != null) purchasedTip2Text.text = "Unavailable";
        if (purchasedTip3Text != null) purchasedTip3Text.text = "Unavailable";
    }
}
