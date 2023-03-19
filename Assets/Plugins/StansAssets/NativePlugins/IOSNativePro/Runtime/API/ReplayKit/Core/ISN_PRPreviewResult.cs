using System;
using System.Collections.Generic;
using UnityEngine;
using SA.Foundation.Templates;

namespace SA.iOS.ReplayKit
{
    /// <summary>
    /// Replay Kir preview result.
    /// </summary>
    [Serializable]
    public class ISN_PRPreviewResult : SA_Result
    {
        [SerializeField]
        List<string> m_ActivityTypes = null;

        /// <summary>
        /// A set of activity types as listed in UIActivity.
        /// </summary>
        /// <value>The activity types.</value>
        public List<string> ActivityTypes => m_ActivityTypes;
    }
}
