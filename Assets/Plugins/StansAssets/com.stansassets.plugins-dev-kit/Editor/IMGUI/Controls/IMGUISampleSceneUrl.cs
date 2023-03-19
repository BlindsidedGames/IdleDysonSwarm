using System;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace StansAssets.Plugins.Editor
{
    [Serializable]
    public class IMGUISampleSceneUrl : IMGUIHyperLabel
    {
        [SerializeField]
        string m_ScenePath;

        public IMGUISampleSceneUrl(string title, string scenePath)
            : base(new GUIContent(
        $" {title}",
                    PluginsEditorSkin.GetGenericIcon((EditorGUIUtility.isProSkin)? "sample_dark.png" : "sample_light.png")
                ),
                SettingsWindowStyles.DescriptionLabelStyle)
        {
            m_ScenePath = scenePath;
            SetMouseOverColor(SettingsWindowStyles.SelectedElementColor);
        }

        public override bool Draw(params GUILayoutOption[] options)
        {
            var click = base.Draw(options);
            if (click)
            {
                var userFinishedOperation = EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo();
                if (userFinishedOperation)
                {
                    EditorSceneManager.OpenScene(m_ScenePath);
                }
            }

            return click;
        }
    }
}
