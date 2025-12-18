namespace SA.iOS.AVFoundation
{
    /// <summary>
    /// Constants that provide information regarding permission to use media capture devices.
    /// </summary>
    public enum ISN_AVAuthorizationStatus
    {
        /// <summary>
        /// Explicit user permission is required for media capture,
        /// but the user has not yet granted or denied such permission.
        /// </summary>
        NotDetermined = 0,

        /// <summary>
        /// The user is not allowed to access media capture devices.
        /// </summary>
        Restricted = 1,

        /// <summary>
        /// The user has explicitly denied permission for media capture.
        /// </summary>
        Denied = 2,

        /// <summary>
        /// The user has explicitly granted permission for media capture,
        /// or explicit user permission is not necessary for the media type in question.
        /// </summary>
        Authorized = 3,
    }
}
