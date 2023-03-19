using UnityEditor;
using UnityEngine;
using System.Collections.Generic;
using SA.Foundation.Utility;
using StansAssets.Foundation;
using StansAssets.Plugins.Editor;

namespace SA.Foundation.Editor
{
    public abstract class SA_PreferencesWindow<T> : EditorWindow where T : EditorWindow
    {
        [SerializeField]
        Vector2 m_sectionScrollPos;
        [SerializeField]
        int m_selectedSection;
        [SerializeField]
        List<SA_PreferencesWindowSection> m_sections = new List<SA_PreferencesWindowSection>();

        [SerializeField]
        Vector2 m_tabScrollPos;

        bool m_shouldEnabled = false;

        //--------------------------------------
        // Abstract Methods
        //--------------------------------------

        protected abstract void OnAwake();

        //--------------------------------------
        // Virtual Methods
        //--------------------------------------

        public virtual int TabSelectionWidth => 140;

        protected virtual void BeforeGUI() { }

        protected virtual void AfterGUI() { }

        //--------------------------------------
        // Protected Methods
        //--------------------------------------

        protected IMGUILayoutElement GetLayoutWithTabIndex(int index)
        {
            return m_sections[index].Layout;
        }

        //--------------------------------------
        // Public Methods
        //--------------------------------------

        public void AddSection(string name, IMGUILayoutElement layout)
        {
            var section = new SA_PreferencesWindowSection(name, layout);
            m_sections.Add(section);
        }

        //--------------------------------------
        // Static Methods
        //--------------------------------------

        public static T ShowAsModal()
        {
            var window = GetWindow<T>(true);

            window.minSize = new Vector2(700f, 560f);
            window.maxSize = new Vector2(window.minSize.x, window.maxSize.y);
            window.Show();
            return window;
        }

        //--------------------------------------
        // GUI
        //--------------------------------------

        void Awake()
        {
            OnAwake();
        }

        void OnEnable()
        {
            m_shouldEnabled = true;

            //A very nice trick to Repain window when mose is moven inside
            //Repaint will be called from OnGUI method.
            wantsMouseMove = true;

            //We might also want implement wantsMouseEnterLeaveWindow in case some animation is taking part inside
        }

        void OnGUI()
        {
            if (Event.current.type == EventType.MouseMove) Repaint();

            position = new Rect(position.x, position.y, 700f, 560f);
            if (m_shouldEnabled)
            {
                foreach (var section in m_sections) section.Layout.OnLayoutEnable();

                m_shouldEnabled = false;
            }

            BeforeGUI();
            using (new IMGUIBeginHorizontal())
            {
                m_sectionScrollPos = GUILayout.BeginScrollView(m_sectionScrollPos, SA_EditorStyles.PreferencesSectionBox, GUILayout.Width(TabSelectionWidth));

                for (var i = 0; i < m_sections.Count; i++)
                {
                    var section = m_sections[i];

                    var rect = GUILayoutUtility.GetRect(section.Content, SA_EditorStyles.PreferencesSection, GUILayout.ExpandWidth(true));

                    if (i == m_selectedSection && Event.current.type == EventType.Repaint)
                    {
                        Color color;
                        if (EditorGUIUtility.isProSkin)
                            color = new Color(62f / 255f, 95f / 255f, 150f / 255f, 1f);
                        else
                            color = new Color(62f / 255f, 125f / 255f, 231f / 255f, 1f);

                        GUI.DrawTexture(rect, Texture2DUtility.MakePlainColorImage(color));
                    }

                    EditorGUI.BeginChangeCheck();
                    if (GUI.Toggle(rect, m_selectedSection == i, section.Content, SA_EditorStyles.PreferencesSection)) m_selectedSection = i;
                    if (EditorGUI.EndChangeCheck()) GUIUtility.keyboardControl = 0;
                }

                GUILayout.EndScrollView();
                GUILayout.Space(10f);

                using (new IMGUIBeginVertical())
                {
                    m_tabScrollPos = GUILayout.BeginScrollView(m_tabScrollPos, GUILayout.Width(position.width - TabSelectionWidth - 10));
                    {
                        //  GUILayout.Label(m_sections[m_selectedSection].Content, SA_EditorStyles.Collection.SectionHeader);

                        using (new IMGUIBeginVertical(GUILayout.Width(position.width - TabSelectionWidth - 25)))
                        {
                            m_sections[m_selectedSection].Layout.OnGUI();
                        }
                    }
                    GUILayout.EndScrollView();
                }
            }

            AfterGUI();
        }
    }
}
