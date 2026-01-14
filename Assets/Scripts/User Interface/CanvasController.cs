using UnityEngine;
using static Expansion.Oracle;

public class CanvasController : MonoBehaviour
{
    [SerializeField] private GameObject gameplayOverlay;

    [SerializeField] private GameObject galaxyOverlay;

    [SerializeField] private GameObject tutorial1;

    [SerializeField] private GameObject tutorial2;
    // [SerializeField] private TMP_Text fps;

    private void Start()
    {
        if (!oracle.saveSettings.tutorial)
            tutorial1.SetActive(true);
        //tutorial2.SetActive(true);
    }

    private void Update()
    {
        // var fpsn = 1f / Time.deltaTime;
        // fps.text = fpsn.ToString("F0");
// #if UNITY_EDITOR
        #if UNITY_IOS
        if (Screen.orientation == ScreenOrientation.Portrait ||
            Screen.orientation == ScreenOrientation.PortraitUpsideDown)
        {
            gameplayOverlay.SetActive(true);
            galaxyOverlay.SetActive(false);
        }
        else
        {
            gameplayOverlay.SetActive(false);
            galaxyOverlay.SetActive(true);
        }
        #elif UNITY_ANDROID
        if (Screen.orientation == ScreenOrientation.Portrait ||
            Screen.orientation == ScreenOrientation.PortraitUpsideDown)
        {
            gameplayOverlay.SetActive(true);
            galaxyOverlay.SetActive(false);
        }
        else
        {
            gameplayOverlay.SetActive(false);
            galaxyOverlay.SetActive(true);
        }
        #else
        gameplayOverlay.SetActive(true);
        galaxyOverlay.SetActive(true);
        #endif
// #else
//         if (Input.deviceOrientation == DeviceOrientation.Portrait ||
//             Input.deviceOrientation == DeviceOrientation.PortraitUpsideDown)
//         {
//             gameplayOverlay.SetActive(true);
//             galaxyOverlay.SetActive(false);
//         }
//         else
//         {
//             gameplayOverlay.SetActive(false);
//             galaxyOverlay.SetActive(true);
//         }
// #endif
    }

    public void FinishTutorial()
    {
        tutorial1.SetActive(false);
        tutorial2.SetActive(false);

        oracle.saveSettings.tutorial = true;
    }
}