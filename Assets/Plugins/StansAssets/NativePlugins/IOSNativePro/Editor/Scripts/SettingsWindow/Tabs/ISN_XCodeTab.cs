using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEditor;
using SA.Foundation.Editor;
using SA.Foundation.Utility;
using SA.Foundation.UtilitiesEditor;
using StansAssets.IOS.XCode;
using StansAssets.Plugins.Editor;

namespace SA.iOS
{
    [Serializable]
    class ISN_XCodeTab : IMGUILayoutElement
    {
        [SerializeField]
        IMGUIHyperToolbar m_menuToolbar;
        [SerializeField]
        List<IMGUILayoutElement> m_tabsLayout = new List<IMGUILayoutElement>();

        public override void OnAwake()
        {
            m_tabsLayout = new List<IMGUILayoutElement>();
            m_menuToolbar = new IMGUIHyperToolbar();

            AddMenuItem("GENERAL", CreateInstance<GeneralWindowTab>());
            AddMenuItem("COMPATIBILITIES", CreateInstance<CapabilitiesTab>());
            AddMenuItem("INFO.PLIST", CreateInstance<InfoPlistWindowTab>());
        }

        public override void OnLayoutEnable()
        {
            foreach (var tab in m_tabsLayout) tab.OnLayoutEnable();
        }

        void AddMenuItem(string itemName, IMGUILayoutElement layout)
        {
            var button = new IMGUIHyperLabel(new GUIContent(itemName), EditorStyles.boldLabel);
            button.SetMouseOverColor(SettingsWindowStyles.SelectedElementColor);
            m_menuToolbar.AddButtons(button);

            m_tabsLayout.Add(layout);
            layout.OnAwake();
        }

        public override void OnGUI()
        {
            EditorGUI.BeginChangeCheck();

            GUILayout.Space(2);
            var index = m_menuToolbar.Draw();
            GUILayout.Space(4);
            EditorGUILayout.BeginVertical(SettingsWindowStyles.SeparationStyle);
            GUILayout.Space(5);
            EditorGUILayout.EndVertical();

            m_tabsLayout[index].OnGUI();

            if (EditorGUI.EndChangeCheck()) XCodeProjectSettings.Save();
        }
    }
}
