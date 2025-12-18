namespace SA.iOS.UserNotifications
{
    /// <summary>
    /// Constants indicating whether the app is allowed to schedule notifications.
    /// </summary>
    public enum ISN_UNAuthorizationStatus
    {
        /// <summary>
        /// The user has not yet made a choice regarding whether the application may post user notifications.
        /// </summary>
        NotDetermined = 0,

        /// <summary>
        /// The application is not authorized to post user notifications.
        /// </summary>
        Denied,

        /// <summary>
        /// The application is authorized to post user notifications.
        /// </summary>
        Authorized,
    }
}
