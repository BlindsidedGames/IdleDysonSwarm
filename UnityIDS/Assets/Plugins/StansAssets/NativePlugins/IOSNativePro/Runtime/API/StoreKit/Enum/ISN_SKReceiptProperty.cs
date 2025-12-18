namespace SA.iOS.StoreKit
{
    /// <summary>
    /// States that a receipt can be in, related to the Volume Purchase Plan.
    /// </summary>
    public enum ISN_SKReceiptProperty
    {
        /// <summary>
        /// A key whose int value is interpreted as a Boolean value, indicating whether the receipt is expired.
        /// </summary>
        IsExpired = 0,

        /// <summary>
        /// A key whose int value is interpreted as a Boolean value, indicating whether the receipt has been revoked.
        /// </summary>
        IsRevoked = 1,

        /// <summary>
        /// A key whose int value is interpreted as a Boolean value, indicating whether the receipt is a Volume Purchase Plan receipt.
        /// </summary>
        IsVolumePurchase = 2,
    }
}
