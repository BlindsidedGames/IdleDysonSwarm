using System;

namespace SA.iOS.ReplayKit
{
    /// <summary>
    /// An object that displays a user interface where users preview and edit a screen recording created with ReplayKit.
    /// </summary>
    public class ISN_RPPreviewViewController
    {
        /// <summary>
        /// Presents a view controller modally.
        /// </summary>
        /// <param name="callback">Indicates that the preview view controller is dismissed.</param>
        public void Present(Action<ISN_PRPreviewResult> callback)
        {
            ISN_RPNativeLib.Api.ShowVideoShareDialog(callback);
        }
    }
}
