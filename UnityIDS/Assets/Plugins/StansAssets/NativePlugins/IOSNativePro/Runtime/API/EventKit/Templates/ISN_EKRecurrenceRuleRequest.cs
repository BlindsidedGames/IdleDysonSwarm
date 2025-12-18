using UnityEngine;
using System;
using StansAssets.Foundation;

namespace SA.iOS.EventKit
{
    /// <summary>
    /// This is object that save data fir recurrence rule that we need to send
    /// to EventKit for saving event or reminder.
    /// </summary>
    [Serializable]
    public class ISN_EKRecurrenceRuleRequest
    {
#pragma warning disable 414
        [SerializeField]
        bool m_HasRule;
        [SerializeField]
        string m_Frequency = null;
        [SerializeField]
        int m_Interval = -1;
        [SerializeField]
        bool m_HasEndDate = false;
        [SerializeField]
        long m_EndDate = -1;
#pragma warning restore 414

        /// <summary>
        /// Create ISN_RecurrenceRuleRequest object.
        /// </summary>
        public ISN_EKRecurrenceRuleRequest()
        {
            m_HasRule = false;
        }

        /// <summary>
        /// Create ISN_RecurrenceRuleRequest object.
        /// </summary>
        /// <param name="frequency"> Frequency of recurrence rule</param>
        /// <param name="interval"> Interval of recurrence rule</param>
        public ISN_EKRecurrenceRuleRequest(ISN_EKRecurrenceFrequencies frequency, int interval)
        {
            m_HasRule = true;
            m_Frequency = frequency.ToString();
            m_Interval = interval;
        }

        /// <summary>
        /// Create ISN_RecurrenceRuleRequest object.
        /// </summary>
        /// <param name="frequency"> Frequency of recurrence rule</param>
        /// <param name="interval"> Interval of recurrence rule</param>
        /// <param name="endDate"> End date of recurrence rule</param>
        public ISN_EKRecurrenceRuleRequest(ISN_EKRecurrenceFrequencies frequency, int interval, DateTime endDate)
        {
            m_HasRule = true;
            m_Frequency = frequency.ToString();
            m_Interval = interval;
            m_HasEndDate = true;
            m_EndDate = TimeUtility.ToUnixTime(endDate);
        }
    }
}
