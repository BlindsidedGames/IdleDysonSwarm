using System;
using SA.Foundation.Templates;

namespace SA.iOS.StoreKit
{
    /// <summary>
    /// A payment transaction is created whenever a payment is added to the payment queue.
    /// Transactions are delivered to your app when the App Store has finished processing the payment.
    /// Completed transactions provide a receipt and transaction identifier that your app can use to save a permanent record of the processed payment.
    /// </summary>
    public interface ISN_iSKPaymentTransaction : SA_iResult
    {
        /// <summary>
        /// A string used to identify a product that can be purchased from within your application.
        /// </summary>
        string ProductIdentifier { get; }

        /// <summary>
        /// A string that uniquely identifies a successful payment transaction.
        ///
        /// The contents of this property are undefined except when <see cref="State"/>
        /// is set to <see cref="ISN_SKPaymentTransactionState.Purchased"/> or <see cref="ISN_SKPaymentTransactionState.Restored"/>.
        /// The transactionIdentifier is a string that uniquely identifies the processed payment.
        /// Your application may wish to record this string as part of an audit trail for App Store purchases.
        /// See <see href="https://developer.apple.com/library/content/documentation/NetworkingInternet/Conceptual/StoreKitGuide/Introduction.html#//apple_ref/doc/uid/TP40008267"> In-App Purchase Programming Guide </see> for more information.
        ///
        ///The value of this property corresponds to the Transaction Identifier property in the <see href="https://developer.apple.com/library/content/releasenotes/General/ValidateAppStoreReceipt/Chapters/ReceiptFields.html#//apple_ref/doc/uid/TP40010573-CH106-SW13">receipt </see>.
        /// </summary>
        string TransactionIdentifier { get; }

        /// <summary>
        /// The date the transaction was added to the App Store’s payment queue.
        ///
        /// The contents of this property are undefined except when <see cref="State"/>
        /// is set to <see cref="ISN_SKPaymentTransactionState.Purchased"/> or <see cref="ISN_SKPaymentTransactionState.Restored"/>.
        /// </summary>
        DateTime Date { get; }

        /// <summary>
        /// An object describing the error that occurred while processing the transaction.
        /// </summary>
        ISN_SKPaymentTransactionState State { get; }

        /// <summary>
        /// Gets the associated product with this transaction.
        /// </summary>
        ISN_SKProduct Product { get; }

        /// <summary>
        /// The transaction that was restored by the App Store.
        ///
        /// The contents of this property are undefined except when <see cref="State"/>
        /// is set to <see cref="ISN_SKPaymentTransactionState.Restored"/>.
        /// When a transaction is restored, the current transaction holds a new transaction identifier, receipt, and so on.
        /// Your application will read this property to retrieve the restored transaction.
        /// </summary>
        /// <value>The original transaction.</value>
        ISN_iSKPaymentTransaction OriginalTransaction { get; }
    }
}
