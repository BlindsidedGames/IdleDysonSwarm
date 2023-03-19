namespace SA.iOS.AdSupport
{
    /// <summary>
    /// An object containing an identifier to be used only for serving advertisements,
    /// and a flag indicating whether a user has limited ad tracking.
    /// </summary>
    public class ISN_ASIdentifierManager
    {
        static ISN_ASIdentifierManager s_SharedManager;

        /// <summary>
        /// Returns the shared instance of the ASIdentifierManager class.
        /// </summary>
        public static ISN_ASIdentifierManager SharedManager => s_SharedManager ?? (s_SharedManager = new ISN_ASIdentifierManager());

        /// <summary>
        /// An alphanumeric string unique to each device, used only for serving advertisements.
        /// </summary>
        public string AdvertisingIdentifier => Internal.ISN_AdSupportNativeAPI.AdvertisingIdentifier;

        /// <summary>
        /// A Boolean value that indicates whether the user has limited ad tracking.
        /// </summary>
        public bool AdvertisingTrackingEnabled => Internal.ISN_AdSupportNativeAPI.AdvertisingTrackingEnabled;
    }
}
