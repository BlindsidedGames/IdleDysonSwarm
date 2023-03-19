////////////////////////////////////////////////////////////////////////////////
//
// @module IOS Native Plugin
// @author Koretsky Konstantin (Stan's Assets)
// @support support@stansassets.com
// @website https://stansassets.com
//
////////////////////////////////////////////////////////////////////////////////

namespace SA.iOS.Foundation
{
    /// <summary>
    /// Possible values associated with the <see cref="ISN_NSStoreDidChangeExternallyNotification.Reason"/> property.
    /// </summary>
    public enum ISN_NSUbiquitousKeyValueStoreChangeReasons
    {
        /// <summary>
        /// A value changed in iCloud.
        /// This occurs when another device, running another instance of your app and attached to the same iCloud account, uploads a new value.
        /// </summary>
        ServerChange,

        /// <summary>
        /// Your attempt to write to key-value storage was discarded because an initial download from iCloud has not yet happened.
        /// That is, before you can first write key-value data, the system must ensure that your app’s local, o
        /// n-disk cache matches the truth in iCloud.
        ///
        /// Initial downloads happen the first time a device is connected to an iCloud account,
        /// and when a user switches their primary iCloud account.
        /// </summary>
        InitialSyncChange,

        /// <summary>
        /// Your app’s key-value store has exceeded its space quota on the iCloud server.
        /// </summary>
        QuotaViolationChange,

        /// <summary>
        /// The user has changed the primary iCloud account.
        /// The keys and values in the local key-value store have been replaced with those from the new account,
        /// regardless of the relative timestamps.
        /// </summary>
        AccountChange,

        /// <summary>
        /// Empty value.
        /// </summary>
        None = -1,
    }
}
