using System;
#if UNITY_IPHONE || UNITY_TVOS
using System.Runtime.InteropServices;

#endif

namespace SA.iOS.Foundation
{
    static class ISN_NSNativeUtils
    {
#if UNITY_IPHONE || UNITY_TVOS
        [DllImport("__Internal")]
        static extern IntPtr _ISN_GetNSMutableData(IntPtr handle, out int size);

        [DllImport("__Internal")]
        static extern IntPtr _ISN_ReleaseNSMutableData(IntPtr handle);
#endif

        public static byte[] GetPinnedData(IntPtr handle)
        {
#if UNITY_IPHONE || UNITY_TVOS
            var size = 0;
            var pointer = _ISN_GetNSMutableData(handle, out size);

            var data = new byte[size];
            Marshal.Copy(pointer, data, 0, size);
            return data;
#else
            return new byte[0];
#endif
        }

        public static void ReleasePinnedData(IntPtr handle)
        {
#if UNITY_IPHONE || UNITY_TVOS
            _ISN_ReleaseNSMutableData(handle);
#endif
        }
    }
}
