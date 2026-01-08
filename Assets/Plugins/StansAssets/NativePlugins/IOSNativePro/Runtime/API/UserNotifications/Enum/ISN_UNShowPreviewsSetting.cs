namespace SA.iOS.UserNotifications
{
    /// <summary>
    /// Constants indicating the types of alerts that can be displayed to the user.
    /// </summary>
    public enum ISN_UNShowPreviewsSetting
    {
        /// <summary>
        /// Notification previews are always shown.
        /// </summary>
        Always,

        /// <summary>
        /// Notifications previews are only shown when authenticated.
        /// </summary>
        WhenAuthenticated,

        /// <summary>
        /// Notifications previews are never shown.
        /// </summary>
        Never,
    }
}
