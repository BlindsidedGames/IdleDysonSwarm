////////////////////////////////////////////////////////////////////////////////
//
// @module IOS Native Plugin
// @author Koretsky Konstantin (Stan's Assets)
// @support support@stansassets.com
// @website https://stansassets.com
//
////////////////////////////////////////////////////////////////////////////////

using SA.Foundation.Events;

namespace SA.iOS.Foundation
{
    interface ISN_NSAPI
    {
        //--------------------------------------
        // NSUbiquitousKeyValueStore
        //--------------------------------------

        void SetString(string key, string val);
        ISN_NSKeyValueObject KeyValueStoreObjectForKey(string key);
        bool Synchronize();
        void ResetCloud();

        SA_Event<ISN_NSStoreDidChangeExternallyNotification> StoreDidChangeReceiveResponse { get; }

        //--------------------------------------
        // Time Zone
        //--------------------------------------

        void ResetSystemTimeZone();
        ISN_NSTimeZone LocalTimeZone { get; }
        ISN_NSTimeZone SystemTimeZone { get; }
        ISN_NSTimeZone DefaultTimeZone { get; }

        //--------------------------------------
        // Locale
        //--------------------------------------

        ISN_NSLocale CurrentLocale { get; }
        ISN_NSLocale AutoUpdatingCurrentLocale { get; }

        string PreferredLanguage { get; }

        //--------------------------------------
        // File Manager
        //--------------------------------------

        string UbiquityIdentityToken { get; }
    }
}
