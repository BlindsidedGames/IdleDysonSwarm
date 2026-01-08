using System;
using SA.iOS.CoreLocation;

namespace SA.iOS.UserNotifications
{
    /// <summary>
    /// The geographic location that the user must reach to enable the delivery of a local notification.
    /// </summary>
    [Serializable]
    public class ISN_UNLocationNotificationTrigger : ISN_UNNotificationTrigger
    {
        /// <summary>
        /// Creates and returns a location trigger for the specified region.
        /// </summary>
        /// <param name="region">
        /// The region to use for the trigger.
        /// The trigger fires when the user’s device enters or leaves the region.
        /// Use the region object to specify whether to deliver notifications on entry, on exit, or both.
        /// </param>
        /// <param name="repeats">
        /// Specify <c>false</c> to unschedule the notification after the trigger fires.
        /// Specify <c>true</c> if you want the notification to be rescheduled after it fires.
        /// </param>
        public ISN_UNLocationNotificationTrigger(ISN_CLCircularRegion region, bool repeats)
        {
            m_Region = region;
            m_Repeats = repeats;

            m_Type = ISN_UNNotificationTriggerType.Location;
        }

        /// <summary>
        /// The region used to determine when the notification is sent.
        ///
        /// Use the <see cref="ISN_CLRegion.NotifyOnEntry"/> and <see cref="ISN_CLRegion.NotifyOnExit"/> properties of this region
        /// to specify whether notifications are sent when the user enters or exits the specified geographic area.
        /// </summary>
        public ISN_CLCircularRegion Region
        {
            get => m_Region;
            set => m_Region = value;
        }
    }
}
