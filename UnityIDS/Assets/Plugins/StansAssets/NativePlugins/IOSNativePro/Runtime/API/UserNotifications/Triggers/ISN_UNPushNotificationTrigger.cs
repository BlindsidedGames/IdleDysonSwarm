using System;

namespace SA.iOS.UserNotifications
{
    /// <summary>
    /// An object that indicates that a notification was sent from the Apple Push Notification Service.
    ///
    /// A <see cref="ISN_UNPushNotificationTrigger"/> object
    /// is assigned to notifications sent by the Apple Push Notification service.
    /// You do not create instances of this class directly; the system creates them for you.
    /// You encounter instances of this class when managing your app’s delivered notifications.
    /// A notification request associated with a remote notification has an instance of this class in its Trigger property.
    /// </summary>
    [Serializable]
    public class ISN_UNPushNotificationTrigger : ISN_UNNotificationTrigger { }
}
