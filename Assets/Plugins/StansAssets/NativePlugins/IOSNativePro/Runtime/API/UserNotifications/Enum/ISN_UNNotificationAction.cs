namespace SA.iOS.UserNotifications
{
    /// <summary>
    /// A task to perform in response to a delivered notification.
    /// </summary>
    public class ISN_UNNotificationAction
    {
        /// <summary>
        /// An action that indicates the user opened the app from the notification interface.
        ///
        /// The delivery of this action does not require any special configuration of notification categories.
        /// </summary>
        public const string DefaultActionIdentifier = "com.apple.UNNotificationDefaultActionIdentifier";

        /// <summary>
        /// The action that indicates the user explicitly dismissed the notification interface.
        ///
        /// This action is delivered only if the notification’s category object was configured
        /// with the UNNotificationCategoryOptionCustomDismissAction option.
        /// To trigger this action, the user must explicitly dismiss the notification interface.
        /// For example, the user must tap the Dismiss button
        /// or swipe down on the notification interface in watchOS to trigger this action.
        ///
        ///Ignoring a notification or flicking away a notification banner does not trigger this action.
        /// </summary>
        public const string DismissActionIdentifier = "com.apple.UNNotificationDismissActionIdentifier";
    }
}
