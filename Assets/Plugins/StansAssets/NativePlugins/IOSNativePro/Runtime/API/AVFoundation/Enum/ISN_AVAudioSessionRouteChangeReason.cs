namespace SA.iOS.AVFoundation
{
    /// <summary>
    /// Constants values indicating the reason for an audio route change.
    /// </summary>
    public enum ISN_AVAudioSessionRouteChangeReason
    {
        /// <summary>
        /// A value that indicates the reason for the change is unknown.
        /// </summary>
        Unknown = 0,

        /// <summary>
        /// A value that indicates a user action, such as plugging in a headset, has made a preferred audio route available.
        /// </summary>
        NewDeviceAvailable = 1,

        /// <summary>
        /// A value that indicates that the previous audio output path is no longer available.
        /// </summary>
        OldDeviceUnavailable = 2,

        /// <summary>
        /// A value that indicates that the category of the session object changed.
        /// </summary>
        CategoryChange = 3,

        /// <summary>
        /// A value that indicates that the output route was overridden by the app.
        /// </summary>
        Override = 4,

        /// <summary>
        /// A value that indicates that the route changed when the device woke up from sleep.
        /// </summary>
        WakeFromSleep = 6,

        /// <summary>
        /// A value that indicates that the route changed because no suitable route is now available for the specified category.
        /// </summary>
        NoSuitableRouteForCategory = 7,

        /// <summary>
        /// A value that indicates that the configuration for a set of I/O ports has changed.
        /// </summary>
        RouteConfigurationChange = 8,
    }
}
