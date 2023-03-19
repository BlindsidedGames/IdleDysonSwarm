using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEditor;
using SA.Foundation.Utility;
using SA.Foundation.Config;
using StansAssets.Foundation;
using StansAssets.Plugins.Editor;

namespace SA.Foundation.Editor
{
    public static class SA_PluginSettingsWindowStyles
    {
        static GUIStyle m_labelServiceBlockStyle = null;

        public static GUIStyle LabelServiceBlockStyle
        {
            get
            {
                if (m_labelServiceBlockStyle == null)
                {
                    m_labelServiceBlockStyle = new GUIStyle(EditorStyles.miniLabel);
                    m_labelServiceBlockStyle.fontSize = 18;
                    m_labelServiceBlockStyle.padding = new RectOffset();
                    m_labelServiceBlockStyle.richText = true;

                    m_labelServiceBlockStyle.font = EditorAssetDatabase.GetFontAtPath($"{PluginsDevKitPackage.EditorFontAssetsPath}/Raleway-Light.ttf");
                    if (EditorGUIUtility.isProSkin)
                        m_labelServiceBlockStyle.normal.textColor = Color.white;
                    else
                        m_labelServiceBlockStyle.normal.textColor = Color.black;
                }

                return m_labelServiceBlockStyle;
            }
        }

        static GUIStyle m_serviceBlockHeader2 = null;

        public static GUIStyle ServiceBlockHeader2
        {
            get
            {
                if (m_serviceBlockHeader2 == null)
                {
                    m_serviceBlockHeader2 = new GUIStyle(EditorStyles.boldLabel);
                    m_serviceBlockHeader2.alignment = TextAnchor.MiddleLeft;
                    m_serviceBlockHeader2.fontSize = 10;
                }

                return m_serviceBlockHeader2;
            }
        }

        static GUIStyle m_assetLabel = null;

        public static GUIStyle AssetLabel
        {
            get
            {
                if (m_assetLabel == null) m_assetLabel = new GUIStyle(GUI.skin.GetStyle("AssetLabel"));
                return m_assetLabel;
            }
        }

        static GUIStyle m_textArea = null;

        public static GUIStyle TextArea
        {
            get
            {
                if (m_textArea == null)
                {
                    m_textArea = new GUIStyle(EditorStyles.textArea);
                    m_textArea.wordWrap = true;
                }

                return m_textArea;
            }
        }


        public static Color SelectedImageColor => ColorHelper.MakeColorFromHtml(EditorGUIUtility.isProSkin ? "#0CB4CCED" : "#018D98ED");
        public static Color GerySilverColor => ColorHelper.MakeColorFromHtml("#C0C0C0");
        public static Color DefaultImageContentColor => EditorGUIUtility.isProSkin ? ColorHelper.MakeColorFromHtml("#B4B4B4FF") : Color.black;
    }
}
