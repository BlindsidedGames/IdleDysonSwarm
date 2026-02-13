using System;
using Systems.Save;
using UnityEngine;
using UnityEngine.InputSystem;

/*
Purpose (runtime): Load screen + screensaver controller, also exposes unlock flags for UI.

Primary entry points:
- Unity: Awake (singleton), Start (init + refresh unlock flags), Update (screensaver), CloseLoadScreen.

Interacts with:
- Systems.Save.PlayerEntitlementsStore (debug entitlement).
- UnityEngine.PlayerPrefs ("doubleip" legacy).
- Expansion.Oracle.saveSettings (per-save debug enabled + double ip enabled).

Change notes:
- Debug entitlement is no longer sourced from PlayerPrefs("debug"); it migrates to PlayerEntitlementsStore.
*/
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
    private const string DoubleIpPrefKey = "doubleip";

    private void Start()
    {
        InvokeRepeating(nameof(RotateScreenSaverText), 0, 1);
        RefreshUnlockFlags();
    }

    private void RefreshUnlockFlags()
    {
        PlayerEntitlementsStore.EnsureLoaded();
        bool debugUnlocked = PlayerEntitlementsStore.DebugEntitlementPurchased;
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
        bool userInteracted = false;

        var mouse = Mouse.current;
        if (mouse != null && mouse.leftButton.wasPressedThisFrame) userInteracted = true;

        var touchscreen = Touchscreen.current;
        if (touchscreen != null && touchscreen.primaryTouch.press.wasPressedThisFrame) userInteracted = true;

        if (userInteracted) afkTime = 0;

        afkTime += Time.deltaTime;
        bool screensaverOn = Expansion.Oracle.oracle != null
            && Expansion.Oracle.oracle.saveSettings.screensaverEnabled
            && afkTime >= windowActivationTime;
        screensaverWindow.SetActive(screensaverOn);
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
