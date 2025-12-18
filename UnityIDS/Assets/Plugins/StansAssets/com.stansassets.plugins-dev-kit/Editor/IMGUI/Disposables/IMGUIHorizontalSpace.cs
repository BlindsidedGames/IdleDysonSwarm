using System;
using UnityEngine;
using UnityEditor;

namespace StansAssets.Plugins.Editor
{
    [Serializable]
    public class IMGUIHorizontalSpace : IDisposable
    {
        public IMGUIHorizontalSpace(int space)
        {
            EditorGUILayout.BeginHorizontal();
            GUILayout.Space(space);
            EditorGUILayout.BeginVertical();
        }

        public void Dispose()
        {
            EditorGUILayout.EndVertical();
            EditorGUILayout.EndHorizontal();
        }
    }
}
