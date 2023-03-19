using System;
using System.Collections.Generic;
using UnityEngine;

namespace SA.iOS.CoreLocation
{
    /// <summary>
    /// Object that holds locations provided by the location service.
    /// </summary>
    [Serializable]
    public class ISN_CLLocationArray
    {
        [SerializeField]
        List<ISN_CLLocation> m_Locations = null;

        /// <summary>
        /// Locations Array.
        /// </summary>
        public List<ISN_CLLocation> Locations => m_Locations;
    }
}
