using SA.Foundation.Templates;
using System;
using UnityEngine.Assertions;

namespace SA.iOS.EventKit
{
    /// <summary>
    /// Event Kit store that gives access to Event Kit functionality.
    /// </summary>
    public class ISN_EKEventStore
    {
        static ISN_EKEventStore s_Instance;

        /// <summary>
        /// Get Instance of Event Kit store
        /// </summary>
        public static ISN_EKEventStore Instance => s_Instance ?? (s_Instance = new ISN_EKEventStore());

        /// <summary>
        /// Request access to EventKit Event.
        /// </summary>
        /// <param name="callback">
        /// This is callback that will be called from EventKit
        /// when user will give access or not to iOS calendar functionality.
        /// It shouldn't be null.
        /// </param>
        public void RequestAccessToEvent(Action<SA_Result> callback)
        {
            Assert.IsNotNull(callback);
            ISN_EventKitLib.Api.EventKitRequestAccess(callback, ISN_EKEntityType.Event);
        }

        /// <summary>
        /// Request access to EventKit Reminder.
        /// </summary>
        /// <param name="callback">
        /// This is callback that will be called from EventKit when user will give access or not to iOS calendar functionality.
        /// It shouldn't be null.</param>
        public void RequestAccessToReminder(Action<SA_Result> callback)
        {
            Assert.IsNotNull(callback);
            ISN_EventKitLib.Api.EventKitRequestAccess(callback, ISN_EKEntityType.Reminder);
        }

        /// <summary>
        /// Save new event though EventKit.
        /// </summary>
        /// <param name="title">Title of the event.</param>
        /// <param name="startDate">Start date of this event.</param>
        /// <param name="endDate">End date of this event.</param>
        /// <param name="callback">
        /// This is callback that will be called from EventKit when user will give access or not to iOS calendar functionality.
        /// It shouldn't be null.</param>
        public void SaveEvent(string title, DateTime startDate, DateTime endDate, Action<ISN_EKSaveResult> callback)
        {
            Assert.IsNotNull(callback);
            var request = new ISN_EKDataRequest(title, startDate, endDate);
            ISN_EventKitLib.Api.SaveEvent(callback, request, null, null);
        }

        /// <summary>
        /// Save new event with alarm and recurrence rule though EventKit.
        /// </summary>
        /// <param name="title"> Title of the event.</param>
        /// <param name="startDate"> Start date of this event.</param>
        /// <param name="endDate"> End date of this event.></param>
        /// <param name="alarm"> Alarm that should be added to this event. </param>
        /// <param name="recurrenceRule"> The recurrence rule that should be added to this event.</param>
        /// <param name="callback">
        /// This is callback that will be called from EventKit when user will give access or not to iOS calendar functionality.
        /// It shouldn't be null.</param>
        public void SaveEvent(string title, DateTime startDate, DateTime endDate, ISN_EKAlarmDataRequest alarm, ISN_EKRecurrenceRuleRequest recurrenceRule, Action<ISN_EKSaveResult> callback)
        {
            Assert.IsNotNull(callback);
            var request = new ISN_EKDataRequest(title, startDate, endDate);
            ISN_EventKitLib.Api.SaveEvent(callback, request, alarm, recurrenceRule);
        }

        /// <summary>
        /// Remove event though EventKit by it identifier.
        /// </summary>
        /// <param name="identifier"> Identifier of the created event in the EventStore.</param>
        /// <param name="callback">
        /// This is callback that will be called from EventKit when user will give access or not to iOS calendar functionality.
        /// It shouldn't be null.</param>
        public void RemoveEvent(string identifier, Action<SA_Result> callback)
        {
            Assert.IsNotNull(callback);
            ISN_EventKitLib.Api.RemoveEvent(callback, identifier);
        }

        /// <summary>
        /// Save new reminder though EventKit.
        /// </summary>
        /// <param name="title"> Title of the reminder.</param>
        /// <param name="callback">
        /// This is callback that will be called from EventKit when user will give access or not to iOS calendar functionality.
        /// It shouldn't be null.</param>
        public void SaveReminder(string title, Action<ISN_EKSaveResult> callback)
        {
            Assert.IsNotNull(callback);
            var request = new ISN_EKDataRequest(title);
            ISN_EventKitLib.Api.SaveReminder(callback, request, null, null);
        }

        /// <summary>
        /// Save new reminder with added alarm and recurrent rule though EventKit.
        /// </summary>
        /// <param name="title"> Title of the reminder.</param>
        /// <param name="startDate"> Start date of this reminder.</param>
        /// <param name="endDate"> End date of this reminder.></param>
        /// <param name="alarm"> Alarm that should be added to this reminder. </param>
        /// <param name="recurrenceRule"> The recurrence rule that should be added to this reminder.</param>
        /// <param name="callback">
        /// This is callback that will be called from EventKit when user will give access or not to iOS calendar functionality.
        /// It shouldn't be null.</param>
        public void SaveReminder(string title, DateTime startDate, DateTime endDate, ISN_EKAlarmDataRequest alarm, ISN_EKRecurrenceRuleRequest recurrenceRule, Action<ISN_EKSaveResult> callback)
        {
            Assert.IsNotNull(callback);
            var request = new ISN_EKDataRequest(title, startDate, endDate);
            ISN_EventKitLib.Api.SaveReminder(callback, request, alarm, recurrenceRule);
        }

        /// <summary>
        /// Remove reminder though EventKit by it identifier.
        /// </summary>
        /// <param name="identifier"> Identifier of the created reminder in the Calendar.</param>
        /// <param name="callback">
        /// This is callback that will be called from EventKit when user will give access or not to iOS calendar functionality.
        /// It shouldn't be null.</param>
        public void RemoveReminder(string identifier, Action<SA_Result> callback)
        {
            Assert.IsNotNull(callback);
            ISN_EventKitLib.Api.RemoveReminder(callback, identifier);
        }
    }
}
