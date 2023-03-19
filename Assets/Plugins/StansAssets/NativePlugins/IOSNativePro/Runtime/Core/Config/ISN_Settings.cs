////////////////////////////////////////////////////////////////////////////////
//
// @module IOS Native Plugin
// @author Osipov Stanislav (Stan's Assets)
// @support support@stansassets.com
// @website https://stansassets.com
//
////////////////////////////////////////////////////////////////////////////////

using System.Collections.Generic;
using SA.Foundation.Patterns;
using SA.Foundation.Config;
using SA.iOS.UIKit;
using SA.iOS.GameKit;
using SA.iOS.StoreKit;
using SA.iOS.Utilities;

namespace SA.iOS
{
    class ISN_Settings : SA_ScriptableSingleton<ISN_Settings>
    {
        public const string PluginTittle = "IOS Native";
        public const string DocumentationUrl = "https://unionassets.com/ios-native-pro/manual";
        public const string IOSNativeFolder = SA_Config.StansAssetsNativePluginsPath + "IOSNativePro/";

        const string k_IOSNativeApi = IOSNativeFolder + "API/";
        public const string IOSNativeXcode = IOSNativeFolder + "XCode/";
        public const string ContactsApiLocation = k_IOSNativeApi + "Contacts/Internal/";
        public const string TestScenePath = IOSNativeFolder + "Tests/Scene/ISN_TestScene.unity";

        //--------------------------------------
        // API Settings
        //--------------------------------------

        public bool Contacts = false;
        public bool CloudKit = false;
        public bool Photos = false;
        public bool ReplayKit = false;
        public bool Social = false;
        public bool AdSupport = false;
        public bool AppTrackingTransparency = false;

        // ReSharper disable once InconsistentNaming
        public bool AVKit = false;
        public bool CoreLocation = false;
        public bool AssetsLibrary = false;
        public bool AppDelegate = false;
        public bool UserNotifications = false;
        public bool MediaPlayer = false;
        public bool EventKit = false;

        internal readonly ISN_LogLevel LogLevel = new ISN_LogLevel();

        //--------------------------------------
        // StoreKit Settings
        //--------------------------------------

        public List<ISN_SKProduct> InAppProducts = new List<ISN_SKProduct>();

        //--------------------------------------
        // GameKit Settings
        //--------------------------------------

        public List<ISN_GKAchievement> Achievements = new List<ISN_GKAchievement>();
        public bool SavingAGame = false;

        //--------------------------------------
        // App Delegate Settings
        //--------------------------------------

        public List<ISN_UIApplicationShortcutItem> ShortcutItems = new List<ISN_UIApplicationShortcutItem>();
        public List<ISN_UIUrlType> UrlTypes = new List<ISN_UIUrlType>();

        //--------------------------------------
        // UIKit Settings
        //--------------------------------------

        public List<ISN_UIUrlType> ApplicationQueriesSchemes = new List<ISN_UIUrlType>();

        public bool CameraUsageDescriptionEnabled = true;
        public bool MediaLibraryUsageDescriptionEnabled = false;
        public bool PhotoLibraryUsageDescriptionEnabled = true;
        public bool PhotoLibraryAddUsageDescriptionEnabled = true;
        public bool MicrophoneUsageDescriptionEnabled = true;


        //--------------------------------------
        // Contacts Settings
        //--------------------------------------

        public string ContactsUsageDescription =
            "Please change 'Contacts Usage Description' with IOS Native Contacts Editor Settings";

        //--------------------------------------
        // Core Location
        //--------------------------------------

        public string LocationAlwaysAndWhenInUseUsageDescription =
            "Please change 'Location Always And When In Use Usage Description' with IOS Native Core Location Editor Settings";

        public string LocationWhenInUseUsageDescription =
            "Please change 'Location When In Use Usage Description' with IOS Native Core Location Editor Settings";

        //--------------------------------------
        // Event Kit
        //--------------------------------------

        public string NsCalendarsUsageDescription = "This app is require access your Calendar";
        public string NsRemindersUsageDescription = "This app is require access to your Reminder";

        //--------------------------------------
        // pp Tracking Transparency
        //--------------------------------------

        public string UserTrackingUsageDescription =
            "Please change 'UserTrackingUsageDescription' with IOS Native App Tracking Transparency Editor Settings";

        //--------------------------------------
        // SA_ScriptableSettings
        //--------------------------------------

        protected override string BasePath => IOSNativeFolder;
        public override string PluginName => PluginTittle;
        public override string DocumentationURL => DocumentationUrl;
        public override string SettingsUIMenuItem => SA_Config.EditorMenuRoot + "iOS/Services";
    }
}
