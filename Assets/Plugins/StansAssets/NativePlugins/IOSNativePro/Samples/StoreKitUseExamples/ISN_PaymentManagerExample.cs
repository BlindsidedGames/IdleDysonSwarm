////////////////////////////////////////////////////////////////////////////////
//  
// @module IOS Native Plugin for Unity3D 
// @author Osipov Stanislav (Stan's Assets) 
// @support stans.assets@gmail.com 
//
////////////////////////////////////////////////////////////////////////////////

using UnityEngine;
using SA.iOS.StoreKit;
using SA.Foundation.Templates;

namespace SA.iOS.Examples
{
    /// <summary>
    /// The example class that shows how to implement InApp support in your app
    /// </summary>
    public class ISN_PaymentManagerExample : ISN_iSKPaymentTransactionObserver
    {
        //This could also be defined with the Plugin editor settings
        //Stan's Assets -> IOSNative -> EditSettings
        public const string SMALL_PACK = "your.product.id1.here";
        public const string NC_PACK = "your.product.id2.here";

        static bool IsInitialized = false;

        public void init()
        {
            // just make sure we init only once
            if (!IsInitialized)
            {
                ISN_SKPaymentQueue.RegisterProductId(SMALL_PACK);
                ISN_SKPaymentQueue.RegisterProductId(NC_PACK);

                IsInitialized = true;

                ISN_SKPaymentQueue.Init(result =>
                {
                    Debug.Log("result.Products.Count " + result.Products.Count);
                    Debug.Log("result.InvalidProductIdentifiers.Count " + result.InvalidProductIdentifiers.Count);
                });

                //Since current class is implement's ISN_iSKPaymentTransactionObserver
                //we can add it as the transaction observer
                ISN_SKPaymentQueue.AddTransactionObserver(this);
            }
        }

        //--------------------------------------
        //  Private Methods
        //--------------------------------------

        static void UnlockProducts(ISN_iSKPaymentTransaction transaction)
        {
            //At this point user already paid for content, so we need to provide it
            //Unless, we want to make sure that payment was legit, and nobody trying to hack us
            //In order to do it, we have to use server side verification, you can read more about it here:
            //https://developer.apple.com/library/content/releasenotes/General/ValidateAppStoreReceipt/Chapters/ValidateRemotely.html#//apple_ref/doc/uid/TP40010573-CH104-SW1
            //
            //this step isn't required. Use it only if you want to make sure that payment is 100% legit
            //So far let's just print a Base64 receipt data

            //  Debug.Log("Receipt: " + ISN_SKPaymentQueue.AppStoreReceipt.AsBase64StringString);

            switch (transaction.ProductIdentifier)
            {
                case SMALL_PACK:
                    //code for adding small game money amount here
                    break;
                case NC_PACK:
                    //code for unlocking cool item here
                    break;
            }

            //After connect was provided to use we can finally finish the transaction
            ISN_SKPaymentQueue.FinishTransaction(transaction);
        }

        //--------------------------------------
        //  ISN_TransactionObserver implementation
        //--------------------------------------

        public void OnTransactionUpdated(ISN_iSKPaymentTransaction transaction)
        {
            //Transactions have been updated.
            //Let's act accordingly
            Debug.Log("transaction JSON: " + JsonUtility.ToJson(transaction));

            Debug.Log("OnTransactionComplete: " + transaction.ProductIdentifier);
            Debug.Log("OnTransactionComplete: state: " + transaction.State);

            switch (transaction.State)
            {
                case ISN_SKPaymentTransactionState.Purchasing:
                    //No actions is required here, we probably don't even have a ProductIdentifier
                    //but we can use this callback to show preloader for example, since we know that user is currently
                    //working on this transaction
                    break;

                case ISN_SKPaymentTransactionState.Purchased:
                case ISN_SKPaymentTransactionState.Restored:
                    //Our product has been successfully purchased or restored
                    //So we need to provide content to our user depends on productIdentifier
                    UnlockProducts(transaction);

                    break;
                case ISN_SKPaymentTransactionState.Deferred:
                    //iOS 8 introduces Ask to Buy, which lets parents approve any purchases initiated by children
                    //You should update your UI to reflect this deferred state, and expect another Transaction Complete  to be called again with a new transaction state 
                    //reflecting the parent’s decision or after the transaction times out. Avoid blocking your UI or gameplay while waiting for the transaction to be updated.
                    break;
                case ISN_SKPaymentTransactionState.Failed:
                    //Our purchase flow is failed.
                    //We can unlock interface and report user that the purchase is failed. 
                    Debug.Log("Transaction failed with error, code: " + transaction.Error.Code);
                    Debug.Log("Transaction failed with error, description: " + transaction.Error.Message);

                    //at this point we just need to finish the transaction
                    ISN_SKPaymentQueue.FinishTransaction(transaction);
                    break;
            }

            if (transaction.State == ISN_SKPaymentTransactionState.Failed)
                Debug.Log("Error code: " + transaction.Error.Code + "\n" + "Error description:" + transaction.Error.Message);
            else
                Debug.Log("product " + transaction.ProductIdentifier + " state: " + transaction.State);
        }

        public void OnTransactionRemoved(ISN_iSKPaymentTransaction result)
        {
            //Your application does not typically need to anything on this event,  
            //but it may be used to update user interface to reflect that a transaction has been completed.
        }

        public bool OnShouldAddStorePayment(ISN_SKProduct result)
        {
            // Return true to continue the transaction in your app.
            // Return false to defer or cancel the transaction.
            // If you return false, you can continue the transaction later using requestId <see cref="ISN_SKProduct"/>
            // 
            // we are okay, to continue transaction, so let's return true
            return true;
        }

        public void OnRestoreTransactionsComplete(SA_Result result)
        {
            // Tells the observer that the payment queue has finished sending restored transactions.
            // 
            // This method is called after all restore transactions have been processed by the payment queue. 
            // Your application is not required to do anything in this method.

            if (result.IsSucceeded)
                Debug.Log("Restore Completed");
            else
                Debug.Log("Error: " + result.Error.Code + " message: " + result.Error.Message);
        }

        public void DidChangeStorefront()
        {
            //You can get new store front from using ISN_SKPaymentQueue.Storefront
        }
    }
}
