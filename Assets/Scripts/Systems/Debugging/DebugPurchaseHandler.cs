using System.Collections;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using Systems.Save;
using static Expansion.Oracle;

/*
Purpose (runtime): Handles purchase-gating of debug/dev options via in-game currency and updates
the associated UI state in the purchase/store panel.

Primary entry points:
- Unity: OnEnable/OnDisable (subscribe), Start (initial refresh), RefreshState() (recompute UI).
- UI: PurshaseWithInGameCurrency() (button click; legacy method name used by UnityEvents).

Interacts with:
- Expansion.Oracle (saveSettings, DebugOptionsChanged event, NotifyDebugOptionsChanged()).
- Systems.Save.PlayerEntitlementsStore (debug entitlement persistence across wipes).
- UnityEngine.PlayerPrefs ("doubleip" legacy).

Change notes:
- Costs are hard-coded here; if you change the intended price, keep this file in sync with
  `Assets/Scripts/User Interface/DebugOptions.cs`.
- Do not grant debug entitlement without updating PlayerEntitlementsStore.
*/
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
    private const string DoubleIpPrefKey = "doubleip";

    private const long DevOptionsQuantumShardCost = 100_000;
    private const long DevOptionsStrangeMatterCost = 500_000;

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

    public void SetDebugState()
    {
        RefreshState();
    }

    public void RefreshState()
    {
        if (oracle == null || oracle.saveSettings == null) return;

        bool debugUnlocked = oracle.saveSettings.debugOptions;
        bool debugEntitled = PlayerEntitlementsStore.DebugEntitlementPurchased;
        if (debugCategrory != null) debugCategrory.SetActive(debugUnlocked);
        purchaseDebugButton.interactable = false;
        if (currencyButton != null)
            currencyButton.interactable = !debugUnlocked && (debugEntitled || CanAffordDevOptions());

        if (purchasedDebugText != null)
        {
            if (debugEntitled) purchasedDebugText.text = "Purchased";
            else purchasedDebugText.text = CanAffordDevOptions() ? "Available" : "Unavailable";
        }
        SetDoubleIpState();
    }

    public void SetDoubleIpState()
    {
        bool doubleIpUnlocked = oracle.saveSettings.doubleIp || PlayerPrefs.GetInt(DoubleIpPrefKey, 0) == 1;
        purchaseDoubleIpButton.interactable = false;
        purchasedDoubleIpText.text = doubleIpUnlocked ? "Purchased" : "Unavailable";
    }

    private bool CanAffordDevOptions()
    {
        if (oracle == null || oracle.saveSettings == null) return false;
        return oracle.saveSettings.prestigePlus.points >= DevOptionsQuantumShardCost
               && oracle.saveSettings.sdPrestige.strangeMatter >= DevOptionsStrangeMatterCost;
    }

    public void PurshaseWithInGameCurrency()
    {
        if (oracle == null || oracle.saveSettings == null) return;
        if (oracle.saveSettings.debugOptions) return;

        if (PlayerEntitlementsStore.DebugEntitlementPurchased)
        {
            // Entitlement exists; enabling is free.
            oracle.saveSettings.debugOptions = true;
            oracle.saveSettings.debugEverEnabled = true;
            NotifyDebugOptionsChanged();
            RefreshState();
            return;
        }

        if (!CanAffordDevOptions())
        {
            RefreshState();
            return;
        }

        oracle.saveSettings.prestigePlus.points -= DevOptionsQuantumShardCost;
        oracle.saveSettings.sdPrestige.strangeMatter -= DevOptionsStrangeMatterCost;
        PlayerEntitlementsStore.DebugEntitlementPurchased = true;
        PurchaseDevOptionsSuccessful();
    }

    public void PurchaseDevOptionsSuccessful()
    {
        oracle.saveSettings.debugOptions = true;
        oracle.saveSettings.debugEverEnabled = true;
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
