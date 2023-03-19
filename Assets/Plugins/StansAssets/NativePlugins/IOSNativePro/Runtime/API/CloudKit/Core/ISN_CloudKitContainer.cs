using System;

namespace SA.iOS.CloudKit
{
    /// <summary>
    /// A CloudKitContainer object provides access to an app container, and through the app container, access to its databases.
    /// <summary>
    public class ISN_CloudKitContainer
    {
        public delegate void AccountStatusDelegate();
        // public event AccountStatusDelegate OnAccountStatusChanged;

        /// <summary>
        /// The database containing the data shared by all users.
        /// </summary>
        public ISN_CKDatabase Public => new ISN_CKDatabase(ISN_CKDatabaseType.Public);


        /// <summary>
        /// The database containing shared records accepted by the current user.
        /// </summary>
        public ISN_CKDatabase Shared => new ISN_CKDatabase(ISN_CKDatabaseType.Shared);
        
        /// <summary>
        /// The database containing the user’s private data.
        /// </summary>
        public ISN_CKDatabase Private => new ISN_CKDatabase(ISN_CKDatabaseType.Private);

        /// <summary>
        /// Get account Status from container. 
        /// This method determines the status of the current user’s iCloud account asynchronously, 
        /// reporting the results to the block in the callback parameter.
        /// </summary>
        /// <param name='callback'> Callback from iCloid as ISN_CKResult that have AccountStatus.</param>
        public void GetAccountStatus(Action<ISN_CKResult> callback) {
            Internal.ISN_CloudKitLib.Api.GetAccountStatus(callback);
        }

        /// <summary>
        /// Init account Status notification event. 
        /// </summary>
        /// <param name='OnAccountStatusChanged'> Event that would be called when system get CKAccountChangedNotification.</param>
        public void InitAccoutStatusNotificationCallback(AccountStatusDelegate OnAccountStatusChanged) {
            Internal.ISN_CloudKitLib.Api.InitAccoutStatusNotificationCallback(OnAccountStatusChanged);
        }
    }
}