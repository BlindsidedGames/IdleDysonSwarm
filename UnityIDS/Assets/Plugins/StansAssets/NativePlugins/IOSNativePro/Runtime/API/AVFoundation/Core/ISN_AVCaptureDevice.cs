using System;
using SA.iOS.AVFoundation.Internal;

namespace SA.iOS.AVFoundation
{
    /// <summary>
    /// A device that provides input (such as audio or video)
    /// for capture sessions and offers controls for hardware-specific capture features.
    /// </summary>
    public static class ISN_AVCaptureDevice
    {
        /// <summary>
        /// Returns a constant indicating whether the app has permission for recording a specified media type
        ///
        /// After the user grants recording permission, the system remembers the choice for future use in the same app,
        /// but the user can change this choice at any time using the Settings app.
        /// If the user has denied your app recoding permission or has not yet responded to the permission prompt,
        /// any audio recordings will contain only silence and any video recordings will contain only black frames.
        /// </summary>
        /// <param name="type">A media type constant, either Video or Audio.</param>
        public static ISN_AVAuthorizationStatus GetAuthorizationStatus(ISN_AVMediaType type)
        {
            return ISN_AVLib.Api.GetAuthorizationStatus(type);
        }

        /// <summary>
        /// Requests the user’s permission, if needed, for recording a specified media type.
        ///
        /// Recording audio or video always requires explicit permission from the user.
        /// Your app must provide an explanation for its use of capture devices using the
        /// <c>NSCameraUsageDescription</c> or <c>NSMicrophoneUsageDescription</c> Info.plist key;
        /// iOS displays this explanation when initially asking the user for permission,
        /// and thereafter in the Settings app.
        /// Calling this method or attempting to start a capture session without a usage description raises an exception.
        /// </summary>
        /// <param name="type">media type.</param>
        /// <param name="callback">Callback.</param>
        public static void RequestAccess(ISN_AVMediaType type, Action<ISN_AVAuthorizationStatus> callback)
        {
            ISN_AVLib.Api.RequestAccess(type, callback);
        }
    }
}
