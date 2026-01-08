using SA.Foundation.Templates;
using UnityEngine;

namespace SA.iOS.EventKit
{
    interface ISN_EventKitAPI
    {
        void EventKitRequestAccess(System.Action<SA_Result> callback, ISN_EKEntityType ekEntityType);
        void SaveEvent(System.Action<ISN_EKSaveResult> callback, ISN_EKDataRequest eventData, ISN_EKAlarmDataRequest alarmData, ISN_EKRecurrenceRuleRequest recurrenceRule);
        void RemoveEvent(System.Action<SA_Result> callback, string identifier);
        void SaveReminder(System.Action<ISN_EKSaveResult> callback, ISN_EKDataRequest reminderData, ISN_EKAlarmDataRequest alarmData, ISN_EKRecurrenceRuleRequest recurrenceRule);
        void RemoveReminder(System.Action<SA_Result> callback, string identifier);
    }
}
