////////////////////////////////////////////////////////////////////////////////
//
// @module IOS Native 2018 - New Generation
// @author Stan's Assets team
// @support support@stansassets.com
// @website https://stansassets.com
//
////////////////////////////////////////////////////////////////////////////////

using System;
using SA.Foundation.Events;
using SA.Foundation.Templates;
using StansAssets.Foundation.Async;

namespace SA.iOS.StoreKit
{
    class ISN_SKEditorAPI : ISN_iSKAPI
    {
        readonly SA_Event<ISN_iSKPaymentTransaction> m_TransactionUpdated = new SA_Event<ISN_iSKPaymentTransaction>();
        readonly SA_Event<ISN_iSKPaymentTransaction> m_TransactionRemoved = new SA_Event<ISN_iSKPaymentTransaction>();
        readonly SA_Event<ISN_SKProduct> m_ShouldAddStorePayment = new SA_Event<ISN_SKProduct>();
        readonly SA_Event<SA_Result> m_RestoreTransactionsComplete = new SA_Event<SA_Result>();
        readonly SA_Event m_DidChangeStorefront = new SA_Event();

        public void LoadStore(ISN_SKLib.ISN_LoadStoreRequest request, Action<ISN_SKProductsResponse> callback)
        {
             CoroutineUtility.WaitForSeconds(DelayTime, () =>
            {
                var res = new ISN_SKProductsResponse(ISN_Settings.Instance.InAppProducts);
                callback.Invoke(res);
            });
        }

        public void AddPayment(string productIdentifier)
        {
             CoroutineUtility.WaitForSeconds(DelayTime, () =>
            {
                var product = ISN_SKPaymentQueue.GetProductById(productIdentifier);
                var transaction = new ISN_SKPaymentTransaction(product, ISN_SKPaymentTransactionState.Purchased);

                m_TransactionUpdated.Invoke(transaction);
            });
        }

        public void FinishTransaction(ISN_iSKPaymentTransaction transaction)
        {
             CoroutineUtility.WaitForSeconds(DelayTime, () =>
            {
                m_TransactionRemoved.Invoke(transaction);
            });
        }

        public void RestoreCompletedTransactions()
        {
             CoroutineUtility.WaitForSeconds(DelayTime, () =>
            {
                foreach (var product in ISN_SKPaymentQueue.Products)
                    if (product.Type == ISN_SKProductType.NonConsumable)
                    {
                        var transaction = new ISN_SKPaymentTransaction(product, ISN_SKPaymentTransactionState.Restored);
                        m_TransactionUpdated.Invoke(transaction);
                    }

                m_RestoreTransactionsComplete.Invoke(new SA_Result());
            });
        }

        public void SetTransactionObserverState(bool enabled)
        {
            //Just do nothing
        }

        public ISN_SKAppStoreReceipt RetrieveAppStoreReceipt()
        {
            return new ISN_SKAppStoreReceipt(string.Empty);
        }

        public bool CanMakePayments()
        {
            return true;
        }

        public void StoreRequestReview()
        {
            // do nothing
            // probably need to simulate show popup in an editor
        }

        public ISN_SKStorefront PaymentQueue_Storefront()
        {
            return new ISN_SKStorefront();
        }

        public void RefreshRequest(ISN_SKReceiptDictionary dictionary, Action<SA_Result> callback)
        {
             CoroutineUtility.WaitForSeconds(DelayTime, () =>
            {
                callback.Invoke(new SA_Result());
            });
        }

        public SA_iEvent<ISN_iSKPaymentTransaction> TransactionUpdated => m_TransactionUpdated;

        public SA_iEvent<ISN_iSKPaymentTransaction> TransactionRemoved => m_TransactionRemoved;

        public SA_iEvent<ISN_SKProduct> ShouldAddStorePayment => m_ShouldAddStorePayment;

        public SA_iEvent<SA_Result> RestoreTransactionsComplete => m_RestoreTransactionsComplete;

        public SA_iEvent DidChangeStorefront => m_DidChangeStorefront;

        float DelayTime => UnityEngine.Random.Range(0.1f, 3f);
    }
}
