using System;
using UnityEditor;
using UnityEngine;

namespace StansAssets.Plugins.Editor
{
    public class IMGUIBeginVertical : IDisposable
    {
        public IMGUIBeginVertical(params GUILayoutOption[] layoutOptions)
        {
            EditorGUILayout.BeginVertical(layoutOptions);
        }

        public IMGUIBeginVertical(GUIStyle style, params GUILayoutOption[] layoutOptions)
        {
            EditorGUILayout.BeginVertical(style, layoutOptions);
        }

        public void Dispose()
        {
            EditorGUILayout.EndVertical();
        }
    }
}
