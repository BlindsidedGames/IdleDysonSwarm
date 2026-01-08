namespace SA.iOS.StoreKit
{
    /// <summary>
    /// A mutable request to the App Store to process payment for additional functionality offered by your app.
    ///
    /// A mutable payment object identifies a product and the quantity of that item the user would like to purchase.
    ///
    /// When a mutable payment is added to the payment queue, the payment queue copies the contents into an immutable request before queueing the request.
    /// Your app can safely change the contents of the mutable payment object.
    /// </summary>
    public class ISN_SKMutablePayment : ISN_SKPayment
    {
        /// <summary>
        /// Create new payment request with product.
        /// </summary>
        /// <param name="product">target product.</param>
        public ISN_SKMutablePayment(ISN_SKProduct product)
        {
            var hash = ISN_NewSKNativeAPI._SKMutablePayment_paymentWithProduct(product.NativeHashCode);
            SetNativeHashCode(hash);
        }

        /// <summary>
        /// A string that associates the payment transaction with a user on your own service.
        /// You can use this property to detect some forms of fraudulent activity,
        /// typically multiple transactions from different iTunes Store accounts.
        /// For example, if you have an online game where each user creates an account to save gameplay data,
        /// it's unusual for many different iTunes Store accounts to make purchases on behalf
        /// of the same user account on your system. The App Store can't automatically detect
        /// that the transactions are related. Setting this property associates the purchases with each other.
        ///
        /// Create a string that uniquely identifies the user's account on your service.
        /// For example, you can use a one-way hash of the user’s account name.
        /// Don't provide personally identifiable information or any data whose disclosure would
        /// otherwise be detrimental to the user.
        ///
        /// The following code demonstrates one way to generate this hashed data:
        /// </summary>
        public string ApplicationUsername
        {
            set => ISN_NewSKNativeAPI._SKMutablePayment_setApplicationUsername(NativeHashCode, value);
        }

        /// <summary>
        /// The details of the discount offer to apply to the payment.
        /// </summary>
        public ISN_SKPaymentDiscount PaymentDiscount
        {
            set => ISN_NewSKNativeAPI._SKMutablePayment_setPaymentDiscount(NativeHashCode, value.NativeHashCode);
        }
    }
}
