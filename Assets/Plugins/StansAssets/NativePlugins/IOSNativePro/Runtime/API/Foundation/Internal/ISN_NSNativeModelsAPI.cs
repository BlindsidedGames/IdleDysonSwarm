////////////////////////////////////////////////////////////////////////////////
//
// @module IOS Native Plugin
// @author Osipov Stanislav (Stan's Assets)
// @support support@stansassets.com
// @website https://stansassets.com
//
////////////////////////////////////////////////////////////////////////////////

#if UNITY_IPHONE || UNITY_TVOS
#define API_ENABLED
#endif

using SA.iOS.Utilities;
#if API_ENABLED
using System.Runtime.InteropServices;

#endif

namespace SA.iOS.Foundation
{
    static class ISN_NSNativeModelsAPI
    {
#if API_ENABLED

        // NSSortDescriptor
        [DllImport("__Internal")]
        static extern ulong _ISN_NSSortDescriptor_Init(string key, bool ascending);
#endif

        // NSSortDescriptor
        public static ulong NSSortDescriptor_Init(string key, bool ascending)
        {
#if API_ENABLED
            return _ISN_NSSortDescriptor_Init(key, ascending);

#else
            return ISN_NativeObject.NullObjectHash;
#endif
        }
    }
}
