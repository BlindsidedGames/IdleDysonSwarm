using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEditor;

namespace StansAssets.Plugins.Editor
{
    [Serializable]
    public class IMGUIHyperToolbar
    {
        [SerializeField]
        int m_ButtonsWidth = 0;
        [SerializeField]
        int m_ButtonsHeight = 0;
        [SerializeField]
        float m_ItemsSpace = 5f;
        [SerializeField]
        List<IMGUIHyperLabel> m_Buttons = new List<IMGUIHyperLabel>();

        public void AddButtons(params IMGUIHyperLabel[] buttons)
        {
            if (m_Buttons == null) m_Buttons = new List<IMGUIHyperLabel>();

            foreach (var newBtn in buttons) m_Buttons.Add(newBtn);

            ValidateButtons();
        }

        void ValidateButtons()
        {
            if (m_Buttons.Count == 0) return;

            var hasActive = false;
            foreach (var button in m_Buttons)
                if (button.IsSelectionLock)
                {
                    hasActive = true;
                    break;
                }

            if (!hasActive) m_Buttons[0].LockSelectedState(true);
        }

        public void SetSelectedIndex(int index)
        {
            foreach (var button in m_Buttons) button.LockSelectedState(false);

            var selectedButton = m_Buttons[index];
            selectedButton.LockSelectedState(true);
        }

        /// <summary>
        /// Draw toolbar with buttons.
        /// Returns selected button index
        /// </summary>
        public int Draw()
        {
            if (m_Buttons == null) return 0;

            EditorGUILayout.BeginHorizontal();
            {
                EditorGUILayout.Space();

                foreach (var button in m_Buttons)
                {
                    float width;

                    if (m_ButtonsWidth == 0)
                        width = button.CalcSize().x + m_ItemsSpace;
                    else
                        width = m_ButtonsWidth;

                    bool click;
                    click = m_ButtonsHeight != 0 
                        ? button.Draw(GUILayout.Width(width), GUILayout.Height(m_ButtonsHeight)) 
                        : button.Draw(GUILayout.Width(width));

                    if (click) SetSelectedIndex(m_Buttons.IndexOf(button));
                }

                EditorGUILayout.Space();
            }
            EditorGUILayout.EndHorizontal();

            return SelectionIndex;
        }

        /// <summary>
        /// Set's custom width for all toolbar buttons.
        /// The default value is 0. When value is 0 button width is calculated
        /// based on button GUI rect.
        /// </summary>
        /// <param name="width">width value</param>
        public void SetButtonsWidth(int width)
        {
            m_ButtonsWidth = width;
        }

        /// <summary>
        /// Set's custom height for all toolbar buttons.
        /// The default value is 0. When value is 0 button height is calculated
        /// based on button GUI rect.
        /// </summary>
        /// <param name="height">height value</param>
        public void SetButtonsHeight(int height)
        {
            m_ButtonsHeight = height;
        }

        /// <summary>
        /// Set's space between items.
        /// Default space it 5
        /// </summary>
        /// <param name="space">items space value</param>
        public void SetItemsSpace(float space)
        {
            m_ItemsSpace = space;
        }

        /// <summary>
        /// Toolbar buttons
        /// </summary>
        public List<IMGUIHyperLabel> Buttons => m_Buttons;

        public int SelectionIndex
        {
            get
            {
                foreach (var button in m_Buttons)
                    if (button.IsSelectionLock)
                        return m_Buttons.IndexOf(button);

                return 0;
            }
        }
    }
}
