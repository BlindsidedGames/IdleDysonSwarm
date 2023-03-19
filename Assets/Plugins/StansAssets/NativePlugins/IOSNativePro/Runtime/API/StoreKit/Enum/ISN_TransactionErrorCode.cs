////////////////////////////////////////////////////////////////////////////////
//
// @module IOS Native Plugin
// @author Osipov Stanislav (Stan's Assets)
// @support support@stansassets.com
// @website https://stansassets.com
//
////////////////////////////////////////////////////////////////////////////////

namespace SA.iOS.StoreKit
{
    /// <summary>
    /// Possible Transaction error codes.
    /// </summary>
    public enum ISN_SKTransactionErrorCode
    {
        /// <summary>
        /// Unknown error.
        /// </summary>
        SKErrorUnknown = 0,

        /// <summary>
        /// Client is not allowed to issue the request, etc.
        /// </summary>
        SKErrorClientInvalid = 1,

        /// <summary>
        /// User canceled the request, etc.
        /// </summary>
        SKErrorPaymentCanceled = 2,

        /// <summary>
        /// Purchase identifier was invalid, etc.
        /// </summary>
        SKErrorPaymentInvalid = 3,

        /// <summary>
        /// This device is not allowed to make the payment
        /// </summary>
        SKErrorPaymentNotAllowed = 4,

        /// <summary>
        /// Product is not available in the current storefront
        /// </summary>
        SKErrorStoreProductNotAvailable = 5,

        /// <summary>
        /// No purchases to restore
        /// </summary>
        SKErrorPaymentNoPurchasesToRestore = 6,

        /// <summary>
        /// StoreKit initialization required
        /// </summary>
        SKErrorPaymentServiceNotInitialized = 7,

        /// <summary>
        /// No error occurred
        /// </summary>
        SKErrorNone = 8,
    }
}
