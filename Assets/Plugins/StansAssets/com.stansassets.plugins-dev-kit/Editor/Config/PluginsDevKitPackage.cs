using StansAssets.Foundation.Editor;
using UnityEditor.PackageManager;

namespace StansAssets.Plugins.Editor
{
    /// <summary>
    /// Common config values for packages. Editor use only.
    /// </summary>
    public static class PluginsDevKitPackage
    {

        /// <summary>
        /// Package runtime settings location path.
        /// </summary>
        public const string RootMenu = "Stan's Assets";
        public const string ProductivityRootMenu = RootMenu + "/Productivity";
        public const string StansAssetsSupportEmail = "support@stansassets.com";
        public const string StansAssetsCeoEMail = "ceo@stansassets.com";
        public const string StansAssetsWebsiteRootUrl = "https://stansassets.com/";

        public const string Name = "com.stansassets.plugins-dev-kit";
        public static readonly string RootPath = $"Assets/Plugins/StansAssets/{Name}";
        public static readonly string UIToolkitPath = $"{RootPath}/Editor/UIToolkit";
        public static readonly string UIToolkitControlsPath = $"{UIToolkitPath}/Controls";

        public static readonly string EditorArtAssetsPath = $"{RootPath}/Editor/Art";
        public static readonly string EditorIconAssetsPath = $"{EditorArtAssetsPath}/Icons";
        public static readonly string EditorFontAssetsPath = $"{EditorArtAssetsPath}/Fonts";

#if UNITY_2019_4_OR_NEWER
        /// <summary>
        ///  Foundation package info.
        /// </summary>
        public static PackageInfo GetPackageInfo()
        {
            return PackageManagerUtility.GetPackageInfo(Name);
        }
#endif
    }
}
