
namespace SA.iOS.CloudKit
{
    /// <summary>
    /// Enum indicating the availability of the user’s iCloud account.
    /// </summary>
    public enum ISN_CKAccountStatus 
    {
        /// <summary>
        /// An error occurred when getting the account status, consult the corresponding NSError.
        /// </summary>
        CKAccountStatusCouldNotDetermine,
        /// <summary>
        /// The iCloud account credentials are available for this application.
        /// </summary>
        CKAccountStatusAvailable,
        /// <summary>
        /// Parental Controls / Device Management has denied access to iCloud account credentials.
        /// </summary>
        CKAccountStatusRestricted,
        /// <summary>
        /// No iCloud account is logged in on this device.
        /// </summary>
        CKAccountStatusNoAccount,
    }
}
