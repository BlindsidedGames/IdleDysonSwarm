using System;
using SA.Foundation.Utility;
using UnityEngine;
#if UNITY_IPHONE || UNITY_TVOS
using System.Runtime.InteropServices;

#endif

namespace SA.iOS.UIKit
{
    /// <summary>
    /// The centralized point of control and coordination for apps running in iOS.
    /// </summary>
    public class ISN_UIApplication
    {
#if UNITY_IPHONE || UNITY_TVOS
        [DllImport("__Internal")]
        static extern void _ISN_UI_SetApplicationBagesNumber(long count);

        [DllImport("__Internal")]
        static extern long _ISN_UI_GetApplicationBagesNumber();

        [DllImport("__Internal")]
        static extern bool _ISN_UI_CanOpenURL(string url);

        [DllImport("__Internal")]
        static extern void _ISN_UI_OpenUrl(string url);

        [DllImport("__Internal")]
        static extern void _ISN_UI_Suspend();

        [DllImport("__Internal")]
        static extern void _ISN_UI_RegisterForRemoteNotifications();

        [DllImport("__Internal")]
        static extern void _ISN_UI_UnregisterForRemoteNotifications();

        [DllImport("__Internal")]
        static extern string _ISN_UIApplicationOpenSettingsURLString();
#endif

        static ISN_UIApplicationDelegate s_Delegate;

        [RuntimeInitializeOnLoadMethod]
        static void Init()
        {
            // Might be created by user up on request already.
            if(s_Delegate != null)
                s_Delegate = new ISN_UIApplicationDelegate();
        }

        /// <summary>
        /// The number currently set as the badge of the app icon in Springboard.
        /// Set to 0 (zero) to hide the badge number. The default value of this property is 0.
        /// </summary>
        public static long ApplicationIconBadgeNumber
        {
            get
            {
#if (UNITY_IPHONE || UNITY_TVOS) && !UNITY_EDITOR
                    return _ISN_UI_GetApplicationBagesNumber();
#else
                return 0;
#endif
            }
            set
            {
#if (UNITY_IPHONE || UNITY_TVOS) && !UNITY_EDITOR
                    _ISN_UI_SetApplicationBagesNumber(value);
#endif
            }
        }

        /// <summary>
        /// Used to create a URL that you can pass to the <see cref="OpenURL(string)"/> method.
        /// When you open the URL built from this string,
        /// the system launches the Settings app and displays the app’s custom settings, if it has any.
        /// </summary>
        public static string OpenSettingsURLString
        {
            get
            {
#if (UNITY_IPHONE || UNITY_TVOS) && !UNITY_EDITOR
                return _ISN_UIApplicationOpenSettingsURLString();
#else
                return "app-settings:";
#endif
            }
        }

        /// <summary>
        /// Returns a Boolean value indicating whether or not the URL’s scheme can be handled by some app installed on the device.
        /// </summary>
        /// <param name="url">A URL (Universal Resource Locator).
        /// At runtime, the system tests the URL’s scheme to determine if there is an installed app that is registered to handle the scheme.
        /// More than one app can be registered to handle a scheme.
        /// The URL you pass to this method can have a common scheme or a custom scheme.
        /// </param>
        public static bool CanOpenURL(string url)
        {
#if (UNITY_IPHONE || UNITY_TVOS) && !UNITY_EDITOR
            return _ISN_UI_CanOpenURL(url);
#else
            return false;
#endif
        }

        /// <summary>
        /// Attempts to open the resource at the specified URL asynchronously.
        ///
        /// Use this method to open the specified resource.
        /// If the specified URL scheme is handled by another app, iOS launches that app and passes the URL to it.
        /// To determine whether an app is installed that is capable of handling the URL,
        /// call the <see cref="CanOpenURL"/> method before calling this one.
        /// Be sure to read the description of that method for an important note
        /// about registering the schemes you want to employ.
        /// </summary>
        /// <param name="url">URL.</param>
        public static void OpenURL(string url)
        {
#if (UNITY_IPHONE || UNITY_TVOS) && !UNITY_EDITOR
            _ISN_UI_OpenUrl(url);
#endif
        }

        /// <summary>
        /// Will send an  application to background.
        /// Can be used to simulate Home button press.
        /// </summary>
        public static void Suspend()
        {
#if (UNITY_IPHONE || UNITY_TVOS) && !UNITY_EDITOR
            _ISN_UI_Suspend();
#endif
        }

        /// <summary>
        /// A set of methods that are called in response to important events in the lifetime of your app.
        /// </summary>
        public static ISN_UIApplicationDelegate ApplicationDelegate
        {
            get
            {
                if (!ISN_Settings.Instance.AppDelegate)
                    SA_Plugins.OnDisabledAPIUseAttempt(ISN_Settings.PluginTittle, "App Delegate");

                // In most cases delegate already created but if user request is ti early.
                return s_Delegate ?? (s_Delegate = new ISN_UIApplicationDelegate());
            }
        }

        /// <summary>
        /// Register to receive remote notifications via Apple Push Notification service
        ///
        /// Call this method to initiate the registration process with Apple Push Notification service.
        /// If registration succeeds, the app calls <see cref="ApplicationDelegate"/> object
        /// DidRegisterForRemoteNotifications event and passes it a device token.
        /// You should pass this token along to the server you use to generate remote notifications for the device.
        /// If registration fails, DidRegisterForRemoteNotifications will have an empty token and result with error.
        ///
        /// If you want your app’s remote notifications to display alerts, play sounds,
        /// or perform other user-facing actions, you must request authorization to do so using the
        /// <see cref="UserNotifications.ISN_UNUserNotificationCenter.RequestAuthorization(int,System.Action{SA.Foundation.Templates.SA_Result}(SA.Foundation.Templates.SA_Result))"/> method.
        /// If you do not request and receive authorization for your app's interactions,
        /// the system delivers all remote notifications to your app silently.
        /// </summary>
        public static void RegisterForRemoteNotifications()
        {
#if (UNITY_IPHONE || UNITY_TVOS) && !UNITY_EDITOR
            _ISN_UI_RegisterForRemoteNotifications();
#endif
        }

        /// <summary>
        /// Unregister for all remote notifications received via Apple Push Notification service.
        ///
        /// You should call this method in rare circumstances only,
        /// such as when a new version of the app removes support for all types of remote notifications.
        /// Users can temporarily prevent apps from receiving remote notifications through the Notifications section
        /// of the Settings app.
        /// Apps unregistered through this method can always re-register.
        /// </summary>
        public static void UnregisterForRemoteNotifications()
        {
#if (UNITY_IPHONE || UNITY_TVOS) && !UNITY_EDITOR
            _ISN_UI_UnregisterForRemoteNotifications();
#endif
        }
    }
}
