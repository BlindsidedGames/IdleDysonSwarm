#if UNITY_IPHONE && !UNITY_EDITOR && PHOTOS_API_ENABLED
#define API_ENABLED
#endif

using System;
using SA.iOS.Utilities;

#if API_ENABLED
using System.Runtime.InteropServices;
#endif

namespace SA.iOS.Photos
{
    static class ISN_PHNativeAPI
    {
#if API_ENABLED
        [DllImport("__Internal")]
        static extern int _ISN_PH_GetAuthorizationStatus();

        [DllImport("__Internal")]
        static extern void _ISN_PH_RequestAuthorization(IntPtr byteArrPtr);

        // PHFetchOptions
        [DllImport("__Internal")]
        static extern ulong _ISN_PHFetchOption_Init();

        [DllImport("__Internal")]
        static extern void _ISN_PHFetchOption_setFetchLimit(ulong hash, int fetchLimit);

        [DllImport("__Internal")]
        static extern void _ISN_PHFetchOption_setSortDescriptor(ulong hash, ulong descriptorHash);

        // PHAsset
        [DllImport("__Internal")]
        static extern ulong _ISN_PHAsset_fetchAssetsWithOptions(ulong optionsHash);

        [DllImport("__Internal")]
        static extern string _ISN_PHAsset_localIdentifier(ulong hash);

        //PHFetchResult
        [DllImport("__Internal")]
        static extern ulong _ISN_PHFetchResult_firstObject(ulong hash);

#endif

        public static ISN_PHAuthorizationStatus GetAuthorizationStatus()
        {
#if API_ENABLED
            return (ISN_PHAuthorizationStatus)_ISN_PH_GetAuthorizationStatus();
#else
            return ISN_PHAuthorizationStatus.Authorized;
#endif
        }

        public static void RequestAuthorization(Action<ISN_PHAuthorizationStatus> callback)
        {
#if API_ENABLED
            _ISN_PH_RequestAuthorization(ISN_MonoPCallback.ActionToIntPtr<string>(data =>
            {
                var index = Convert.ToInt32(data);
                var status = (ISN_PHAuthorizationStatus) index;
                callback.Invoke(status);
            }));
#else
            callback.Invoke(ISN_PHAuthorizationStatus.Authorized);
#endif
        }

        // PHFetchOptions
        public static ulong PHFetchOption_Init()
        {
#if API_ENABLED
            return _ISN_PHFetchOption_Init();

#else
            return ISN_NativeObject.NullObjectHash;
#endif
        }

        public static void PHFetchOption_setFetchLimit(ulong hash, int fetchLimit)
        {
#if API_ENABLED
            _ISN_PHFetchOption_setFetchLimit(hash, fetchLimit);
#endif
        }

        public static void PHFetchOption_setSortDescriptor(ulong hash, ulong descriptorHash)
        {
#if API_ENABLED
            _ISN_PHFetchOption_setSortDescriptor(hash, descriptorHash);
#endif
        }

        // PHAsset
        public static ulong PHAsset_fetchAssetsWithOptions(ulong optionsHash)
        {
#if API_ENABLED
            return _ISN_PHAsset_fetchAssetsWithOptions(optionsHash);

#else
            return ISN_NativeObject.NullObjectHash;
#endif
        }

        public static string PHAsset_localIdentifier(ulong hash)
        {
#if API_ENABLED
           return _ISN_PHAsset_localIdentifier(hash);
#else
            return string.Empty;
#endif
        }

        // PHFetchResult
        public static ulong PHFetchResult_firstObject(ulong hash)
        {
#if API_ENABLED
            return _ISN_PHFetchResult_firstObject(hash);

#else
            return ISN_NativeObject.NullObjectHash;
#endif
        }
    }
}
