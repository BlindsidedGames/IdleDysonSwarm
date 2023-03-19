using System;
using SA.Foundation.Templates;

namespace SA.iOS.StoreKit
{
    /// <summary>
    /// A request to refresh the receipt, which represents the user's transactions with your app.
    ///
    /// Use this API to request a new receipt if the receipt is invalid or missing.
    /// In the sandbox environment, you can request a receipt with any combination of properties
    /// to test the state transitions related to Volume Purchase Plan receipts.
    /// </summary>
    public class ISN_SKReceiptRefreshRequest : ISN_SKRequest
    {
        readonly ISN_SKReceiptDictionary m_Properties;

        /// <summary>
        /// Initializes a receipt refresh request with optional properties.
        ///
        /// In the test environment, the properties that the new receipt should have.
        /// For keys, see <see cref="ISN_SKReceiptDictionary"/>.
        ///
        /// In the production environment, set this parameter to nil.
        /// </summary>
        /// <param name="properties">Properties.</param>
        public ISN_SKReceiptRefreshRequest(ISN_SKReceiptDictionary properties)
        {
            m_Properties = properties;
        }

        /// <summary>
        /// Sends the receipt refresh request to the Apple App Store.
        /// </summary>
        public override void Start(Action<SA_Result> callback)
        {
            ISN_SKLib.Api.RefreshRequest(m_Properties, callback);
        }
    }
}
