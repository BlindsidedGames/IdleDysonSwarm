using System;
using SA.iOS.Utilities;
using SA.Foundation.Templates;
using UnityEngine;
#if UNITY_IPHONE
using System.Runtime.InteropServices;

#endif

namespace SA.iOS.EventKit
{
    /// <summary>
    /// This is native api for getting data from EventKit native iOS
    /// </summary>
    class ISN_EventKitNativeAPI : ISN_Singleton<ISN_EventKitNativeAPI>, ISN_EventKitAPI
    {
#if UNITY_IPHONE && EVENT_KIT_ENABLED
        [DllImport("__Internal")]
        static extern void _ISN_EventKitRequestAccess(IntPtr callback, string type);

        [DllImport("__Internal")]
        static extern void _ISN_SaveEvent(IntPtr callback, string eventData, string alarmData, string recurrenceRuleData);

        [DllImport("__Internal")]
        static extern void _ISN_RemoveEvent(IntPtr callback, string identifier);

        [DllImport("__Internal")]
        static extern void _ISN_SaveReminder(IntPtr callback, string reminderData, string alarmData, string recurrenceRuleData);

        [DllImport("__Internal")]
        static extern void _ISN_RemoveReminder(IntPtr callback, string identifier);
#endif

        /// <summary>
        /// Request access to Event or Reminder data of EventKit by using EventStore
        /// </summary>
        public void EventKitRequestAccess(Action<SA_Result> callback, ISN_EKEntityType ekEntityType)
        {
#if UNITY_IPHONE && EVENT_KIT_ENABLED
            _ISN_EventKitRequestAccess(ISN_MonoPCallback.ActionToIntPtr<SA_Result>(callback), ekEntityType.ToString());
#endif
        }

        /// <summary>
        /// Create new Event though EventKit.
        /// <summary>
        public void SaveEvent(Action<ISN_EKSaveResult> callback, ISN_EKDataRequest eventData, ISN_EKAlarmDataRequest alarmData, ISN_EKRecurrenceRuleRequest recurrenceRule)
        {
#if UNITY_IPHONE && EVENT_KIT_ENABLED
            var data = JsonUtility.ToJson(eventData);
            string alarm = null;
            string recurrenceRuleData = null;
            if (alarmData != null)
                alarm = JsonUtility.ToJson(alarmData);
            else
                alarm = JsonUtility.ToJson(new ISN_EKAlarmDataRequest());
            if (recurrenceRule != null)
                recurrenceRuleData = JsonUtility.ToJson(recurrenceRule);
            else
                recurrenceRuleData = JsonUtility.ToJson(new ISN_EKRecurrenceRuleRequest());
            _ISN_SaveEvent(ISN_MonoPCallback.ActionToIntPtr<ISN_EKSaveResult>(callback), data, alarm, recurrenceRuleData);
#endif
        }

        /// <summary>
        /// Remove event though EventKit by it's identifier.
        /// <summary>
        public void RemoveEvent(Action<SA_Result> callback, string identifier)
        {
            if (string.IsNullOrEmpty(identifier))
            {
                var error = new SA_Error(1, "Identifier parameter is empty or null.");
                var result = new SA_Result(error);
                callback.Invoke(result);
            }
#if UNITY_IPHONE && EVENT_KIT_ENABLED
            _ISN_RemoveEvent(ISN_MonoPCallback.ActionToIntPtr<SA_Result>(callback), identifier);
#endif
        }

        /// <summary>
        /// Create new Reminder though EventKit.
        /// <summary>
        public void SaveReminder(Action<ISN_EKSaveResult> callback, ISN_EKDataRequest reminderData, ISN_EKAlarmDataRequest alarmData, ISN_EKRecurrenceRuleRequest recurrenceRule)
        {
#if UNITY_IPHONE && EVENT_KIT_ENABLED
            var data = JsonUtility.ToJson(reminderData);
            string alarm = null;
            string recurrenceRuleData = null;
            if (alarmData != null)
                alarm = JsonUtility.ToJson(alarmData);
            else
                alarm = JsonUtility.ToJson(new ISN_EKAlarmDataRequest());
            if (recurrenceRule != null)
                recurrenceRuleData = JsonUtility.ToJson(recurrenceRule);
            else
                recurrenceRuleData = JsonUtility.ToJson(new ISN_EKRecurrenceRuleRequest());
            _ISN_SaveReminder(ISN_MonoPCallback.ActionToIntPtr<ISN_EKSaveResult>(callback), data, alarm, recurrenceRuleData);
#endif
        }

        /// <summary>
        /// Remove reminder though EventKit by it's identifier.
        /// <summary>
        public void RemoveReminder(Action<SA_Result> callback, string identifier)
        {
            if (string.IsNullOrEmpty(identifier))
            {
                var error = new SA_Error(1, "Identifier parameter is empty or null.");
                var result = new SA_Result(error);
                callback.Invoke(result);
            }
#if UNITY_IPHONE && EVENT_KIT_ENABLED
            _ISN_RemoveReminder(ISN_MonoPCallback.ActionToIntPtr<SA_Result>(callback), identifier);
#endif
        }
    }
}
