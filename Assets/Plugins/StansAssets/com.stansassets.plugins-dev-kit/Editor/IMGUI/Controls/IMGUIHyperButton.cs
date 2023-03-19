using System;
using UnityEngine;
using UnityEditor;

namespace StansAssets.Plugins.Editor
{
    [Serializable]
    public abstract class IMGUIHyperButton
    {
        bool m_IsMouseOver = false;
        Rect m_LabelRect = new Rect();

        [SerializeField]
        bool m_IsSelected = false;

        protected abstract void OnNormal(params GUILayoutOption[] options);
        protected abstract void OnMouseOver(params GUILayoutOption[] options);

        /// <summary>
        /// True if current elements selection state is locked
        /// </summary>
        public bool IsSelectionLock => m_IsSelected;

        /// <summary>
        /// Locked button in a selected state
        /// OnMouseOver mode UI will be drawn, and button will not accept 
        /// the mouse click event.
        /// </summary>
        public void LockSelectedState(bool val)
        {
            m_IsSelected = val;
        }

        public virtual bool Draw(params GUILayoutOption[] options)
        {
            if (m_IsSelected)
            {
                OnMouseOver(options);
                return false;
            }

            if (!m_IsMouseOver)
                OnNormal(options);
            else
                OnMouseOver(options);

            if (Event.current.type == EventType.Repaint)
            {
                m_LabelRect = GUILayoutUtility.GetLastRect();
                m_IsMouseOver = m_LabelRect.Contains(Event.current.mousePosition);
            }

            if (Event.current.type == EventType.Repaint)
                if (m_IsMouseOver)
                    EditorGUIUtility.AddCursorRect(m_LabelRect, MouseCursor.Link);

            var clicked = false;
            if (m_IsMouseOver)
                if (Event.current.type == EventType.MouseDown && Event.current.button == 0)
                {
                    clicked = true;
                    GUI.changed = true;
                    Event.current.Use();
                }

            return clicked;
        }
    }
}
