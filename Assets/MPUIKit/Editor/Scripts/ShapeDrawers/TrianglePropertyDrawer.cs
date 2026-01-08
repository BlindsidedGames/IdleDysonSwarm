using UnityEditor;
using UnityEngine;

namespace MPUIKIT.Editor {
    [CustomPropertyDrawer(typeof(Triangle))]
    public class TrianglePropertyDrawer : PropertyDrawer{
        public override void OnGUI(Rect position, SerializedProperty property, GUIContent label) {
            EditorGUI.BeginProperty(position, label, property);
            {
                Rect LabelRect = new Rect(position.x, position.y, position.width, EditorGUIUtility.singleLineHeight);
                Rect RadiusVectorRect = new Rect(position.x, 
                    position.y + EditorGUIUtility.singleLineHeight + EditorGUIUtility.standardVerticalSpacing, 
                    position.width, EditorGUIUtility.singleLineHeight);
                
                SerializedProperty uniform = property.FindPropertyRelative("m_UniformCornerRadius");
                SerializedProperty radius = property.FindPropertyRelative("m_CornerRadius");
                
                MPEditorUtility.CornerRadiusModeGUI(LabelRect, ref uniform, new []{"Free", "Uniform"});

                float floatVal = radius.vector3Value.x;
                Vector3 vectorValue = radius.vector3Value;
                
                EditorGUI.BeginChangeCheck();
                {
                    if (uniform.boolValue) {
                        floatVal = EditorGUI.FloatField(RadiusVectorRect, "Uniform Radius", floatVal);
                    }
                    else {
                        vectorValue = EditorGUI.Vector3Field(RadiusVectorRect, string.Empty, vectorValue);
                    }
                }
                if (EditorGUI.EndChangeCheck()) {
                    radius.vector3Value = uniform.boolValue ? new Vector3(floatVal, floatVal, floatVal) : vectorValue;
                }
            }
            EditorGUI.EndProperty();
        }

        public override float GetPropertyHeight(SerializedProperty property, GUIContent label) {
            return EditorGUIUtility.singleLineHeight * 2 + EditorGUIUtility.standardVerticalSpacing * 2;
        }
    }
}