using System;
using UnityEngine;
using UnityEditor;
using UnityEditor.AnimatedValues;

namespace StansAssets.Plugins.Editor
{
    [Serializable]
    public class IMGUIAnimatedFoldoutBlock
    {
        [SerializeField]
        GUIContent m_Header;
        [SerializeField]
        AnimBool m_ShowExtraFields = new AnimBool(false);

        public IMGUIAnimatedFoldoutBlock(GUIContent header)
        {
            if (header.image != null) header.text = " " + header.text;
            m_Header = header;
        }

        protected virtual void OnAfterHeaderGUI() { }

        public void OnGUI(Action onContentRender)
        {
            using (new IMGUIBeginHorizontal())
            {
                m_ShowExtraFields.target = EditorGUILayout.Foldout(m_ShowExtraFields.target, m_Header, true);
            }

            using (new IMGUIHorizontalSpace(15))
            {
                if (EditorGUILayout.BeginFadeGroup(m_ShowExtraFields.faded)) onContentRender.Invoke();
                EditorGUILayout.EndFadeGroup();
            }
        }
    }
}
