using Buildings;
using Research;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using static Expansion.Oracle;


public class PanelLifetime1 : MonoBehaviour
{
    public BuildingReferences references;
    [SerializeField] private double _cost = 1e9f;
    [SerializeField] private int upgrade;
    [SerializeField] private int panelLifetimeToGive;
    private DysonVerseInfinityData dvid => oracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData;

    private void Start()
    {
        references.purchaseButton.onClick.AddListener(PurchaseUpgrade);
        UpdateText();
        InvokeRepeating("UpdateText", 0, 1f);
    }

    private void Update()
    {
        switch (upgrade)
        {
            case 0:
            {
                Debug.Log("setmeup");
                break;
            }
            case 1:
            {
                if (!dvid.panelLifetime1)
                    references.purchaseButton.interactable = _cost <= dvid.science;
                else
                    references.purchaseButton.interactable = false;
                break;
            }
            case 2:
            {
                if (!dvid.panelLifetime2)
                    references.purchaseButton.interactable = _cost <= dvid.science;
                else
                    references.purchaseButton.interactable = false;
                break;
            }
            case 3:
            {
                if (!dvid.panelLifetime3)
                    references.purchaseButton.interactable = _cost <= dvid.science;
                else
                    references.purchaseButton.interactable = false;
                break;
            }
            case 4:
            {
                if (!dvid.panelLifetime4)
                    references.purchaseButton.interactable = _cost <= dvid.science;
                else
                    references.purchaseButton.interactable = false;
                break;
            }
        }
    }

    private void OnEnable()
    {
        ResearchAutoBuy.researchPanelLifetime += EventPurchaseUpgrade;
    }

    private void OnDisable()
    {
        ResearchAutoBuy.researchPanelLifetime -= EventPurchaseUpgrade;
    }

    private void EventPurchaseUpgrade(int upgradeEvent)
    {
        if (upgradeEvent == upgrade) PurchaseUpgrade();
    }

    public void PurchaseUpgrade()
    {
        if (_cost <= dvid.science)
        {
            switch (upgrade)
            {
                case 0:
                {
                    Debug.Log("setmeup");
                    break;
                }
                case 1:
                {
                    dvid.panelLifetime1 = true;
                    break;
                }
                case 2:
                {
                    dvid.panelLifetime2 = true;
                    break;
                }
                case 3:
                {
                    dvid.panelLifetime3 = true;
                    break;
                }
                case 4:
                {
                    dvid.panelLifetime4 = true;
                    break;
                }
            }

            FindObjectOfType<GameManager>().UpdatePanelLifetime();
            dvid.science -= _cost;
            UpdateText();
        }
    }

    private void UpdateText()
    {
        switch (upgrade)
        {
            case 0:
            {
                Debug.Log("setmeup");
                break;
            }
            case 1:
            {
                references.buttonCost.text = dvid.panelLifetime1
                    ? "Purchased"
                    : $"<sprite=1>{CalcUtils.FormatNumber(1000000000)}";
                break;
            }
            case 2:
            {
                references.buttonCost.text = dvid.panelLifetime2
                    ? "Purchased"
                    : $"<sprite=1>{CalcUtils.FormatNumber(_cost)}";
                break;
            }
            case 3:
            {
                references.buttonCost.text = dvid.panelLifetime3
                    ? "Purchased"
                    : $"<sprite=1>{CalcUtils.FormatNumber(_cost)}";
                break;
            }
            case 4:
            {
                references.buttonCost.text = dvid.panelLifetime4
                    ? "Purchased"
                    : $"<sprite=1>{CalcUtils.FormatNumber(_cost)}";
                break;
            }
        }
    }
}