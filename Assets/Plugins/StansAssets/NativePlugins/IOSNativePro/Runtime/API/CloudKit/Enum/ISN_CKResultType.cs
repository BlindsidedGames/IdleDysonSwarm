using System;

namespace SA.iOS.CloudKit
{
    /// <summary>
    /// Constants indicating the type of CloudKit operation state result.
    /// </summary>
    public enum ISN_CKResultType
    {
        /// <summary>
        /// We got an error during CloudKit operation.
        /// </summary>
        Error,

        /// <summary>
        /// CloudKit operation was successful.
        /// </summary>
        Success
    }
}
