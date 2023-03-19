////////////////////////////////////////////////////////////////////////////////
//
// @module IOS Native 2018 - New Generation
// @author Stan's Assets team
// @support support@stansassets.com
// @website https://stansassets.com
//
////////////////////////////////////////////////////////////////////////////////

using System;
using SA.Foundation.Events;
using SA.Foundation.Templates;

namespace SA.iOS.Contacts.Internal
{
    interface ISN_iCNAPI
    {
        void ShowContactsPicker(Action<ISN_CNContactsResult> callback);
        void RetrievePhoneContacts(bool includeNotes, Action<ISN_CNContactsResult> callback);

        ISN_CNAuthorizationStatus GetAuthorizationStatus(ISN_CNEntityType entityType);
        void RequestAccess(ISN_CNEntityType entityType, Action<SA_Result> callback);
    }
}
