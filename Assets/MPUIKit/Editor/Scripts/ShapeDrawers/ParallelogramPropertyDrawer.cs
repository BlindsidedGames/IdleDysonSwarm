using UnityEditor;
using UnityEngine;

namespace MPUIKIT.Editor
{
	[CustomPropertyDrawer(typeof(Parallelogram))]
	public class ParallelogramPropertyDrawer : PropertyDrawer
	{
		public override void OnGUI(Rect position, SerializedProperty property, GUIContent label)
		{
			EditorGUI.BeginProperty(position, label, property);
			{
				SerializedProperty skewProperty = property.FindPropertyRelative("m_Skew");
				SerializedProperty cornerRadiusProperty = property.FindPropertyRelative("m_CornerRadius");
				
				Rect propRect = new Rect(position.position, new Vector2(position.width, EditorGUIUtility.singleLineHeight));
				EditorGUI.PropertyField(propRect, skewProperty, new GUIContent("Skew"));
				propRect.y += EditorGUIUtility.singleLineHeight + EditorGUIUtility.standardVerticalSpacing;
				
				EditorGUI.PropertyField(propRect, cornerRadiusProperty, new GUIContent("Corner Radius"));
			}
			EditorGUI.EndProperty();
		}
		
		public override float GetPropertyHeight(SerializedProperty property, GUIContent label)
		{
			return EditorGUIUtility.singleLineHeight * 2 + EditorGUIUtility.standardVerticalSpacing;
		}
	}
}