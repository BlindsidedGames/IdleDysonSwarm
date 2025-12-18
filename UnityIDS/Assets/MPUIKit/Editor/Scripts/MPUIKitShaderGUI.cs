using UnityEditor;
using UnityEngine;

namespace MPUIKIT.Editor
{
    public class MPImageShaderGUI : ShaderGUI
    {
        private bool _showValues;

        public override void OnGUI(MaterialEditor materialEditor, MaterialProperty[] properties)
        {
            EditorGUILayout.HelpBox(
                "Nothing to modify here. Select an MPImage component in the hierarchy and modify the values in the inspector.",
                MessageType.Info);
            
            if (GUILayout.Button(_showValues ? "Hide Debug Values" : "Show Debug Values", EditorStyles.miniLabel)) _showValues = !_showValues;

            if (_showValues)
            {
                EditorGUI.BeginDisabledGroup(true);
                base.OnGUI(materialEditor, properties);
                EditorGUI.EndDisabledGroup();
            }
        }
    }
}