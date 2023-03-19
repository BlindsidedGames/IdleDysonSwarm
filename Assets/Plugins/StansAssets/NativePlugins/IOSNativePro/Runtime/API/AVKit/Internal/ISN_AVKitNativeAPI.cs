using UnityEngine;
#if (UNITY_IPHONE || UNITY_IOS || UNITY_TVOS) && AVKIT_API_ENABLED
using System.Runtime.InteropServices;
#endif
using SA.iOS.Utilities;

namespace SA.iOS.AVKit.Internal
{
    class ISN_AVKitNativeAPI : ISN_Singleton<ISN_AVKitNativeAPI>, ISN_iAVKitAPI
    {
#if (UNITY_IPHONE || UNITY_IOS || UNITY_TVOS) && AVKIT_API_ENABLED
        [DllImport("__Internal")]
        static extern void _ISN_AV_ShowPlayerViewController(string json);
#endif

        public void ShowPlayerViewController(ISN_AVPlayerViewController controller)
        {
#if (UNITY_IPHONE || UNITY_IOS || UNITY_TVOS) && AVKIT_API_ENABLED
            _ISN_AV_ShowPlayerViewController(JsonUtility.ToJson(controller));
#endif
        }
    }
}
