#if ((UNITY_IPHONE || UNITY_TVOS ) && GAME_KIT_API_ENABLED && !UNITY_EDITOR)
#define API_ENABLED
#endif

using System.Runtime.InteropServices;

namespace SA.iOS.GameKit
{
    static class GKAccessPointNative
    {
        const string k_DllName = "__Internal";

#if API_ENABLED
        [DllImport(k_DllName)]
        public static extern void _ISN_GKAccessPoint_setActive(bool active);

        [DllImport(k_DllName)]
        public static extern bool _ISN_GKAccessPoint_getActive();

        [DllImport(k_DllName)]
        public static extern void _ISN_GKAccessPoint_setLocation(int location);

        [DllImport(k_DllName)]
        public static extern int _ISN_GKAccessPoint_getLocation();

        [DllImport(k_DllName)]
        public static extern bool _ISN_GKAccessPoint_getVisible();

        [DllImport(k_DllName)]
        public static extern bool _ISN_GKAccessPoint_getIsPresentingGameCenter();

        [DllImport(k_DllName)]
        public static extern bool _ISN_GKAccessPoint_getShowHighlights();

        [DllImport(k_DllName)]
        public static extern void _ISN_GKAccessPoint_setShowHighlights(bool showHighlights);

#else
        public static void _ISN_GKAccessPoint_setActive(bool active) { }
        public static bool _ISN_GKAccessPoint_getActive() => false;
        public static void _ISN_GKAccessPoint_setLocation(int location) { }
        public static int _ISN_GKAccessPoint_getLocation() => 0;
        public static bool _ISN_GKAccessPoint_getVisible() => false;
        public static bool _ISN_GKAccessPoint_getIsPresentingGameCenter() => false;
        public static bool _ISN_GKAccessPoint_getShowHighlights() => false;
        public static void _ISN_GKAccessPoint_setShowHighlights(bool showHighlights) { }
#endif
    }
}
