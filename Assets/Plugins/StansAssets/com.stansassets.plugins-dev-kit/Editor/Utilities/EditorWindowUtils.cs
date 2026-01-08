using System;
using UnityEditor;
using UnityEngine;

namespace StansAssets.Plugins.Editor
{
    /// <summary>
    /// Utils collection for the Unity EditorWindow.
    /// </summary>
    public static class EditorWindowUtils
    {
        public static TWindow OpenAndDockNextToInspector<TWindow>() where TWindow : EditorWindow
        {
            // We want to dock next to the Unity Inspector window
            var inspectorType = Type.GetType("UnityEditor.InspectorWindow, UnityEditor.dll");
            var window = EditorWindow.GetWindow<TWindow>(inspectorType);

            // For widows docked next to the inspector we would also like to maintain minimal size as follows
            window.minSize = new Vector2(350, 100);
            window.Show();
            return window;
        }
    }
}
