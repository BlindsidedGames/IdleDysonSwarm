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

#if (UNITY_IPHONE && !UNITY_EDITOR && SOCIAL_API_ENABLED) || SA_DEBUG_MODE
using System.Runtime.InteropServices;
#endif

namespace SA.iOS.Social
{
    public static class ISN_Whatsapp
    {
        //--------------------------------------
        //  PUBLIC METHODS
        //--------------------------------------

        public static void Post(string message)
        {
            Internal.ISN_WP_ShareText(message);
        }

        public static void Post(Texture2D image)
        {
            var val = image.EncodeToPNG();
            var encodedMedia = Convert.ToBase64String(val);

            Internal.ISN_WP_ShareMedia(encodedMedia);
        }

        //--------------------------------------
        //  SUPPORT CLASSES
        //--------------------------------------

        static class Internal
        {
#if (UNITY_IPHONE && !UNITY_EDITOR && SOCIAL_API_ENABLED) || SA_DEBUG_MODE
            [DllImport ("__Internal")]
            private static extern void _ISN_WP_ShareText(string message);

            [DllImport ("__Internal")]
            private static extern void _ISN_WP_ShareMedia(string encodedMedia);

#endif

            public static void ISN_WP_ShareText(string message)
            {
#if (UNITY_IPHONE && !UNITY_EDITOR && SOCIAL_API_ENABLED) || SA_DEBUG_MODE
                _ISN_WP_ShareText(message);
#endif
            }

            public static void ISN_WP_ShareMedia(string encodedMedia)
            {
#if (UNITY_IPHONE && !UNITY_EDITOR && SOCIAL_API_ENABLED) || SA_DEBUG_MODE
                _ISN_WP_ShareMedia(encodedMedia);
#endif
            }
        }
    }
}
