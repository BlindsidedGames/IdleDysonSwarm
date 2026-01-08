using System;
using StansAssets.Foundation;
using UnityEngine;

namespace SA.iOS.CoreLocation
{
    /// <summary>
    /// The latitude, longitude, and course information reported by the system.
    /// </summary>
    [Serializable]
    public class ISN_CLLocation
    {
        [SerializeField]
        double m_Altitude = default;
        [SerializeField]
        int m_Floor = default;
        [SerializeField]
        double m_Speed = default;
        [SerializeField]
        double m_Course = default;
        [SerializeField]
        long m_Timestamp = default;
        [SerializeField]
        double m_HorizontalAccuracy = default;
        [SerializeField]
        double m_VerticalAccuracy = default;
        [SerializeField]
        ISN_CLLocationCoordinate2D m_Coordinate = default;

        /// <summary>
        /// Creates a location object with the specified coordinate and altitude information.
        /// </summary>
        /// <param name="coordinate">A coordinate structure containing the latitude and longitude values.</param>
        /// <param name="altitude">The altitude value for the location.</param>
        /// <param name="hAccuracy">
        /// The radius of uncertainty for the geographical coordinate, measured in meters.
        /// Specify a negative number to indicate that the geographical coordinate is invalid.
        /// </param>
        /// <param name="vAccuracy">
        /// The accuracy of the altitude value, measured in meters.
        /// Specify a negative number to indicate that the altitude is invalid.
        /// </param>
        /// <param name="timestamp">
        /// he time to associate with the location object.
        /// Typically, you specify the current time.
        /// </param>
        public ISN_CLLocation(ISN_CLLocationCoordinate2D coordinate,
            double altitude,
            double hAccuracy,
            double vAccuracy,
            DateTime timestamp)
        {
            m_Coordinate = coordinate;
            m_Altitude = altitude;
            m_HorizontalAccuracy = hAccuracy;
            m_VerticalAccuracy = vAccuracy;
            m_Timestamp = TimeUtility.ToUnixTime(timestamp);
        }

        /// <summary>
        /// The altitude, measured in meters.
        /// Positive values indicate altitudes above sea level.
        /// Negative values indicate altitudes below sea level.
        /// </summary>
        public double Altitude => m_Altitude;

        /// <summary>
        /// The logical floor of the building in which the user is located.
        /// If floor information is not available for the current location, the value of this property is -1.
        /// </summary>
        public int Floor => m_Floor;

        /// <summary>
        /// The instantaneous speed of the device, measured in meters per second.
        ///
        /// This value reflects the instantaneous speed of the device as it moves in the direction of its current heading.
        /// A negative value indicates an invalid speed.
        /// Because the actual speed can change many times between the delivery of location events,
        /// use this property for informational purposes only.
        /// </summary>
        public double Speed => m_Speed;

        /// <summary>
        /// The direction in which the device is traveling, measured in degrees and relative to due north.
        /// Course values are measured in degrees starting at due north and continue clockwise around the compass.
        /// Thus, north is 0 degrees, east is 90 degrees, south is 180 degrees, and so on.
        /// Course values may not be available on all devices. A negative value indicates that the course information is invalid.
        /// </summary>
        public double Course => m_Course;

        /// <summary>
        /// The time at which this location was determined.
        /// </summary>
        public DateTime Timestamp => TimeUtility.FromUnixTime(m_Timestamp);

        /// <summary>
        /// The geographical coordinate information.
        /// When running in the simulator, Core Location uses the values provided to it by the simulator.
        /// You must run your application on an iOS-based device to get the actual location of that device.
        /// </summary>
        public ISN_CLLocationCoordinate2D Coordinate => m_Coordinate;

        /// <summary>
        /// The radius of uncertainty for the location, measured in meters.
        ///
        /// The location’s latitude and longitude identify the center of the circle,
        /// and this value indicates the radius of that circle.
        /// A negative value indicates that the latitude and longitude are invalid.
        /// </summary>
        public double HorizontalAccuracy => m_HorizontalAccuracy;

        /// <summary>
        /// The accuracy of the altitude value, measured in meters.
        ///
        /// When this property contains 0 or a positive number,
        /// the value in the <see cref="Altitude"/> property is plus or minus the specified number of meters.
        /// When this property contains a negative number, the value in the <see cref="Altitude"/> property is invalid.
        ///
        ///Determining the vertical accuracy requires a device with GPS capabilities.
        /// Thus, on some devices, this property always contains a negative value.
        /// </summary>
        public double VerticalAccuracy => m_VerticalAccuracy;

        /// <summary>
        /// Returns the distance (measured in meters) from the current object's location to the specified location.
        ///
        /// This method measures the distance between the location in the current object
        /// and the value in the location parameter.
        /// The distance is calculated by tracing a line between the two points
        /// that follows the curvature of the Earth, and measuring the length of the resulting arc.
        /// The arc is a smooth curve that does not take into account altitude changes
        /// between the two locations.
        /// </summary>
        /// <param name="location">The destination location.</param>
        /// <returns>The distance (in meters) between the two locations.</returns>
        public double DistanceFromLocation(ISN_CLLocation location)
        {
            return ISN_CLNativeAPI.CllocationDistanceFromLocation(this, location);
        }
    }
}
