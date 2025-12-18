////////////////////////////////////////////////////////////////////////////////
//
// @module IOS Native Plugin
// @author Koretsky Konstantin (Stan's Assets)
// @support support@stansassets.com
// @website https://stansassets.com
//
////////////////////////////////////////////////////////////////////////////////

using System;
using UnityEngine;
using SA.Foundation.Events;

namespace SA.iOS.Foundation
{
    class ISN_NSEditorAPI : ISN_NSAPI
    {
        readonly SA_Event<ISN_NSStoreDidChangeExternallyNotification> m_StoreDidChangeReceived = new SA_Event<ISN_NSStoreDidChangeExternallyNotification>();

        public void SetString(string key, string val)
        {
            PlayerPrefs.SetString(key, val);
        }

        public bool Synchronize()
        {
            return true;
        }

        public ISN_NSKeyValueObject KeyValueStoreObjectForKey(string key)
        {
            var val = PlayerPrefs.GetString(key);
            if (string.IsNullOrEmpty(val)) return null;

            var obj = new ISN_NSKeyValueObject(key, val);
            return obj;
        }

        void OnStoreDidChange(string data, Action<ISN_NSStoreDidChangeExternallyNotification> callback) { }

        public void ResetCloud()
        {
            PlayerPrefs.DeleteAll();
        }

        public SA_Event<ISN_NSStoreDidChangeExternallyNotification> StoreDidChangeReceiveResponse => m_StoreDidChangeReceived;

        //--------------------------------------
        // Time Zone
        //--------------------------------------

        public void ResetSystemTimeZone() { }

        public ISN_NSTimeZone LocalTimeZone => new ISN_NSTimeZone();
        public ISN_NSTimeZone SystemTimeZone => new ISN_NSTimeZone();
        public ISN_NSTimeZone DefaultTimeZone => new ISN_NSTimeZone();
        public string UbiquityIdentityToken => string.Empty;

        //--------------------------------------
        // Locale
        //--------------------------------------

        public ISN_NSLocale CurrentLocale => new ISN_NSLocale();
        public ISN_NSLocale AutoUpdatingCurrentLocale => new ISN_NSLocale();
        public string PreferredLanguage => "en";
    }
}
