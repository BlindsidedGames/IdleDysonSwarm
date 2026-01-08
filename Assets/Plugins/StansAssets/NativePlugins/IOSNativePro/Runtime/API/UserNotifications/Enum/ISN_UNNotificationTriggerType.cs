namespace SA.iOS.UserNotifications
{
    /// <summary>
    /// Supported local notification trigger types.
    /// </summary>
    public enum ISN_UNNotificationTriggerType
    {
        /// <summary>
        /// The common behavior for subclasses that trigger the delivery of a local or remote notification.
        /// </summary>
        TimeInterval,

        /// <summary>
        /// A trigger condition that causes a notification to be delivered at a specific date and time.
        /// </summary>
        Calendar,

        /// <summary>
        /// A trigger condition that causes a notification to be delivered when the user's device enters or exits the specified geographic region.
        /// </summary>
        Location,

        /// <summary>
        /// A trigger condition that indicates the notification was sent from Apple Push Notification Service (APNs).
        /// </summary>
        PushNotification,
    }
}
