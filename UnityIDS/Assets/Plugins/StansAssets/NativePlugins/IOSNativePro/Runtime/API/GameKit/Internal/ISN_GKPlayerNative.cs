#if ((UNITY_IPHONE || UNITY_TVOS || UNITY_STANDALONE_OSX ) && GAME_KIT_API_ENABLED)
#define API_ENABLED
#endif

using System;
using System.Runtime.InteropServices;

namespace SA.iOS.GameKit
{
    class ISN_GKPlayerNative
    {
#if UNITY_IPHONE || UNITY_TVOS
        const string k_DllName = "__Internal";
#else
        private const string k_DllName = "ISN_GameKit";
#endif

#if API_ENABLED
        [DllImport(k_DllName)]
        public static extern string _ISN_GKPlayer_playerId(ulong hash);

        [DllImport(k_DllName)]
        public static extern string _ISN_GKPlayer_guestIdentifier(ulong hash);

        [DllImport(k_DllName)]
        public static extern string _ISN_GKPlayer_teamPlayerID(ulong hash);

        [DllImport(k_DllName)]
        public static extern string _ISN_GKPlayer_gamePlayerID(ulong hash);

        [DllImport(k_DllName)]
        public static extern string _ISN_GKPlayer_alias(ulong hash);

        [DllImport(k_DllName)]
        public static extern string _ISN_GKPlayer_displayName(ulong hash);

        [DllImport(k_DllName)]
        public static extern bool _ISN_GKPlayer_scopedIDsArePersistent(ulong hash);

        [DllImport(k_DllName)]
        public static extern void _ISN_GKPlayer_LoadPhotoForSize(ulong hash, int size, IntPtr callback);
#else
        public static string _ISN_GKPlayer_playerId(ulong hash) => string.Empty;
        public static string _ISN_GKPlayer_guestIdentifier(ulong hash) => string.Empty;
        public static string _ISN_GKPlayer_teamPlayerID(ulong hash) => string.Empty;
        public static string _ISN_GKPlayer_gamePlayerID(ulong hash) => string.Empty;

        public static string _ISN_GKPlayer_alias(ulong hash) => string.Empty;
        public static string _ISN_GKPlayer_displayName(ulong hash) => string.Empty;

        public static bool _ISN_GKPlayer_scopedIDsArePersistent(ulong hash) => false;

        public static void _ISN_GKPlayer_LoadPhotoForSize(ulong hash, int size, IntPtr callback) { }
#endif
    }
}
