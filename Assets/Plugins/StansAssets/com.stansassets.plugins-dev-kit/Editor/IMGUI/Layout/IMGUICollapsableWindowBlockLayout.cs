using System;
using UnityEngine;
using UnityEditor;
using UnityEditor.AnimatedValues;

namespace StansAssets.Plugins.Editor
{
    [Serializable]
    public class IMGUICollapsableWindowBlockLayout
    {
        Action m_OnGUI;
        IMGUIHyperLabel m_Header;
        IMGUIHyperLabel m_Arrow;

        AnimBool m_ShowExtraFields = new AnimBool(false);

        GUIContent m_CollapsedContent;
        GUIContent m_ExpandedContent;

        public IMGUICollapsableWindowBlockLayout(GUIContent content, Action onGUI)
        {
            if (content.image != null) content.text = " " + content.text;

            m_OnGUI = onGUI;
            m_Header = new IMGUIHyperLabel(content, SettingsWindowStyles.ServiceBlockHeader);
            m_Header.SetMouseOverColor(SettingsWindowStyles.SelectedElementColor);

            var rightArrow = PluginsEditorSkin.GetGenericIcon("arrow_right.png");
            var arrowDown = PluginsEditorSkin.GetGenericIcon("arrow_down.png");
            m_CollapsedContent = new GUIContent(rightArrow);
            m_ExpandedContent = new GUIContent(arrowDown);

            m_Arrow = new IMGUIHyperLabel(m_CollapsedContent, SettingsWindowStyles.ServiceBlockHeader);
        }

        protected virtual void OnAfterHeaderGUI() { }

        public void OnGUI()
        {
            GUILayout.Space(5);
            using (new IMGUIBeginHorizontal())
            {
                GUILayout.Space(10);

                var content = m_CollapsedContent;
                if (m_ShowExtraFields.target) content = m_ExpandedContent;

                m_Arrow.SetContent(content);
                var arClick = m_Arrow.Draw(GUILayout.Width(20));
                GUILayout.Space(-5);

                var headerWidth = m_Header.CalcSize().x;
                var click = m_Header.Draw(GUILayout.Width(headerWidth));
                if (click || arClick) m_ShowExtraFields.target = !m_ShowExtraFields.target;

                OnAfterHeaderGUI();
            }

            using (new IMGUIHorizontalSpace(10))
            {
                if (EditorGUILayout.BeginFadeGroup(m_ShowExtraFields.faded))
                {
                    GUILayout.Space(5);
                    m_OnGUI.Invoke();
                    GUILayout.Space(5);
                }

                EditorGUILayout.EndFadeGroup();
            }

            GUILayout.Space(5);
            EditorGUILayout.BeginVertical(SettingsWindowStyles.SeparationStyle);
            GUILayout.Space(5);
            EditorGUILayout.EndVertical();
        }
    }
}
