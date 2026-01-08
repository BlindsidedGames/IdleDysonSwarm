using System;
using UnityEngine;
using SA.Foundation.Templates;
using StansAssets.Foundation;

namespace SA.iOS.StoreKit
{
    /// <inheritdoc cref="ISN_iSKPaymentTransaction" />
    [Serializable]
    public class ISN_SKPaymentOriginalTransaction : SA_Result, ISN_iSKPaymentTransaction
    {
        [SerializeField]
        string m_ProductIdentifier = null;
        [SerializeField]
        string m_TransactionIdentifier = null;
        [SerializeField]
        long m_UnixDate = 0;
        [SerializeField]
        ISN_SKPaymentTransactionState m_State = default;

        public string ProductIdentifier => m_ProductIdentifier;

        public string TransactionIdentifier => m_TransactionIdentifier;

        public DateTime Date => TimeUtility.FromUnixTime(m_UnixDate);

        public ISN_SKPaymentTransactionState State => m_State;

        public ISN_SKProduct Product => ISN_SKPaymentQueue.GetProductById(m_ProductIdentifier);

        public ISN_iSKPaymentTransaction OriginalTransaction => null;
    }
}
