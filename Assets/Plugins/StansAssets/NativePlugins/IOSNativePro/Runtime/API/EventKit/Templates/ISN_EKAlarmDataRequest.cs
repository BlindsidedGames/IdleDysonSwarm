using UnityEngine;
using System;
using StansAssets.Foundation;

namespace SA.iOS.EventKit
{
    /// <summary>
    /// This is object for creating new alarm for Events and Reminders.
    /// </summary>
    [Serializable]
    public class ISN_EKAlarmDataRequest
    {
#pragma warning disable 414
        [SerializeField]
        bool m_HasAlarm;
        [SerializeField]
        bool m_IsAbsoluteDate;
        [SerializeField]
        long m_DueDate = -1;
        [SerializeField]
        long m_TimeStamp = -1;
#pragma warning restore 414

        /// <summary>
        /// Create an ISN_AlarmDataRequest object.
        /// </summary>
        public ISN_EKAlarmDataRequest()
        {
            m_HasAlarm = false;
            m_IsAbsoluteDate = false;
        }

        /// <summary>
        /// Create an ISN_AlarmDataRequest object.
        /// </summary>
        /// <param name="dueDate"> Due date of this alarm. </param>
        public ISN_EKAlarmDataRequest(DateTime dueDate)
        {
            m_HasAlarm = true;
            m_DueDate = TimeUtility.ToUnixTime(dueDate);
            m_IsAbsoluteDate = true;
        }

        /// <summary>
        /// Create an ISN_AlarmDataRequest object.
        /// </summary>
        /// <param name="timeStamp"> Time stamp before this alarm will activated. </param>
        public ISN_EKAlarmDataRequest(long timeStamp)
        {
            m_HasAlarm = true;
            m_IsAbsoluteDate = false;
            m_TimeStamp = timeStamp;
        }
    }
}
