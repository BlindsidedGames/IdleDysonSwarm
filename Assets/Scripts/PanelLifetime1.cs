using TMPro;
using UnityEngine;
using UnityEngine.UI;
using static Oracle;


public class PanelLifetime1 : MonoBehaviour
{
    [SerializeField] private Button _btn;
    [SerializeField] private TMP_Text cost;
    [SerializeField] private double _cost = 1e9f;
    [SerializeField] private int upgrade;
    [SerializeField] private int panelLifetimeToGive;
    private DysonVerseInfinityData dvid => oracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData;
    private DysonVerseSaveData dvsd => oracle.saveSettings.dysonVerseSaveData;

    private void Start()
    {
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
                    _btn.interactable = _cost <= dvid.science;
                else
                    _btn.interactable = false;
                break;
            }
            case 2:
            {
                if (!dvid.panelLifetime2)
                    _btn.interactable = _cost <= dvid.science;
                else
                    _btn.interactable = false;
                break;
            }
            case 3:
            {
                if (!dvid.panelLifetime3)
                    _btn.interactable = _cost <= dvid.science;
                else
                    _btn.interactable = false;
                break;
            }
            case 4:
            {
                if (!dvid.panelLifetime4)
                    _btn.interactable = _cost <= dvid.science;
                else
                    _btn.interactable = false;
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
            //dvid.panelLifetime += panelLifetimeToGive;
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
                cost.text = dvid.panelLifetime1
                    ? "Purchased"
                    : $"<sprite=1>{CalcUtils.FormatNumber(1000000000)}";
                break;
            }
            case 2:
            {
                cost.text = dvid.panelLifetime2
                    ? "Purchased"
                    : $"<sprite=1>{CalcUtils.FormatNumber(_cost)}";
                break;
            }
            case 3:
            {
                cost.text = dvid.panelLifetime3
                    ? "Purchased"
                    : $"<sprite=1>{CalcUtils.FormatNumber(_cost)}";
                break;
            }
            case 4:
            {
                cost.text = dvid.panelLifetime4
                    ? "Purchased"
                    : $"<sprite=1>{CalcUtils.FormatNumber(_cost)}";
                break;
            }
        }
    }
}