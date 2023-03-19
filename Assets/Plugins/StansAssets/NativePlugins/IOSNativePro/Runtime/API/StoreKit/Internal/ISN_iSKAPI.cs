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

namespace SA.iOS.StoreKit
{
    interface ISN_iSKAPI
    {
        void LoadStore(ISN_SKLib.ISN_LoadStoreRequest request, Action<ISN_SKProductsResponse> callback);
        void AddPayment(string productIdentifier);
        void FinishTransaction(ISN_iSKPaymentTransaction transaction);
        void RestoreCompletedTransactions();
        void SetTransactionObserverState(bool enabled);

        bool CanMakePayments();
        ISN_SKAppStoreReceipt RetrieveAppStoreReceipt();
        void RefreshRequest(ISN_SKReceiptDictionary dictionary, Action<SA_Result> callback);
        void StoreRequestReview();
        ISN_SKStorefront PaymentQueue_Storefront();

        SA_iEvent<ISN_iSKPaymentTransaction> TransactionUpdated { get; }
        SA_iEvent<ISN_iSKPaymentTransaction> TransactionRemoved { get; }
        SA_iEvent<ISN_SKProduct> ShouldAddStorePayment { get; }
        SA_iEvent<SA_Result> RestoreTransactionsComplete { get; }
        SA_iEvent DidChangeStorefront { get; }
    }
}
