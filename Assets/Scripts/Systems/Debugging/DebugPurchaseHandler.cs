using System.Collections;
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

    private void OnEnable()
    {
        DebugOptionsChanged += HandleDebugOptionsChanged;
        StartCoroutine(RefreshWhenOracleReady());
    }

    private void OnDisable()
    {
        DebugOptionsChanged -= HandleDebugOptionsChanged;
    }

    private void Start()
    {
        RefreshState();
        SetTipTextUnavailable();
    }

    private void Update()
    {
        currencyButton.interactable = false;
    }

    public void SetDebugState()
    {
        RefreshState();
    }

    public void RefreshState()
    {
        if (oracle == null || oracle.saveSettings == null) return;

        bool debugUnlocked = oracle.saveSettings.debugOptions;
        debugCategrory.SetActive(debugUnlocked);
        purchaseDebugButton.interactable = false;
        currencyButton.interactable = false;
        purchasedDebugText.text = debugUnlocked ? "Purchased" : "Unavailable";
        SetDoubleIpState();
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
        PlayerPrefs.Save();
        NotifyDebugOptionsChanged();
        RefreshState();
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

    private void HandleDebugOptionsChanged()
    {
        RefreshState();
    }

    private IEnumerator RefreshWhenOracleReady()
    {
        yield return new WaitUntil(() => oracle != null && oracle.saveSettings != null);
        RefreshState();
    }
}
