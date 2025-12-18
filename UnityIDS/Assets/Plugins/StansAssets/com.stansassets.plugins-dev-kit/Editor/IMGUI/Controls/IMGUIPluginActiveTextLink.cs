using System;
using UnityEngine;

namespace StansAssets.Plugins.Editor
{
    [Serializable]
    public class IMGUIPluginActiveTextLink : IMGUIHyperLabel
    {
        [SerializeField]
        string m_Url;

        public IMGUIPluginActiveTextLink(string title)
            : base(new GUIContent(title), SettingsWindowStyles.DescriptionLabelStyle)
        {
            SetColor(SettingsWindowStyles.ActiveLinkColor);
            SetMouseOverColor(SettingsWindowStyles.SelectedElementColor);
        }

        public void SetUrl(string url)
        {
            m_Url = url;
        }

        public void DrawWithWithCalcSizeAndDefaultAction()
        {
            bool click;
            click = DrawWithCalcSize();
            if (click)
            {
                Application.OpenURL(m_Url);
            }
        }
        
        public void DrawWithDefaultAction(params GUILayoutOption[] options)
        {
            bool click;
            click = Draw(options);
            if (click)
            {
                Application.OpenURL(m_Url);
            }
        }
    }
}
