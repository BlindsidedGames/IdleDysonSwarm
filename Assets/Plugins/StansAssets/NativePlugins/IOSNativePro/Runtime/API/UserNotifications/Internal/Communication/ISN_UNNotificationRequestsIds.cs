using System;
using System.Collections.Generic;
using UnityEngine;

namespace SA.iOS.UserNotifications
{
    [Serializable]
    class ISN_UNNotificationRequestsIds
    {
        [SerializeField]
        List<string> m_NotificationIds;

        public ISN_UNNotificationRequestsIds(List<string> notificationIds)
        {
            m_NotificationIds = notificationIds;
        }

        public List<string> NotificationIds => m_NotificationIds;
    }
}
