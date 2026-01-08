#if ((UNITY_IPHONE || UNITY_TVOS || UNITY_STANDALONE_OSX ) && AUTHENTICATION_SERVICES_API_ENABLED)
#define API_ENABLED
#endif

using System;
using SA.iOS.Utilities;
#if API_ENABLED
using System.Runtime.InteropServices;

#endif

// ReSharper disable InconsistentNaming
namespace SA.iOS.AuthenticationServices
{
    static class ISN_AuthenticationServicesLib
    {
        // ASAuthorizationAppleIDProvider

#if API_ENABLED
        [DllImport("__Internal")]
        public static extern ulong _ISN_ASAuthorizationAppleIDProvider_init();

        [DllImport("__Internal")]
        public static extern ulong _ISN_ASAuthorizationAppleIDProvider_createRequest(ulong hash);

        [DllImport("__Internal")]
        public static extern void _ISN_ASAuthorizationAppleIDProvider_getCredentialStateForUserID(ulong hash,
                string userID, IntPtr callback);
#else
        public static ulong _ISN_ASAuthorizationAppleIDProvider_init() => ISN_NativeObject.NullObjectHash;
        public static ulong _ISN_ASAuthorizationAppleIDProvider_createRequest(ulong hash) => ISN_NativeObject.NullObjectHash;
        public static void _ISN_ASAuthorizationAppleIDProvider_getCredentialStateForUserID(ulong hash,
                string userID, IntPtr callback) { }
#endif

        // ASAuthorizationAppleIDProvider

#if API_ENABLED
        [DllImport("__Internal")]
        public static extern ulong ISN_ASAuthorizationPasswordProvider_init();

        [DllImport("__Internal")]
        public static extern ulong ISN_ASAuthorizationPasswordProvider_createRequest(ulong hash);
#else
        public static ulong ISN_ASAuthorizationPasswordProvider_init() => ISN_NativeObject.NullObjectHash;
        public static ulong ISN_ASAuthorizationPasswordProvider_createRequest(ulong hash) => ISN_NativeObject.NullObjectHash;

#endif

        // ASAuthorizationOpenIDRequest

#if API_ENABLED
        [DllImport("__Internal")]
        public static extern void _ISN_ASAuthorizationOpenIDRequest_setRequestedScopes(ulong hash, string scopes);
#else
        public static void _ISN_ASAuthorizationOpenIDRequest_setRequestedScopes(ulong hash, string scopes) { }
#endif

        // ASAuthorizationController

#if API_ENABLED
        [DllImport("__Internal")]
        public static extern ulong _ISN_ASAuthorizationController_initWithAuthorizationRequests(
            string authorizationRequests);

        [DllImport("__Internal")]
        public static extern void _ISN_ASAuthorizationController_performRequests(ulong hash);

        [DllImport("__Internal")]
        public static extern void _ISN_ASAuthorizationController_setDelegate(ulong hash, IntPtr didCompleteWithError,
            IntPtr didCompleteWithAuthorization);
#else
        public static ulong _ISN_ASAuthorizationController_initWithAuthorizationRequests(string authorizationRequests)
        {
            return ISN_NativeObject.NullObjectHash;
        }

        public static void _ISN_ASAuthorizationController_performRequests(ulong hash) { }
        public static void _ISN_ASAuthorizationController_setDelegate(ulong hash, IntPtr didCompleteWithError, IntPtr didCompleteWithAuthorization) { }
#endif
    }
}
