using System;
using StansAssets.Foundation;
using UnityEngine;

namespace SA.iOS.UserNotifications
{
    /// <summary>
    /// The data for a delivered notification.
    ///
    /// A <see cref="ISN_UNNotification"/> object represents a local or remote notification
    /// that has been delivered to your app.
    /// A notification object consists of the initial notification request
    /// and the date on which the notification was delivered.
    /// The notification request includes the content of the notification
    /// and the trigger condition that caused it to be delivered.
    ///
    /// You do not create instances of this class directly.
    /// Instead, the <see cref="ISN_UNUserNotificationCenter"/> object maintains the list of notification objects
    /// whose contents have been delivered to the user.
    /// Use the <see cref="ISN_UNUserNotificationCenter.GetDeliveredNotifications"/> method to retrieve
    /// those notification objects.
    /// </summary>
    [Serializable]
    public class ISN_UNNotification
    {
        [SerializeField]
        long m_Date = 0;
        [SerializeField]
        ISN_UNNotificationRequest m_Request = null;

        /// <summary>
        /// The originating notification request.
        ///
        /// For local notifications, the request object is a copy of the one you originally configured.
        /// For remote notifications, the request object is synthesized from information received from the APNS server.
        /// </summary>
        public ISN_UNNotificationRequest Request => m_Request;

        /// <summary>
        /// The delivery date of the notification.
        /// This date is displayed to the user in Notification Center.
        /// </summary>
        public DateTime Date => TimeUtility.FromUnixTime(m_Date);
    }
}
