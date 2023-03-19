namespace SA.iOS.CoreLocation
{
    /// <summary>
    /// The accuracy of a geographical coordinate.
    /// </summary>
    public enum ISN_CLLocationAccuracy
    {
        /// <summary>
        /// The best level of accuracy available.
        /// Specify this constant when you want very high accuracy but do not need the same level of
        /// accuracy required for navigation apps.
        /// </summary>
        Best,

        /// <summary>
        /// Accurate to within ten meters of the desired target.
        /// </summary>
        NearestTenMeters,

        /// <summary>
        /// Accurate to within one hundred meters.
        /// </summary>
        HundredMeters,

        /// <summary>
        /// Accurate to the nearest kilometer.
        /// </summary>
        Kilometer,

        /// <summary>
        /// Accurate to the nearest three kilometers.
        /// </summary>
        ThreeKilometers,

        /// <summary>
        /// The highest possible accuracy that uses additional sensor data to facilitate navigation apps.
        /// </summary>
        BestForNavigation,
    }
}
