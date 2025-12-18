using System;
using UnityEngine;

namespace StansAssets.Plugins.Editor
{
    public class IMGUIBeginArea : IDisposable
    {
        public IMGUIBeginArea(Rect area)
        {
            GUILayout.BeginArea(area);
        }

        public IMGUIBeginArea(Rect area, string content)
        {
            GUILayout.BeginArea(area, content);
        }

        public IMGUIBeginArea(Rect area, string content, string style)
        {
            GUILayout.BeginArea(area, content, style);
        }

        public void Dispose()
        {
            GUILayout.EndArea();
        }
    }
}
