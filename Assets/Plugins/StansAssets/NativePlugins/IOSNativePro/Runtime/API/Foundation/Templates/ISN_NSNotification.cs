using System;
using UnityEngine;

namespace SA.iOS.Foundation
{
    /// <summary>
    /// A container for information broadcast through a notification center to all registered observers.
    /// https://developer.apple.com/documentation/foundation/nsnotification?language=objc
    /// </summary>
    [Serializable]
    public class ISN_NSNotification
    {
        [SerializeField]
        string m_Name = string.Empty;

        /// <summary>
        /// The name of the notification.
        /// </summary>
        public string Name => m_Name;
    }
}
