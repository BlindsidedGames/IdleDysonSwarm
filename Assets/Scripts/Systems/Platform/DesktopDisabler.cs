using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class DesktopDisabler : MonoBehaviour
{
    [SerializeField] private GameObject desktop;
    [SerializeField] private GameObject desktopEnable;

    private void Awake()
    {
#if UNITY_IOS
if (desktopEnable != null)
        {
            desktopEnable.SetActive(false);
        }
#elif UNITY_ANDROID
if (desktopEnable != null)
        {
            desktopEnable.SetActive(false);
        }
#else
        if (desktop != null) desktop.SetActive(false);
        if (desktopEnable != null) desktopEnable.SetActive(true);
#endif
    }
}