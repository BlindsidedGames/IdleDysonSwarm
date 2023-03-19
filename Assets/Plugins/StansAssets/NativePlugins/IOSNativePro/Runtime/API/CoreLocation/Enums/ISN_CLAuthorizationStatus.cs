namespace SA.iOS.CoreLocation
{
    /// <summary>
    /// Constants indicating the app's authorization to use location services.
    /// </summary>
    public enum ISN_CLAuthorizationStatus
    {
        /// <summary>
        /// User has not yet made a choice with regards to this application
        /// </summary>
        NotDetermined = 0,

        /// <summary>
        /// This application is not authorized to use location services.  Due
        /// to active restrictions on location services, the user cannot change
        /// this status, and may not have personally denied authorization
        /// </summary>
        Restricted,

        /// <summary>
        /// User has explicitly denied authorization for this application, or
        /// location services are disabled in Settings.
        /// </summary>
        Denied,

        /// <summary>
        /// User has granted authorization to use their location at any time,
        /// including monitoring for regions, visits, or significant location changes.
        ///
        /// This value should be used on iOS, tvOS and watchOS.  It is available on
        /// MacOS, but kCLAuthorizationStatusAuthorized is synonymous and preferred.
        /// </summary>
        AuthorizedAlways,

        /// <summary>
        /// User has granted authorization to use their location only when your app
        /// is visible to them (it will be made visible to them if you continue to
        /// receive location updates while in the background).  Authorization to use
        /// launch APIs has not been granted.
        ///
        /// This value is not available on MacOS.  It should be used on iOS, tvOS and
        /// watchOS.
        /// </summary>
        AuthorizedWhenInUse,
    }
}
