using UnityEngine;
using SA.iOS.EventKit;
using UnityEngine.UI;

public class ISN_EventKitExamples : MonoBehaviour
{
    [SerializeField]
    Text m_Error = null;

    string m_EventID = null;
    string m_ReminderID = null;

    public void RequestAccessToEvent()
    {
        ISN_EKEventStore.Instance.RequestAccessToEvent((request) =>
        {
            if (request.IsSucceeded)
                m_Error.text = "We Initialized EventKit with event!";
            else
                m_Error.text = "We have error at initialized EventKit with event- " + request.Error.FullMessage;
        });
    }

    public void RequestAccessToReminder()
    {
        ISN_EKEventStore.Instance.RequestAccessToReminder((request) =>
        {
            if (request.IsSucceeded)
                m_Error.text = "We Initialized EventKit with reminder!";
            else
                m_Error.text = "We have error at initialized EventKit with reminder - " + request.Error.FullMessage;
        });
    }

    public void AddEvent()
    {
        var alarm = new ISN_EKAlarmDataRequest(System.DateTime.Now);
        var recurrenceRule = new ISN_EKRecurrenceRuleRequest(ISN_EKRecurrenceFrequencies.Monthly, 2);
        ISN_EKEventStore.Instance.SaveEvent("Test event", System.DateTime.Now, System.DateTime.Now, alarm, recurrenceRule, (request) =>
        {
            if (request.Result.IsSucceeded)
            {
                m_Error.text = "Yey, It's working! ID is - " + request.Identifier;
                m_EventID = request.Identifier;
            }
            else
            {
                m_Error.text = "We have error - " + request.Result.Error.FullMessage;
            }
        });
    }

    public void RemoveEvent()
    {
        if (!string.IsNullOrEmpty(m_EventID))
            ISN_EKEventStore.Instance.RemoveEvent(m_EventID, (request) =>
            {
                if (request.IsSucceeded)
                {
                    m_Error.text = "We removed event - " + m_EventID;
                    m_EventID = null;
                }
                else
                {
                    m_Error.text = "We have error at removing event - " + request.Error.FullMessage;
                }
            });
        else
            m_Error.text = "We can't remove event because identifier is null or empty!";
    }

    public void AddReminder()
    {
        var alarm = new ISN_EKAlarmDataRequest(System.DateTime.Now);
        var recurrenceRule = new ISN_EKRecurrenceRuleRequest(ISN_EKRecurrenceFrequencies.Monthly, 2, System.DateTime.Now);
        ISN_EKEventStore.Instance.SaveReminder("Test reminder", System.DateTime.Now, System.DateTime.Now, alarm, recurrenceRule, (request) =>
        {
            if (request.Result.IsSucceeded)
            {
                m_Error.text = "Yey, It's working! ID is - " + request.Identifier;
                m_ReminderID = request.Identifier;
            }
            else
            {
                m_Error.text = "We have error - " + request.Result.Error.FullMessage;
            }
        });
    }

    public void RemoveReminder()
    {
        if (!string.IsNullOrEmpty(m_ReminderID))
            ISN_EKEventStore.Instance.RemoveReminder(m_ReminderID, (request) =>
            {
                if (request.IsSucceeded)
                {
                    m_Error.text = "We removed reminder - " + m_ReminderID;
                    m_ReminderID = null;
                }
                else
                {
                    m_Error.text = "We have error at removing reminder - " + request.Error.FullMessage;
                }
            });
        else
            m_Error.text = "We can't remove reminder because identifier is null or empty!";
    }
}
