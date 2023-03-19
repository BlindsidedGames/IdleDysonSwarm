using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.SceneManagement;
using static Oracle;

public class DeviceRotationManager : MonoBehaviour
{
    private void Update()
    {
#if UNITY_IOS || UNITY_ANDROID
        switch (SceneManager.GetActiveScene().buildIndex)
        {
            case 1:
                if (Screen.width > Screen.height)
                {
                    oracle.Save();
                    SceneManager.LoadScene(2);
                }

                break;
            case 2:
                if (Screen.width < Screen.height)
                {
                    oracle.Save();
                    SceneManager.LoadScene(1);
                }

                break;
        }
#endif
    }
}