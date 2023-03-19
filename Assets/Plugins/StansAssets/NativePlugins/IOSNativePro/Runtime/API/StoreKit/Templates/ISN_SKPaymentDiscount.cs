using SA.iOS.Utilities;

namespace SA.iOS.StoreKit
{
    /// <summary>
    /// The signed discount applied to a payment.
    /// </summary>
    public class ISN_SKPaymentDiscount : ISN_NativeObject
    {
        /// <summary>
        /// Initializes the payment discount with a signature and the parameters used by the signature.
        /// </summary>
        /// <param name="identifier">A string used to uniquely identify a discount offer for a product.</param>
        /// <param name="keyIdentifier">A string that identifies the key used to generate the signature.</param>
        /// <param name="nonce">A universally unique ID (UUID) value that you define.</param>
        /// <param name="signature">A UTF-8 string representing the properties of a specific discount offer, cryptographically signed.</param>
        /// <param name="timestamp">The date and time of the signature's creation in milliseconds, formatted in Unix epoch time.</param>
        public ISN_SKPaymentDiscount(string identifier, string keyIdentifier, string nonce, string signature, ulong timestamp)
        {
            var hash = ISN_NewSKNativeAPI._SKPaymentDiscount_initWithIdentifier(identifier, keyIdentifier, nonce, signature, timestamp);
            SetNativeHashCode(hash);
        }
    }
}
