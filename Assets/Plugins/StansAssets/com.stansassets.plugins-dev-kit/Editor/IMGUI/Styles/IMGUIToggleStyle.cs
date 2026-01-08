using UnityEditor;
using UnityEngine;

namespace StansAssets.Plugins.Editor
{
    public static class IMGUIToggleStyle
    {
        public enum YesNoBool
        {
            Yes,
            No
        }

        public enum EnabledDisabledBool
        {
            Enabled,
            Disabled
        }

        public enum ToggleType
        {
            YesNo,
            EnabledDisabled
        }

        public static bool ToggleFiled(GUIContent content, bool value, ToggleType type)
        {
            switch (type)
            {
                case ToggleType.EnabledDisabled:
                    return EnabledDisabledToggleFiled(content, value);
                case ToggleType.YesNo:
                    return YesNoToggleFiled(content, value);
            }

            return true;
        }

        static bool EnabledDisabledToggleFiled(GUIContent title, bool value)
        {
            var initialValue = EnabledDisabledBool.Enabled;
            if (!value) initialValue = EnabledDisabledBool.Disabled;

            if (string.IsNullOrEmpty(title.text))
            {
                initialValue = (EnabledDisabledBool)EditorGUILayout.EnumPopup(initialValue);
                value = initialValue == EnabledDisabledBool.Enabled;
            }
            else
            {
                EditorGUILayout.BeginHorizontal();
                EditorGUILayout.LabelField(title);
                initialValue = (EnabledDisabledBool)EditorGUILayout.EnumPopup(initialValue);
                value = initialValue == EnabledDisabledBool.Enabled;
                EditorGUILayout.EndHorizontal();
            }

            return value;
        }

        static bool YesNoToggleFiled(GUIContent title, bool value)
        {
            var initialValue = YesNoBool.Yes;
            if (!value) initialValue = YesNoBool.No;
            EditorGUILayout.BeginHorizontal();
            EditorGUILayout.LabelField(title);

            initialValue = (YesNoBool)EditorGUILayout.EnumPopup(initialValue);
            value = initialValue == YesNoBool.Yes;
            EditorGUILayout.EndHorizontal();

            return value;
        }
    }
}
