using System;
using StansAssets.Foundation.Extensions;
using UnityEngine;
using UnityEditor;

namespace StansAssets.Plugins.Editor
{
    [Serializable]
    public class IMGUIHyperLabel : IMGUIHyperButton
    {
        [SerializeField]
        GUIContent m_Content;
        [SerializeField]
        GUIContent m_HighlightedContext;

        [SerializeField]
        GUIStyle m_Style;
        [SerializeField]
        GUIStyle m_MouseOverStyle;

        [SerializeField]
        bool m_OverrideGuiColor;

        public IMGUIHyperLabel(GUIContent content)
            : this(content, EditorStyles.label) { }

        public IMGUIHyperLabel(GUIContent content, GUIStyle style)
        {
            m_Content = content;
            m_Style = new GUIStyle(style);
            m_MouseOverStyle = new GUIStyle(style);
        }

        public void SetColor(Color color)
        {
            m_Style.normal.textColor = color;
        }

        public void SetMouseOverColor(Color color)
        {
            m_MouseOverStyle.normal.textColor = color;
        }

        public void HighLight(string pattern)
        {
            if (m_HighlightedContext == null) m_HighlightedContext = new GUIContent(m_Content);

            var indexes = m_Content.text.AllIndexesOf(pattern, StringComparison.OrdinalIgnoreCase);
            if (indexes.Count == 0)
            {
                m_HighlightedContext.text = m_Content.text;
            }
            else
            {
                m_HighlightedContext.text = string.Empty;
                var lastCopyIndex = 0;
                foreach (var index in indexes)
                {
                    if (index < lastCopyIndex)
                    {
                        lastCopyIndex = index;
                    }
                    
                    m_HighlightedContext.text += m_Content.text.Substring(lastCopyIndex, index - lastCopyIndex);
                    m_HighlightedContext.text += "<color=yellow>";
                    m_HighlightedContext.text += m_Content.text.Substring(index, pattern.Length);
                    m_HighlightedContext.text += "</color>";

                    lastCopyIndex = index + pattern.Length;
                }

                m_HighlightedContext.text += m_Content.text.Substring(lastCopyIndex, m_Content.text.Length - lastCopyIndex);
            }
        }

        public void DisableHighLight()
        {
            m_HighlightedContext = null;
        }

        public bool DrawWithCalcSize()
        {
            var width = CalcSize().x + 5f;
            return Draw(GUILayout.Width(width));
        }

        protected override void OnNormal(params GUILayoutOption[] options)
        {
            if (m_OverrideGuiColor)
                using (new IMGUIChangeColor(m_Style.normal.textColor))
                {
                    using (new IMGUIChangeContentColor(m_Style.normal.textColor))
                    {
                        EditorGUILayout.LabelField(HighlightedContext ?? m_Content, m_Style, options);
                    }
                }
            else
                EditorGUILayout.LabelField(HighlightedContext ?? m_Content, m_Style, options);
        }

        protected override void OnMouseOver(params GUILayoutOption[] options)
        {
            var c = GUI.color;
            GUI.color = m_MouseOverStyle.normal.textColor;

            EditorGUILayout.LabelField(m_Content, m_MouseOverStyle, options);
            GUI.color = c;
        }

        public Vector2 CalcSize()
        {
            return m_Style.CalcSize(m_Content);
        }

        public void SetContent(GUIContent content)
        {
            m_Content = content;
        }

        public void SetStyle(GUIStyle style)
        {
            m_Style = new GUIStyle(style);
        }

        public void GuiColorOverride(bool value)
        {
            m_OverrideGuiColor = value;
        }

        public GUIContent Content => m_Content;

        public Color Color => m_Style.normal.textColor;

        GUIContent HighlightedContext
        {
            get
            {
                if (m_HighlightedContext != null && string.IsNullOrEmpty(m_HighlightedContext.text)) return null;

                return m_HighlightedContext;
            }
        }
    }
}
