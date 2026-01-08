using UnityEngine;
using System;

namespace SA.iOS.CloudKit 
{
    /// <summary>
    /// An object that uniquely identifies a record in a database.
    /// </summary>
    [Serializable]
    public class ISN_CKRecordID
    {
        [SerializeField]
        string m_recordName;
        [SerializeField]
        ISN_CKZoneID m_zoneID;

        /// <summary>
        /// Get recordName of this recordID.
        /// </summary>
        public string RecordName => m_recordName;

        /// <summary>
        /// Get zoneID of this RecordID.
        /// <summary>
        public ISN_CKZoneID ZoneID => m_zoneID;

        /// <summary>
        /// Creates a record ID in the default zone.
        /// </summary>
        /// <param name="recordName">
        /// Name for this recordID.
        /// </param>
        public ISN_CKRecordID(string recordName) {
            this.m_recordName = recordName;
            this.m_zoneID = ISN_CKZoneID.DefaultZoneID;
        }

        /// <summary>
        /// Creates a record ID with your zoneID.
        /// </summary>
        /// <param name="recordName"> Name for this recordID. </param>
        /// <param name="zoneID"> ZoneID for this recordID. </param>
        public ISN_CKRecordID(string recordName, ISN_CKZoneID zoneID) {
            this.m_recordName = recordName;
            this.m_zoneID = zoneID;
        }
    }
}
