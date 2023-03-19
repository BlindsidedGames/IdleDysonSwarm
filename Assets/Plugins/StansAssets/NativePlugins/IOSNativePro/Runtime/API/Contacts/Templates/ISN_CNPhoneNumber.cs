////////////////////////////////////////////////////////////////////////////////
//
// @module IOS Native Plugin
// @author Osipov Stanislav (Stan's Assets)
// @support support@stansassets.com
// @website https://stansassets.com
//
////////////////////////////////////////////////////////////////////////////////

using System;
using UnityEngine;

namespace SA.iOS.Contacts
{
    /// <summary>
    /// An immutable object representing a phone number for a contact.
    /// </summary>
    [Serializable]
    public class ISN_CNPhoneNumber
    {
        [SerializeField]
        string m_CountryCode = string.Empty;
        [SerializeField]
        string m_Digits = string.Empty;

        /// <summary>
        /// Gets the phone number country code.
        /// </summary>
        public string CountryCode => m_CountryCode;

        /// <summary>
        /// Gets the phone number without country code.
        /// </summary>
        public string Digits => m_Digits;

        /// <summary>
        /// Full phone number including Country Code and Digits
        /// </summary>
        public string FullNumber => CountryCode + Digits;
    }
}
