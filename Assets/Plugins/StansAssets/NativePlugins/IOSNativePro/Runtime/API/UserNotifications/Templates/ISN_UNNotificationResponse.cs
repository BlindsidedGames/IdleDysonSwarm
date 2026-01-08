using System;
using UnityEngine;

namespace SA.iOS.UserNotifications
{
    /// <summary>
    /// The user’s response to an actionable notification.
    ///
    /// When the user interacts with a delivered notification,
    /// the system delivers a <see cref="ISN_UNNotificationResponse"/> object to your app
    /// so that you can process the response.
    /// Users can interact with delivered notifications in many ways.
    /// If the notification’s category had associated action buttons, they can select one of those buttons.
    /// Users can also dismiss the notification without selecting one of your actions and they can open your app.
    /// A response object tells you which option that the user selected.
    ///
    /// You do not create instances of this class yourself.
    /// Instead, the notification center object creates instances and delivers them
    /// to the <see cref="ISN_UNUserNotificationCenterDelegate"/>.
    /// You use that method to extract any needed information from the response objects and take appropriate actions.
    /// For more information about, see the <see cref="ISN_UNUserNotificationCenterDelegate"/>.
    /// </summary>
    [Serializable]
    public class ISN_UNNotificationResponse
    {
        [SerializeField]
        ISN_UNNotification m_Notification = null;
        [SerializeField]
        string m_ActionIdentifier = null;

        /// <summary>
        /// The notification to which the user responded.
        /// </summary>
        public ISN_UNNotification Notification => m_Notification;

        /// <summary>
        /// The identifier for the action that the user selected.
        ///
        /// This parameter may contain one the identifier of one of your <see cref="ISN_UNNotificationAction"/> objects
        /// or it may contain a system-defined identifier.
        /// The system defined identifiers are <see cref="ISN_UNNotificationAction.DefaultActionIdentifier"/>
        /// and <see cref="ISN_UNNotificationAction.DismissActionIdentifier"/>, which indicate that the user opened the app
        /// or dismissed the notification without any further actions.
        ///
        /// For more information about defining custom actions, see <see cref="ISN_UNNotificationAction"/>.
        /// </summary>
        public string ActionIdentifier => m_ActionIdentifier;
    }
}
