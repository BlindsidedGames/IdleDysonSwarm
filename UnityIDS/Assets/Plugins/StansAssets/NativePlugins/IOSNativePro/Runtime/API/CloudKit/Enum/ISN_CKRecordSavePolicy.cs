namespace SA.iOS.CloudKit
{
    /// <summary>
    /// This is a representation of CKRecordSavePolicy from CloudKit.
    /// </summary>
    public enum ISN_CKRecordSavePolicy
    {
        /// <summary>
        /// If the record on the server has been modified, fail the write and return an error.
        /// A CKShare's participants array is always treated as `CKRecordSaveIfServerRecordUnchanged`,
        /// regardless of the `savePolicy` of the operation that modifies the share.
        /// </summary>
        CKRecordSaveIfServerRecordUnchanged = 0,
        /// <summary>
        /// Any unseen changes on the server will be overwritten to the locally-edited value.
        /// </summary>
        CKRecordSaveChangedKeys = 1,
        /// <summary>
        /// Any unseen changes on the server will be overwritten to the local values.  Keys present only on the server remain unchanged.
        /// There are two common ways in which a server record will contain keys not present locally:
        /// *  1 - Since you've fetched this record, another client has added a new key to the record.
        /// *  2 - The presence of `desiredKeys` on the fetch / query that returned this record meant that only a portion of the record's keys were downloaded.
        /// </summary>
        CKRecordSaveAllKeys = 2,
    }
}
