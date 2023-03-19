////////////////////////////////////////////////////////////////////////////////
//
// @module IOS Native Plugin
// @author Koretsky Konstantin (Stan's Assets)
// @support support@stansassets.com
// @website https://stansassets.com
//
////////////////////////////////////////////////////////////////////////////////

using System;
using System.Collections.Generic;
using UnityEngine;

namespace SA.iOS.Foundation
{
    /// <summary>
    /// The <see cref="ISN_NSUbiquitousKeyValueStore.StoreDidChangeExternallyNotification"/> notification model.
    /// </summary>
    [Serializable]
    public class ISN_NSStoreDidChangeExternallyNotification
    {
        [SerializeField]
        ISN_NSUbiquitousKeyValueStoreChangeReasons m_Reason = ISN_NSUbiquitousKeyValueStoreChangeReasons.None;
        [SerializeField]
        List<ISN_NSKeyValueObject> m_UpdatedData = new List<ISN_NSKeyValueObject>();

        /// <summary>
        /// Return possible values associated with the <see cref="ISN_NSUbiquitousKeyValueStoreChangeReasons"/> key.
        /// </summary>
        public ISN_NSUbiquitousKeyValueStoreChangeReasons Reason
        {
            get => m_Reason;
            set => m_Reason = value;
        }

        /// <summary>
        /// Returns an array of <see cref="ISN_NSKeyValueObject"/> objects, that changed in the key-value store.
        /// </summary>
        public List<ISN_NSKeyValueObject> UpdatedData
        {
            get => m_UpdatedData;
            set => m_UpdatedData = value;
        }
    }
}
