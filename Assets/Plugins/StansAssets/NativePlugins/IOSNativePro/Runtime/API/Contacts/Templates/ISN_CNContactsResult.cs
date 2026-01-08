////////////////////////////////////////////////////////////////////////////////
//
// @module IOS Native Plugin
// @author Osipov Stanislav (Stan's Assets)
// @support support@stansassets.com
// @website https://stansassets.com
//
////////////////////////////////////////////////////////////////////////////////

using System;
using System.Collections.Generic;
using SA.Foundation.Templates;
using UnityEngine;

namespace SA.iOS.Contacts
{
    /// <summary>
    /// Contacts interaction result.
    /// </summary>
    [Serializable]
    public class ISN_CNContactsResult : SA_Result
    {
        [SerializeField]
        List<ISN_CNContact> m_Contacts = new List<ISN_CNContact>();

        public ISN_CNContactsResult(List<ISN_CNContact> contacts)
        {
            m_Contacts = contacts;
        }

        /// <summary>
        /// Gets the array of loaded contacts.
        /// </summary>
        public List<ISN_CNContact> Contacts => m_Contacts;
    }
}
