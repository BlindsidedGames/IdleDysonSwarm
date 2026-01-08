using System;
using System.Collections.Generic;
using UnityEditor;
using UnityEngine;

namespace StansAssets.Plugins.Editor
{
    public static class IMGUILayout
    {
        public static string StringValuePopup(string title, string value, string[] displayedOptions, string tooltip = "")
        {
            return StringValuePopup(new GUIContent(title, tooltip), value, displayedOptions);
        }

        public static void ReorderablList<T>(IList<T> list, IMGUIReorderablList.ItemName<T> itemName, IMGUIReorderablList.ItemContent<T> itemContent = null, IMGUIReorderablList.OnItemAdd onItemAdd = null, IMGUIReorderablList.ItemContent<T> buttonsContent = null, IMGUIReorderablList.ItemContent<T> itemStartUI = null)
        {
            IMGUIReorderablList.Draw(list, itemName, itemContent, onItemAdd, buttonsContent, itemStartUI);
        }

        public static string StringValuePopup(GUIContent content, string value, string[] displayedOptions)
        {
            var index = Array.IndexOf(displayedOptions, value);

            EditorGUILayout.BeginHorizontal();
            EditorGUILayout.LabelField(content);
            index = EditorGUILayout.Popup(index, displayedOptions);
            EditorGUILayout.EndHorizontal();

            return displayedOptions[index];
        }

        public static void Header(string header)
        {
            EditorGUILayout.Space();
            EditorGUILayout.HelpBox(header, MessageType.None);
            EditorGUILayout.Space();
        }

        public static void HorizontalLine()
        {
            var guiState = GUI.enabled;
            GUI.enabled = false;
            EditorGUILayout.TextArea("", GUI.skin.horizontalSlider);
            GUI.enabled = guiState;
        }

        public static void HorizontalLinePr()
        {
            GUILayout.BeginHorizontal();
            {
                GUILayout.FlexibleSpace();
                GUILayout.Label("", "PR Insertion", GUILayout.MaxWidth(300f));
                GUILayout.FlexibleSpace();
            }
            GUILayout.EndHorizontal();
        }

        public static string TextField(string label, string text)
        {
            var c = new GUIContent(label, "");
            return TextField(c, text);
        }

        public static string TextField(GUIContent label, string text)
        {
            EditorGUILayout.BeginHorizontal();
            EditorGUILayout.LabelField(label);
            text = EditorGUILayout.TextField(text);
            if (!string.IsNullOrEmpty(text) && text.Length > 0) text = text.Trim();
            EditorGUILayout.EndHorizontal();

            return text;
        }

        public static float FloatField(string label, float value)
        {
            var content = new GUIContent(label, "");
            return FloatField(content, value);
        }

        public static float FloatField(GUIContent content, float value)
        {
            EditorGUILayout.BeginHorizontal();
            EditorGUILayout.LabelField(content);
            value = EditorGUILayout.FloatField(value);

            EditorGUILayout.EndHorizontal();

            return value;
        }

        public static int IntField(string label, int value)
        {
            var content = new GUIContent(label, "");
            return IntField(content, value);
        }

        public static int IntField(GUIContent content, int value)
        {
            EditorGUILayout.BeginHorizontal();
            EditorGUILayout.LabelField(content);
            value = EditorGUILayout.IntField(value);

            EditorGUILayout.EndHorizontal();

            return value;
        }

        public static Enum EnumPopup(string label, Enum selected)
        {
            return EnumPopup(new GUIContent(label, ""), selected);
        }

        public static Enum EnumPopup(GUIContent label, Enum selected)
        {
            EditorGUILayout.BeginHorizontal();
            EditorGUILayout.LabelField(label);
            selected = EditorGUILayout.EnumPopup(selected);
            EditorGUILayout.EndHorizontal();

            return selected;
        }

        public static void LabelField(string title, string message)
        {
            var c = new GUIContent(title, "");
            LabelField(c, message);
        }

        public static void LabelField(GUIContent label, string message)
        {
            EditorGUILayout.BeginHorizontal();
            EditorGUILayout.LabelField(label, GUILayout.Width(180), GUILayout.Height(16));
            EditorGUILayout.LabelField(message, GUILayout.Height(16));
            EditorGUILayout.EndHorizontal();
        }

        public static void SelectableLabel(GUIContent content)
        {
            using (new IMGUIBeginHorizontal())
            {
                if (content.image != null) EditorGUILayout.LabelField(new GUIContent(content.image), GUILayout.Width(16), GUILayout.Height(16));
                EditorGUILayout.SelectableLabel(content.text, GUILayout.Height(16));
            }
        }

        public static void SelectableLabel(string title, string message)
        {
            var c = new GUIContent(title, "");
            SelectableLabel(c, message);
        }

        public static void SelectableLabel(GUIContent label, string message)
        {
            using (new IMGUIBeginHorizontal())
            {
                EditorGUILayout.LabelField(label, GUILayout.Width(180), GUILayout.Height(16));
                EditorGUILayout.SelectableLabel(message, GUILayout.Height(16));
            }
        }

        public static bool ToggleFiled(string title, bool value, IMGUIToggleStyle.ToggleType type)
        {
            return ToggleFiled(new GUIContent(title, title), value, type);
        }

        public static bool ToggleFiled(GUIContent content, bool value, IMGUIToggleStyle.ToggleType type)
        {
            return IMGUIToggleStyle.ToggleFiled(content, value, type);
        }

        public static void HorizontalLineThin()
        {
            using (new IMGUIBeginHorizontal())
            {
                GUILayout.Label("", "sv_iconselector_sep", GUILayout.MaxWidth(5000f));
            }
        }
    }
}
