namespace SA.iOS.UIKit
{
    /// <summary>
    /// Styles to apply to action buttons in an alert.
    /// </summary>
    public enum ISN_UIAlertActionStyle
    {
        /// <summary>
        /// Apply the default style to the action’s button.
        /// </summary>
        Default,

        /// <summary>
        /// Apply a style that indicates the action cancels the operation and leaves things unchanged.
        /// </summary>
        Cancel,

        /// <summary>
        /// Apply a style that indicates the action might change or delete data.
        /// </summary>
        Destructive,
    }
}
