using UnityEditor;
using UnityEngine;

namespace Blindsided.ProceduralUIImage.Editor {
    internal static class ProceduralUIImageEditorUtility {
        private static Sprite _emptySprite;

        public static void CornerRadiusModeGUI(Rect rect, ref SerializedProperty property, string[] toolBarHeading,
            string label = "Corner Radius") {
            bool boolVal = property.boolValue;
            Rect labelRect = new Rect(rect.x, rect.y, EditorGUIUtility.labelWidth, rect.height);
            Rect toolBarRect = new Rect(rect.x + EditorGUIUtility.labelWidth, rect.y,
                rect.width - EditorGUIUtility.labelWidth, rect.height);

            EditorGUI.BeginChangeCheck();
            {
                EditorGUI.showMixedValue = property.hasMultipleDifferentValues;
                EditorGUI.LabelField(labelRect, label);

                boolVal = GUI.Toolbar(toolBarRect, boolVal ? 1 : 0, toolBarHeading) == 1;
                EditorGUI.showMixedValue = false;
            }
            if (EditorGUI.EndChangeCheck()) {
                property.boolValue = boolVal;
            }
        }

        internal static Sprite EmptySprite {
            get {
                if (_emptySprite == null) {
                    _emptySprite = Resources.Load<Sprite>("mpui_default_empty_sprite");
                }

                return _emptySprite;
            }
        }
    }
}
