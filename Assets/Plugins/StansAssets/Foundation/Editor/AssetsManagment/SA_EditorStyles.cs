using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEditor;
using SA.Foundation.Utility;

namespace SA.Foundation.Editor
{
    public class SA_EditorStyles
    {
        public static GUIStyle PreferencesSectionBox = "PreferencesSectionBox";
        public static GUIStyle OLTitle = "OL Title";
        public static GUIStyle OLBox = "OL Box";
        public static GUIStyle WordWrappedLabel = "WordWrappedLabel";
        public static GUIStyle PreferencesSection = "PreferencesSection";
        public static GUIStyle EntryBackEven = "CN EntryBackEven";
        public static GUIStyle EntryBackOdd = "CN EntryBackOdd";
        public static GUIStyle PreferencesKeysElement = "PreferencesKeysElement";
        public static GUIStyle EntryWarn = "CN EntryWarn";

        public GUIStyle SectionHeader;
        public GUIStyle CacheFolderLocation;

        public SA_EditorStyles()
        {
            SectionHeader = new GUIStyle(EditorStyles.largeLabel);

            PreferencesSectionBox = new GUIStyle(PreferencesSectionBox);
            PreferencesSectionBox.overflow.bottom++;

            SectionHeader.fontStyle = FontStyle.Bold;
            SectionHeader.fontSize = 18;
            SectionHeader.margin.top = 10;
            SectionHeader.margin.left++;

            if (!EditorGUIUtility.isProSkin)
                SectionHeader.normal.textColor = new Color(0.4f, 0.4f, 0.4f, 1f);
            else
                SectionHeader.normal.textColor = new Color(0.7f, 0.7f, 0.7f, 1f);

            CacheFolderLocation = new GUIStyle(GUI.skin.label);
            CacheFolderLocation.wordWrap = true;
        }

        static SA_EditorStyles s_Instance = null;
        public static SA_EditorStyles Collection
        {
            get
            {
                if (s_Instance == null) s_Instance = new SA_EditorStyles();

                return s_Instance;
            }
        }
    }
}
