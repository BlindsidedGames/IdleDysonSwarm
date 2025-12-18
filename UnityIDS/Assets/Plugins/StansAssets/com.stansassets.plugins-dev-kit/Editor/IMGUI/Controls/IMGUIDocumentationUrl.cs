using System;
using UnityEngine;

namespace StansAssets.Plugins.Editor
{
    [Serializable]
    public class IMGUIDocumentationUrl : IMGUIHyperLabel
    {
        [SerializeField]
        string m_URL;

        public IMGUIDocumentationUrl(string title, string url)
            : base(new GUIContent(
                    title,
                    PluginsEditorSkin.GetGenericIcon("list_arrow_white.png")
                ),
                SettingsWindowStyles.DescriptionLabelStyle)
        {
            m_URL = url;
            SetMouseOverColor(SettingsWindowStyles.SelectedElementColor);
        }

        public override bool Draw(params GUILayoutOption[] options)
        {
            var click = base.Draw(options);
            if (click) 
                Application.OpenURL(m_URL);

            return click;
        }
    }
}
