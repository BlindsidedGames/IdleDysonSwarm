#if ((UNITY_IPHONE || UNITY_TVOS || UNITY_STANDALONE_OSX ) && GAME_KIT_API_ENABLED)
#define API_ENABLED
#endif

using System.Runtime.InteropServices;

namespace SA.iOS.GameKit
{
    class ISN_GKLocalPlayerNative
    {
#if UNITY_IPHONE || UNITY_TVOS
        const string k_DllName = "__Internal";
#else
        private const string k_DllName = "ISN_GameKit";
#endif

#if API_ENABLED
        [DllImport(k_DllName)]
        public static extern bool _ISN_GKLocalPlayer_isAuthenticated();

        [DllImport(k_DllName)]
        public static extern bool _ISN_GKLocalPlayer_isUnderage();
#else
        public static bool _ISN_GKLocalPlayer_isAuthenticated() => false;
        public static bool _ISN_GKLocalPlayer_isUnderage() => false;
#endif
    }
}
