namespace SA.iOS.UserNotifications
{
    /// <summary>
    /// Constants for requesting authorization to interact with the user.
    /// </summary>
    public static class ISN_UNAuthorizationOptions
    {
        /// <summary>
        /// The ability to update the app’s badge.
        /// </summary>
        public const int Badge = 1;

        /// <summary>
        /// The ability to play sounds.
        /// </summary>
        public const int Sound = 1 << 1;

        /// <summary>
        /// The ability to display alerts.
        /// </summary>
        public const int Alert = 1 << 2;

        /// <summary>
        /// The ability to display notifications in a CarPlay environment.
        /// </summary>
        public const int CarPlay = 1 << 3;
    }
}
