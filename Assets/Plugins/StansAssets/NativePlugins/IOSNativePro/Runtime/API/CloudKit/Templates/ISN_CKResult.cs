using System;
using SA.Foundation.Templates;
using UnityEngine;
using StansAssets.Foundation;

namespace SA.iOS.CloudKit
{
    /// <summary>
    /// This type for saving data from ISN_CloudKit callbacks.
    /// </summary>
    [Serializable]
    public class ISN_CKResult: SA_Result
    {
        [SerializeField]
        public string m_State;

        [SerializeField]
        public string m_Description;

        [SerializeField]
        public int m_ErrorCode;

        /// <summary>
        /// Get description from ISN_CKResult
        /// </summary>
        public string Description => m_Description;

        /// <summary>
        /// Get error code from ISN_CKResult
        /// Only for record update operation.
        /// </summary>
        public int ErrorCode => m_ErrorCode;

        [SerializeField]
        public ISN_CKRecord m_Record;

        /// <summary>
        /// Get Record from result.
        /// </summary>
        public ISN_CKRecord Record {
            get {
                if (m_Record == null) {
                    m_Record = JsonUtility.FromJson<ISN_CKRecord>(m_Description);
                }
                return m_Record;
            }
        }

        /// <summary>
        /// Get state from ISN_CKResult
        /// </summary>
        public ISN_CKResultType State => EnumUtility.TryParseEnum <ISN_CKResultType> (m_State, out var state) ? state : ISN_CKResultType.Error;

        /// <summary>
        /// Get account state from ISN_CKResult
        /// </summary>
        public ISN_CKAccountStatus AccountState => EnumUtility.TryParseEnum <ISN_CKAccountStatus> (m_Description, out var state) ? state : ISN_CKAccountStatus.CKAccountStatusCouldNotDetermine;
    }
}
