using SA.Foundation.Templates;

namespace SA.iOS.CoreLocation
{
    /// <summary>
    /// The methods that you use to receive events from an associated location manager object.
    /// </summary>
    public interface ISN_ICLLocationManagerDelegate
    {
        /// <summary>
        /// Tells the delegate that the authorization status for the application changed.
        ///
        /// This method is called whenever the application’s ability to use location services changes.
        /// Changes can occur because the user allowed or denied the use of location services for your application
        /// or for the system as a whole.
        /// </summary>
        /// <param name="authorizationStatus">The new authorization status for the application.</param>
        void DidChangeAuthorizationStatus(ISN_CLAuthorizationStatus authorizationStatus);

        /// <summary>
        /// Tells the delegate that new location data is available.
        /// </summary>
        /// <param name="locations">
        /// An array of <see cref="ISN_CLLocation"/> objects containing the location data.
        /// This array always contains at least one object representing the current location.
        /// If updates were deferred or if multiple locations arrived before they could be delivered,
        /// the array may contain additional entries. The objects in the array are organized in the order in which they occurred.
        /// Therefore, the most recent location update is at the end of the array.
        /// </param>
        void DidUpdateLocations(ISN_CLLocationArray locations);

        /// <summary>
        /// Tells the delegate that the location manager was unable to retrieve a location value.
        /// If you do not implement this method, Core Location throws an exception when attempting to use location services.
        /// </summary>
        /// <param name="error">The error object containing the reason the location or heading could not be retrieved.</param>
        void DidFailWithError(SA_Error error);

        /// <summary>
        /// Tells the delegate that updates will no longer be deferred.
        ///
        /// The location manager object calls this method to let you know that it has stopped deferring the delivery of location events.
        /// The manager may call this method for any number of reasons.
        /// For example, it calls it when you stop location updates altogether,
        /// when you ask the location manager to disallow deferred updates,
        /// or when a condition for deferring updates (such as exceeding a timeout or distance parameter) is met.
        /// </summary>
        /// <param name="error">The error object containing the reason deferred location updates could not be delivered.</param>
        void DidFinishDeferredUpdatesWithError(SA_Error error);

        /// <summary>
        /// Tells the delegate that location updates were paused.
        ///
        /// When the location manager detects that the device’s location is not changing,
        /// it can pause the delivery of updates in order to shut down the appropriate hardware and save power.
        /// When it does this, it calls this method to let your app know that this has happened.
        ///
        /// After a pause occurs, it is your responsibility to restart location services again at an appropriate time.
        /// You might use your implementation of this method to start region monitoring at the user's current location
        /// or enable the visits location service to determine when the user starts moving again.
        /// Another alternative is to restart location services immediately with a reduced accuracy (which can save power)
        /// and then return to a greater accuracy only after the user starts moving again.
        /// </summary>
        void DidPauseLocationUpdates();

        /// <summary>
        /// Tells the delegate that the delivery of location updates has resumed.
        ///
        /// When you restart location services after an automatic pause,
        /// Core Location calls this method to notify your app that services have resumed.
        /// You are responsible for restarting location services in your app.
        /// Core Location does not resume updates automatically after it pauses them.
        /// </summary>
        void DidResumeLocationUpdates();
    }
}
