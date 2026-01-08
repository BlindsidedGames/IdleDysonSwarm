using System;
using System.Collections.Generic;
using SA.iOS.AuthenticationServices;
using SA.iOS.Utilities;
using UnityEngine;

namespace SA.iOS.StoreKit
{
    /// <summary>
    /// An object that can retrieve localized information from the App Store about a specified list of products.
    /// </summary>
    public class ISN_SKProductsRequest
    {
        ISN_SKLib.ISN_LoadStoreRequest m_loadStoreRequest;

        /// <summary>
        /// Initializes the request with the set of product identifiers.
        /// </summary>
        /// <param name="productIdentifiers">The list of product identifiers for the products you wish to retrieve descriptions of.</param>
        public ISN_SKProductsRequest(List<string> productIdentifiers)
        {
            m_loadStoreRequest = new ISN_SKLib.ISN_LoadStoreRequest
            {
                ProductIdentifiers = productIdentifiers
            };
        }

        /// <summary>
        /// Sends the request to the Apple App Store.
        /// </summary>
        /// <param name="response">The request response.</param>
        public void Start(Action<ISN_SKProductsResponse> response)
        {
            ISN_NewSKNativeAPI._SKProductsRequest_start(JsonUtility.ToJson(m_loadStoreRequest),
                ISN_MonoPCallback.ActionToIntPtr(response));
        }
    }
}
