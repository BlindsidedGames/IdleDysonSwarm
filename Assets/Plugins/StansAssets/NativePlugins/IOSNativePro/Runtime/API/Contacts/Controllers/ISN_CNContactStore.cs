////////////////////////////////////////////////////////////////////////////////
//
// @module IOS Native Plugin
// @author Osipov Stanislav (Stan's Assets)
// @support support@stansassets.com
// @website https://stansassets.com
//
////////////////////////////////////////////////////////////////////////////////

using System;
using SA.iOS.Contacts.Internal;
using SA.Foundation.Templates;

namespace SA.iOS.Contacts
{
    /// <summary>
    /// The object that fetches and saves contacts, groups, and containers from the user's contacts database.
    /// </summary>
    public static class ISN_CNContactStore
    {
        //--------------------------------------
        // Public Methods
        //--------------------------------------

        /// <summary>
        /// Allows the user to select one or more contacts (or their properties)
        /// from the list of contacts displayed in the contact view controller
        /// </summary>
        /// <param name="callback">Callback.</param>
        public static void ShowContactsPickerUI(Action<ISN_CNContactsResult> callback)
        {
            ISN_CNLib.Api.ShowContactsPicker(callback);
        }

        /// <summary>
        /// Fetches phone contact's list
        /// </summary>
        /// <param name="includeNotes">
        /// Set to `true` if you would also like to get <see cref="ISN_CNContact.Note"/>.
        /// Please note that including the notes field requires an entitlement since IOS 13.
        /// The default value is `false`
        /// </param>
        /// <param name="callback">Callback.</param>
        public static void FetchPhoneContacts(Action<ISN_CNContactsResult> callback, bool includeNotes = false)
        {
            ISN_CNLib.Api.RetrievePhoneContacts(includeNotes, callback);
        }

        /// <summary>
        /// Returns the current authorization status to access the contact data.
        ///
        /// Based on the authorization status, your application might display or hide its UI elements
        /// that access any Contacts API.
        /// </summary>
        /// <returns>The authorization status.</returns>
        /// <param name="entityType">Entity type.</param>
        public static ISN_CNAuthorizationStatus GetAuthorizationStatus(ISN_CNEntityType entityType)
        {
            return ISN_CNLib.Api.GetAuthorizationStatus(entityType);
        }

        /// <summary>
        /// Requests access to the user's contacts.
        ///
        /// Users are able to grant or deny access to contact data on a per-application basis.
        /// The user will only be prompted the first time access is requested,
        /// any subsequent <see cref="ISN_CNContactStore"/> calls will use the existing permissions.
        /// If this method is not used, <see cref="ISN_CNContactStore"/> may block your application
        /// while the user is asked for access permission.
        /// </summary>
        /// <param name="entityType">Entity type.</param>
        /// <param name="callback">Callback.</param>
        public static void RequestAccess(ISN_CNEntityType entityType, Action<SA_Result> callback)
        {
            ISN_CNLib.Api.RequestAccess(entityType, callback);
        }
    }
}
