#if ((UNITY_IPHONE || UNITY_IOS || UNITY_TVOS ) && STORE_KIT_API_ENABLED)
#define API_ENABLED
#endif

////////////////////////////////////////////////////////////////////////////////
//
// @module IOS Native 2018 - New Generation
// @author Stan's Assets team
// @support support@stansassets.com
// @website https://stansassets.com
//
////////////////////////////////////////////////////////////////////////////////

using System;
using UnityEngine;
using SA.iOS.Utilities;
using SA.Foundation.Templates;
using SA.Foundation.Events;
#if ((UNITY_IPHONE || UNITY_TVOS) && STORE_KIT_API_ENABLED)
using System.Runtime.InteropServices;

#endif

namespace SA.iOS.StoreKit
{
    class ISN_SKNativeAPI : ISN_Singleton<ISN_SKNativeAPI>, ISN_iSKAPI
    {
#if API_ENABLED
        [DllImport("__Internal")]
        static extern void _ISN_LoadStore(string data);

        [DllImport("__Internal")]
        static extern void _ISN_AddPayment(string productIdentifier);

        [DllImport("__Internal")]
        static extern void _ISN_FinishTransaction(string transactionIdentifier);

        [DllImport("__Internal")]
        static extern void _ISN_RestoreCompletedTransactions();

        [DllImport("__Internal")]
        static extern void _ISN_StoreRequestReview();

        [DllImport("__Internal")]
        static extern void _ISN_SetTransactionObserverState(bool enabled);

        [DllImport("__Internal")]
        static extern bool _ISN_CanMakePayments();

        [DllImport("__Internal")]
        static extern string _ISN_RetrieveAppStoreReceipt();

        [DllImport("__Internal")]
        static extern string _ISN_SKPaymentQueue_Storefront();

        [DllImport("__Internal")]
        static extern void _ISN_SK_RefreshRequest(string data, IntPtr callback);
#endif
        readonly SA_Event m_didChangeStorefront = new SA_Event();
        readonly SA_Event<ISN_iSKPaymentTransaction> m_transactionUpdated = new SA_Event<ISN_iSKPaymentTransaction>();
        readonly SA_Event<ISN_iSKPaymentTransaction> m_transactionRemoved = new SA_Event<ISN_iSKPaymentTransaction>();
        readonly SA_Event<ISN_SKProduct> m_shouldAddStorePayment = new SA_Event<ISN_SKProduct>();
        readonly SA_Event<SA_Result> m_restoreTransactionsComplete = new SA_Event<SA_Result>();
        Action<ISN_SKProductsResponse> m_LoadStoreCallback;

        public void LoadStore(ISN_SKLib.ISN_LoadStoreRequest request, Action<ISN_SKProductsResponse> callback)
        {
            m_LoadStoreCallback = callback;
#if API_ENABLED
            _ISN_LoadStore(JsonUtility.ToJson(request));
#endif
        }

        void OnStoreKitDidReceiveResponse(string data)
        {
            var result = JsonUtility.FromJson<ISN_SKProductsResponse>(data);
            m_LoadStoreCallback.Invoke(result);
        }

        public void RefreshRequest(ISN_SKReceiptDictionary dictionary, Action<SA_Result> callback)
        {
#if API_ENABLED
            _ISN_SK_RefreshRequest(JsonUtility.ToJson(dictionary), ISN_MonoPCallback.ActionToIntPtr(callback));
#endif
        }

        void OnSRefreshRequestResponse(string data)
        {
            var result = JsonUtility.FromJson<ISN_SKProductsResponse>(data);
            m_LoadStoreCallback.Invoke(result);
        }

        public void SetTransactionObserverState(bool enabled)
        {
#if API_ENABLED
            _ISN_SetTransactionObserverState(enabled);
#endif
        }

        public void AddPayment(string productIdentifier)
        {
#if API_ENABLED
            _ISN_AddPayment(productIdentifier);
#endif
        }

        public void FinishTransaction(ISN_iSKPaymentTransaction transaction)
        {
#if API_ENABLED
            _ISN_FinishTransaction(transaction.TransactionIdentifier);
#endif
        }

        public void RestoreCompletedTransactions()
        {
#if API_ENABLED
            _ISN_RestoreCompletedTransactions();
#endif
        }

        public bool CanMakePayments()
        {
#if API_ENABLED
            return _ISN_CanMakePayments();
#else
            return false;
#endif
        }

        public ISN_SKAppStoreReceipt RetrieveAppStoreReceipt()
        {
#if API_ENABLED
            return new ISN_SKAppStoreReceipt(_ISN_RetrieveAppStoreReceipt());
#else
            return new ISN_SKAppStoreReceipt(string.Empty);
#endif
        }

        public void StoreRequestReview()
        {
#if API_ENABLED
            _ISN_StoreRequestReview();
#endif
        }

        public ISN_SKStorefront PaymentQueue_Storefront()
        {
#if API_ENABLED
            var json = _ISN_SKPaymentQueue_Storefront();
            return JsonUtility.FromJson<ISN_SKStorefront>(json);
#else
            return new ISN_SKStorefront();
#endif
        }

        public SA_iEvent<ISN_iSKPaymentTransaction> TransactionUpdated => m_transactionUpdated;

        public SA_iEvent<ISN_iSKPaymentTransaction> TransactionRemoved => m_transactionRemoved;

        public SA_iEvent<ISN_SKProduct> ShouldAddStorePayment => m_shouldAddStorePayment;

        public SA_iEvent<SA_Result> RestoreTransactionsComplete => m_restoreTransactionsComplete;

        public SA_iEvent DidChangeStorefront => m_didChangeStorefront;

        //--------------------------------------
        //  ISN_TransactionObserver
        //--------------------------------------

        void OnDidChangeStorefront()
        {
            m_didChangeStorefront.Invoke();
        }

        void OnTransactionUpdated(string data)
        {
            var result = JsonUtility.FromJson<ISN_SKPaymentTransaction>(data);
            m_transactionUpdated.Invoke(result);
        }

        void OnTransactionRemoved(string data)
        {
            var result = JsonUtility.FromJson<ISN_SKPaymentTransaction>(data);
            m_transactionRemoved.Invoke(result);
        }

        void OnShouldAddStorePayment(string data)
        {
            var result = JsonUtility.FromJson<ISN_SKProduct>(data);
            m_shouldAddStorePayment.Invoke(result);
        }

        void OnRestoreTransactionsComplete(string data)
        {
            var result = JsonUtility.FromJson<SA_Result>(data);
            m_restoreTransactionsComplete.Invoke(result);
        }
    }
}
