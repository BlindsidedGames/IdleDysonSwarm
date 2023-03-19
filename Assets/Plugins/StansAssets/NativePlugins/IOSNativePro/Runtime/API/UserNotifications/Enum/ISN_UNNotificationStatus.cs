namespace SA.iOS.UserNotifications
{
    /// <summary>
    /// Constants indicating the current status of a notification setting.
    /// </summary>
    public enum ISN_UNNotificationStatus
    {
        /// <summary>
        /// The application does not support this notification type
        /// </summary>
        NotSupported = 0,

        /// <summary>
        /// The notification setting is turned off.
        /// </summary>
        Disabled,

        /// <summary>
        /// The notification setting is turned on.
        /// </summary>
        Enabled,
    }
}
