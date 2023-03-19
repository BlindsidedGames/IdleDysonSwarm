namespace SA.iOS.CoreLocation
{
    /// <summary>
    /// The object that you use to start and stop the delivery of location-related events to your app.
    /// </summary>
    public static class ISN_CLLocationManager
    {
        /// <summary>
        /// A constant indicating that all movement should be reported.
        /// Use this constant to specify that any change in location should trigger a new location update.
        /// </summary>
        public static readonly double k_CLDistanceFilterNone = 0;

        /// <summary>
        /// Returns a Boolean value indicating whether location services are enabled on the device.
        /// The user can enable or disable location services from the Settings app by toggling the Location Services switch in General.
        ///
        /// You should check the return value of this method before starting location updates to determine whether
        /// the user has location services enabled for the current device.
        /// Location services prompts users the first time they attempt to use location-related information in an app
        /// but does not prompt for subsequent attempts.
        /// If the user denies the use of location services and you attempt to start location updates anyway,
        /// the location manager reports an error to its delegate.
        /// </summary>
        public static bool LocationServicesEnabled => ISN_CLNativeAPI.LocationServicesEnabled();

        /// <summary>
        /// Requests permission to use location services while the app is in the foreground.
        /// </summary>
        public static void RequestAlwaysAuthorization()
        {
            ISN_CLNativeAPI.RequestAlwaysAuthorization();
        }

        /// <summary>
        /// Requests permission to use location services whenever the app is running.
        /// </summary>
        public static void RequestWhenInUseAuthorization()
        {
            ISN_CLNativeAPI.RequestWhenInUseAuthorization();
        }

        /// <summary>
        /// Requests the one-time delivery of the user’s current location.
        ///
        /// This method returns immediately.
        /// Calling it causes the location manager to obtain a location fix (which may take several seconds)
        /// and call the delegate’s DidUpdateLocations method with the result.
        /// The location fix is obtained at the accuracy level indicated by the <see cref="SetDesiredAccuracy"/> method.
        /// Only one location fix is reported to the delegate, after which location services are stopped.
        /// If a location fix cannot be determined in a timely manner,
        /// the location manager calls the delegate’s SidFailWithError method instead and reports a kCLErrorLocationUnknown error.
        ///
        /// Use this method when you want the user’s current location but do not need to leave location services running.
        /// This method starts location services long enough to return a result or report an error and then stops them again.
        /// Calling the <see cref="StartUpdatingLocation"/> method cancels any pending request made using this method.
        /// Calling this method while location services are already running does nothing.
        /// To cancel a pending request, call the <see cref="StopUpdatingLocation"/> method.
        ///
        /// If obtaining the desired accuracy would take too long,
        /// the location manager delivers a less accurate location value rather than reporting an error.
        ///
        /// When using this method, the associated delegate must implement the DidUpdateLocations DidFailWithError methods.
        /// Failure to do so is a programmer error.
        /// </summary>
        public static void RequestLocation()
        {
            ISN_CLNativeAPI.RequestLocation();
        }

        /// <summary>
        /// Starts the generation of updates that report the user’s current location.
        ///
        /// This method returns immediately.
        /// Calling this method causes the location manager to obtain an initial location fix (which may take several seconds)
        /// and notify your delegate by calling its DidUpdateLocations method.
        /// After that, the receiver generates update events primarily when the value in the distanceFilter property is exceeded.
        /// Updates may be delivered in other situations though.
        /// For example, the receiver may send another notification if the hardware gathers a more accurate location reading.
        ///
        /// Calling this method several times in succession does not automatically result in new events being generated.
        /// Calling stopUpdatingLocation in between, however, does cause a new initial event to be sent the next time you call this method.
        ///
        /// If you start this service and your app is suspended,
        /// the system stops the delivery of events until your app starts running again (either in the foreground or background).
        /// If your app is terminated, the delivery of new location events stops altogether.
        /// Therefore, if your app needs to receive location events while in the background,
        /// it must include the UIBackgroundModes key (with the location value) in its Info.plist file.
        /// </summary>
        public static void StartUpdatingLocation()
        {
            ISN_CLNativeAPI.StartUpdatingLocation();
        }

        /// <summary>
        /// Stops the generation of location updates.
        ///
        /// Call this method whenever your code no longer needs to receive location-related events.
        /// Disabling event delivery gives the receiver the option of disabling the appropriate hardware (and thereby saving power)
        /// when no clients need location data.
        /// You can always restart the generation of location updates by calling the startUpdatingLocation method again.
        /// </summary>
        public static void StopUpdatingLocation()
        {
            ISN_CLNativeAPI.StopUpdatingLocation();
        }

        /// <summary>
        /// The accuracy of the location data.
        ///
        /// The receiver does its best to achieve the requested accuracy; however, the actual accuracy is not guaranteed.
        /// You should assign a value to this property that is appropriate for your usage scenario.
        /// For example, if you need the current location only within a kilometer, you should specify <see cref="ISN_CLLocationAccuracy.Kilometer"/>
        /// and not <see cref="ISN_CLLocationAccuracy.BestForNavigation"/>.
        /// Determining a location with greater accuracy requires more time and more power.
        ///
        /// When requesting high-accuracy location data,
        /// the initial event delivered by the location service may not have the accuracy you requested.
        /// The location service delivers the initial event as quickly as possible.
        /// It then continues to determine the location with the accuracy you requested and delivers additional events,
        /// as necessary, when that data is available.
        ///
        /// For iOS and macOS, the default value of this property is <see cref="ISN_CLLocationAccuracy.Best"/>.
        /// For watchOS, the default value is <see cref="ISN_CLLocationAccuracy.HundredMeters"/>.
        /// </summary>
        public static void SetDesiredAccuracy(ISN_CLLocationAccuracy value)
        {
            ISN_CLNativeAPI.SetDesiredAccuracy(value);
        }

        /// <summary>
        /// A Boolean value indicating whether the location manager object may pause location updates.
        ///
        /// Allowing the location manager to pause updates can improve battery life on the target device without sacrificing location data.
        /// When this property is set to <c>true</c>, the location manager pauses updates (and powers down the appropriate hardware)
        /// at times when the location data is unlikely to change.
        /// For example, if the user stops for food while using a navigation app,
        /// the location manager might pause updates for a period of time.
        ///
        /// After a pause occurs, it is your responsibility to restart location services again when you determine that they are needed.
        /// Core Location calls the DidPauseLocationUpdates method of your location manager's delegate to let you know that a pause has occurred.
        ///
        /// Important. For apps that have in-use authorization,
        /// a pause to location updates ends access to location changes until the app is launched again and able to restart those updates.
        /// If you do not wish location updates to stop entirely,
        /// consider disabling this property and changing location accuracy to <see cref="ISN_CLLocationAccuracy.ThreeKilometers"/>
        /// when your app moves to the background.
        /// Doing so allows you to continue receiving location updates in a power-friendly manner.
        ///
        /// The default value of this property is <c>true</c>.
        /// </summary>
        public static bool PausesLocationUpdatesAutomatically
        {
            get => ISN_CLNativeAPI.PausesLocationUpdatesAutomatically;
            set => ISN_CLNativeAPI.PausesLocationUpdatesAutomatically = value;
        }

        /// <summary>
        /// Set location service delegate.
        /// </summary>
        /// <param name="delegate">The delegate object to receive update events.</param>
        public static void SetDelegate(ISN_ICLLocationManagerDelegate @delegate)
        {
            ISN_CLNativeAPI.SetDelegate(@delegate);
        }

        /// <summary>
        /// A Boolean value indicating whether the app should receive location updates when suspended.
        ///
        /// Apps that want to receive location updates when suspended must include the UIBackgroundModes key
        /// (with the location value) in their app’s Info.plist file and set the value of this property to <c>true</c>.
        /// The presence of the UIBackgroundModes key with the location value is required for background updates;
        /// you use this property to enable and disable background updates programmatically.
        /// For example, you might set this property to <c>true</c> only after the user enables features in your app
        /// where background updates are needed.
        ///
        /// When the value of this property is <c>false</c>, apps receive location updates normally while running in either the foreground
        /// or background based on its current authorization.
        /// Updates stop only when the app is suspended, thereby preventing the app from being woken up to handle those events.
        ///
        /// The default value of this property is <c>false</c>.
        /// Setting the value to <c>true</c> but omitting the UIBackgroundModes key and location value in your app’s Info.plist file
        /// is a programmer error.
        /// </summary>
        public static bool AllowsBackgroundLocationUpdates
        {
            get => ISN_CLNativeAPI.AllowsBackgroundLocationUpdates;
            set => ISN_CLNativeAPI.AllowsBackgroundLocationUpdates = value;
        }

        /// <summary>
        /// The minimum distance (measured in meters)
        /// a device must move horizontally before an update event is generated.
        ///
        /// This distance is measured relative to the previously delivered location.
        /// Use the value <see cref="k_CLDistanceFilterNone"/> to be notified of all movements.
        /// The default value of this property is <see cref="k_CLDistanceFilterNone"/>.
        ///
        /// This property is used only in conjunction with the standard location services
        /// and is not used when monitoring significant location changes.
        /// </summary>
        public static double DistanceFilter
        {
            get => ISN_CLNativeAPI.DistanceFilter;
            set => ISN_CLNativeAPI.DistanceFilter = value;
        }

        /// <summary>
        /// Returns the app’s authorization status for using location services.
        ///
        /// The authorization status of a given app is managed by the system and determined by several factors.
        /// Apps must be explicitly authorized to use location services by the user and location services must themselves currently
        /// be enabled for the system. A request for user authorization is displayed automatically
        /// when your app first attempts to use location services.
        /// </summary>
        public static ISN_CLAuthorizationStatus AuthorizationStatus => ISN_CLNativeAPI.AuthorizationStatus;
    }
}
