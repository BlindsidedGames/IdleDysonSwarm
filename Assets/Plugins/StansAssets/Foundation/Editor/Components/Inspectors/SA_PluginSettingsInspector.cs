using UnityEditor;
using UnityEngine;
using SA.Foundation.Patterns;
using StansAssets.Plugins.Editor;

namespace SA.Foundation.Editor
{
    [CustomEditor(typeof(SA_ScriptableSettings), true)]
    public class SA_PluginSettingsInspector : UnityEditor.Editor
    {
        const string k_DescriptionText = "This ScriptableObject hold's plugin setting. " +
            "You may use it to backup the settings or to transfer it into the new project. " +
            "It’s not recommended to modify the settings via Default settings Inspector menu. " +
            "Use plugin editor window instead. ";

        IMGUIPluginActiveTextLink m_AboutScriptableObjects;
        IMGUIPluginActiveTextLink m_PluginSettings;
        IMGUIPluginActiveTextLink m_Documentation;

        protected virtual void OnEnable()
        {
            m_AboutScriptableObjects = new IMGUIPluginActiveTextLink("About ScriptableObject");
            m_PluginSettings = new IMGUIPluginActiveTextLink("Plugin Settings");
            m_Documentation = new IMGUIPluginActiveTextLink("Documentation");
        }

        public override void OnInspectorGUI()
        {
            Repaint();
            HeaderBlock();
            InfoBlock();
        }

        void InfoBlock()
        {
            using (new SA_WindowBlockWithSpace(new GUIContent("Where to go from here?")))
            {
                using (new IMGUIBeginHorizontal())
                {
                    GUILayout.Space(5);
                    bool click;
                    click = m_PluginSettings.DrawWithCalcSize();
                    if (click) EditorApplication.ExecuteMenuItem(TargetSettings.SettingsUIMenuItem);

                    click = m_AboutScriptableObjects.DrawWithCalcSize();
                    if (click) Application.OpenURL("https://docs.unity3d.com/ScriptReference/ScriptableObject.html");
                }

                using (new IMGUIBeginHorizontal())
                {
                    GUILayout.Space(5);
                    var click = m_Documentation.DrawWithCalcSize();
                    if (click) Application.OpenURL(TargetSettings.DocumentationURL);
                }
            }

            using (new SA_WindowBlockWithSpace(new GUIContent("Default Settings Inspector")))
            {
                DrawDefaultInspector();
            }
        }

        void HeaderBlock()
        {
            EditorGUILayout.BeginVertical(SettingsWindowStyles.SeparationStyle);
            {
                GUILayout.Space(20);
                EditorGUILayout.BeginHorizontal();
                {
                    GUILayout.Space(SettingsWindowStyles.IndentPixelSize);
                    EditorGUILayout.LabelField(TargetSettings.PluginName + " Settings", SettingsWindowStyles.LabelHeaderStyle);
                }
                EditorGUILayout.EndHorizontal();
                GUILayout.Space(8);

                EditorGUILayout.BeginHorizontal();
                {
                    GUILayout.Space(SettingsWindowStyles.IndentPixelSize);
                    EditorGUILayout.LabelField(k_DescriptionText, SettingsWindowStyles.DescriptionLabelStyle);
                }
                EditorGUILayout.EndHorizontal();

                GUILayout.Space(2);
                using (new IMGUIBeginHorizontal())
                {
                    GUILayout.FlexibleSpace();
                    EditorGUILayout.SelectableLabel("v: " + TargetSettings.GetFormattedVersion(), SettingsWindowStyles.VersionLabelStyle, GUILayout.Width(120));
                    GUILayout.Space(10);
                }

                GUILayout.Space(5);
            }
            EditorGUILayout.EndVertical();
        }

        public SA_ScriptableSettings TargetSettings => (SA_ScriptableSettings)target;
    }
}
