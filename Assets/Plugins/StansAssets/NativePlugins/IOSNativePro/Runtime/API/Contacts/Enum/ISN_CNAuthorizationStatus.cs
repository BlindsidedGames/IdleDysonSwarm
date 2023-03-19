namespace SA.iOS.Contacts
{
    /// <summary>
    /// An authorization status the user can grant for an app to access the specified entity type.
    /// </summary>
    public enum ISN_CNAuthorizationStatus
    {
        /// <summary>
        /// The user has not yet made a choice regarding whether the application may access contact data.
        /// </summary>
        NotDetermined = 0,

        /// <summary>
        /// The application is not authorized to access contact data.
        /// The user cannot change this application’s status, possibly due to active restrictions such as parental controls being in place.
        /// </summary>
        Restricted,

        /// <summary>
        /// The user explicitly denied access to contact data for the application.
        /// </summary>
        Denied,

        /// <summary>
        /// The application is authorized to access contact data.
        /// </summary>
        Authorized
    }
}
