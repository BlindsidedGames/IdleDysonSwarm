using UnityEditor;
using UnityEngine;

namespace StansAssets.Plugins.Editor
{
    [CustomEditor(typeof(PackageScriptableSettings), true)]
    public sealed class PackageSettingsInspector : UnityEditor.Editor
    {
        const string k_DescriptionText = "This ScriptableObject hold's plugin setting. " +
            "You may use it to backup the settings or to transfer it into the new project. " +
            "It’s not recommended to modify the settings via Default settings Inspector menu. " +
            "Use plugin editor window instead. ";

        IMGUIPluginActiveTextLink m_AboutScriptableObjects;
        IMGUIPluginActiveTextLink m_PluginSettings;
        IMGUIPluginActiveTextLink m_Documentation;

        void OnEnable()
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
            using (new IMGUIBlockWithSpace(new GUIContent("Where to go from here?")))
            {
                using (new IMGUIBeginHorizontal())
                {
                    GUILayout.Space(5);
                    bool click;
                    click = m_PluginSettings.DrawWithCalcSize();
                    if (click)
                    {
                        Debug.Log("Not yet implemented");
                    }

                    click = m_AboutScriptableObjects.DrawWithCalcSize();
                    if (click) Application.OpenURL("https://docs.unity3d.com/ScriptReference/ScriptableObject.html");
                }

                using (new IMGUIBeginHorizontal())
                {
                    GUILayout.Space(5);
                    var click = m_Documentation.DrawWithCalcSize();
                    if (click)
                    {
                        Debug.Log("Not yet implemented");
                    }
                }
            }

            using (new IMGUIBlockWithSpace(new GUIContent("Default Settings Inspector")))
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
                    EditorGUILayout.LabelField(TargetSettings.PackageName, SettingsWindowStyles.LabelHeaderStyle);
                }
                EditorGUILayout.EndHorizontal();
                GUILayout.Space(8);

                EditorGUILayout.BeginHorizontal();
                {
                    GUILayout.Space(SettingsWindowStyles.IndentPixelSize);
                    EditorGUILayout.LabelField(k_DescriptionText, SettingsWindowStyles.DescriptionLabelStyle);
                }
                EditorGUILayout.EndHorizontal();
                GUILayout.Space(5);
            }
            EditorGUILayout.EndVertical();
        }

        public PackageScriptableSettings TargetSettings => (PackageScriptableSettings)target;
    }
}
