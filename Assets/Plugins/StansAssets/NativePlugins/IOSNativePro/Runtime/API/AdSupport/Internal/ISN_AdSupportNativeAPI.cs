#if UNITY_IPHONE && !UNITY_EDITOR && AS_SUPPORT_API_ENABLED
 #define API_ENABLED
#endif

#if API_ENABLED
using System.Runtime.InteropServices;
#endif

namespace SA.iOS.AdSupport.Internal
{
    /// <summary>
    /// This is api for getting data from native iOS
    /// </summary>
    class ISN_AdSupportNativeAPI
    {
#if API_ENABLED
        [DllImport("__Internal")] static extern string _ISN_GetAdvertisingIdentifier();
        [DllImport("__Internal")] static extern bool _ISN_AdvertisingTrackingEnabled();
#else
        static string _ISN_GetAdvertisingIdentifier()
        {
            return string.Empty;
        }

        static bool _ISN_AdvertisingTrackingEnabled()
        {
            return false;
        }
#endif

        /// <summary>
        /// Get AdvertisingIdentifier from ASIdentifierManager native api.
        /// </summary>
        internal static string AdvertisingIdentifier => _ISN_GetAdvertisingIdentifier();

        /// <summary>
        /// Get AdvertisingTrackingEnabled from ASIdentifierManager
        /// value that indicates whether the user has limited ad tracking.
        /// </summary>
        internal static bool AdvertisingTrackingEnabled => _ISN_AdvertisingTrackingEnabled();
    }
}
