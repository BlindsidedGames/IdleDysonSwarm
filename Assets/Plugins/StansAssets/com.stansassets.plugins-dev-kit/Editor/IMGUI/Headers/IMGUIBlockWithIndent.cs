using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEditor;

namespace StansAssets.Plugins.Editor
{
    [Serializable]
    public class IMGUIBlockWithIndent : IDisposable
    {
        public IMGUIBlockWithIndent(GUIContent header)
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
