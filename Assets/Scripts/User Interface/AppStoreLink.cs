using UnityEngine;

public class AppStoreLink : MonoBehaviour
{
#if UNITY_IOS
        private readonly string appleAppStore = "https://apps.apple.com/au/developer/blindsided-games/id1538856129";
#endif
#if UNITY_ANDROID
         private string googleAppStore = "https://play.google.com/store/apps/dev?id=8315705273233616064";
#endif

    public void OpenDeveloperAppStorePage()
    {
#if UNITY_IOS
        Application.OpenURL(appleAppStore);
#endif
#if UNITY_ANDROID
            Application.OpenURL(googleAppStore);
#endif
    }
}