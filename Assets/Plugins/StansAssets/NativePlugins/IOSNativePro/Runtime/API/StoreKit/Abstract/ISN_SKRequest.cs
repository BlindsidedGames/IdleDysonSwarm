using System;
using System.Collections.Generic;
using UnityEngine;
using SA.Foundation.Templates;

namespace SA.iOS.StoreKit
{
    /// <summary>
    /// An abstract class that represents a request to the App Store.
    /// </summary>
    public abstract class ISN_SKRequest
    {
        /// <summary>
        /// Sends the request to the Apple App Store.
        /// </summary>
        public abstract void Start(Action<SA_Result> callback);
    }
}
