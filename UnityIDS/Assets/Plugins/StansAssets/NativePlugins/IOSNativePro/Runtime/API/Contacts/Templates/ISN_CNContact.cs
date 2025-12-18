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
using UnityEngine;

namespace SA.iOS.Contacts
{
    /// <summary>
    /// Class that represents an immutable value object for contact properties,
    /// such as the first name and phone numbers of a contact.
    ///
    /// More filed can be added upon request
    /// <see href="https://developer.apple.com/documentation/contacts/cncontact?language=objc">CNContact</see>
    /// </summary>
    [Serializable]
    public class ISN_CNContact
    {
#pragma warning disable 649
        [SerializeField]
        string m_GivenName;
        [SerializeField]
        string m_FamilyName;
        [SerializeField]
        string m_Nickname;
        [SerializeField]
        string m_OrganizationName;
        [SerializeField]
        string m_DepartmentName;
        [SerializeField]
        string m_JobTitle;
        [SerializeField]
        string m_Note;

        [SerializeField]
        List<string> m_Emails;
        [SerializeField]
        List<ISN_CNPhoneNumber> m_Phones;

#pragma warning restore 649

        public ISN_CNContact(string givenName, string familyName)
        {
            m_GivenName = givenName;
            m_FamilyName = familyName;
        }

        /// <summary>
        /// The given name of the contact.
        /// The given name is often known as the first name of the contact.
        /// </summary>
        public string GivenName => m_GivenName;

        /// <summary>
        /// The family name of the contact.
        /// The family name is often known as the last name of the contact.
        /// </summary>
        public string FamilyName => m_FamilyName;

        public string Nickname => m_Nickname;

        /// <summary>
        /// The name of the organization associated with the contact.
        /// </summary>
        public string OrganizationName
        {
            get => m_OrganizationName;
            set => m_OrganizationName = value;
        }

        /// <summary>
        /// The name of the department associated with the contact.
        /// </summary>
        public string DepartmentName => m_DepartmentName;

        /// <summary>
        /// The contact’s job title.
        /// </summary>
        public string JobTitle => m_JobTitle;

        /// <summary>
        /// A note associated with a contact.
        /// </summary>
        public string Note => m_Note;

        /// <summary>
        /// An array of labeled email addresses for the contact.
        /// </summary>
        public List<string> Emails => m_Emails;

        /// <summary>
        /// An array of labeled phone numbers for a contact.
        /// </summary>
        public List<ISN_CNPhoneNumber> Phones => m_Phones;
    }
}
