using UnityEditor;
using UnityEngine;

namespace MPUIKIT.Editor {
    [CustomPropertyDrawer(typeof(Pentagon))]
    public class PentagonPropertyDrawer : PropertyDrawer {
        public override void OnGUI(Rect position, SerializedProperty property, GUIContent label) {
            EditorGUI.BeginProperty(position, label, property);
            {
                SerializedProperty RectRadius = property.FindPropertyRelative("m_CornerRadius");
                SerializedProperty uniform = property.FindPropertyRelative("m_UniformCornerRadius");
                SerializedProperty triSize = property.FindPropertyRelative("m_TipSize");
                SerializedProperty triRadius = property.FindPropertyRelative("m_TipRadius");

                Vector4 radiusVectorValue = RectRadius.vector4Value;
                float radiusFloatValue = radiusVectorValue.x;
                bool boolVal = uniform.boolValue;
                
                float[] zw = new[] {radiusVectorValue.w, radiusVectorValue.z};
                float[] xy = new[] {radiusVectorValue.x, radiusVectorValue.y};
                
                Rect line = position;
                line.height = EditorGUIUtility.singleLineHeight;
                MPEditorUtility.CornerRadiusModeGUI(line, ref uniform, new []{"Free", "Uniform"});
                line.y += EditorGUIUtility.singleLineHeight + EditorGUIUtility.standardVerticalSpacing;
                
                EditorGUI.BeginChangeCheck();
                {
                    EditorGUI.showMixedValue = RectRadius.hasMultipleDifferentValues;
                    if (boolVal) {
                        radiusFloatValue = EditorGUI.FloatField(line,"   Uniform Radius", radiusFloatValue);
                    }
                    else {
                        line.x += 10;
                        line.width -= 10;
                        EditorGUI.MultiFloatField(line, new []{new GUIContent("W"), new GUIContent("Z"), }, zw);
                        line.y += EditorGUIUtility.singleLineHeight + EditorGUIUtility.standardVerticalSpacing;
                        EditorGUI.MultiFloatField(line, new []{new GUIContent("X "), new GUIContent("Y"), }, xy);
                        line.x -= 10;
                        line.width += 10;
                    }
                    EditorGUI.showMixedValue = false;
                }
                if (EditorGUI.EndChangeCheck()) {
                    RectRadius.vector4Value = boolVal ? new Vector4(radiusFloatValue, radiusFloatValue, radiusFloatValue, radiusFloatValue) : new Vector4(xy[0], xy[1], zw[1], zw[0]);
                }
                
                line.y += EditorGUIUtility.singleLineHeight + EditorGUIUtility.standardVerticalSpacing;
                EditorGUI.PropertyField(line, triSize, new GUIContent("Tip size"));
                line.y += EditorGUIUtility.singleLineHeight + EditorGUIUtility.standardVerticalSpacing;
                EditorGUI.PropertyField(line, triRadius, new GUIContent("Tip Radius"));
            }
            EditorGUI.EndProperty();
        }

        public override float GetPropertyHeight(SerializedProperty property, GUIContent label) {
            if (property.FindPropertyRelative("m_UniformCornerRadius").boolValue) {
                return EditorGUIUtility.singleLineHeight * 4 + EditorGUIUtility.standardVerticalSpacing * 3;
            }
            return EditorGUIUtility.singleLineHeight * 5 + EditorGUIUtility.standardVerticalSpacing * 4;
        }
    }
}