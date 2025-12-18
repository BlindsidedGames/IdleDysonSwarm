namespace SA.iOS.StoreKit
{
    /// <summary>
    /// Values representing the state of a transaction.
    /// </summary>
    public enum ISN_SKPaymentTransactionState
    {
        /// <summary>
        /// Transaction is being added to the server queue.
        /// </summary>
        Purchasing = 0,

        /// <summary>
        ///  Transaction is in queue, user has been charged.  Client should complete the transaction.
        /// </summary>
        Purchased = 1,

        /// <summary>
        /// Transaction was cancelled or failed before being added to the server queue.
        /// </summary>
        Failed = 2,

        /// <summary>
        ///  Transaction was restored from user's purchase history.  Client should complete the transaction.
        /// </summary>
        Restored = 3,

        /// <summary>
        /// A transaction that is in the queue, but its final status is pending external action such as Ask to Buy.
        /// </summary>
        Deferred = 4,
    }
}
