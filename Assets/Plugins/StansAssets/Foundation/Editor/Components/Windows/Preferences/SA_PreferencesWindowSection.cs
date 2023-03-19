using System;
using StansAssets.Plugins.Editor;
using UnityEngine;

namespace SA.Foundation.Editor
{
    [Serializable]
    public class SA_PreferencesWindowSection
    {
        [SerializeField]
        GUIContent m_Content;
        [SerializeField]
        IMGUILayoutElement m_Layout;

        public SA_PreferencesWindowSection(string name, IMGUILayoutElement layout)
        {
            m_Content = new GUIContent(name);
            m_Layout = layout;
        }

        public string Name => m_Content.text;

        public IMGUILayoutElement Layout => m_Layout;

        public GUIContent Content => m_Content;
    }
}
