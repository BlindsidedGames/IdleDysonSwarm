////////////////////////////////////////////////////////////////////////////////
//
// @module IOS Native 2018 - New Generation
// @author Stan's Assets team
// @support support@stansassets.com
// @website https://stansassets.com
//
////////////////////////////////////////////////////////////////////////////////

using UnityEngine;
using System;
using SA.Foundation.Templates;
using SA.Foundation.UtilitiesEditor;
using StansAssets.Foundation.Async;

namespace SA.iOS.Contacts.Internal
{
    class ISN_CNEditorAPI : ISN_iCNAPI
    {
        public void RetrievePhoneContacts(bool includeNotes, Action<ISN_CNContactsResult> callback)
        {
             CoroutineUtility.WaitForSeconds(DelayTime, () =>
            {
                callback.Invoke(CreateFakeResult());
            });
        }

        public void ShowContactsPicker(Action<ISN_CNContactsResult> callback)
        {
             CoroutineUtility.WaitForSeconds(DelayTime, () =>
            {
                callback.Invoke(CreateFakeResult());
            });
        }

        ISN_CNContactsResult CreateFakeResult()
        {
            var editorData = SA_AssetDatabase.LoadAssetAtPath<TextAsset>(ISN_Settings.ContactsApiLocation + "ISN_CNContactsEditorResponse.txt");
            var result = JsonUtility.FromJson<ISN_CNContactsResult>(editorData.text);
            return result;
        }

        public ISN_CNAuthorizationStatus GetAuthorizationStatus(ISN_CNEntityType entityType)
        {
            return ISN_CNAuthorizationStatus.Authorized;
        }

        public void RequestAccess(ISN_CNEntityType entityType, Action<SA_Result> callback)
        {
             CoroutineUtility.WaitForSeconds(DelayTime, () =>
            {
                callback.Invoke(new SA_Result());
            });
        }

        float DelayTime => UnityEngine.Random.Range(0.1f, 3f);
    }
}
