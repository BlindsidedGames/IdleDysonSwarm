using UnityEngine;

public class TipsEnablerPlatforms : MonoBehaviour
{
    [SerializeField] private GameObject mobile;
    [SerializeField] private GameObject pc;

    private void Awake()
    {
#if UNITY_IOS
        mobile.SetActive(true);
#elif UNITY_ANDROID
        mobile.SetActive(true);
#else
        pc.SetActive(true);
#endif
    }
}