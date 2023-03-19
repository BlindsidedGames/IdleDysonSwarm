using UnityEngine;
using System;

namespace StansAssets.Plugins.Editor
{
    public class IMGUIEnable : IDisposable
    {
        bool PreviousState { get; }

        public IMGUIEnable(bool newState)
        {
            PreviousState = GUI.enabled;
            GUI.enabled = newState;
        }

        public void Dispose()
        {
            GUI.enabled = PreviousState;
        }
    }
}
