////////////////////////////////////////////////////////////////////////////////
//
// @module IOS Native Plugin
// @author Koretsky Konstantin (Stan's Assets)
// @support support@stansassets.com
// @website https://stansassets.com
//
////////////////////////////////////////////////////////////////////////////////

#if UNITY_IPHONE || UNITY_TVOS || UNITY_STANDALONE_OSX
#define API_ENABLED
#endif

using SA.iOS.Utilities;
using UnityEngine;
using SA.Foundation.Events;
#if API_ENABLED
using System.Runtime.InteropServices;

#endif

namespace SA.iOS.Foundation
{
    class ISN_NSNativeAPI : ISN_Singleton<ISN_NSNativeAPI>, ISN_NSAPI
    {
#if UNITY_IPHONE || UNITY_TVOS
        const string k_DllName = "__Internal";
#else
        private const string k_DllName = "ISN_GameKit";
#endif

#if API_ENABLED

        [DllImport(k_DllName)]
        static extern void _ISN_SetString(string key, string val);

        [DllImport(k_DllName)]
        static extern bool _ISN_Synchronize();

        [DllImport(k_DllName)]
        static extern string _ISN_KeyValueStoreObjectForKey(string key);

        [DllImport(k_DllName)]
        static extern void _ISN_iCloud_Reset();

        //Time Zone
        [DllImport(k_DllName)]
        static extern string _ISN_NS_TimeZone_LocalTimeZone();

        [DllImport(k_DllName)]
        static extern string _ISN_NS_TimeZone_SystemTimeZone();

        [DllImport(k_DllName)]
        static extern string _ISN_NS_TimeZone_DefaultTimeZone();

        [DllImport(k_DllName)]
        static extern void _ISN_NS_TimeZone_ResetSystemTimeZone();

        //Locale
        [DllImport(k_DllName)]
        static extern string _ISN_NS_Locale_CurrentLocale();

        [DllImport(k_DllName)]
        static extern string _ISN_NS_Locale_AutoupdatingCurrentLocale();

        [DllImport(k_DllName)]
        static extern string _ISN_NS_Locale_PreferredLanguage();

        [DllImport(k_DllName)]
        static extern string _ISN_UbiquityIdentityToken();
#endif

        readonly SA_Event<ISN_NSStoreDidChangeExternallyNotification> m_storeDidChangeReceived = new SA_Event<ISN_NSStoreDidChangeExternallyNotification>();

        public void SetString(string key, string val)
        {
#if API_ENABLED
            _ISN_SetString(key, val);
#endif
        }

        public bool Synchronize()
        {
#if API_ENABLED
            return _ISN_Synchronize();
#else
                return false;
#endif
        }

        public ISN_NSKeyValueObject KeyValueStoreObjectForKey(string key)
        {
#if API_ENABLED
            var result = JsonUtility.FromJson<ISN_NSKeyValueResult>(_ISN_KeyValueStoreObjectForKey(key));
            if (result.HasError)
                return null;
            else
                return result.KeyValueObject;

#else
                return null;
#endif
        }

        public void ResetCloud()
        {
#if API_ENABLED
            _ISN_iCloud_Reset();
#endif
        }

        void OnStoreDidChange(string data)
        {
            var result = JsonUtility.FromJson<ISN_NSStoreDidChangeExternallyNotification>(data);
            m_storeDidChangeReceived.Invoke(result);
        }

        public SA_Event<ISN_NSStoreDidChangeExternallyNotification> StoreDidChangeReceiveResponse => m_storeDidChangeReceived;

        //--------------------------------------
        // Time Zone
        //--------------------------------------

        public void ResetSystemTimeZone()
        {
#if API_ENABLED
            _ISN_NS_TimeZone_ResetSystemTimeZone();
#endif
        }

        public ISN_NSTimeZone LocalTimeZone
        {
            get
            {
#if API_ENABLED
                return JsonUtility.FromJson<ISN_NSTimeZone>(_ISN_NS_TimeZone_LocalTimeZone());
#else
                return null;
#endif
            }
        }

        public ISN_NSTimeZone SystemTimeZone
        {
            get
            {
#if API_ENABLED
                return JsonUtility.FromJson<ISN_NSTimeZone>(_ISN_NS_TimeZone_SystemTimeZone());
#else
                return null;
#endif
            }
        }

        public ISN_NSTimeZone DefaultTimeZone
        {
            get
            {
#if API_ENABLED
                return JsonUtility.FromJson<ISN_NSTimeZone>(_ISN_NS_TimeZone_DefaultTimeZone());
#else
                return null;
#endif
            }
        }

        //--------------------------------------
        // Locale
        //--------------------------------------

        public string PreferredLanguage
        {
            get
            {
#if API_ENABLED
                return _ISN_NS_Locale_PreferredLanguage();
#else
                return "en";
#endif
            }
        }

        public ISN_NSLocale CurrentLocale
        {
            get
            {
#if API_ENABLED
                return JsonUtility.FromJson<ISN_NSLocale>(_ISN_NS_Locale_CurrentLocale());
#else
                return null;
#endif
            }
        }

        public ISN_NSLocale AutoUpdatingCurrentLocale
        {
            get
            {
#if API_ENABLED
                return JsonUtility.FromJson<ISN_NSLocale>(_ISN_NS_Locale_AutoupdatingCurrentLocale());
#else
                return null;
#endif
            }
        }

        //--------------------------------------
        // ISN_NSFileManager
        //--------------------------------------

        public string UbiquityIdentityToken
        {
            get
            {
#if API_ENABLED
                return _ISN_UbiquityIdentityToken();
#else
                return string.Empty;
#endif
            }
        }
    }
}
