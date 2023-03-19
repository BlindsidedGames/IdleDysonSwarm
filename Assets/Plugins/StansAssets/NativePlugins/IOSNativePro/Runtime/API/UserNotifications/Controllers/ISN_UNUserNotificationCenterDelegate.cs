using SA.Foundation.Events;

namespace SA.iOS.UserNotifications
{
    /// <summary>
    /// The interface for handling notification-related interactions in your app or app extension.
    ///
    /// The <see cref="ISN_UNUserNotificationCenterDelegate"/> defines events for responding to actionable notifications
    /// and receiving notifications while your app is in the foreground.
    /// The user notification center calls methods of this delegate at appropriate times to deliver information.
    ///
    /// You must subscribe to this object events as soon as possible.
    /// However, delegate may already receive action while app was launching. For example if user has launched the app
    /// by clicking on notifications. You may check <see cref="LastReceivedResponse"/> to find out of app was launched
    /// using the notification. If Property is null after your app is launched it means that application was launched
    /// without interaction with the notification object.
    ///
    /// </summary>
    public static class ISN_UNUserNotificationCenterDelegate
    {
        /// <summary>
        /// Clears the last received response.
        /// </summary>
        public static void ClearLastReceivedResponse()
        {
            ISN_UNLib.Api.ClearLastReceivedResponse();
        }

        /// <summary>
        /// Called when a notification is delivered to a foreground app.
        ///
        /// If your app is in the foreground when a notification arrives,
        /// the notification center calls this method to deliver the notification directly to your app.
        /// If you implement this method, you can take whatever actions are necessary to process the notification
        /// and update your app.
        /// User will not be alerted by a system;
        /// </summary>
        public static SA_iEvent<ISN_UNNotification> WillPresentNotification => ISN_UNLib.Api.WillPresentNotification;

        /// <summary>
        /// Called to let your app know which action was selected by the user for a given notification.
        ///
        /// Use this method to perform the tasks associated with your app’s custom actions.
        /// When the user responds to a notification, the system calls this method with the results.
        /// You use this method to perform the task associated with that action, if at all.
        ///
        /// If you do not subscribe this event, your app never responds to custom actions.
        /// </summary>
        public static SA_iEvent<ISN_UNNotificationResponse> DidReceiveNotificationResponse => ISN_UNLib.Api.DidReceiveNotificationResponse;

        /// <summary>
        /// Contains last received <see cref="ISN_UNNotificationResponse"/> object by delegate.
        ///
        /// You must subscribe to this class events as soon as possible.
        /// However, delegate may already receive action while app was launching. For example if user has launched the app
        /// by clicking on notifications. You may check <see cref="LastReceivedResponse"/> to find out of app was launched
        /// using the notification. If Property is null after your app is launched it means that application was launched
        /// without interaction with the notification object.
        /// </summary>
        public static ISN_UNNotificationResponse LastReceivedResponse => ISN_UNLib.Api.LastReceivedResponse;
    }
}
