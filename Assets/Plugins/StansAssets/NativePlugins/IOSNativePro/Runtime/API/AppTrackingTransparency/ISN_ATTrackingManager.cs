using System;
using SA.iOS.UIKit;
using UnityEngine;

namespace SA.iOS.AppTrackingTransparency
{
    /// <summary>
    /// A class that provides a tracking authorization request
    /// and the tracking authorization status of the app.
    /// https://developer.apple.com/documentation/apptrackingtransparency/attrackingmanager
    /// </summary>
    public class ISN_ATTrackingManager
    {
        /// <summary>
        /// The status values for app tracking authorization.
        /// </summary>
        public enum AuthorizationStatus
        {
            /// <summary>
            /// The value returned if a user has not yet received an authorization request
            /// to authorize access to app-related data that can be used for tracking the user or the device.
            /// </summary>
            NotDetermined,

            /// <summary>
            /// The value returned if authorization to access app-related data
            /// that can be used for tracking the user or the device is restricted.
            /// </summary>
            Restricted,

            /// <summary>
            /// The value returned if the user denies authorization to access app-related data
            /// that can be used for tracking the user or the device.
            /// </summary>
            Denied,

            /// <summary>
            ///  The value returned if the user authorizes access to app-related data
            /// that can be used for tracking the user or the device.
            /// </summary>
            Authorized,
        }

        /// <summary>
        /// The authorization status that is current for the calling application.
        /// </summary>
        public static AuthorizationStatus TrackingAuthorizationStatus
        {
            get
            {
                var majorOSVersion = ISN_UIDevice.CurrentDevice.MajorIOSVersion;
                return majorOSVersion < 14
                    ? AuthorizationStatus.Authorized
                    : ISN_ATLib.TrackingAuthorizationStatus();
            }
        }

        /// <summary>
        /// The `RequestTrackingAuthorization` is the one-time request to authorize or deny access to app-related data
        /// that can be used for tracking the user or the device.
        /// The system remembers the user’s choice and doesn't prompt again unless a user uninstalls and then
        /// reinstalls the app on the device.
        /// </summary>
        /// <param name="completionHandler">Operation result callback.</param>
        public static void RequestTrackingAuthorization(Action<AuthorizationStatus> completionHandler)
        {
            var majorOSVersion = ISN_UIDevice.CurrentDevice.MajorIOSVersion;
            Debug.Log($"majorOSVersion: {majorOSVersion}");
            if (majorOSVersion < 14)
            {
                completionHandler.Invoke(AuthorizationStatus.Authorized);
            }
            else
            { 
                ISN_ATLib.RequestTrackingAuthorizationWithCompletionHandle(intValue =>
                {
                    completionHandler.Invoke((AuthorizationStatus) intValue);
                });
            }
        }
    }
}