using System;
using UnityEngine;
using UnityEngine.SceneManagement;

public class LoadScreenMethods : MonoBehaviour
{
    [SerializeField] private GameObject _LoadScreen;

    [SerializeField] private GameObject playfabBackGround;
    [SerializeField] private GameObject dysonVersePlayFabScreen;
    [SerializeField] private GameObject normalPlayfabScreen;

    // ScreenSaver
    [SerializeField] private GameObject rotateMe;
    [SerializeField] private GameObject screensaverWindow;


    [SerializeField] private string path;
    [SerializeField] [Range(1, 5)] private int size = 1;
    private readonly float windowActivationTime = 300;
    private float afkTime;

    private void Start()
    {
        InvokeRepeating(nameof(RotateScreenSaverText), 0, 1);
#if UNITY_IOS || UNITY_ANDROID
        SceneManager.LoadScene(Screen.width > Screen.height ? 2 : 1);
#else
        SceneManager.LoadScene(2);
#endif
    }

    private void Update()
    {
        if (Input.GetMouseButtonDown(0)) afkTime = 0;

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

    public void OpenPlayfabDysonVerse()
    {
        playfabBackGround.SetActive(true);
        dysonVersePlayFabScreen.SetActive(true);
        normalPlayfabScreen.SetActive(false);
    }

    public void ClosePlayfabDysonVerse()
    {
        playfabBackGround.SetActive(false);
        dysonVersePlayFabScreen.SetActive(false);
        normalPlayfabScreen.SetActive(false);
    }

    #region StaticClass

    public static LoadScreenMethods lsm;

    private void Awake()
    {
        if (lsm == null)
        {
            lsm = this;
            DontDestroyOnLoad(gameObject);
        }
        else
        {
            Destroy(gameObject);
        }
    }

    #endregion
}