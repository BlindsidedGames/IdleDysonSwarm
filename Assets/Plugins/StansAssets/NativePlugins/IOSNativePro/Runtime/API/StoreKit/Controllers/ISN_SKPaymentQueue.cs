////////////////////////////////////////////////////////////////////////////////
//
// @module IOS Native 2018 - New Generation
// @author Stan's Assets team
// @support support@stansassets.com
// @website https://stansassets.com
//
////////////////////////////////////////////////////////////////////////////////

using System;
using System.Collections.Generic;

namespace SA.iOS.StoreKit
{
    /// <summary>
    /// A queue of payment transactions to be processed by the App Store.
    ///
    /// The payment queue communicates with the App Store
    /// and presents a user interface so that the user can authorize payment.
    /// The contents of the queue are persistent between launches of your app.
    /// </summary>
    public static class ISN_SKPaymentQueue
    {
        static event Action<ISN_SKProductsResponse> OnStoreKitInitComplete = delegate { };

        static bool s_IsInitializationInProgress;
        static ISN_SKProductsResponse s_SuccessProductsResponseCache;

        static readonly Dictionary<string, ISN_SKProduct> s_Products = new Dictionary<string, ISN_SKProduct>();
        static readonly List<ISN_iSKPaymentTransactionObserver> s_Observers = new List<ISN_iSKPaymentTransactionObserver>();

        //--------------------------------------
        // Initialization
        //--------------------------------------

        static ISN_SKPaymentQueue()
        {
            SubscribeToNativeEvents();
        }

        //--------------------------------------
        //  Public Methods
        //--------------------------------------

        public static void Init(Action<ISN_SKProductsResponse> callback)
        {
            Init(ISN_Settings.Instance.InAppProducts, callback);
        }

        /// <summary>
        /// Initializes the Store Kit with the set of previously defined product
        /// Products can be defined under the editor plugin settings: Stan's Assets->IOS Native->Edit Settings
        /// Or you can add product's via code using <see cref="RegisterProduct"/>
        /// </summary>
        /// <param name="products">List of the products to initialize the service with.</param>
        /// <param name="callback">Callback with the initialization result.</param>
        public static void Init(List<ISN_SKProduct> products, Action<ISN_SKProductsResponse> callback)
        {
            if (s_SuccessProductsResponseCache != null)
            {
                callback.Invoke(s_SuccessProductsResponseCache);
                return;
            }

            OnStoreKitInitComplete += callback;
            if (s_IsInitializationInProgress) return;

            s_IsInitializationInProgress = true;

            var request = new ISN_SKLib.ISN_LoadStoreRequest();
            foreach (var product in products) request.ProductIdentifiers.Add(product.ProductIdentifier);

            ISN_SKLib.Api.LoadStore(request, result =>
            {
                s_IsInitializationInProgress = false;
                if (result.IsSucceeded)
                {
                    CacheAppStoreProducts(result);
                    s_SuccessProductsResponseCache = result;
                }

                OnStoreKitInitComplete.Invoke(result);
                OnStoreKitInitComplete = delegate { };
            });
        }

        /// <summary>
        /// Adds an observer to the payment queue.
        ///
        /// Your application should add an observer to the payment queue during application initialization.
        /// If there are no observers attached to the queue, the payment queue does not synchronize its list
        /// of pending transactions with the Apple App Store,
        /// because there is no observer to respond to updated transactions.
        ///
        /// If an application quits when transactions are still being processed,
        /// those transactions are not lost. The next time the application launches,
        /// the payment queue will resume processing the transactions.
        /// Your application should always expect to be notified of completed transactions.
        ///
        /// If more than one transaction observer is attached to the payment queue,
        /// no guarantees are made as to the order they will be called in.
        /// It is safe for multiple observers to call <see cref="FinishTransaction"/>, but not recommended.
        /// It is recommended that you use a single observer to process and finish the transaction.
        /// </summary>
        /// <param name="observer">The observer to add to the queue.</param>
        public static void AddTransactionObserver(ISN_iSKPaymentTransactionObserver observer)
        {
            s_Observers.Add(observer);
            if (s_Observers.Count == 1)

                //we have at least one observer atm, so let's enable observation on a native side
                ISN_SKLib.Api.SetTransactionObserverState(true);
        }

        /// <summary>
        /// Removes an observer from the payment queue.
        ///
        /// If there are no observers attached to the queue,
        /// the payment queue does not synchronize its list of pending transactions with the Apple App Store,
        /// because there is no observer to respond to updated transactions.
        /// </summary>
        /// <param name="observer">The observer to remove.</param>
        public static void RemoveTransactionObserver(ISN_iSKPaymentTransactionObserver observer)
        {
            s_Observers.Remove(observer);
            if (s_Observers.Count == 0)

                //we have no observer's atm, have to disable observation on a native side
                ISN_SKLib.Api.SetTransactionObserverState(false);
        }

        /// <summary>
        /// Adds a payment request to the queue.
        ///
        /// An application should always have at least one observer of the payment queue before adding payment requests.
        /// The payment request must have a product identifier registered with the Apple App Store.
        ///
        /// When a payment request is added to the queue,
        /// the payment queue processes that request with the Apple App Store
        /// and arranges for payment from the user. When that transaction is complete or if a failure occurs,
        /// the payment queue sends the <see cref="ISN_SKPaymentTransaction"/> object that encapsulates the request
        /// to all transaction observers.
        /// </summary>
        /// <param name="productId">Product identifier.</param>
        public static void AddPayment(string productId)
        {
            Init(result =>
            {
                ISN_SKLib.Api.AddPayment(productId);
            });
        }

        /// <summary>
        /// Adds a payment request to the queue.
        ///
        /// An application should always have at least one observer of the payment queue before adding payment requests.
        /// The payment request must have a product identifier registered with the Apple App Store.
        ///
        /// When a payment request is added to the queue,
        /// the payment queue processes that request with the Apple App Store
        /// and arranges for payment from the user. When that transaction is complete or if a failure occurs,
        /// the payment queue sends the <see cref="ISN_SKPaymentTransaction"/> object that encapsulates the request
        /// to all transaction observers.
        /// </summary>
        /// <param name="payment">A payment request.</param>
        public static void AddPayment(ISN_SKPayment payment)
        {
            ISN_NewSKNativeAPI._SKPaymentQueue_addPayment(payment.NativeHashCode);
        }

        /// <summary>
        /// Completes a pending transaction.
        ///
        /// Your application should call this method from a transaction observer
        /// that received a notification from the payment queue.
        /// Calling <see cref="FinishTransaction"/> on a transaction removes it from the queue.
        /// Your application should call <see cref="FinishTransaction"/> only after
        /// it has successfully processed the transaction and unlocked the functionality purchased by the user.
        ///
        /// Calling <see cref="FinishTransaction"/> on a transaction that is in the Purchasing state throws an exception.
        /// </summary>
        /// <param name="transaction">transaction to finish</param>
        public static void FinishTransaction(ISN_iSKPaymentTransaction transaction)
        {
            Init(result =>
            {
                ISN_SKLib.Api.FinishTransaction(transaction);
            });
        }

        /// <summary>
        /// Asks the payment queue to restore previously completed purchases.
        ///
        /// our application calls this method to restore transactions that were previously finished
        /// so that you can process them again.
        /// For example, your application would use this to allow a user to unlock previously purchased content
        /// onto a new device.
        /// </summary>
        public static void RestoreCompletedTransactions()
        {
            Init(result =>
            {
                ISN_SKLib.Api.RestoreCompletedTransactions();
            });
        }

        /// <summary>
        /// Gets the product by identifier.
        /// </summary>
        /// <param name="productIdentifier">Product identifier.</param>
        public static ISN_SKProduct GetProductById(string productIdentifier)
        {
            return s_Products[productIdentifier];
        }

        /// <summary>
        /// Simplified product registration by the product identifier.
        /// You can also define products using editor plugin settings: Stan's Assets->IOS Native->Edit Settings
        /// </summary>
        /// <param name="productId">Product identifier.</param>
        public static void RegisterProductId(string productId)
        {
            var tpl = new ISN_SKProduct();
            tpl.ProductIdentifier = productId;
            RegisterProduct(tpl);
        }

        /// <summary>
        /// Registers the product.
        /// You can also define products using editor plugin settings: Stan's Assets->IOS Native->Edit Settings
        /// </summary>
        /// <param name="product">Product.</param>
        public static void RegisterProduct(ISN_SKProduct product)
        {
            var isProductAlreadyInList = false;
            var replaceIndex = 0;
            foreach (var p in ISN_Settings.Instance.InAppProducts)
                if (p.ProductIdentifier.Equals(product.ProductIdentifier))
                {
                    isProductAlreadyInList = true;
                    replaceIndex = ISN_Settings.Instance.InAppProducts.IndexOf(p);
                    break;
                }

            if (isProductAlreadyInList)
                ISN_Settings.Instance.InAppProducts[replaceIndex] = product;
            else
                ISN_Settings.Instance.InAppProducts.Add(product);
        }

        //--------------------------------------
        //  Get / Set
        //--------------------------------------

        /// <summary>
        /// Gets a value indicating whether this <see cref="ISN_SKPaymentQueue"/> is ready.
        /// The ISN_SKPaymentQueue is ready once Init is completed successfully
        /// </summary>
        /// <value><c>true</c> if is ready; otherwise, <c>false</c>.</value>
        public static bool IsReady => s_SuccessProductsResponseCache != null;

        /// <summary>
        /// For an application purchased from the App Store, use this property a to get the receipt.
        /// This property makes no guarantee about whether there is a file at the URL—only
        /// that if a receipt is present, that is its location.
        /// </summary>
        /// <returns>The app store receipt.</returns>
        public static ISN_SKAppStoreReceipt AppStoreReceipt => ISN_SKLib.Api.RetrieveAppStoreReceipt();

        /// <summary>
        /// A list of products, one product for each valid product identifier provided in the original init request.
        /// only valid to use when <see cref="IsReady"/> is <c>true</c>
        /// </summary>
        public static List<ISN_SKProduct> Products => new List<ISN_SKProduct>(s_Products.Values);

        /// <summary>
        /// Indicates whether the user is allowed to make payments.
        ///
        /// An iPhone can be restricted from accessing the Apple App Store.
        /// For example, parents can restrict their children’s ability to purchase additional content.
        /// Your application should confirm that the user is allowed to authorize payments
        /// before adding a payment to the queue.
        /// Your application may also want to alter its behavior or appearance
        /// when the user is not allowed to authorize payments.
        /// </summary>
        /// <value><c>true</c> if can make payments; otherwise, <c>false</c>.</value>
        public static bool CanMakePayments => ISN_SKLib.Api.CanMakePayments();

        /// <summary>
        /// The current App Store storefront for the payment queue.
        /// </summary>
        public static ISN_SKStorefront Storefront => ISN_SKLib.Api.PaymentQueue_Storefront();

        //--------------------------------------
        //  Private Methods
        //--------------------------------------

        static void SubscribeToNativeEvents()
        {
            ISN_SKLib.Api.TransactionUpdated.AddListener(result =>
            {
                foreach (var observer in s_Observers) observer.OnTransactionUpdated(result);
            });

            ISN_SKLib.Api.TransactionRemoved.AddListener(result =>
            {
                foreach (var observer in s_Observers) observer.OnTransactionRemoved(result);
            });

            ISN_SKLib.Api.RestoreTransactionsComplete.AddListener(result =>
            {
                foreach (var observer in s_Observers) observer.OnRestoreTransactionsComplete(result);
            });

            ISN_SKLib.Api.DidChangeStorefront.AddListener(() =>
            {
                foreach (var observer in s_Observers) observer.DidChangeStorefront();
            });

            ISN_SKLib.Api.ShouldAddStorePayment.AddListener(result =>
            {
                var startTransaction = false;
                foreach (var observer in s_Observers) startTransaction = observer.OnShouldAddStorePayment(result);

                if (startTransaction)
                    AddPayment(result.ProductIdentifier);
            });
        }

        static void CacheAppStoreProducts(ISN_SKProductsResponse result)
        {
            s_Products.Clear();
            foreach (var product in result.Products)
            {
                var settingsProduct = GetProductFromSettings(product.ProductIdentifier);
                if (settingsProduct != null) product.EditorData = settingsProduct.EditorData;

                s_Products.Add(product.ProductIdentifier, product);
            }
        }

        static ISN_SKProduct GetProductFromSettings(string productIdentifier)
        {
            foreach (var product in ISN_Settings.Instance.InAppProducts)
                if (product.ProductIdentifier.Equals(productIdentifier))
                    return product;

            return null;
        }
    }
}
