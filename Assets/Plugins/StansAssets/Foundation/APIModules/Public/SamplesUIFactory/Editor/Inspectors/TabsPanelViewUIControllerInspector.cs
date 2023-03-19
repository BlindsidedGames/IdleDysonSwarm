using UnityEditor;
using UnityEngine;
using UnityEngine.UI;

namespace SA.Foundation.Editor
{
    [CustomEditor(typeof(TabsPanelViewUIController))]
    public class TabsPanelViewUIControllerInspector : UnityEditor.Editor
    {
        public override void OnInspectorGUI()
        {
            DrawDefaultInspector();

            EditorGUILayout.Space();
            EditorGUILayout.LabelField("Tabs", EditorStyles.boldLabel);

            var buttons = ViewUiController.GetButtons();
            for (var i = 0; i < buttons.Length; i++)
            {
                var label = buttons[i].GetComponentInChildren<Text>().text;
                var click = GUILayout.Button(label, GUILayout.Width(200));
                if (click)
                {
                    ViewUiController.ShowPanel(i);
                    var panel = ViewUiController.GetPanel(i);
                    EditorGUIUtility.PingObject(panel);
                }
            }

            EditorGUILayout.Space();
            EditorGUILayout.LabelField("Actions", EditorStyles.boldLabel);
            var script = (TabsPanelViewUIController)target;
            if (GUILayout.Button("Add Button", GUILayout.Width(200))) script.AddButton();
        }

        public TabsPanelViewUIController ViewUiController => target as TabsPanelViewUIController;
    }
}
