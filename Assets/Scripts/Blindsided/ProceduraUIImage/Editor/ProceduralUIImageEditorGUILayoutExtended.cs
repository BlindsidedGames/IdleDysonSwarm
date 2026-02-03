using System;
using System.Reflection;
using UnityEditor;
using UnityEngine;

namespace Blindsided.ProceduralUIImage.Editor {
    public class ProceduralUIImageEditorGUILayoutExtended : UnityEditor.Editor {
        private static readonly Type EditorGUIType = typeof(EditorGUI);

        private static readonly Type RecycledTextEditorType =
            Assembly.GetAssembly(EditorGUIType).GetType("UnityEditor.EditorGUI+RecycledTextEditor");

        private static readonly Type[] ArgumentTypes = {
            RecycledTextEditorType, typeof(Rect), typeof(Rect), typeof(int), typeof(float), typeof(string),
            typeof(GUIStyle), typeof(bool)
        };

        private static readonly MethodInfo DoFloatFieldMethod = EditorGUIType.GetMethod("DoFloatField",
            BindingFlags.NonPublic | BindingFlags.Static, null, ArgumentTypes, null);

#if UNITY_6000_0_OR_NEWER
        private static readonly FieldInfo RecycledEditorField =
            EditorGUIType.GetField("s_RecycledEditorInternal", BindingFlags.NonPublic | BindingFlags.Static);
#else
        private static readonly FieldInfo RecycledEditorField =
            EditorGUIType.GetField("s_RecycledEditor", BindingFlags.NonPublic | BindingFlags.Static);
#endif

        private static readonly object RecycledEditor = RecycledEditorField.GetValue(null);
        private static readonly GUIStyle Style = EditorStyles.numberField;

        public static float FloatFieldExtended(Rect position, float value, Rect dragHotZone) {
            int controlId = GUIUtility.GetControlID("EditorTextField".GetHashCode(), FocusType.Keyboard, position);
            object[] parameters = {RecycledEditor, position, dragHotZone, controlId, value, "g7", Style, true};
            return (float)DoFloatFieldMethod.Invoke(null, parameters);
        }
    }
}


