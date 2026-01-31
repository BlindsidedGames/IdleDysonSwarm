using TMPro;
using UnityEngine;
using UnityEngine.Purchasing;
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
    private readonly string doubleIP = "ids.doubleip";
    private readonly string debug = "ids.devoptions";

    private StoreController _storeController;

    private void Start()
    {
        SetDebugState();
        SetDoubleIpState();
        CheckProductEntitlements();
    }

    private void CheckProductEntitlements()
    {
        _storeController = UnityIAPServices.StoreController();
        _storeController.OnCheckEntitlement += OnCheckEntitlement;

        var products = _storeController.GetProducts();
        foreach (var product in products)
        {
            if (product.definition.id == doubleIP || product.definition.id == debug)
            {
                _storeController.CheckEntitlement(product);
            }
        }
    }

    private void OnCheckEntitlement(Entitlement entitlement)
    {
        bool isEntitled = entitlement.Status == EntitlementStatus.FullyEntitled ||
                          entitlement.Status == EntitlementStatus.EntitledButNotFinished ||
                          entitlement.Status == EntitlementStatus.EntitledUntilConsumed;

        if (!isEntitled) return;

        string productId = entitlement.Product.definition.id;
        if (productId == doubleIP)
        {
            PurchaseDoubleIpSuccessful();
        }
        else if (productId == debug)
        {
            PurchaseDevOptionsSuccessful();
        }
    }

    private void OnDestroy()
    {
        if (_storeController != null)
        {
            _storeController.OnCheckEntitlement -= OnCheckEntitlement;
        }
    }

    public void OnDebugProductFetched(Product product)
    {
        bool debugUnlocked = oracle.saveSettings.debugOptions || PlayerPrefs.GetInt("debug", 0) == 1;
        purchasedDebugText.text = debugUnlocked ? "Purchased" : product.metadata.localizedPriceString;
    }
    public void OnDoubleIpProductFetched(Product product)
    {
        bool doubleIpUnlocked = oracle.saveSettings.doubleIp || PlayerPrefs.GetInt("doubleip", 0) == 1;
        purchasedDoubleIpText.text = doubleIpUnlocked ? "Purchased" : product.metadata.localizedPriceString;
    }
    public void OnTip1ProductFetched(Product product)
    {
        purchasedTip1Text.text = product.metadata.localizedPriceString;
    }
    public void OnTip2ProductFetched(Product product)
    {
        purchasedTip2Text.text = product.metadata.localizedPriceString;
    }
    public void OnTip3ProductFetched(Product product)
    {
        purchasedTip3Text.text = product.metadata.localizedPriceString;
    }

    private void Update()
    {
        currencyButton.interactable = oracle.saveSettings.prestigePlus.points >= 100000 &&
                                      oracle.saveSettings.sdPrestige.strangeMatter >= 500000 && PlayerPrefs.GetInt("debug", 0) == 0;
    }

    public void SetDebugState()
    {
        bool debugUnlocked = oracle.saveSettings.debugOptions || PlayerPrefs.GetInt("debug", 0) == 1;
        debugCategrory.SetActive(debugUnlocked);
        purchaseDebugButton.interactable = !debugUnlocked;
        currencyButton.interactable = !debugUnlocked;
        if (debugUnlocked)
        {
            purchasedDebugText.text = "Purchased";
        }

        //purchasedText.text = (PlayerPrefs.GetInt("debug", 0) == 1) ? "Purchased" : "100k Quantum shards and 500k Strange Matter";
        //purchaseCategory.SetActive(!debugUnlocked);
    }

    public void SetDoubleIpState()
    {
        bool doubleIpUnlocked = oracle.saveSettings.doubleIp || PlayerPrefs.GetInt("doubleip", 0) == 1;
        purchaseDoubleIpButton.interactable = !doubleIpUnlocked;
        if (doubleIpUnlocked)
        {
            purchasedDoubleIpText.text = "Purchased";
        }
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
        PlayerPrefs.SetInt("debug", 1);
        SetDebugState();
    }
    public void PurchaseDoubleIpSuccessful()
    {
        oracle.saveSettings.doubleIp = true;
        PlayerPrefs.SetInt("doubleip", 1);
        SetDoubleIpState();
    }
}