using UnityEditor;
using UnityEngine;

namespace MPUIKIT.Editor
{
	[CustomPropertyDrawer(typeof(ChamferBox))]
	public class ChamferBoxPropertyDrawer : PropertyDrawer {
        
		public override void OnGUI(Rect position, SerializedProperty property, GUIContent label)
		{
			EditorGUI.BeginProperty(position, label, property);
			{
				Rect rect = new Rect(position.x, position.y, position.width, EditorGUIUtility.singleLineHeight);

				SerializedProperty chamferSize = property.FindPropertyRelative("m_ChamferSize");
				float floatVal = chamferSize.floatValue;
				EditorGUI.BeginChangeCheck();
				{
					EditorGUI.showMixedValue = chamferSize.hasMultipleDifferentValues;
					floatVal = EditorGUI.FloatField(rect, "Chamfer Size", floatVal);
					EditorGUI.showMixedValue = false;
				}
				if (EditorGUI.EndChangeCheck())
				{
					chamferSize.floatValue = floatVal;
				}
			}
			EditorGUI.EndProperty();
		}
		public override float GetPropertyHeight(SerializedProperty property, GUIContent label)
		{
			return base.GetPropertyHeight(property, label);
		}
	}
}