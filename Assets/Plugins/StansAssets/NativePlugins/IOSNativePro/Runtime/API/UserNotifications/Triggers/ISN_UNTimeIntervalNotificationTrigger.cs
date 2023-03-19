using System;
using StansAssets.Foundation;

namespace SA.iOS.UserNotifications
{
    /// <summary>
    /// The time that must expire before the delivery of a local notification.
    /// </summary>
    [Serializable]
    public class ISN_UNTimeIntervalNotificationTrigger : ISN_UNNotificationTrigger
    {
        /// <summary>
        /// Creates and returns a time interval trigger from the specified time value.
        /// </summary>
        /// <param name="timeInterval">
        /// The time (in seconds) that must elapse before the trigger fires. This value must be greater than zero.
        /// </param>
        /// <param name="repeats">
        /// Specify <c>false</c> to unschedule the notification after the trigger fires.
        /// Specify <c>true</c> if you want the notification to be rescheduled after it fires.
        /// </param>
        public ISN_UNTimeIntervalNotificationTrigger(long timeInterval, bool repeats)
        {
            m_TimeInterval = timeInterval;
            m_Repeats = repeats;

            m_Type = ISN_UNNotificationTriggerType.TimeInterval;

            var date = DateTime.Now;
            var timeSpan = new TimeSpan(TimeSpan.TicksPerSecond * timeInterval);
            date.Add(timeSpan);
            m_NextTriggerDate = TimeUtility.ToUnixTime(date);
        }

        /// <summary>
        /// The time interval used to create the trigger.
        ///
        /// This property contains the original time interval that you specified when creating the trigger object. T
        /// he value in this property is not updated as time counts down.
        /// To find out when the trigger will fire next,
        /// call the <see cref="ISN_UNNotificationTrigger.NextTriggerDate"/> property.
        /// </summary>
        public long TimeInterval
        {
            get => m_TimeInterval;
            set => m_TimeInterval = value;
        }
    }
}
