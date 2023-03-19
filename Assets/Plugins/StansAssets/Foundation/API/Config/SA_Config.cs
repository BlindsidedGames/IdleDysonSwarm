////////////////////////////////////////////////////////////////////////////////
//
// @module Assets Common Lib
// @author Osipov Stanislav (Stan's Assets)
// @support support@stansassets.com
// @website https://stansassets.com
//
////////////////////////////////////////////////////////////////////////////////

namespace SA.Foundation.Config
{
    public static class SA_Config
    {
        public const string StansAssetsPluginsPath = "Assets/Plugins/StansAssets/";
        public const string StansAssetsThirdPartyNotices = StansAssetsPluginsPath + "Third-PartyNotices.txt";

        public const string StansAssetsCrossPlatformPluginsPath = StansAssetsPluginsPath + "CrossPlatform/";
        public const string StansAssetsNativePluginsPath = StansAssetsPluginsPath + "NativePlugins/";
        public const string StansAssetsProductivityPluginsPath = StansAssetsPluginsPath + "Productivity/";
        public const string StansAssetsServicesPluginsPath = StansAssetsPluginsPath + "Services/";

        public const string StansAssetsFoundationPath = StansAssetsPluginsPath + "Foundation/";
        public const string StansAssetsFoundationPackagePath = StansAssetsPluginsPath + "com.stansassets.foundation/";
        public const string StansAssetsDevKitPackagePath = StansAssetsPluginsPath + "com.stansassets.plugins-dev-kit/";
        public const string StansAssetsXcodePackagePath = StansAssetsPluginsPath + "com.stansassets.xcode-project/";


        public const string StansAssetsFoundationApiPath = StansAssetsFoundationPath + "API/";

        public const string StansAssetsFoundationApiModulesPath = StansAssetsFoundationPath + "APIModules/";
        public const string StansAssetsFoundationApiModulesPathPublic = StansAssetsFoundationApiModulesPath + "Public/";
        public const string StansAssetsFoundationApiModulesPathPrivate = StansAssetsFoundationApiModulesPath + "Private/";
        public const string StansAssetsFoundationApiModulesPathThirdParty = StansAssetsFoundationApiModulesPath + "ThirdParty/";

        public const string StansAssetsSettingsRootPath = StansAssetsPluginsPath + "Settings/";

        public const string StansAssetsCachePath = StansAssetsSettingsRootPath + "Cache/Resources/";
        public const string StansAssetsSettingsPath = StansAssetsSettingsRootPath + "Resources/";

        public const string StansAssetsEditorSettingsPath = StansAssetsSettingsRootPath + "Editor/";
        public const string StansAssetsEditorSettingsResourcesPath = StansAssetsEditorSettingsPath + "Resources/";

        public const string UnityIOSPluginsPath = "Assets/Plugins/IOS/";
        public const string UnityAndroidPluginsPath = "Assets/Plugins/Android/";

        public const string EditorMenuRoot = "Stan's Assets/";
        public const string EditorFoundationLibMenuRoot = EditorMenuRoot + "Foundation/";
        public const string EditorAnalyticsMenuRoot = EditorMenuRoot + "Analytics/";
        public const string EditorProductivityMenuRoot = EditorMenuRoot + "Productivity/";
        public const string EditorProductivityNativeUtilityMenuRoot = EditorProductivityMenuRoot + "Native Utility/";

        public const int ProductivityMenuIndex = 500;
        public const int ProductivityNativeUtilityMenuIndex = 600;

        public const int FoundationMenuIndex = 1000;

        static PluginVersionHandler s_FoundationVersion;

        public static PluginVersionHandler FoundationVersion => s_FoundationVersion ?? (s_FoundationVersion = new PluginVersionHandler(StansAssetsFoundationPath));
    }
}
