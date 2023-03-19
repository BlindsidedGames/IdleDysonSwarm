using UnityEngine;
using UnityEngine.UI;
using static Oracle;

public class ResearchBuyXSettings : MonoBehaviour
{
    [SerializeField] private Button one;
    [SerializeField] private Button ten;
    [SerializeField] private Button fifty;
    [SerializeField] private Button onehundred;
    [SerializeField] private Button max;

    private void Start()
    {
        one.onClick.AddListener(() => SetMode(ResearchBuyMode.Buy1, one));
        ten.onClick.AddListener(() => SetMode(ResearchBuyMode.Buy10, ten));
        fifty.onClick.AddListener(() => SetMode(ResearchBuyMode.Buy50, fifty));
        onehundred.onClick.AddListener(() => SetMode(ResearchBuyMode.Buy100, onehundred));
        max.onClick.AddListener(() => SetMode(ResearchBuyMode.BuyMax, max));
    }

    private void OnEnable()
    {
        SetButton();
    }

    public void SetButton()
    {
        switch (oracle.saveSettings.researchBuyMode)
        {
            case ResearchBuyMode.Buy1:
                SetMode(ResearchBuyMode.Buy1, one);
                break;
            case ResearchBuyMode.Buy10:
                SetMode(ResearchBuyMode.Buy10, ten);
                break;
            case ResearchBuyMode.Buy50:
                SetMode(ResearchBuyMode.Buy50, fifty);
                break;
            case ResearchBuyMode.Buy100:
                SetMode(ResearchBuyMode.Buy100, onehundred);
                break;
            case ResearchBuyMode.BuyMax:
                SetMode(ResearchBuyMode.BuyMax, max);
                break;
        }
    }

    private void SetMode(ResearchBuyMode m, Button b)
    {
        oracle.saveSettings.researchBuyMode = m;
        one.interactable = true;
        ten.interactable = true;
        fifty.interactable = true;
        onehundred.interactable = true;
        max.interactable = true;
        b.interactable = false;
    }
}