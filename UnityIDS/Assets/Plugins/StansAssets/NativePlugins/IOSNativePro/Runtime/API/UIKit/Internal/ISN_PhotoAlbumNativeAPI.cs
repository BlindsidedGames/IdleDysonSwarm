using System;
using SA.Foundation.Templates;
using SA.iOS.Utilities;
using UnityEngine;
#if UNITY_IPHONE
using System.Runtime.InteropServices;

#endif

namespace SA.iOS.UIKit
{
    static class ISN_PhotoAlbumNativeAPI
    {
#if UNITY_IPHONE
        [DllImport("__Internal")]
        static extern void _ISN_UIImageWriteToSavedPhotosAlbum(int length, IntPtr byteArrPtr, IntPtr callback);

        [DllImport("__Internal")]
        static extern bool _ISN_UIVideoAtPathIsCompatibleWithSavedPhotosAlbum(string videoPath);

        [DllImport("__Internal")]
        static extern void _ISN_UISaveVideoAtPathToSavedPhotosAlbum(string videoPath, IntPtr callback);
#endif

        public static void UIImageWriteToSavedPhotosAlbum(Texture2D texture, Action<SA_Result> callback)
        {
#if UNITY_IPHONE
            var data = texture.EncodeToPNG();
            var handle = GCHandle.Alloc(data, GCHandleType.Pinned);
            _ISN_UIImageWriteToSavedPhotosAlbum(
                data.Length,
                handle.AddrOfPinnedObject(),
                ISN_MonoPCallback.ActionToIntPtr<SA_Result>(callback.Invoke));

            handle.Free();
#endif
        }

        public static bool UIVideoAtPathIsCompatibleWithSavedPhotosAlbum(string videoPath)
        {
#if UNITY_IPHONE
            return _ISN_UIVideoAtPathIsCompatibleWithSavedPhotosAlbum(videoPath);

#else
            return false;
#endif
        }

        public static void UISaveVideoAtPathToSavedPhotosAlbum(string videoPath, Action<SA_Result> callback)
        {
#if UNITY_IPHONE
            _ISN_UISaveVideoAtPathToSavedPhotosAlbum(
                videoPath,
                ISN_MonoPCallback.ActionToIntPtr<SA_Result>(callback.Invoke));
#endif
        }
    }
}
