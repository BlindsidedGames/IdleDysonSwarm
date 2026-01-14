using UnityEngine;

public class PlatformEnabler : MonoBehaviour
{
    [SerializeField] private GameObject ios;
    [SerializeField] private GameObject gplay;

    private void Awake()
    {
#if UNITY_IOS
        ios.SetActive(true);
        //gplay.SetActive(false);

#elif UNITY_ANDROID
        ios.SetActive(false);
        //gplay.SetActive(true);
#endif
    }
}