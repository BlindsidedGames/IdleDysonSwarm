using System;
using UnityEngine;
using UnityEngine.UI;
using static Oracle;

public class DebugPurchaseHandler : MonoBehaviour
{
    [SerializeField] private GameObject purchaseCategory;
    [SerializeField] private GameObject debugCategrory;
    [SerializeField] private Button currencyButton;
    [SerializeField] private Button purchaseButton;
    [SerializeField] private Text purchasedText;

    private void Start()
    {
        SetDebugState();
    }

    private void Update()
    {
        currencyButton.interactable = oracle.saveSettings.prestigePlus.points >= 100000 &&
                                      oracle.saveSettings.sdPrestige.strangeMatter >= 500000 && PlayerPrefs.GetInt("debug", 0) == 0;
    }

    public void SetDebugState()
    {
        var debugUnlocked = oracle.saveSettings.debugOptions || PlayerPrefs.GetInt("debug", 0) == 1;
        debugCategrory.SetActive(debugUnlocked);
        purchaseButton.interactable = !debugUnlocked;
        currencyButton.interactable = !debugUnlocked;
        //purchasedText.text = (PlayerPrefs.GetInt("debug", 0) == 1) ? "Purchased" : "100k Quantum shards and 500k Strange Matter";
        //purchaseCategory.SetActive(!debugUnlocked);
    }

    public void PurshaseWithInGameCurrency()
    {
        if (oracle.saveSettings.prestigePlus.points >= 100000 && oracle.saveSettings.sdPrestige.strangeMatter >= 500000)
        {
            oracle.saveSettings.prestigePlus.points -= 100000;
            oracle.saveSettings.sdPrestige.strangeMatter -= 500000;
            PurchaseSuccessful();
        }
    }

    public void PurchaseSuccessful()
    {
        oracle.saveSettings.debugOptions = true;
        PlayerPrefs.SetInt("debug", 1);
        SetDebugState();
    }
}