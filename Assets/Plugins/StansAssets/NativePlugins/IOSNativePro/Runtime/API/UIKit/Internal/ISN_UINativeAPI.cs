////////////////////////////////////////////////////////////////////////////////
//
// @module IOS Native 2018 - New Generation
// @author Stan's Assets team
// @support support@stansassets.com
// @website https://stansassets.com
//
////////////////////////////////////////////////////////////////////////////////

#if ((UNITY_IPHONE || UNITY_TVOS) && !UNITY_EDITOR) || SA_DEVELOPMENT_PROJECT
#define API_ENABLED
#endif

using System;
using System.Collections.Generic;
using UnityEngine;
using SA.iOS.Utilities;
using SA.Foundation.Templates;
using SA.Foundation.Events;
#if API_ENABLED
using System.Runtime.InteropServices;

#endif

namespace SA.iOS.UIKit
{
    class ISN_UINativeAPI : ISN_Singleton<ISN_UINativeAPI>, ISN_iUIAPI
    {
#if API_ENABLED
        [DllImport("__Internal")]
        static extern string _ISN_UI_GetAvailableMediaTypesForSourceType(int type);

        [DllImport("__Internal")]
        static extern bool _ISN_UI_IsSourceTypeAvailable(int type);

        [DllImport("__Internal")]
        static extern void _ISN_UI_PresentPickerController(string data);

        [DllImport("__Internal")]
        static extern void _ISN_UI_PresentUIAlertController(string data);

        [DllImport("__Internal")]
        static extern void _ISN_UI_DismissUIAlertController(int alertId);

        [DllImport("__Internal")]
        static extern void _ISN_UI_PreloaderLockScreen();

        [DllImport("__Internal")]
        static extern void _ISN_UI_PreloaderUnlockScreen();

        [DllImport("__Internal")]
        static extern void _ISN_UIWheelPicker(IntPtr callback, string data);

        // UIScreen
        [DllImport("__Internal")]
        static extern ulong _ISN_UI_UIScreen_MainScreen();

        [DllImport("__Internal")]
        static extern ulong _ISN_UI_UIScreen_TraitCollection(ulong uiScreenHash);

        // TraitCollection
        [DllImport("__Internal")]
        static extern int _ISN_UI_TraitCollection_UserInterfaceStyle(ulong traitCollectionHash);

        // UIViewController

        [DllImport("__Internal")]
        static extern void _ISN_UIViewController_setModalPresentationStyle(ulong hash, ISN_UIModalPresentationStyle presentationStyle);

        [DllImport("__Internal")]
        static extern ISN_UIModalPresentationStyle _ISN_UIViewController_getModalPresentationStyle(ulong hash);

        [DllImport("__Internal")]
        static extern void _ISN_UIViewController_presentViewController(ulong hash, bool animated, IntPtr callback);

        [DllImport("__Internal")]
        static extern void _ISN_UIViewController_dismissViewControllerAnimated(ulong hash, bool animated, IntPtr callback);

        [DllImport("__Internal")]
        static extern void _ISN_UIMenuController(IntPtr callback, string data);
#endif

        // UIScreen
        public ulong UIScreen_MainScreen()
        {
#if API_ENABLED
            return _ISN_UI_UIScreen_MainScreen();
#else
            return ISN_NativeObject.NullObjectHash;
#endif
        }

        public ulong UIScreen_TraitCollection(ulong uiScreenHash)
        {
#if API_ENABLED
            return _ISN_UI_UIScreen_TraitCollection(uiScreenHash);
#else
            return ISN_NativeObject.NullObjectHash;
#endif
        }

        //TraitCollection

        public ISN_UIUserInterfaceStyle TraitCollection_UserInterfaceStyle(ulong traitCollectionHash)
        {
#if API_ENABLED
            return (ISN_UIUserInterfaceStyle)_ISN_UI_TraitCollection_UserInterfaceStyle(traitCollectionHash);
#else
            return ISN_UIUserInterfaceStyle.Unspecified;
#endif
        }

        readonly SA_Event<ISN_UIAlertActionId> m_onUIAlertActionPerformed = new SA_Event<ISN_UIAlertActionId>();

        public List<string> GetAvailableMediaTypes(ISN_UIImagePickerControllerSourceType type)
        {
#if API_ENABLED
            var data = _ISN_UI_GetAvailableMediaTypesForSourceType((int)type);
            var result = JsonUtility.FromJson<ISN_UIAvailableMediaTypes>(data);
            return result.Types;
#else
            return new List<string>();
#endif
        }

        public bool IsSourceTypeAvailable(ISN_UIImagePickerControllerSourceType type)
        {
#if API_ENABLED
            return _ISN_UI_IsSourceTypeAvailable((int)type);
#else
            return true;
#endif
        }

        Action<ISN_UIPickerControllerResult> m_didFinishPickingMedia;

        public void PresentPickerController(ISN_UIPickerControllerRequest request, Action<ISN_UIPickerControllerResult> callback)
        {
            m_didFinishPickingMedia = callback;
#if API_ENABLED
            _ISN_UI_PresentPickerController(JsonUtility.ToJson(request));
#endif
        }

        void didFinishPickingMedia(string data)
        {
            var result = JsonUtility.FromJson<ISN_UIPickerControllerResult>(data);
            m_didFinishPickingMedia.Invoke(result);
        }

        public void PresentUIAlertController(ISN_UIAlertController alert)
        {
#if API_ENABLED
            var data = JsonUtility.ToJson(alert);
            _ISN_UI_PresentUIAlertController(data);
#endif
        }

        public void DismissUIAlertController(ISN_UIAlertController alert)
        {
#if API_ENABLED
            _ISN_UI_DismissUIAlertController(alert.Id);
#endif
        }

        public SA_iEvent<ISN_UIAlertActionId> OnUIAlertActionPerformed => m_onUIAlertActionPerformed;

        void OnUIAlertAction(string data)
        {
            var result = JsonUtility.FromJson<ISN_UIAlertActionId>(data);
            m_onUIAlertActionPerformed.Invoke(result);
        }

        public void PreloaderLockScreen()
        {
#if API_ENABLED
            _ISN_UI_PreloaderLockScreen();
#endif
        }

        public void PreloaderUnlockScreen()
        {
#if API_ENABLED
            _ISN_UI_PreloaderUnlockScreen();
#endif
        }

        /// <summary>
        /// Create Wheel UIPickerView.
        /// It will create UIPickerView with cancel and done buttons.
        /// </summary>
        public void ShowUIWheelPicker(ISN_UIWheelPickerController controller, Action<ISN_UIWheelPickerResult> callback)
        {
#if API_ENABLED
            var data = JsonUtility.ToJson(controller);
            _ISN_UIWheelPicker(ISN_MonoPCallback.ActionToIntPtr(callback), data);
#endif
        }

        // UIViewController

        public static void UIViewController_setModalPresentationStyle(ulong hash, ISN_UIModalPresentationStyle presentationStyle)
        {
#if API_ENABLED
            _ISN_UIViewController_setModalPresentationStyle(hash, presentationStyle);
#endif
        }

        public static ISN_UIModalPresentationStyle UIViewController_getModalPresentationStyle(ulong hash)
        {
#if API_ENABLED
            return _ISN_UIViewController_getModalPresentationStyle(hash);
#else
            return ISN_UIModalPresentationStyle.None;
#endif
        }

        public static void UIViewController_presentViewController(ulong hash, bool animated, Action callback)
        {
#if API_ENABLED
            _ISN_UIViewController_presentViewController(hash, animated, ISN_MonoPCallback.ActionToIntPtr(callback));
#endif
        }

        public static void UIViewController_dismissViewControllerAnimated(ulong hash, bool animated, Action callback)
        {
#if API_ENABLED
            _ISN_UIViewController_dismissViewControllerAnimated(hash, animated, ISN_MonoPCallback.ActionToIntPtr(callback));
#endif
        }

        public void ShowUIMenuControlleer(ISN_UIMenuController controller, Action<ISN_UIMenuControllerResult> callback)
        {
#if API_ENABLED
            var data = JsonUtility.ToJson(controller);
            _ISN_UIMenuController(ISN_MonoPCallback.ActionToIntPtr(callback), data);
#endif
        }
    }
}
