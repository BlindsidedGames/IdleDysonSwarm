#if ((UNITY_IPHONE && !UNITY_EDITOR) || SA_DEVELOPMENT_PROJECT) && MEDIA_PLAYER_API_ENABLED
#define API_ENABLED
#endif

using System;
using SA.iOS.Utilities;
#if API_ENABLED
using System.Runtime.InteropServices;

#endif

namespace SA.iOS.MediaPlayer
{
    static class ISN_MPNativeAPI
    {
#if API_ENABLED
        [DllImport("__Internal")]
        static extern ulong _ISN_MPMediaPickerController_Init();

        [DllImport("__Internal")]
        static extern bool _ISN_MPMediaPickerController_getAllowsPickingMultipleItems(ulong hash);

        [DllImport("__Internal")]
        static extern void _ISN_MPMediaPickerController_setAllowsPickingMultipleItems(ulong hash, bool allowsPickingMultipleItems);

        [DllImport("__Internal")]
        static extern void _ISN_MPMediaPickerController_setDelegate(ulong hash, IntPtr didCancel, IntPtr didPickMediaItems);
#endif

        public static ulong MPMediaPickerController_Init()
        {
#if API_ENABLED
            return _ISN_MPMediaPickerController_Init();
#else
            return ISN_NativeObject.NullObjectHash;
#endif
        }

        public static bool MPMediaPickerController_getAllowsPickingMultipleItems(ulong hash)
        {
#if API_ENABLED
            return _ISN_MPMediaPickerController_getAllowsPickingMultipleItems(hash);
#else
            return false;
#endif
        }

        public static void MPMediaPickerController_setAllowsPickingMultipleItems(ulong hash, bool allowsPickingMultipleItems)
        {
#if API_ENABLED
            _ISN_MPMediaPickerController_setAllowsPickingMultipleItems(hash, allowsPickingMultipleItems);
#endif
        }

        public static void MPMediaPickerController_setDelegate(ulong hash, Action didCancel, Action<ulong> didPickMediaItems)
        {
#if API_ENABLED
            _ISN_MPMediaPickerController_setDelegate(
                hash,
                ISN_MonoPCallback.ActionToIntPtr(didCancel),
                ISN_MonoPCallback.ActionToIntPtr(didPickMediaItems));
#endif
        }
    }
}
