using System;

namespace SA.iOS.Photos
{
    /// <summary>
    /// A shared object that manages access to and changes in the user’s Photos library.
    /// </summary>
    public static class ISN_PHPhotoLibrary
    {
        /// <summary>
        /// Returns information about your app’s authorization for accessing the user’s Photos library.
        ///
        /// Accessing the Photos library always requires explicit permission from the user.
        /// Important:Your app’s <c>Info.plist</c> file must provide a value for the <c>NSPhotoLibraryUsageDescription</c> key
        /// that explains to the user why your app is requesting Photos access.
        /// Apps linked on or after iOS 10.0 will crash if this key is not present.
        ///
        /// After the user grants permission, the system remembers the choice for future use in your app,
        /// but the user can change this choice at any time using the Settings app.
        /// If the user has denied your app photo library access, not yet responded to the permission prompt,
        /// or cannot grant access due to restrictions
        /// </summary>
        public static ISN_PHAuthorizationStatus AuthorizationStatus => ISN_PHNativeAPI.GetAuthorizationStatus();

        /// <summary>
        /// Requests the user’s permission, if needed, for accessing the Photos library.
        ///
        /// Accessing the Photos library always requires explicit permission from the user.
        /// Important:Your app’s <c>Info.plist</c> file must provide a value for the <c>NSPhotoLibraryUsageDescription</c> key
        /// that explains to the user why your app is requesting Photos access.
        /// Apps linked on or after iOS 10.0 will crash if this key is not present.
        ///
        /// After the user grants permission, the system remembers the choice for future use in your app,
        /// but the user can change this choice at any time using the Settings app.
        /// If the user has denied your app photo library access, not yet responded to the permission prompt,
        /// or cannot grant access due to restrictions
        /// </summary>
        /// <param name="callback">callback fired upon determining your app’s authorization to access the photo library.</param>
        public static void RequestAuthorization(Action<ISN_PHAuthorizationStatus> callback)
        {
            ISN_PHNativeAPI.RequestAuthorization(callback);
        }
    }
}
