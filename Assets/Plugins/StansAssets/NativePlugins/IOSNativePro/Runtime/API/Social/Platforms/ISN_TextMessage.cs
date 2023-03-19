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
using SA.iOS.Utilities;

namespace SA.iOS.Social
{
    public static class ISN_TextMessage
    {
        //--------------------------------------
        //  PUBLIC METHODS
        //--------------------------------------

        static ISN_TextMessage()
        {
            NativeListener.Instantiate();
        }

        public static event Action<ISN_MessageComposeResult> OnTextMessageResult = delegate { };

        public static void Send(string body, string recipient, Action<ISN_MessageComposeResult> callback = null)
        {
            Send(body, new string[] { recipient }, new Texture2D[] { }, callback);
        }

        public static void Send(string body, string recipient, Texture2D image, Action<ISN_MessageComposeResult> callback = null)
        {
            Send(body, new string[] { recipient }, new Texture2D[] { image }, callback);
        }

        public static void Send(string body, string recipient, Texture2D[] images, Action<ISN_MessageComposeResult> callback = null)
        {
            Send(body, new string[] { recipient }, images, callback);
        }

        public static void Send(string body, string[] recipients, Action<ISN_MessageComposeResult> callback = null)
        {
            Send(body, recipients, new Texture2D[] { }, callback);
        }

        public static void Send(string body, string[] recipients, Texture2D image, Action<ISN_MessageComposeResult> callback = null)
        {
            Send(body, recipients, new Texture2D[] { image }, callback);
        }

        public static void Send(string body, string[] recipients, Texture2D[] images, Action<ISN_MessageComposeResult> callback = null)
        {
            if (body == null) body = string.Empty;

            if (recipients == null) recipients = new string[] { };

            if (images == null) images = new Texture2D[] { };

            if (callback != null) OnTextMessageResult += callback;

            var encodedRecipients = ISN_SocialConverter.SerializeArray(recipients);

            var media = new List<string>();
            foreach (var image in images)
            {
                var val = image.EncodeToPNG();
                media.Add(Convert.ToBase64String(val));
            }

            var encodedMedia = ISN_SocialConverter.SerializeArray(media.ToArray());

            Internal.ISN_SendTextMessage(body, encodedRecipients, encodedMedia);
        }

        //--------------------------------------
        //  SUPPORT CLASSES
        //--------------------------------------

        class NativeListener : ISN_Singleton<NativeListener>
        {
            void OnTextMessageComposeResult(string data)
            {
                var code = Convert.ToInt32(data);

                OnTextMessageResult((ISN_MessageComposeResult)code);
                OnTextMessageResult = delegate { };
            }
        }

        static class Internal
        {
#if (UNITY_IPHONE && !UNITY_EDITOR && SOCIAL_API_ENABLED) || SA_DEBUG_MODE
            [DllImport ("__Internal")]
            private static extern void _ISN_SendTextMessage(string body, string recipients, string encodedMedia);
#endif

            public static void ISN_SendTextMessage(string body, string recipients, string encodedMedia)
            {
#if (UNITY_IPHONE && !UNITY_EDITOR && SOCIAL_API_ENABLED) || SA_DEBUG_MODE
                _ISN_SendTextMessage( body, recipients, encodedMedia);
#endif
            }
        }
    }
}
