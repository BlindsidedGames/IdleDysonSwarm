using UnityEngine;
using UnityEditor;
using SA.Foundation.Editor;
using StansAssets.Plugins.Editor;

namespace SA.iOS
{
    static class ISN_Skin
    {
        public const string IconsPath = ISN_Settings.IOSNativeFolder + "Editor/Art/Icons/";
        public const string SocialIconsPath = ISN_Settings.IOSNativeFolder + "Editor/Art/Social/";

        public static Texture2D SettingsWindowIcon =>
            EditorGUIUtility.isProSkin
                ? EditorAssetDatabase.GetTextureAtPath(IconsPath + "ios_pro.png")
                : EditorAssetDatabase.GetTextureAtPath(IconsPath + "ios.png");

        public static Texture2D GetIcon(string iconName)
        {
            return EditorAssetDatabase.GetTextureAtPath(IconsPath + iconName);
        }
    }
}
