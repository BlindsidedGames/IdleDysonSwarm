using System;
using UnityEngine;

namespace SA.iOS.CoreLocation
{
    /// <summary>
    /// The latitude and longitude associated with a location, specified using the WGS 84 reference frame.
    /// </summary>
    [Serializable]
    public class ISN_CLLocationCoordinate2D
    {
        [SerializeField]
        double m_Latitude;
        [SerializeField]
        double m_Longitude;

        /// <summary>
        /// Initializes a new instance of the <see cref="ISN_CLLocationCoordinate2D"/> class.
        /// </summary>
        /// <param name="latitude">he latitude in degrees.</param>
        /// <param name="longitude">The longitude in degrees.</param>
        public ISN_CLLocationCoordinate2D(double latitude, double longitude)
        {
            m_Latitude = latitude;
            m_Longitude = longitude;
        }

        /// <summary>
        /// The latitude in degrees.
        ///
        /// Positive values indicate latitudes north of the equator.
        /// Negative values indicate latitudes south of the equator.
        /// </summary>
        /// <value>The latitude.</value>
        public double Latitude
        {
            get => m_Latitude;
            set => m_Latitude = value;
        }

        /// <summary>
        /// The longitude in degrees.
        ///
        /// Measurements are relative to the zero meridian,
        /// with positive values extending east of the meridian and negative values extending west of the meridian.
        /// </summary>
        /// <value>The longitude.</value>
        public double Longitude
        {
            get => m_Longitude;
            set => m_Longitude = value;
        }
    }
}
