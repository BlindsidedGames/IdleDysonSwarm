using System;
using SA.iOS.Foundation;

namespace SA.iOS.UserNotifications
{
    [Serializable]
    public class ISN_UNCalendarNotificationTrigger : ISN_UNNotificationTrigger
    {
        /// <summary>
        /// Creates and returns a calendar trigger from the specified date components.
        /// </summary>
        /// <param name="dateComponents">
        /// The temporal information to use when constructing the trigger.
        /// Provide only the date components that are relevant for your trigger.
        /// </param>
        /// <param name="repeats">
        /// Specify <c>false</c> to unschedule the notification after the trigger fires.
        /// Specify <c>true</c> if you want the notification to be rescheduled after it fires.
        /// </param>
        public ISN_UNCalendarNotificationTrigger(ISN_NSDateComponents dateComponents, bool repeats)
        {
            m_DateComponents = dateComponents;
            m_Repeats = repeats;

            m_Type = ISN_UNNotificationTriggerType.Calendar;
        }

        /// <summary>
        /// The date components used to construct this object
        /// Use this property to review the date components associated with this trigger.
        /// </summary>
        public ISN_NSDateComponents DateComponents => m_DateComponents;
    }
}
