////////////////////////////////////////////////////////////////////////////////
//
// @module IOS Native Plugin
// @author Koretsky Konstantin (Stan's Assets)
// @support support@stansassets.com
// @website https://stansassets.com
//
////////////////////////////////////////////////////////////////////////////////

using System;
using System.Collections.Generic;
using SA.Foundation.Templates;
using SA.Foundation.Events;

namespace SA.iOS.UserNotifications
{
    interface ISN_iUNAPI
    {
        SA_iEvent<ISN_UNNotification> WillPresentNotification { get; }
        SA_iEvent<ISN_UNNotificationResponse> DidReceiveNotificationResponse { get; }

        ISN_UNNotificationResponse LastReceivedResponse { get; }

        void RequestAuthorization(int options, Action<SA_Result> callback);
        void GetNotificationSettings(Action<ISN_UNNotificationSettings> callback);
        void AddNotificationRequest(ISN_UNNotificationRequest request, Action<SA_Result> callback);

        void RemoveAllPendingNotificationRequests();
        void RemovePendingNotificationRequests(List<string> notificationRequestsIds);
        void GetPendingNotificationRequests(Action<List<ISN_UNNotificationRequest>> callback);

        void RemoveAllDeliveredNotifications();
        void RemoveDeliveredNotifications(List<string> notificationsIds);
        void GetDeliveredNotifications(Action<List<ISN_UNNotification>> callback);

        void ClearLastReceivedResponse();
    }
}
