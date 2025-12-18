using System;
using System.Collections.Generic;
using UnityEngine;

namespace SA.iOS.UserNotifications
{
    [Serializable]
    class ISN_UNNotifications
    {
        [SerializeField]
        List<ISN_UNNotification> m_Notifications = new List<ISN_UNNotification>();

        public List<ISN_UNNotification> Notifications => m_Notifications;
    }
}
