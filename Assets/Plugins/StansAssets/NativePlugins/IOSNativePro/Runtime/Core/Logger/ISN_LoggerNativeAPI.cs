#if (UNITY_IPHONE || UNITY_TVOS)
using System.Runtime.InteropServices;

#endif

namespace SA.iOS.Utilities
{
    static class ISN_LoggerNativeAPI
    {
#if (UNITY_IPHONE || UNITY_TVOS)
        [DllImport("__Internal")]
        static extern void _ISN_NativeLog(string msg);

        [DllImport("__Internal")]
        static extern void _ISN_SetLogLevel(bool info, bool warning, bool error);

#endif

        public static void NativeLog(string msg)
        {
#if (UNITY_IPHONE || UNITY_TVOS)
            _ISN_NativeLog(msg);
#endif
        }

        public static void SetLogLevel(bool info, bool warning, bool error)
        {
#if (UNITY_IPHONE || UNITY_TVOS)
            _ISN_SetLogLevel(info, warning, error);
#endif
        }
    }
}
