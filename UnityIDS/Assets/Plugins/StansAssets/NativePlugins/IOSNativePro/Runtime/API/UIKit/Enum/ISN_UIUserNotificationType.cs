namespace SA.iOS.UIKit
{
    /// <summary>
    /// Constants indicating how the app alerts the user when a local or push notification arrives.
    /// </summary>
    public enum ISN_UIUserNotificationType
    {
        /// <summary>
        /// The application may not present any UI upon a notification being received
        /// </summary>
        None = 0,

        /// <summary>
        /// The application may badge its icon upon a notification being received
        /// </summary>
        Badge = 1 << 0,

        /// <summary>
        /// The application may play a sound upon a notification being received
        /// </summary>
        Sound = 1 << 1,

        /// <summary>
        /// The application may display an alert upon a notification being received
        /// </summary>
        Alert = 1 << 2,
    }
}
