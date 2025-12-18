using System;
using UnityEngine.Assertions;
using UnityEngine;

namespace SA.iOS.CloudKit
{
    /// <summary>
    /// The CKDatabase class offers convenience methods for accessing records, record zones, and subscriptions without an operation object.
    /// The convenience methods allow you to fetch, save, or delete a single item asynchronously and process the results on a background thread.
    /// There is also a convenience method to search for records in the database.
    /// </summary>
    public class ISN_CKDatabase
    {
        string m_DatabaseType;

        public ISN_CKDatabase(ISN_CKDatabaseType database) {
            this.m_DatabaseType = database.ToString();
        }

        /// <summary>
        /// Saves one record asynchronously, with a low priority, to the current database,
        /// if the record has never been saved or if it is newer than the version on the server.
        /// </summary>
        /// <param name="record">
        /// The record to save. This method return an error if this parameter is nil.
        /// </param>
        /// <param name="callback">
        /// This is callback that return ISN_CKResult when saving oparation is done.
        /// </param>
        public void SaveRecord(ISN_CKRecord record, Action<ISN_CKResult> callback) {
            Assert.IsNotNull(callback);
            Internal.ISN_CloudKitLib.Api.SaveRecord(record, m_DatabaseType.ToString(), callback);
        }

        /// <summary>
        /// Deletes the specified record asynchronously, with a low priority, from the current database.
        /// Deleting a record may trigger additional deletions if the record was referenced by other records.
        /// This method reports only the ID of the record you asked to delete.
        /// CloudKit does not report deletions triggered by owning relationships between records.
        /// </summary>
        /// <param name="recordID">
        /// The recordID of record that should be removed. This method return an error if this parameter is nil.
        /// </param>
        /// <param name="callback">
        /// This is callback that return ISN_CKResult when saving oparation is done.
        /// </param>
        public void RemoveRecordByID(ISN_CKRecordID recordID, Action<ISN_CKResult> callback) {
            Assert.IsNotNull(callback);
            Internal.ISN_CloudKitLib.Api.RemoveRecordByID(recordID, m_DatabaseType.ToString(), callback);
        }

        /// <summary>
        /// Fetches one record asynchronously, with a low priority, from the current database.
        /// Use this method to fetch records that are not urgent to your app’s execution.
        /// This method fetches the record with a low priority, which may cause the fetch to execute after higher-priority tasks.
        /// </summary>
        /// <param name="recordID">
        /// The recordID of record that you want to fetch. This method return an error if this parameter is nil.
        /// </param>
        /// <param name="callback">
        /// This is callback that return ISN_CKResult when saving oparation is done.
        /// </param>
        public void FetchRecordWithID(ISN_CKRecordID recordID, Action<ISN_CKResult> callback) {
            Assert.IsNotNull(callback);
            Internal.ISN_CloudKitLib.Api.FetchRecordWithID(recordID, m_DatabaseType.ToString(), callback);
        }

        /// <summary>
        /// An operation that saves changes to one record objects.
        /// After modifying the fields of a record, use this type of operation object to save those changes to a database. 
        /// </summary>
        /// <param name="record">
        /// The record to update. This method return an error if this parameter is nil.
        /// </param>
        /// <param name ="savePolicy">
        /// This is savePolicy for this update.
        /// </parame>
        /// <param name="callback">
        /// This is callback that return ISN_CKResult when updating oparation is done.
        /// </param>
        public void UpdateRecord(ISN_CKRecord record, ISN_CKRecordSavePolicy savePolicy, Action<ISN_CKResult> callback) {
            Assert.IsNotNull(callback);
            record.Reset();
            Internal.ISN_CloudKitLib.Api.UpdateRecord(record, savePolicy, m_DatabaseType.ToString(), callback);
        }
    }
}
