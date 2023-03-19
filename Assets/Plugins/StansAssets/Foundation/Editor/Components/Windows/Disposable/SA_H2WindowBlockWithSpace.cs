using System;
using StansAssets.Plugins.Editor;
using UnityEngine;
using UnityEditor;

namespace SA.Foundation.Editor
{
    [Serializable]
    public class SA_H2WindowBlockWithSpace : IDisposable
    {
        int m_IndentLevel;

        public SA_H2WindowBlockWithSpace(GUIContent header)
        {
            if (header.image != null) header.text = " " + header.text;
            using (new IMGUIBeginHorizontal())
            {
                GUILayout.Space(10);
                EditorGUILayout.LabelField(header, SA_PluginSettingsWindowStyles.ServiceBlockHeader2);
            }

            //  GUILayout.Space(5);

            m_IndentLevel = EditorGUI.indentLevel;
            EditorGUI.indentLevel = 0;
            EditorGUILayout.BeginHorizontal();
            GUILayout.Space(20);
            EditorGUILayout.BeginVertical();
        }

        public void Dispose()
        {
            EditorGUILayout.EndVertical();
            EditorGUILayout.EndHorizontal();
            EditorGUI.indentLevel = m_IndentLevel;

            GUILayout.Space(5);
        }
    }
}
