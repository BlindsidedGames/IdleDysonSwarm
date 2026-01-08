using UnityEditor;
using UnityEngine;
using SA.Foundation.Editor;
using SA.iOS.Editor;
using StansAssets.Plugins.Editor;

namespace SA.iOS
{
    class ISN_SettingsTab : IMGUILayoutElement
    {
        readonly GUIContent m_Info = new GUIContent("Info[?]:", "Full communication logs between Native plugin part");
        readonly GUIContent m_Warnings = new GUIContent("Warnings[?]:", "Warnings");
        readonly GUIContent m_Errors = new GUIContent("Errors[?]:", "Errors");

        public override void OnGUI()
        {
            using (new SA_WindowBlockWithSpace(new GUIContent("Log Level")))
            {
                EditorGUILayout.HelpBox("We recommend you to keep full logging level while your project in development mode. " +
                    "Full communication logs between Native plugin part & " +
                    "Unity side will be only available with Info logging level enabled. \n" +
                    "Disabling the error logs isn't recommended", MessageType.Info);

                using (new IMGUIBeginHorizontal())
                {
                    var logLevel = ISN_Settings.Instance.LogLevel;

                    logLevel.Info = GUILayout.Toggle(logLevel.Info, m_Info, GUILayout.Width(80));
                    logLevel.Warning = GUILayout.Toggle(logLevel.Warning, m_Warnings, GUILayout.Width(100));
                    logLevel.Error = GUILayout.Toggle(logLevel.Error, m_Errors, GUILayout.Width(100));
                }
            }

            using (new SA_WindowBlockWithSpace(new GUIContent("Debug")))
            {
                EditorGUILayout.HelpBox("API Resolver's are normally launched with build pre-process stage", MessageType.Info);
                using (new IMGUIBeginHorizontal())
                {
                    var pressed = GUILayout.Button("Start API Resolvers");
                    if (pressed) ISN_Preprocessor.Resolve(true);
                }

                EditorGUILayout.HelpBox("Action will reset all of the plugin settings to default.", MessageType.Info);
                using (new IMGUIBeginHorizontal())
                {
                    var pressed = GUILayout.Button("Reset To Defaults");
                    if (pressed) ISN_Preprocessor.DropToDefault();
                }
            }

            using (new SA_WindowBlockWithSpace("Export/import settings"))
            {
                EditorGUILayout.HelpBox("Export settings to file.", MessageType.Info);
                var pressed = GUILayout.Button("Export settings");
                if (pressed)
                {
                    var path = EditorUtility.SaveFilePanel("Save settings as JSON",
                        "",
                        "ISN_Settings",
                        "isn_settings");
                    ISN_SettingsManager.Export(path);
                }

                EditorGUILayout.HelpBox("Import settings from file.", MessageType.Info);
                pressed = GUILayout.Button("Import settings");
                if (pressed)
                {
                    var path = EditorUtility.OpenFilePanel("Import settings from json",
                        "",
                        "isn_settings");
                    ISN_SettingsManager.Import(path);
                }
            }
        }
    }
}
