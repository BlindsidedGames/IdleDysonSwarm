using System;
using UnityEngine;

namespace SA.iOS.UserNotifications
{
    /// <summary>
    /// The content of a local or remote notification.
    /// </summary>
    [Serializable]
    public class ISN_UNNotificationContent
    {
        [SerializeField]
        string m_Title = string.Empty;
        [SerializeField]
        string m_Subtitle = string.Empty;
        [SerializeField]
        string m_Body = string.Empty;
        [SerializeField]
        long m_Badge = 0;
        [SerializeField]
        string m_Sound = string.Empty;
        [SerializeField]
        string m_UserInfo = string.Empty;

        /// <summary>
        /// A short description of the reason for the alert.
        ///
        /// When a title is present, the system attempts to display a notification alert.
        /// Apps must be authorized to display alerts.
        ///
        /// Title strings should be short, usually only a couple of words describing the reason for the notification.
        /// In watchOS, the title string is displayed as part of the short look notification interface,
        /// which has limited space.
        /// </summary>
        public string Title
        {
            get => m_Title;
            set => m_Title = value;
        }

        /// <summary>
        /// A secondary description of the reason for the alert.
        ///
        /// Subtitles offer additional context in cases where the title alone is not clear.
        /// Subtitles are not displayed in all cases.
        /// </summary>
        public string Subtitle
        {
            get => m_Subtitle;
            set => m_Subtitle = value;
        }

        /// <summary>
        /// The message displayed in the notification alert.
        ///
        /// Printf style escape characters are stripped from the string prior to display;
        /// to include a percent symbol (%) in the message body, use two percent symbols (%%).
        /// </summary>
        public string Body
        {
            get => m_Body;
            set => m_Body = value;
        }

        /// <summary>
        /// The number to display as the app’s icon badge.
        ///
        /// When the number in this property is 0, the system does not display a badge.
        /// When the number is greater than 0, the system displays the badge with the specified number.
        /// </summary>
        public long Badge
        {
            get => m_Badge;
            set => m_Badge = value;
        }

        /// <summary>
        /// The sound to play when the notification is delivered.
        ///
        /// Notifications can play a default sound or a custom sound.
        /// For information on how to specify custom sounds for your notifications,
        /// see <see cref="ISN_UNNotificationSound"/>.
        /// </summary>
        public ISN_UNNotificationSound Sound
        {
            get => string.IsNullOrEmpty(m_Sound) ? null : new ISN_UNNotificationSound(m_Sound);
            set => m_Sound = value.SoundName;
        }

        /// <summary>
        /// A custom developer defined serializable object associated with the notification.
        ///
        /// The object will be serialized with <see cref="JsonUtility.ToJson(object)"/>.
        /// Make sure you are using appropriate object that can be serialized.
        /// </summary>
        /// <param name="userInfo">Serializable object.</param>
        public void SetUserInfo(object userInfo)
        {
            m_UserInfo = JsonUtility.ToJson(userInfo);
        }

        /// <summary>
        /// Gets custom developer defined serializable object associated with the notification.
        /// The object will be deserialized with <see cref="JsonUtility.FromJson(string, System.Type)"/>.
        /// Make sure you are using appropriate object that can be deserialized.
        /// </summary>
        public T GetUserInfo<T>()
        {
            return string.IsNullOrEmpty(m_UserInfo) ? default(T) : JsonUtility.FromJson<T>(m_UserInfo);
        }
    }
}
