using System;
using UnityEngine;

namespace SA.iOS.Foundation
{
    /// <summary>
    /// Contains current build information
    /// </summary>
    [Serializable]
    public class ISN_NSBuildInfo
    {
        [SerializeField]
        string m_AppVersion = null;
        [SerializeField]
        string m_BuildNumber = null;

        /// <summary>
        /// Current App Version
        /// </summary>
        public string AppVersion => m_AppVersion;

        /// <summary>
        /// Current Build Number
        /// </summary>
        public string BuildNumber => m_BuildNumber;
    }
}
