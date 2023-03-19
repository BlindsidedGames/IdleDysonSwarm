using UnityEditor;
using UnityEngine;

namespace StansAssets.Plugins.Editor
{
    public static class PluginsEditorSkin
    {
        public static readonly string AboutIconsPath = PluginsDevKitPackage.EditorIconAssetsPath + "/About";
        public static readonly string GeneticIconsPath = PluginsDevKitPackage.EditorIconAssetsPath + "/Generic";
        public static readonly string SocialIconsPath = PluginsDevKitPackage.EditorIconAssetsPath + "/Social";

        public static Texture2D GetAboutIcon(string iconName)
        {
            return EditorAssetDatabase.GetTextureAtPath($"{AboutIconsPath}/{iconName}");
        }

        public static Texture2D GetGenericIcon(string iconName)
        {
            return EditorAssetDatabase.GetTextureAtPath($"{GeneticIconsPath}/{iconName}");
        }

        public static Texture2D GetSocialIcon(string iconName)
        {
            return EditorAssetDatabase.GetTextureAtPath($"{SocialIconsPath}/{iconName}");
        }

        static GUIStyle s_BoxStyle = null;
        public static GUIStyle BoxStyle => s_BoxStyle ?? (s_BoxStyle = new GUIStyle(GUI.skin.box));

        static GUIStyle s_LabelBold = null;
        public static GUIStyle LabelBold
        {
            get
            {
                if (s_LabelBold == null)
                {
                    s_LabelBold = new GUIStyle(EditorStyles.label);
                    s_LabelBold.fontStyle = FontStyle.Bold;
                }

                return s_LabelBold;
            }
        }

        static GUIStyle s_MiniLabel = null;
        public static GUIStyle MiniLabelWordWrap
        {
            get
            {
                if (s_MiniLabel == null)
                {
                    s_MiniLabel = new GUIStyle(EditorStyles.miniLabel);
                    s_MiniLabel.wordWrap = true;
                }

                return s_MiniLabel;
            }
        }
    }
}
