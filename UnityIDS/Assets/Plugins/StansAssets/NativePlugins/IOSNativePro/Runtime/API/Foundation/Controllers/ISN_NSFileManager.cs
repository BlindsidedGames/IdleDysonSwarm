namespace SA.iOS.Foundation
{
    /// <summary>
    /// An object that provides a convenient interface to the contents of the file system.
    /// </summary>
    public class ISN_NSFileManager
    {
        /// <summary>
        /// An opaque token that represents the current user’s iCloud identity.
        ///
        /// When iCloud is currently available, this property contains an opaque object representing the identity of the current user.
        /// If iCloud is unavailable for any reason or there is no logged-in user, the value of this property is nil.
        /// Accessing the value of this property is relatively fast so you can check the value at launch time from your app’s main thread.
        /// </summary>
        public static string UbiquityIdentityToken => ISN_NSLib.Api.UbiquityIdentityToken;
    }
}
