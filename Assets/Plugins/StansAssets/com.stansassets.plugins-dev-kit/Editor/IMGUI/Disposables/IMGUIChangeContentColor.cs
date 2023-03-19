using UnityEngine;
using System;

namespace StansAssets.Plugins.Editor
{
    public class IMGUIChangeContentColor : IDisposable
    {
        Color PreviousColor { get; set; }

        public IMGUIChangeContentColor(string htmlColor)
        {
            PreviousColor = GUI.contentColor;

            ColorUtility.TryParseHtmlString(htmlColor, out var color);
            GUI.contentColor = color;
        }

        public IMGUIChangeContentColor(Color newColor)
        {
            PreviousColor = GUI.contentColor;
            GUI.contentColor = newColor;
        }

        public void Dispose()
        {
            GUI.contentColor = PreviousColor;
        }
    }
}
