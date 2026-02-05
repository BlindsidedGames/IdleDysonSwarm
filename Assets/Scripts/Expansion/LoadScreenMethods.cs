using System;
using UnityEngine;
using UnityEngine.InputSystem;

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
    private const string DebugPrefKey = "debug";
    private const string DoubleIpPrefKey = "doubleip";

    private void Start()
    {
        InvokeRepeating(nameof(RotateScreenSaverText), 0, 1);
        RefreshUnlockFlags();
    }

    private void RefreshUnlockFlags()
    {
        bool debugUnlocked = PlayerPrefs.GetInt(DebugPrefKey, 0) == 1;
        bool doubleIpUnlocked = PlayerPrefs.GetInt(DoubleIpPrefKey, 0) == 1;

        if (Expansion.Oracle.oracle != null)
        {
            debugUnlocked |= Expansion.Oracle.oracle.saveSettings.debugOptions;
            doubleIpUnlocked |= Expansion.Oracle.oracle.saveSettings.doubleIp;
        }

        gotDebug = debugUnlocked;
        gotDoubleIp = doubleIpUnlocked;
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
