using System;
using UnityEngine;
using SA.iOS.Utilities;
using SA.Foundation.Templates;
using SA.Foundation.Events;
using SA.iOS.Foundation;
using StansAssets.Foundation;
using StansAssets.Foundation.Async;

#if UNITY_IPHONE
using System.Runtime.InteropServices;

#endif

namespace SA.iOS.AVFoundation.Internal
{
    class ISN_AVNativeAPI : ISN_Singleton<ISN_AVNativeAPI>, ISN_iAVAPI
    {
#if UNITY_IPHONE
        [DllImport("__Internal")]
        static extern int _ISN_AV_GetAuthorizationStatus(int mediaType);

        [DllImport("__Internal")]
        static extern void _ISN_AV_RequestAccessForMediaType(int mediaType);

        [DllImport("__Internal")]
        static extern string _ISN_AV_AudioSessionSetCategory(int category);

        [DllImport("__Internal")]
        static extern string _ISN_AV_AudioSessionSetCategoryWithOptions(int category, int options);

        [DllImport("__Internal")]
        static extern string _ISN_AV_AudioSessionSetActive(bool isActive);

        [DllImport("__Internal")]
        static extern string _ISN_AV_AudioSessionCategory();

        [DllImport("__Internal")]
        static extern int _ISN_AV_AudioSessionGetCategoryOptions();

        [DllImport("__Internal")]
        static extern int _ISN_AV_AudioSessionRecordPermission();

        [DllImport("__Internal")]
        static extern void _ISN_AV_AudioSessionRequestRecordPermission(IntPtr callback);

        [DllImport("__Internal")]
        static extern IntPtr _ISN_CopyCGImageAtTime(string movieUrl, double seconds);

#endif

        readonly SA_Event<ISN_AVAudioSessionRouteChangeReason> m_OnAudioSessionRouteChange = new SA_Event<ISN_AVAudioSessionRouteChangeReason>();
        public event Action<ISN_AVAudioSessionInterruption> AVAudioSessionInterruptionNotification;

        //--------------------------------------
        // ISN_AVCaptureDevice
        //--------------------------------------

        public ISN_AVAuthorizationStatus GetAuthorizationStatus(ISN_AVMediaType type)
        {
#if UNITY_IPHONE
            return (ISN_AVAuthorizationStatus)_ISN_AV_GetAuthorizationStatus((int)type);
#else
            return ISN_AVAuthorizationStatus.Authorized;
#endif
        }

        Action<ISN_AVAuthorizationStatus> m_RequestAccessCallback = null;

        public void RequestAccess(ISN_AVMediaType type, Action<ISN_AVAuthorizationStatus> callback)
        {
#if UNITY_IPHONE
            m_RequestAccessCallback = callback;
            _ISN_AV_RequestAccessForMediaType((int)type);
#else
            CoroutineUtility.WaitForSeconds(2f, () =>
            {
                callback.Invoke(ISN_AVAuthorizationStatus.Authorized);
            });
#endif
        }

        void OnRequestAccessCompleted(string data)
        {
            var index = Convert.ToInt32(data);
            var status = (ISN_AVAuthorizationStatus)index;
            m_RequestAccessCallback.Invoke(status);
        }

        //--------------------------------------
        // ISN_AVAudioSession
        //--------------------------------------

        public SA_Result AudioSessionSetCategory(ISN_AVAudioSessionCategory category)
        {
#if UNITY_IPHONE
            var resultString = _ISN_AV_AudioSessionSetCategory((int)category);
            var result = JsonUtility.FromJson<SA_Result>(resultString);
            return result;
#else
            return null;
#endif
        }

        public SA_Result AudioSessionSetCategoryWithOptions(ISN_AVAudioSessionCategory category, ISN_AVAudioSessionCategoryOptions options)
        {
#if UNITY_IPHONE
            var resultString = _ISN_AV_AudioSessionSetCategoryWithOptions((int)category, (int)options);
            var result = JsonUtility.FromJson<SA_Result>(resultString);
            return result;
#else
            return null;
#endif
        }

        public SA_Result AudioSessionSetActive(bool isActive)
        {
#if UNITY_IPHONE
            var resultString = _ISN_AV_AudioSessionSetActive(isActive);
            var result = JsonUtility.FromJson<SA_Result>(resultString);
            return result;
#else
            return null;
#endif
        }

        public ISN_AVAudioSessionCategory AudioSessionCategory
        {
            get
            {
#if UNITY_IPHONE
                var categoryName = _ISN_AV_AudioSessionCategory();
                return EnumUtility.ParseEnum<ISN_AVAudioSessionCategory>(categoryName);
#else
                return ISN_AVAudioSessionCategory.SoloAmbient;
#endif
            }
        }

        public ISN_AVAudioSessionCategoryOptions AudioSessionCategoryOptions
        {
            get
            {
#if UNITY_IPHONE
                return (ISN_AVAudioSessionCategoryOptions)_ISN_AV_AudioSessionGetCategoryOptions();
#else
                return ISN_AVAudioSessionCategoryOptions.MixWithOthers;
#endif
            }
        }

        public SA_iEvent<ISN_AVAudioSessionRouteChangeReason> OnAudioSessionRouteChange => m_OnAudioSessionRouteChange;

        void OnAudioSessionRouteChangeNotification(string data)
        {
            var index = Convert.ToInt32(data);
            var reason = (ISN_AVAudioSessionRouteChangeReason)index;
            m_OnAudioSessionRouteChange.Invoke(reason);
        }

        void OnAVAudioSessionInterruptionNotification(string data)
        {
            var index = Convert.ToInt32(data);
            var reason = (ISN_AVAudioSessionInterruption)index;
            AVAudioSessionInterruptionNotification?.Invoke(reason);
        }

        public Texture2D CopyCGImageAtTime(string movieUrl, double seconds)
        {
#if UNITY_IPHONE
            var handle = _ISN_CopyCGImageAtTime(movieUrl, seconds);
            var tex = new Texture2D(1, 1);
            tex.LoadImage(ISN_NSNativeUtils.GetPinnedData(handle));

            ISN_NSNativeUtils.ReleasePinnedData(handle);
            return tex;
#else
            return new Texture2D(0, 0);
#endif
        }

        public int AudioSessionGetRecordPermission()
        {
#if UNITY_IPHONE
            return _ISN_AV_AudioSessionRecordPermission();
#else
            return 0;
#endif
        }

        public void AudioSessionRequestRecordPermission(Action<bool> callback)
        {
#if UNITY_IPHONE
            _ISN_AV_AudioSessionRequestRecordPermission(ISN_MonoPCallback.ActionToIntPtr(callback));
#endif
        }
    }
}
