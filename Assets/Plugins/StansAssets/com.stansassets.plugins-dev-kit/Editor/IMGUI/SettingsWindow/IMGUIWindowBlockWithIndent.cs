using System;
using UnityEditor;
using UnityEngine;

namespace StansAssets.Plugins.Editor
{
    public class IMGUIWindowBlockWithIndent : IDisposable
    {
        public IMGUIWindowBlockWithIndent(GUIContent header)
        {
            if (header.image != null) header.text = " " + header.text;
            GUILayout.Space(10);
            using (new IMGUIBeginHorizontal())
            {
                GUILayout.Space(10);
                EditorGUILayout.LabelField(header, SettingsWindowStyles.ServiceBlockHeader);
            }

            GUILayout.Space(5);

            EditorGUI.indentLevel++;
        }

        public void Dispose()
        {
            EditorGUI.indentLevel--;
            GUILayout.Space(5);
            EditorGUILayout.BeginVertical(SettingsWindowStyles.SeparationStyle);
            GUILayout.Space(5);
            EditorGUILayout.EndVertical();
        }
    }
}
