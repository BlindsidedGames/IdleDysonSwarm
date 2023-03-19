using System;
using UnityEngine;
using SA.Foundation.Templates;

namespace SA.iOS.ReplayKit
{
    /// <summary>
    /// Replay Kit Store Recording result.
    /// </summary>
    [Serializable]
    public class ISN_RPStopResult : SA_Result
    {
        [SerializeField]
        bool m_HasPreviewController = false;

        /// <summary>
        /// An instance of the <see cref="ISN_RPPreviewViewController"/> class,  that is returned
        /// if anything at all was recorded. The interface allows the user to preview and edit the recording.
        /// </summary>
        public ISN_RPPreviewViewController PreviewController;

        /// <summary>
        /// Gets a value indicating whether result has a <see cref="PreviewController"/>.
        /// </summary>
        /// <value><c>true</c> if has preview controller; otherwise, <c>false</c>.</value>
        public bool HasPreviewController => m_HasPreviewController;
    }
}
