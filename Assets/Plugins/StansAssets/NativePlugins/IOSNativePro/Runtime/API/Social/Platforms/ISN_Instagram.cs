////////////////////////////////////////////////////////////////////////////////
//
// @module IOS Native Plugin
// @author Osipov Stanislav (Stan's Assets)
// @support support@stansassets.com
// @website https://stansassets.com
//
////////////////////////////////////////////////////////////////////////////////

using System;
using UnityEngine;
using System.Collections.Generic;
#if (UNITY_IPHONE && !UNITY_EDITOR && SOCIAL_API_ENABLED) || SA_DEBUG_MODE
using System.Runtime.InteropServices;
#endif
using SA.Foundation.Templates;
using SA.iOS.Utilities;

namespace SA.iOS.Social
{
    public static class ISN_Instagram
    {
        public static event Action OnPostStart = delegate { };
        public static event Action<SA_Result> OnPostResult = delegate { };

        //--------------------------------------
        //  INITIALIZATION
        //--------------------------------------

        static ISN_Instagram()
        {
            NativeListener.Instantiate();
        }

        //--------------------------------------
        //  PUBLIC METHODS
        //--------------------------------------

        public static void Post(Texture2D image, Action<SA_Result> callback = null)
        {
            Post(image, null, callback);
        }

        public static void Post(Texture2D image, string message, Action<SA_Result> callback = null)
        {
            if (message == null) message = string.Empty;

            if (callback != null) OnPostResult += callback;

            if (Application.platform == RuntimePlatform.IPhonePlayer) OnPostStart();

            var val = image.EncodeToPNG();
            var encodedMedia = Convert.ToBase64String(val);

            Internal.ISN_InstaShare(encodedMedia, message);
        }

        //--------------------------------------
        //  SUPPORT CLASSES
        //--------------------------------------

        class NativeListener : ISN_Singleton<NativeListener>
        {
            void OnInstaPostSuccess()
            {
                var result = new SA_Result();
                OnPostResult(result);
            }

            void OnInstaPostFailed(string data)
            {
                var code = Convert.ToInt32(data);

                var error = new SA_Error(code, "Posting Failed");
                var result = new SA_Result(error);
                OnPostResult(result);
            }
        }

        static class Internal
        {
#if (UNITY_IPHONE && !UNITY_EDITOR && SOCIAL_API_ENABLED) || SA_DEBUG_MODE
            [DllImport ("__Internal")]
            private static extern void _ISN_InstaShare(string encodedMedia, string message);
#endif

            public static void ISN_InstaShare(string encodedMedia, string message)
            {
#if (UNITY_IPHONE && !UNITY_EDITOR && SOCIAL_API_ENABLED) || SA_DEBUG_MODE
                _ISN_InstaShare(encodedMedia, message);
#endif
            }
        }
    }
}
