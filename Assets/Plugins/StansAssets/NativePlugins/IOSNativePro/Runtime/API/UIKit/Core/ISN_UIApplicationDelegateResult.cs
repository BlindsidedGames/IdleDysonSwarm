using System;
using UnityEngine;

namespace SA.iOS.UIKit
{
    /// <summary>
    /// This type for saving data from ISN_UIApplicationDelegate callback.
    /// </summary>
    [Serializable]
    public class ISN_UIApplicationDelegateResult
    {
        [SerializeField]
        string m_EventName = string.Empty;
        [SerializeField]
        string m_Data = string.Empty;

        /// <summary>
        /// Gets the event name from the result.
        /// </summary>
        public string EventName => m_EventName;

        /// <summary>
        /// Gets the data from result.
        /// </summary>
        public string Data => m_Data;
    }
}
