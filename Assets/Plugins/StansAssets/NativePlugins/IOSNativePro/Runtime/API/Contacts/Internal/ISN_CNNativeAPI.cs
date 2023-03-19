using System;
using UnityEngine;
using SA.Foundation.Templates;
#if UNITY_IPHONE && CONTACTS_API_ENABLED
using System.Runtime.InteropServices;
#endif
using SA.iOS.Utilities;

namespace SA.iOS.Contacts.Internal
{
    class ISN_CNNativeAPI : ISN_Singleton<ISN_CNNativeAPI>, ISN_iCNAPI
    {
#if UNITY_IPHONE && CONTACTS_API_ENABLED
        [DllImport("__Internal")]
        static extern void _ISN_CN_ShowContactsPicker();

        [DllImport("__Internal")]
        static extern int _ISN_CN_GetAuthorizationStatusForEntityType(int entityType);

        [DllImport("__Internal")]
        static extern void _ISN_CN_RequestAccessForEntityType(int entityType);

        [DllImport("__Internal")]
        static extern void _ISN_CN_RetrievePhoneContacts(bool includeNotes);
#endif

        Action<ISN_CNContactsResult> m_onDidSelectContacts;

        public void ShowContactsPicker(Action<ISN_CNContactsResult> callback)
        {
            m_onDidSelectContacts = callback;
#if UNITY_IPHONE && CONTACTS_API_ENABLED
            _ISN_CN_ShowContactsPicker();
#endif
        }

        void OnDidSelectContacts(string data)
        {
            var result = JsonUtility.FromJson<ISN_CNContactsResult>(data);
            m_onDidSelectContacts.Invoke(result);
        }

        Action<ISN_CNContactsResult> m_onPhoneContactsLoaded;

        public void RetrievePhoneContacts(bool includeNotes, Action<ISN_CNContactsResult> callback)
        {
            m_onPhoneContactsLoaded = callback;
#if UNITY_IPHONE && CONTACTS_API_ENABLED
            _ISN_CN_RetrievePhoneContacts(includeNotes);
#endif
        }

        void OnPhoneContactsLoaded(string data)
        {
            var result = JsonUtility.FromJson<ISN_CNContactsResult>(data);
            m_onPhoneContactsLoaded.Invoke(result);
        }

        public ISN_CNAuthorizationStatus GetAuthorizationStatus(ISN_CNEntityType entityType)
        {
#if UNITY_IPHONE && CONTACTS_API_ENABLED
            return (ISN_CNAuthorizationStatus)_ISN_CN_GetAuthorizationStatusForEntityType((int)entityType);
#else
            return ISN_CNAuthorizationStatus.NotDetermined;
#endif
        }

        Action<SA_Result> m_onRequestAccessForEntityType;

        public void RequestAccess(ISN_CNEntityType entityType, Action<SA_Result> callback)
        {
            m_onRequestAccessForEntityType = callback;
#if UNITY_IPHONE && CONTACTS_API_ENABLED
            _ISN_CN_RequestAccessForEntityType((int)entityType);
#endif
        }

        void OnRequestAccessForEntityType(string data)
        {
            var result = JsonUtility.FromJson<SA_Result>(data);
            m_onRequestAccessForEntityType.Invoke(result);
        }
    }
}
