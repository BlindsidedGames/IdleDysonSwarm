#if UNITY_IPHONE && AT_SUPPORT_API_ENABLED
#define API_ENABLED
#endif

using System;
using SA.iOS.Utilities;

#if API_ENABLED
using System.Runtime.InteropServices;
#endif

namespace SA.iOS.AppTrackingTransparency
{
    static class ISN_ATLib
    {
#if API_ENABLED
        [DllImport("__Internal")]
        static extern void _ISN_ATTrackingManager_RequestTrackingAuthorizationWithCompletionHandler(IntPtr callback);

        [DllImport("__Internal")]
        static extern int _ISN_ATTrackingManager_TrackingAuthorizationStatus();
#endif

        public static void RequestTrackingAuthorizationWithCompletionHandle(Action<int> callback)
        {
#if API_ENABLED
            _ISN_ATTrackingManager_RequestTrackingAuthorizationWithCompletionHandler(ISN_MonoPCallback.ActionToIntPtr(callback));
#endif
        }

        public static ISN_ATTrackingManager.AuthorizationStatus TrackingAuthorizationStatus()
        {
#if API_ENABLED
        return (ISN_ATTrackingManager.AuthorizationStatus) _ISN_ATTrackingManager_TrackingAuthorizationStatus();
#else
        return 0;
#endif 
        }
    }
}
