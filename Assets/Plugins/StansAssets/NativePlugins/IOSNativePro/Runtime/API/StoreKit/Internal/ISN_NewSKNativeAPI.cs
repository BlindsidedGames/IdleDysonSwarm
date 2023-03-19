#if ((UNITY_IPHONE || UNITY_IOS || UNITY_TVOS ) && STORE_KIT_API_ENABLED)
#define API_ENABLED
#endif

using System;

#if API_ENABLED
using System.Runtime.InteropServices;

#endif

namespace SA.iOS.StoreKit
{
    static class ISN_NewSKNativeAPI
    {
#if API_ENABLED
        [DllImport("__Internal")]
        public static extern void _SKProductsRequest_start(string loadRequestJson, IntPtr didReceiveResponse);

        [DllImport("__Internal")]
        public static extern void _SKPaymentQueue_addPayment(ulong paymentHash);


        [DllImport("__Internal")]
        public static extern ulong _SKMutablePayment_paymentWithProduct(ulong productHash);

        [DllImport("__Internal")]
        public static extern void _SKMutablePayment_setApplicationUsername(ulong paymentHash, string applicationUsername);

        [DllImport("__Internal")]
        public static extern void _SKMutablePayment_setPaymentDiscount(ulong paymentHash, ulong paymentDiscountHash);


        [DllImport("__Internal")]
        public static extern ulong _SKPaymentDiscount_initWithIdentifier(string identifier, string keyIdentifier, string nonce, string signature, ulong timestamp);

#else
        public static void _SKProductsRequest_start(string loadRequestJson, IntPtr didReceiveResponse) { }
        public static void _SKPaymentQueue_addPayment(ulong paymentHash) { }

        public static ulong _SKMutablePayment_paymentWithProduct(ulong productHash)
        {
            return 0;
        }

        public static void _SKMutablePayment_setApplicationUsername(ulong paymentHash, string applicationUsername) { }
        public static void _SKMutablePayment_setPaymentDiscount(ulong paymentHash, ulong paymentDiscountHash) { }
        public static ulong _SKPaymentDiscount_initWithIdentifier(string identifier, string keyIdentifier, string nonce, string signature, ulong timestamp)
        {
            return 0;
        }
#endif
    }
}
