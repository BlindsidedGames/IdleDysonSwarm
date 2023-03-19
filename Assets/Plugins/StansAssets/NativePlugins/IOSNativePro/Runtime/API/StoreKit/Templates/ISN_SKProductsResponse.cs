using System;
using System.Collections.Generic;
using UnityEngine;
using SA.Foundation.Templates;

namespace SA.iOS.StoreKit
{
    /// <summary>
    /// An App Store response to a request for information about a list of products.
    /// </summary>
    [Serializable]
    public class ISN_SKProductsResponse : SA_Result
    {
        [SerializeField]
        List<ISN_SKProduct> m_Products = default;
        [SerializeField]
        List<string> m_InvalidProductIdentifiers = default;

        internal ISN_SKProductsResponse(List<ISN_SKProduct> products)
        {
            m_Products = products;
        }

        /// <summary>
        /// A list of products, one product for each valid product identifier provided in the original request.
        /// </summary>
        public List<ISN_SKProduct> Products => m_Products;

        /// <summary>
        /// An array of product identifier strings that were not recognized by the App Store.
        /// </summary>
        public List<string> InvalidProductIdentifiers => m_InvalidProductIdentifiers;
    }
}
