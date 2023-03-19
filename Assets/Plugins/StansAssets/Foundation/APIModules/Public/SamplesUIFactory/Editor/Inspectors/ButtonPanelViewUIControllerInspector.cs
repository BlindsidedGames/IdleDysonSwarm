using UnityEditor;
using UnityEngine;

namespace SA.Foundation.Editor
{
    [CustomEditor(typeof(ButtonPanelViewUIController))]
    public class ButtonPanelViewUIControllerInspector : UnityEditor.Editor
    {
        public override void OnInspectorGUI()
        {
            DrawDefaultInspector();

            var script = (ButtonPanelViewUIController)target;
            if (GUILayout.Button("Add Button")) script.AddGridLayoutButton();
        }
    }
}
