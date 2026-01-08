using System;
using System.Collections.Generic;
using UnityEngine;

namespace SA.iOS.UserNotifications
{
    [Serializable]
    class ISN_UNNotificationRequests
    {
        [SerializeField]
        List<ISN_UNNotificationRequest> m_Requests = new List<ISN_UNNotificationRequest>();

        public List<ISN_UNNotificationRequest> Requests => m_Requests;
    }
}
