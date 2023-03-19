using System;
using UnityEngine;

namespace StansAssets.Plugins.Editor
{
    public class IMGUIBeginScrollView : IDisposable
    {
        public Vector2 Scroll { get; set; }

        public IMGUIBeginScrollView(ref Vector2 scrollPosition)
        {
            scrollPosition = GUILayout.BeginScrollView(scrollPosition);
        }

        public IMGUIBeginScrollView(ref Vector2 scrollPosition, params GUILayoutOption[] options)
        {
            scrollPosition = GUILayout.BeginScrollView(scrollPosition, options);
        }

        public IMGUIBeginScrollView(Vector2 scrollPosition, GUIStyle style)
        {
            Scroll = GUILayout.BeginScrollView(scrollPosition, style);
        }

        public IMGUIBeginScrollView(Vector2 scrollPosition, GUIStyle style, params GUILayoutOption[] options)
        {
            Scroll = GUILayout.BeginScrollView(scrollPosition, style, options);
        }

        public IMGUIBeginScrollView(Vector2 scrollPosition, GUIStyle horizontalScrollBar, GUIStyle verticalScrollBar)
        {
            Scroll = GUILayout.BeginScrollView(scrollPosition, horizontalScrollBar, verticalScrollBar);
        }

        public IMGUIBeginScrollView(Vector2 scrollPosition, bool alwaysShowHorizontalScrollBar,
            bool alwaysShowVerticalScrollBar, GUIStyle horizontalScrollBar, GUIStyle verticalScrollBar)
        {
            Scroll = GUILayout.BeginScrollView(scrollPosition, alwaysShowHorizontalScrollBar, alwaysShowVerticalScrollBar,
                horizontalScrollBar, verticalScrollBar);
        }

        public IMGUIBeginScrollView(Vector2 scrollPosition, bool alwaysShowHorizontalScrollBar,
            bool alwaysShowVerticalScrollBar)
        {
            Scroll = GUILayout.BeginScrollView(scrollPosition, alwaysShowHorizontalScrollBar, alwaysShowVerticalScrollBar);
        }

        public IMGUIBeginScrollView(Vector2 scrollPosition, GUIStyle horizontalScrollBar, GUIStyle verticalScrollBar,
            params GUILayoutOption[] options)
        {
            Scroll = GUILayout.BeginScrollView(scrollPosition, horizontalScrollBar, verticalScrollBar, options);
        }

        public void Dispose()
        {
            GUILayout.EndScrollView();
        }
    }
}
