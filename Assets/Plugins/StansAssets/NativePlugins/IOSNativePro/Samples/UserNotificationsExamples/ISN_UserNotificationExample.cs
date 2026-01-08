using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using SA.iOS.Foundation;
using SA.iOS.CoreLocation;
using SA.iOS.UserNotifications;
using SA.iOS.UIKit;

namespace SA.iOS.Examples
{
    public class ISN_UserNotificationExample : MonoBehaviour
    {
        public void RequestUserNotificationPermission()
        {
            var options = ISN_UNAuthorizationOptions.Alert | ISN_UNAuthorizationOptions.Sound;
            ISN_UNUserNotificationCenter.RequestAuthorization(options, (result) =>
            {
                Debug.Log("RequestAuthorization: " + result.IsSucceeded);
            });

            ISN_UIApplication.RegisterForRemoteNotifications();
            ISN_UIApplication.ApplicationDelegate.DidRegisterForRemoteNotifications.AddListener((result) =>
            {
                if (result.IsSucceeded) Debug.Log(result.DeviceTokenUTF8);
            });
        }

        public void GetSettings()
        {
            ISN_UNUserNotificationCenter.GetNotificationSettings((setting) =>
            {
                Debug.Log("Got the settings");
                Debug.Log(setting.AuthorizationStatus.ToString());
            });
        }

        public void NotificationInterval()
        {
            var content = new ISN_UNNotificationContent();
            content.Title = "Hello";
            content.Body = "Hello_message_body";
            content.Sound = ISN_UNNotificationSound.DefaultSound;

            // Deliver the notification in five seconds.
            var trigger = new ISN_UNTimeIntervalNotificationTrigger(5, false);

            var request = new ISN_UNNotificationRequest("FiveSecond", content, trigger);

            // Schedule the notification.
            ISN_UNUserNotificationCenter.AddNotificationRequest(request, (result) =>
            {
                Debug.Log("AddNotificationRequest: " + result.IsSucceeded);
            });
        }

        public void NotificationCalendar()
        {
            var content = new ISN_UNNotificationContent();
            content.Title = "Hello";
            content.Body = "Hello_message_body";
            content.Sound = ISN_UNNotificationSound.DefaultSound;

            var date = new ISN_NSDateComponents();
            date.Hour = 8;
            date.Minute = 30;

            var trigger = new ISN_UNCalendarNotificationTrigger(date, true);
            var request = new ISN_UNNotificationRequest("FiveSecond", content, trigger);

            // Schedule the notification.
            ISN_UNUserNotificationCenter.AddNotificationRequest(request, (result) =>
            {
                Debug.Log("AddNotificationRequest: " + result.IsSucceeded);
            });
        }

        public void NotificationLocation()
        {
            var content = new ISN_UNNotificationContent();
            content.Title = "Hello";
            content.Body = "Hello_message_body";
            content.Sound = ISN_UNNotificationSound.DefaultSound;

            var center = new ISN_CLLocationCoordinate2D(37.335400f, -122.009201f);
            var region = new ISN_CLCircularRegion(center, 2000f, "Headquarters");

            region.NotifyOnEntry = true;
            region.NotifyOnExit = false;

            // Deliver the notification in five seconds.
            var trigger = new ISN_UNLocationNotificationTrigger(region, false);

            var request = new ISN_UNNotificationRequest("FiveSecond", content, trigger);

            // Schedule the notification.
            ISN_UNUserNotificationCenter.AddNotificationRequest(request, (result) =>
            {
                Debug.Log("AddNotificationRequest: " + result.IsSucceeded);
            });
        }

        public void NoSoundToTrigger()
        {
            var content = new ISN_UNNotificationContent();
            content.Title = "Hello";
            content.Body = "Hello_message_body";

            var request = new ISN_UNNotificationRequest("FiveSecond", content, null);

            // Schedule the notification.
            ISN_UNUserNotificationCenter.AddNotificationRequest(request, (result) =>
            {
                Debug.Log("AddNotificationRequest: " + result.IsSucceeded);
            });
        }
    }
}
