using System;

namespace SA.iOS.CloudKit
{
    /// <summary>
    /// This enum represents CloudKit database types that we can work with.
    /// </summary>
    public enum ISN_CKDatabaseType
    {
        /// <summary>
        /// This is public CloudKit database type.
        /// </summary>
        Public,
        /// <summary>
        /// This is shared CloudKit database type.
        /// </summary>
        Shared,
        /// <summary>
        /// This is private CloudKit database type.
        /// </summary>
        Private
    }
}
