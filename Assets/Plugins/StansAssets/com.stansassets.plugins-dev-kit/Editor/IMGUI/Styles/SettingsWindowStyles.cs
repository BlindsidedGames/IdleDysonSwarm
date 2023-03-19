using StansAssets.Foundation;
using UnityEditor;
using UnityEngine;

namespace StansAssets.Plugins.Editor
{
    public static class SettingsWindowStyles
    {
        public const int LayoutPadding = 5;
        public const int IndentPixelSize = 13;

        static GUIStyle s_SeparationStyle;
        public static GUIStyle SeparationStyle
        {
            get
            {
                if (s_SeparationStyle == null)
                    s_SeparationStyle = new GUIStyle();

                if (s_SeparationStyle.normal.background == null)
                {
                    s_SeparationStyle.normal.background = Texture2DUtility.MakePlainColorImage(EditorGUIUtility.isProSkin ? "#292929FF" : "#A2A2A2FF");
                }

                return s_SeparationStyle;
            }
        }
        
        static GUIStyle s_LabelHeaderStyle = null;
        public static GUIStyle LabelHeaderStyle
        {
            get
            {
                if (s_LabelHeaderStyle == null)
                {
                    s_LabelHeaderStyle = new GUIStyle();
                    s_LabelHeaderStyle.fontSize = 18;
                    s_LabelHeaderStyle.fontStyle = FontStyle.Bold;
                }

                if (EditorGUIUtility.isProSkin) s_LabelHeaderStyle.normal.textColor = ColorHelper.MakeColorFromHtml("#F8F8F8FF");

                return s_LabelHeaderStyle;
            }
        }

        static GUIStyle s_DescriptionLabelStyle = null;
        public static GUIStyle DescriptionLabelStyle
        {
            get
            {
                if (s_DescriptionLabelStyle == null)
                {
                    s_DescriptionLabelStyle = new GUIStyle();
                    s_DescriptionLabelStyle.wordWrap = true;
                }

                if (EditorGUIUtility.isProSkin) s_DescriptionLabelStyle.normal.textColor = ColorHelper.MakeColorFromHtml("#959995FF");

                return s_DescriptionLabelStyle;
            }
        }
        
        static GUIStyle s_VersionLabelStyle = null;
        public static GUIStyle VersionLabelStyle
        {
            get
            {
                if (s_VersionLabelStyle == null) s_VersionLabelStyle = new GUIStyle(DescriptionLabelStyle);

                s_VersionLabelStyle.alignment = TextAnchor.MiddleRight;

                return s_VersionLabelStyle;
            }
        }

        static GUIStyle s_ServiceBlockHeader;
        public static GUIStyle ServiceBlockHeader =>
            s_ServiceBlockHeader ?? (s_ServiceBlockHeader = new GUIStyle
            {
                fontSize = 13,
                fontStyle = FontStyle.Bold,
                normal = { textColor = DisabledImageColor }
            });
        
        static GUIStyle s_SelectableLabelStyle = null;
        public static GUIStyle SelectableLabelStyle
        {
            get
            {
                if (s_SelectableLabelStyle == null)
                {
                    s_SelectableLabelStyle = new GUIStyle();
                    s_SelectableLabelStyle.wordWrap = true;
                }

                s_SelectableLabelStyle.normal.textColor 
                    = ColorHelper.MakeColorFromHtml(EditorGUIUtility.isProSkin ? "#DFDFDFFF" : "#0054C7ED");
                return s_SelectableLabelStyle;
            }
        }

        public static Color SelectedElementColor => ColorHelper.MakeColorFromHtml(EditorGUIUtility.isProSkin ? "#1BE1F2ED" : "#5CBFCD");
        public static Color ProDisabledImageColor => ColorHelper.MakeColorFromHtml("#999999ED");
        public static Color DisabledImageColor => EditorGUIUtility.isProSkin ? ProDisabledImageColor : ColorHelper.MakeColorFromHtml("#3C3C3CFF");
        public static Color ActiveLinkColor => ColorHelper.MakeColorFromHtml(EditorGUIUtility.isProSkin ? "#1B97F2" : "#3066B3");

        static GUIStyle s_MiniLabel;
        public static GUIStyle MiniLabel => s_MiniLabel ?? (s_MiniLabel = new GUIStyle(EditorStyles.miniLabel) { wordWrap = true });
    }
}
