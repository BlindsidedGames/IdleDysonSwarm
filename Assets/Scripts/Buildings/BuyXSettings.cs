using UnityEngine;
using UnityEngine.UI;
using static Oracle;

public class BuyXSettings : MonoBehaviour
{
    [SerializeField] private Button one;
    [SerializeField] private Button ten;
    [SerializeField] private Button fifty;
    [SerializeField] private Button onehundred;
    [SerializeField] private Button max;

    private void Start()
    {
        one.onClick.AddListener(() => SetMode(BuyMode.Buy1, one));
        ten.onClick.AddListener(() => SetMode(BuyMode.Buy10, ten));
        fifty.onClick.AddListener(() => SetMode(BuyMode.Buy50, fifty));
        onehundred.onClick.AddListener(() => SetMode(BuyMode.Buy100, onehundred));
        max.onClick.AddListener(() => SetMode(BuyMode.BuyMax, max));
    }

    private void OnEnable()
    {
        SetButton();
    }

    public void SetButton()
    {
        switch (oracle.saveSettings.buyMode)
        {
            case BuyMode.Buy1:
                SetMode(BuyMode.Buy1, one);
                break;
            case BuyMode.Buy10:
                SetMode(BuyMode.Buy10, ten);
                break;
            case BuyMode.Buy50:
                SetMode(BuyMode.Buy50, fifty);
                break;
            case BuyMode.Buy100:
                SetMode(BuyMode.Buy100, onehundred);
                break;
            case BuyMode.BuyMax:
                SetMode(BuyMode.BuyMax, max);
                break;
        }
    }

    private void SetMode(BuyMode m, Button b)
    {
        oracle.saveSettings.buyMode = m;
        one.interactable = true;
        ten.interactable = true;
        fifty.interactable = true;
        onehundred.interactable = true;
        max.interactable = true;
        b.interactable = false;
    }
}