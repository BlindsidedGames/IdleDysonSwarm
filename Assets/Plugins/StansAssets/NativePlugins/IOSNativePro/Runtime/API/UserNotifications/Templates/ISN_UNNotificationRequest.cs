using System;
using UnityEngine;

namespace SA.iOS.UserNotifications
{
    /// <summary>
    /// An object you use to specify a notification’s content and the condition that triggers its delivery.
    /// </summary>
    [Serializable]
    public class ISN_UNNotificationRequest
    {
        [SerializeField]
        string m_Identifier;
        [SerializeField]
        ISN_UNNotificationContent m_Content;
        [SerializeField]
        ISN_UNNotificationTrigger m_Trigger;

        /// <summary>
        /// Creates and returns a local notification request object.
        ///
        /// Use this method when you want to schedule the delivery of a local notification.
        /// This method creates the request object that you subsequently pass to the
        /// <see cref="ISN_UNUserNotificationCenter.AddNotificationRequest"/> method.
        ///
        /// The system uses the identifier parameter to determine how to handle the request:
        ///  * If you provide a unique identifier, the system creates a new notification.
        ///  * If the identifier matches a previously delivered notification, the system alerts the user again,
        /// replaces the old notification with the new one, and places the new notification at the top of the list.
        ///  * If the identifier matches a pending request, the new request replaces the pending request.
        /// </summary>
        /// <param name="identifier">
        /// An identifier for the request; this parameter must not be <c>null</c>.
        /// You can use this identifier to cancel the request if it is still pending
        /// <see cref="ISN_UNUserNotificationCenter.RemovePendingNotificationRequests(string[])"/> method.
        /// </param>
        /// <param name="content">
        /// The content of the notification. This parameter must not be <c>null</c>.
        /// </param>
        /// <param name="trigger">
        /// The condition that causes the notification to be delivered. Specify <c>null</c> to deliver the notification right away.
        /// </param>
        public ISN_UNNotificationRequest(string identifier, ISN_UNNotificationContent content, ISN_UNNotificationTrigger trigger)
        {
            m_Identifier = identifier;
            m_Content = content;
            m_Trigger = trigger;
        }

        /// <summary>
        /// The unique identifier for this notification request.
        ///
        /// Use this string to identify notifications in your app.
        /// For example, you can pass this string to the <see cref="ISN_UNUserNotificationCenter.RemovePendingNotificationRequests(string[])"/>
        /// method to cancel a previously scheduled notification.
        ///
        /// If you use the same identifier when scheduling a new notification,
        /// the system removes the previously scheduled notification with that identifier and replaces it with the new one.
        /// </summary>
        public string Identifier => m_Identifier;

        /// <summary>
        /// The content associated with the notification.
        ///
        /// Use this property to access the contents of the notification.
        /// The content object contains the badge information, sound to be played,
        /// or alert text to be displayed to the user, in addition to the notification’s thread identifier.
        /// </summary>
        public ISN_UNNotificationContent Content
        {
            get => m_Content;
            set => m_Content = value;
        }

        /// <summary>
        /// The conditions that trigger the delivery of the notification.
        ///
        /// For notifications that have already been delivered, use this property
        /// to determine what caused the delivery to occur.
        /// </summary>
        public ISN_UNNotificationTrigger Trigger
        {
            get
            {
                //This is has to be an abstract class, but to keep ability for deserialization,
                //it's actually not, so before returning the trigger object we need to make sure it's not
                //an instance of ISN_UNNotificationTrigger, and if it is, then we need to create a proper type for it
                if (m_Trigger.GetType() == typeof(ISN_UNNotificationTrigger))
                    m_Trigger = m_Trigger.Convert();

                return m_Trigger;
            }

            set => m_Trigger = value;
        }
    }
}
