namespace SA.iOS.StoreKit
{
    /// <summary>
    /// Values representing the payment modes for a product discount.
    /// </summary>
    public enum ISN_SKPaymentMode
    {
        /// <summary>
        /// A constant indicating that the payment mode of a product discount is billed over a single or multiple billing periods
        /// </summary>

        // ReSharper disable once InconsistentNaming
        SKProductDiscountPaymentModePayAsYouGo = 1,

        /// <summary>
        /// A constant indicating that the payment mode of a product discount is paid up front.
        /// </summary>

        // ReSharper disable once InconsistentNaming
        SKProductDiscountPaymentModePayUpFront = 2,

        /// <summary>
        /// A constant that indicates that the payment mode is a free trial.
        /// </summary>

        // ReSharper disable once InconsistentNaming
        SKProductDiscountPaymentModeFreeTrial = 3,
    }
}
