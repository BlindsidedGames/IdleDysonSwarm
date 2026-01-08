using System;
using UnityEngine;

namespace SA.iOS.UserNotifications
{
    /// <summary>
    /// The object for managing notification-related settings and the authorization status of your app
    /// </summary>
    [Serializable]
    public class ISN_UNNotificationSettings
    {
#pragma warning disable 649
        [SerializeField]
        ISN_UNAuthorizationStatus m_AuthorizationStatus;
        [SerializeField]
        ISN_UNNotificationStatus m_NotificationCenterSetting;
        [SerializeField]
        ISN_UNNotificationStatus m_LockScreenSetting;
        [SerializeField]
        ISN_UNNotificationStatus m_CarPlaySetting;
        [SerializeField]
        ISN_UNNotificationStatus m_AlertSetting;
        [SerializeField]
        ISN_UNAlertStyle m_AlertStyle;
        [SerializeField]
        ISN_UNNotificationStatus m_BadgeSetting;
        [SerializeField]
        ISN_UNNotificationStatus m_SoundSetting;
        [SerializeField]
        ISN_UNShowPreviewsSetting m_ShowPreviewsSetting;
#pragma warning restore 649

        //--------------------------------------
        // Getting Device Settings
        //--------------------------------------

        /// <summary>
        /// The authorization status indicating the app’s ability to interact with the user.
        /// </summary>
        public ISN_UNAuthorizationStatus AuthorizationStatus => m_AuthorizationStatus;

        /// <summary>
        /// The setting that indicates whether your app’s notifications are displayed in Notification Center.
        /// Your app’s notifications appear in Notification Center by default, but the user may disable this setting later.
        /// </summary>
        public ISN_UNNotificationStatus NotificationCenterSetting => m_NotificationCenterSetting;

        /// <summary>
        /// The setting that indicates whether your app’s notifications appear onscreen when the device is locked.
        /// Even if the user disables lock screen notifications, your notifications may still appear onscreen when the device is unlocked.
        /// </summary>
        public ISN_UNNotificationStatus LockScreenSetting => m_LockScreenSetting;

        /// <summary>
        /// The setting that indicates whether your app’s notifications may be displayed in a CarPlay environment.
        /// </summary>
        public ISN_UNNotificationStatus CarPlaySetting => m_CarPlaySetting;

        //--------------------------------------
        // Getting User Notification Settings
        //--------------------------------------

        /// <summary>
        /// The authorization status for displaying alerts.
        /// </summary>
        public ISN_UNNotificationStatus AlertSetting => m_AlertSetting;

        /// <summary>
        /// The type of alert that the app may display when the device is unlocked.
        ///
        /// When alerts are authorized, this property specifies the presentation style for alerts when the device is unlocked.
        /// The user may choose to display alerts as automatically disappearing banners or as modal windows that require explicit dismissal.
        /// The user may also choose not to display alerts at all.
        /// </summary>
        public ISN_UNAlertStyle AlertStyle => m_AlertStyle;

        /// <summary>
        /// The authorization status for badging your app’s icon.
        ///
        /// When this setting is enabled, notifications may update the badge value displayed on top of the app’s icon.
        /// The badge value is stored in the badge property of the UNNotificationContent object.
        /// </summary>
        public ISN_UNNotificationStatus BadgeSetting => m_BadgeSetting;

        /// <summary>
        /// The authorization status for playing sounds for incoming notifications.
        ///
        /// When this setting is enabled, notifications may play sounds upon delivery.
        /// The sound to be played for the notification is stored in the sound property of the UNNotificationContent object.
        /// </summary>
        public ISN_UNNotificationStatus SoundSetting => m_SoundSetting;

        /// <summary>
        /// The setting for whether apps show a preview of the notification's content.
        /// </summary>
        public ISN_UNShowPreviewsSetting ShowPreviewsSetting => m_ShowPreviewsSetting;
    }
}
