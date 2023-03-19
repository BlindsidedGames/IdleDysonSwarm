using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEditor;
using SA.Foundation.Editor;

namespace SA.iOS
{
    class ISN_ServicesTab : SA_ServicesTab
    {
        protected override void OnCreateServices()
        {
            RegisterService(CreateInstance<ISN_FoundationUI>());
            RegisterService(CreateInstance<ISN_UIKitUI>());
            RegisterService(CreateInstance<ISN_StoreKitUI>());
            RegisterService(CreateInstance<ISN_GameKitUI>());
            RegisterService(CreateInstance<ISN_SocialUI>());
            RegisterService(CreateInstance<ISN_ReplayKitUI>());
            RegisterService(CreateInstance<ISN_ContactsUI>());
            RegisterService(CreateInstance<ISN_PhotosUI>());
            RegisterService(CreateInstance<ISN_AVKitUI>());
            RegisterService(CreateInstance<ISN_AppDelegateUI>());
            RegisterService(CreateInstance<ISN_UserNotificationsUI>());
            RegisterService(CreateInstance<ISN_CoreLocationUI>());
            RegisterService(CreateInstance<ISN_MediaPlayerUI>());
            RegisterService(CreateInstance<ISN_AdSupportUI>());
            RegisterService(CreateInstance<ISN_EventKitUI>());
            RegisterService(CreateInstance<ISN_AuthenticationServicesUI>());
            RegisterService(CreateInstance<ISN_CloudKitUI>());
            RegisterService(CreateInstance<ISN_AppTrackingTransparencyUI>());

        }
    }
}
