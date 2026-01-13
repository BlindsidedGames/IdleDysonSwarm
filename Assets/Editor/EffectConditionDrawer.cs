using IdleDysonSwarm.Data.Conditions;
using UnityEditor;
using UnityEngine;

namespace IdleDysonSwarm.Editor
{
    /// <summary>
    /// Custom property drawer for EffectCondition fields.
    /// Shows the condition's description inline in the inspector.
    /// </summary>
    [CustomPropertyDrawer(typeof(EffectCondition), true)]
    public class EffectConditionDrawer : PropertyDrawer
    {
        public override void OnGUI(Rect position, SerializedProperty property, GUIContent label)
        {
            EditorGUI.BeginProperty(position, label, property);

            // Calculate rects
            float lineHeight = EditorGUIUtility.singleLineHeight;
            float spacing = EditorGUIUtility.standardVerticalSpacing;

            Rect objectFieldRect = new Rect(position.x, position.y, position.width, lineHeight);
            Rect descriptionRect = new Rect(position.x + 15, position.y + lineHeight + spacing,
                position.width - 15, lineHeight);

            // Draw the object field
            EditorGUI.PropertyField(objectFieldRect, property, label);

            // Draw the description if a condition is assigned
            var condition = property.objectReferenceValue as EffectCondition;
            if (condition != null)
            {
                string description = condition.GetDescription();
                EditorGUI.LabelField(descriptionRect, description, EditorStyles.miniLabel);
            }

            EditorGUI.EndProperty();
        }

        public override float GetPropertyHeight(SerializedProperty property, GUIContent label)
        {
            float height = EditorGUIUtility.singleLineHeight;

            // Add space for description if condition is assigned
            if (property.objectReferenceValue != null)
            {
                height += EditorGUIUtility.singleLineHeight + EditorGUIUtility.standardVerticalSpacing;
            }

            return height;
        }
    }
}
