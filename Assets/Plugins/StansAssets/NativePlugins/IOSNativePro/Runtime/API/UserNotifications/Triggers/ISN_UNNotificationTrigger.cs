using System;
using UnityEngine;
using SA.iOS.Foundation;
using SA.iOS.CoreLocation;
using StansAssets.Foundation;

namespace SA.iOS.UserNotifications
{
    /// <summary>
    /// The common behavior for subclasses that trigger the delivery of a notification.
    /// </summary>
    [Serializable]
    public class ISN_UNNotificationTrigger
    {
        [SerializeField]
        protected bool m_Repeats = false;
        [SerializeField]
        protected long m_NextTriggerDate;
        [SerializeField]
        protected ISN_UNNotificationTriggerType m_Type;

        //--------------------------------------
        // TimeInterval
        //--------------------------------------

        [SerializeField]
        protected long m_TimeInterval = 0;

        //--------------------------------------
        // Calendar
        //--------------------------------------

        [SerializeField]
        protected ISN_NSDateComponents m_DateComponents;

        //--------------------------------------
        // Location
        //--------------------------------------

        [SerializeField]
        protected ISN_CLCircularRegion m_Region;

        //--------------------------------------
        // Default
        //--------------------------------------

        /// <summary>
        /// A Boolean value indicating whether the event repeats.
        ///
        /// When this property is <c>False</c>, the notification is delivered once and then
        /// the notification request is automatically unscheduled.
        /// When this property is <c>True</c>, the notification request is not unscheduled automatically,
        /// resulting in the notification being delivered each time the trigger condition is met.
        /// </summary>
        public bool Repeats
        {
            get => m_Repeats;
            set => m_Repeats = value;
        }

        /// <summary>
        /// The next date at which the trigger conditions will be met.
        /// Use this property to find out when a notification associated with this trigger will next be delivered.
        /// </summary>
        public DateTime NextTriggerDate => TimeUtility.FromUnixTime(m_NextTriggerDate);

        /// <summary>
        /// Trigger type
        /// Trigger type is defined automatically and depends of constructor that was used
        /// to create a <see cref="ISN_UNNotificationTrigger"/> object in a first place.
        /// </summary>
        public ISN_UNNotificationTriggerType Type => m_Type;

        /// <summary>
        /// Converts ISN_UNNotificationTrigger to one of ISN_UNNotificationTrigger child classes
        /// based on <see cref="Type"/>
        /// </summary>
        /// <returns>The convert.</returns>
        public ISN_UNNotificationTrigger Convert()
        {
            switch (Type)
            {
                case ISN_UNNotificationTriggerType.Calendar:
                    return new ISN_UNCalendarNotificationTrigger(m_DateComponents, m_Repeats);
                case ISN_UNNotificationTriggerType.Location:
                    return new ISN_UNLocationNotificationTrigger(m_Region, m_Repeats);
                case ISN_UNNotificationTriggerType.PushNotification:
                    return new ISN_UNPushNotificationTrigger();
                case ISN_UNNotificationTriggerType.TimeInterval:
                    return new ISN_UNTimeIntervalNotificationTrigger(m_TimeInterval, m_Repeats);
                default:
                    return null;
            }
        }
    }
}
