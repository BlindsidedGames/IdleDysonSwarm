using System;
using SA.Foundation.Templates;
using SA.iOS.Utilities;

namespace SA.iOS.AuthenticationServices
{
    /// <summary>
    /// A mechanism for generating requests to authenticate users based on their Apple ID.
    /// </summary>
    public class ISN_ASAuthorizationAppleIDProvider : ISN_NativeObject
    {
        /// <summary>
        /// Create Apple ID Provider instance.
        /// </summary>
        public ISN_ASAuthorizationAppleIDProvider()
            : base(ISN_AuthenticationServicesLib._ISN_ASAuthorizationAppleIDProvider_init())
        {
        }

        /// <summary>
        /// Creates a new Apple ID auth request.
        /// </summary>
        /// <returns>An Apple ID authorization request that you can configure and execute.</returns>
        public ISN_IASAuthorizationAppleIDRequest CreateRequest()
        {
            var requestHash =
                ISN_AuthenticationServicesLib._ISN_ASAuthorizationAppleIDProvider_createRequest(NativeHashCode);
            return new ISN_ASAuthorizationSingleSignOnRequest(requestHash);
        }

        /// <summary>
        /// Returns the credential state for the given user in a completion handler.
        /// </summary>
        /// <param name="userID">
        /// An opaque string associated with the Apple ID that your app receives in the credential’s
        /// <see cref="ISN_ASAuthorizationAppleIDCredential.User"/> property
        /// after performing a successful authentication request.
        /// </param>
        /// <param name="callback">A block the method calls to report the state and an optional error condition.</param>
        public void GetCredentialStateForUserID(string userID,
            Action<ISN_ASAuthorizationAppleIDProviderCredentialState, SA_iError> callback)
        {
            ISN_AuthenticationServicesLib
                ._ISN_ASAuthorizationAppleIDProvider_getCredentialStateForUserID(
                    NativeHashCode,
                    userID,
                    ISN_MonoPCallback.ActionToIntPtr<SA_Result>(result =>
                    {
                        if (result.IsSucceeded)
                        {
                            var intVal = Convert.ToInt32(result.StringData);
                            callback.Invoke((ISN_ASAuthorizationAppleIDProviderCredentialState) intVal, null);
                        }
                        else
                        {
                            callback.Invoke(ISN_ASAuthorizationAppleIDProviderCredentialState.Transferred,
                                result.Error);
                        }
                    }));
        }
    }
}
