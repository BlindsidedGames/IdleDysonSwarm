using System;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.Purchasing;

public class LoadScreenMethods : MonoBehaviour
{
    [SerializeField] private GameObject _LoadScreen;

    // ScreenSaver
    [SerializeField] private GameObject rotateMe;
    [SerializeField] private GameObject screensaverWindow;


    [SerializeField] private string path;
    [SerializeField, Range(1, 5)] private int size = 1;
    private readonly float windowActivationTime = 300;
    private float afkTime;

    public bool gotDebug;
    public bool gotDoubleIp;
    private readonly string doubleIP = "ids.doubleip";
    private readonly string debug = "ids.devoptions";

    private void Start()
    {
        InvokeRepeating(nameof(RotateScreenSaverText), 0, 1);
        if (CodelessIAPStoreListener.Instance.StoreController.products.WithID(doubleIP).hasReceipt) {
            SetDoubleIp();
        }
        if (CodelessIAPStoreListener.Instance.StoreController.products.WithID(debug).hasReceipt) {
            SetDebug();
        }
    }

    public void SetDebug()
    {
        gotDebug = true;
    }
    public void SetDoubleIp()
    {
        gotDoubleIp = true;
    }

    private void Update()
    {
        var mouse = Mouse.current;
        if (mouse != null && mouse.leftButton.wasPressedThisFrame) afkTime = 0;

        afkTime += Time.deltaTime;
        screensaverWindow.SetActive(afkTime >= windowActivationTime);
    }

    private void RotateScreenSaverText()
    {
        rotateMe.transform.Rotate(0, 0, -45);
    }

    [ContextMenu("TakeScreenshot")]
    private void TakeScreenshot()
    {
        path += "Screenshot ";
        path += Guid.NewGuid() + ".png";

        ScreenCapture.CaptureScreenshot(path, size);
        Debug.Log("screenshot");
    }


    public void CloseLoadScreen()
    {
        _LoadScreen.SetActive(false);
    }
    #region StaticClass

    public static LoadScreenMethods lsm;

    private void Awake()
    {
        if (lsm == null) {
            lsm = this;
            DontDestroyOnLoad(gameObject);
        }
        else {
            Destroy(gameObject);
        }
    }

    #endregion
}