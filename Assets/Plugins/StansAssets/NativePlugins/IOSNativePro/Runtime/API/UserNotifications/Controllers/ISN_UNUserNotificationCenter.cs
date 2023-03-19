using System;
using System.Collections.Generic;
using SA.Foundation.Templates;

namespace SA.iOS.UserNotifications
{
    /// <summary>
    /// The central object for managing notification-related activities for your app or app extension.
    /// </summary>
    public static class ISN_UNUserNotificationCenter
    {
        /// <summary>
        /// Requests authorization to interact with the user when local and remote notifications arrive.
        ///
        /// If the local or remote notifications of your app or app extension interact with the user in any way,
        /// you must call this method to request authorization for those interactions.
        /// The first time your app ever calls the method, the system prompts the user to authorize the requested options.
        /// The user may respond by granting or denying authorization,
        /// and the system stores the user’s response so that subsequent calls to this method do not prompt the user again.
        /// The user may change the allowed interactions at any time. Use the <see cref="GetNotificationSettings"/> method
        /// to determine what your app is allowed to do.
        ///
        /// After determining the authorization status, the user notification center object executes the block you provide in the <see cref="callback"/> parameter.
        /// Use that block to make any adjustments in your app.
        /// For example, if authorization was denied, you might notify a remote notification server not to send notifications to the user’s device.
        ///
        /// Always call this method before scheduling any local notifications and before registering with the Apple Push Notification Service.
        /// Typically, you call this method at launch time when configuring your app's notification support.
        /// However, you may call it at another time in your app's life cycle, providing that you call it before performing any other notification-related tasks.
        /// </summary>
        /// <param name="options">
        /// The authorization options your app is requesting. You may combine the available constants to request authorization for multiple items.
        /// Request only the authorization options that you plan to use. For a list of possible values, see <see cref="ISN_UNAuthorizationOptions"/>
        /// </param>
        /// <param name="callback">The block to execute asynchronously with the results.</param>
        public static void RequestAuthorization(int options, Action<SA_Result> callback)
        {
            ISN_UNLib.Api.RequestAuthorization(options, callback);
        }

        /// <summary>
        /// Requests the notification settings for this app.
        ///
        /// Use this method to determine the specific notification-related features that your app is allowed to use.
        /// When the user authorizes your app to post notifications, the system authorizes your app with a set of default notification-related settings.
        /// The user may further customize those settings to enable or disable specific capabilities.
        /// For example, the user might disable the playing of sounds in conjunction with your notifications.
        /// You can use the settings in the provided object to adjust the content of any scheduled notifications.
        /// </summary>
        /// <param name="callback">The block to execute asynchronously with the results.</param>
        public static void GetNotificationSettings(Action<ISN_UNNotificationSettings> callback)
        {
            ISN_UNLib.Api.GetNotificationSettings(callback);
        }

        /// <summary>
        /// Schedules a local notification for delivery.
        ///
        /// This method schedules local notifications only;
        /// You cannot use it to schedule the delivery of push notifications.
        /// The notification is delivered when the trigger condition in the request parameter is met.
        /// If the request does not contain a <see cref="ISN_UNNotificationTrigger"/> object, the notification is delivered right away.
        ///
        /// You may call this method from any thread of your app.
        /// </summary>
        /// <param name="request">The notification request to schedule.This parameter must not be <c>null</c></param>
        /// <param name="callback">The block to execute with the results.</param>
        public static void AddNotificationRequest(ISN_UNNotificationRequest request, Action<SA_Result> callback)
        {
            ISN_UNLib.Api.AddNotificationRequest(request, callback);
        }

        /// <summary>
        /// Unschedule all pending notification requests.
        /// This method executes asynchronously, removing all pending notification requests on a secondary thread.
        /// </summary>
        public static void RemoveAllPendingNotificationRequests()
        {
            ISN_UNLib.Api.RemoveAllPendingNotificationRequests();
        }

        /// <summary>
        /// Unschedule the specified notification requests.
        /// This method executes asynchronously, removing the pending notification requests on a secondary thread.
        /// </summary>
        /// <param name="requests">
        /// An array of <see cref="ISN_UNNotificationRequest"/> objects,
        /// each of which contains the identifier of an active notification request object.
        /// If the identifier belongs to a non repeating request whose notification has already been delivered,
        /// this method ignores the identifier.
        /// </param>
        public static void RemovePendingNotificationRequests(params ISN_UNNotificationRequest[] requests)
        {
            var identifiers = new List<string>();
            foreach (var request in requests) identifiers.Add(request.Identifier);

            RemovePendingNotificationRequests(identifiers.ToArray());
        }

        /// <summary>
        /// Unschedules the specified notification requests.
        /// This method executes asynchronously, removing the pending notification requests on a secondary thread.
        /// </summary>
        /// <param name="identifiers">
        /// An array of <see cref="string"/> objects,
        /// each of which contains the identifier of an active notification request object.
        /// If the identifier belongs to a non repeating request whose notification has already been delivered,
        /// this method ignores the identifier.
        /// </param>
        public static void RemovePendingNotificationRequests(params string[] identifiers)
        {
            ISN_UNLib.Api.RemovePendingNotificationRequests(new List<string>(identifiers));
        }

        /// <summary>
        /// Returns a list of all notification requests that are scheduled and waiting to be delivered.
        ///
        /// This method executes asynchronously, returning immediately
        /// and executing the provided block on a secondary thread when the results are available.
        /// </summary>
        /// <param name="callback">A block for processing notification requests.</param>
        public static void GetPendingNotificationRequests(Action<List<ISN_UNNotificationRequest>> callback)
        {
            ISN_UNLib.Api.GetPendingNotificationRequests(callback);
        }

        /// <summary>
        /// Provides you with a list of the app’s notifications that are still displayed in Notification Center.
        ///
        /// This method executes asynchronously, returning immediately
        /// and executing the provided block on a background thread when the results become available.
        /// </summary>
        /// <param name="callback">The block to execute with the results.</param>
        public static void GetDeliveredNotifications(Action<List<ISN_UNNotification>> callback)
        {
            ISN_UNLib.Api.GetDeliveredNotifications(callback);
        }

        /// <summary>
        /// Removes all of the app’s notifications from Notification Center.
        ///
        /// Use this method to remove all of your app’s notifications from Notification Center.
        /// The method executes asynchronously, returning immediately
        /// and removing the identifiers on a background thread.
        /// </summary>
        public static void RemoveAllDeliveredNotifications()
        {
            ISN_UNLib.Api.RemoveAllDeliveredNotifications();
        }

        /// <summary>
        /// Removes the specified notifications from Notification Center.
        ///
        /// Use this method to selectively remove notifications that you no longer want displayed in Notification Center.
        /// The method executes asynchronously, returning immediately and removing the identifiers on a background thread.
        /// </summary>
        /// <param name="identifiers">
        /// An array of <see cref="string"/> objects, each of which corresponds to the identifier
        /// associated with a notification request object.
        /// This method ignores the <c>identifiers</c> of request objects whose notifications
        /// are not currently displayed in Notification Center.
        /// </param>
        public static void RemoveDeliveredNotifications(params string[] identifiers)
        {
            ISN_UNLib.Api.RemoveDeliveredNotifications(new List<string>(identifiers));
        }
    }
}
