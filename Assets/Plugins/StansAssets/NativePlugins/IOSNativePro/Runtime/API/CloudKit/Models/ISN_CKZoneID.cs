namespace SA.iOS.CloudKit
{
    ///<summary>
    /// This class represents zoneID for CloudKit.
    /// </summary>
    public class ISN_CKZoneID
    {
        string m_ZoneName;

        string m_OwnerName;
        static ISN_CKZoneID m_DefaultZoneID;

        /// <summary>
        /// Return zoneName of this zoneID.
        /// </summary>
        public string ZoneName => m_ZoneName;

        /// <summary>
        /// Return ownerName of this zoneID.
        /// </summary>
        public string OwnerName => m_OwnerName;

        /// <summary>
        /// Return default zoneID.
        /// </summary>
        public static ISN_CKZoneID DefaultZoneID {
            get {
                if (m_DefaultZoneID == null) {
                    m_DefaultZoneID = new ISN_CKZoneID("defaultZone", "");
                }
                return m_DefaultZoneID;
            }
        }

        /// <summary>
        /// Create new instance of zoneID.
        /// </summary>
        public ISN_CKZoneID(string zoneName, string ownerName) {
            this.m_ZoneName = zoneName;
            this.m_OwnerName = ownerName;
        }
    }
}
