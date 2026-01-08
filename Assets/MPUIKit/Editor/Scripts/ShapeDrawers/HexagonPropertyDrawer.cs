using UnityEditor;
using UnityEngine;

namespace MPUIKIT.Editor {
    [CustomPropertyDrawer(typeof(Hexagon))]
    public class HexagonPropertyDrawer : PropertyDrawer {
        public override void OnGUI(Rect position, SerializedProperty property, GUIContent label) {
            EditorGUI.BeginProperty(position, label, property);
            {
                SerializedProperty rectRadius = property.FindPropertyRelative("m_CornerRadius");
                SerializedProperty uniformRect = property.FindPropertyRelative("m_UniformCornerRadius");
                SerializedProperty triSizes = property.FindPropertyRelative("m_TipSize");
                SerializedProperty uniformTriS = property.FindPropertyRelative("m_UniformTipSize");
                SerializedProperty triRadius = property.FindPropertyRelative("m_TipRadius");
                SerializedProperty uniformTriR = property.FindPropertyRelative("m_UniformTipRadius");
                
                Vector4 radiusVectorValue = rectRadius.vector4Value;
                float radiusFloatValue = radiusVectorValue.x;
                bool rectBoolVal = uniformRect.boolValue;
                float[] zw = new[] {radiusVectorValue.w, radiusVectorValue.z};
                float[] xy = new[] {radiusVectorValue.x, radiusVectorValue.y};
                Vector2 triSizesVectorValue = triSizes.vector2Value;
                float triSizesFloatValue = triSizesVectorValue.x;
                Vector2 triRadiusVectorValue = triRadius.vector2Value;
                float triRadiusFloatValue = triRadiusVectorValue.x;

                Rect line = position;
                line.height = EditorGUIUtility.singleLineHeight;
                string[] toolbarLabel = new[] {"Free", "Uniform"};
                MPEditorUtility.CornerRadiusModeGUI(line, ref uniformRect, toolbarLabel);
                line.y += EditorGUIUtility.singleLineHeight + EditorGUIUtility.standardVerticalSpacing;
                EditorGUI.BeginChangeCheck();
                {
                    EditorGUI.showMixedValue = rectRadius.hasMultipleDifferentValues;
                    if (rectBoolVal) {
                        radiusFloatValue = EditorGUI.FloatField(line, "Uniform Radius", radiusFloatValue);
                    }
                    else {
                        EditorGUI.MultiFloatField(line, new []{new GUIContent("W"), new GUIContent("Z")}, zw);
                        line.y += EditorGUIUtility.singleLineHeight + EditorGUIUtility.standardVerticalSpacing;
                        EditorGUI.MultiFloatField(line, new []{new GUIContent("X"), new GUIContent("Y")}, xy);
                    }
                    EditorGUI.showMixedValue = false;
                }
                if (EditorGUI.EndChangeCheck()) {
                    rectRadius.vector4Value = rectBoolVal
                        ? new Vector4(radiusFloatValue, radiusFloatValue, radiusFloatValue, radiusFloatValue)
                        : new Vector4(xy[0], xy[1], zw[1], zw[0]);
                }
                
                
                line.y += EditorGUIUtility.singleLineHeight + EditorGUIUtility.standardVerticalSpacing;
                MPEditorUtility.CornerRadiusModeGUI(line, ref uniformTriS, toolbarLabel, "Tip Size");
                line.y += EditorGUIUtility.singleLineHeight + EditorGUIUtility.standardVerticalSpacing;
                EditorGUI.BeginChangeCheck();
                {
                    EditorGUI.showMixedValue = triSizes.hasMultipleDifferentValues;
                    if (uniformTriS.boolValue) {
                        triSizesFloatValue = EditorGUI.FloatField(line, "Uniform Size", triSizesFloatValue);
                    }
                    else {
                        triSizesVectorValue = EditorGUI.Vector2Field(line, string.Empty, triSizesVectorValue);
                    }

                    EditorGUI.showMixedValue = false;
                }
                if (EditorGUI.EndChangeCheck()) {
                    triSizes.vector2Value = uniformTriS.boolValue
                        ? new Vector2(triSizesFloatValue, triSizesFloatValue)
                        : triSizesVectorValue;
                }
                
                
                line.y += EditorGUIUtility.singleLineHeight + EditorGUIUtility.standardVerticalSpacing;
                MPEditorUtility.CornerRadiusModeGUI(line, ref uniformTriR, toolbarLabel, "Tip Radius");
                line.y += EditorGUIUtility.singleLineHeight + EditorGUIUtility.standardVerticalSpacing;
                EditorGUI.BeginChangeCheck();
                {
                    EditorGUI.showMixedValue = triRadius.hasMultipleDifferentValues;
                    if (uniformTriR.boolValue) {
                        triRadiusFloatValue = EditorGUI.FloatField(line, "Uniform Radius", triRadiusFloatValue);
                    }
                    else {
                        triRadiusVectorValue = EditorGUI.Vector2Field(line, string.Empty, triRadiusVectorValue);
                    }

                    EditorGUI.showMixedValue = false;
                }
                if (EditorGUI.EndChangeCheck()) {
                    triRadius.vector2Value = uniformTriR.boolValue
                        ? new Vector2(triRadiusFloatValue, triRadiusFloatValue)
                        : triRadiusVectorValue;
                }

            }
            EditorGUI.EndProperty();
        }

        public override float GetPropertyHeight(SerializedProperty property, GUIContent label) {
            if (property.FindPropertyRelative("m_UniformCornerRadius").boolValue) {
                return EditorGUIUtility.singleLineHeight * 6 + EditorGUIUtility.standardVerticalSpacing * 5;
            }
            return EditorGUIUtility.singleLineHeight * 7 + EditorGUIUtility.standardVerticalSpacing * 6;
        }
    }
}