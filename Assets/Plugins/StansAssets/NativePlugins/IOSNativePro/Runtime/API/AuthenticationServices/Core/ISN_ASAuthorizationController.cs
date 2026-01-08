using System.Collections.Generic;
using System.Linq;
using SA.Foundation.Templates;
using SA.iOS.Utilities;

namespace SA.iOS.AuthenticationServices
{
    /// <summary>
    /// A controller that manages authorization requests created by a provider.
    /// </summary>
    public class ISN_ASAuthorizationController : ISN_NativeObject
    {
        /// <summary>
        /// Creates a controller from a collection of authorization requests.
        /// </summary>
        /// <param name="authorizationRequests">One or more authorization requests that this controller can perform.</param>
        public ISN_ASAuthorizationController(IEnumerable<ISN_ASAuthorizationRequest> authorizationRequests)
        {
            var requestsString = string.Join(",", authorizationRequests
                .Select(request => request.NativeHashCode.ToString()).ToArray());

            NativeHashCode = ISN_AuthenticationServicesLib._ISN_ASAuthorizationController_initWithAuthorizationRequests(requestsString);
        }

        /// <summary>
        /// Starts the authorization flows named during controller initialization.
        ///
        /// When authorization succeeds, the system tells the controller’s delegate
        /// by calling the <see cref="ISN_IASAuthorizationControllerDelegate.DidCompleteWithAuthorization"/> method with an authorization instance.
        /// If authorization fails, the system calls the <see cref="ISN_IASAuthorizationControllerDelegate.DidCompleteWithError"/> method instead.
        ///
        /// Some authorization flows require a presentation context to ask the user for information or consent.
        /// </summary>
        public void PerformRequests()
        {
            ISN_AuthenticationServicesLib._ISN_ASAuthorizationController_performRequests(NativeHashCode);
        }

        /// <summary>
        /// Set's a delegate that the authorization controller informs about the success or failure of an authorization attempt.
        /// </summary>
        /// <param name="delegate">A delegate that the authorization controller informs about the success or failure of an authorization attempt.</param>
        public void SetDelegate(ISN_IASAuthorizationControllerDelegate @delegate)
        {
            ISN_AuthenticationServicesLib._ISN_ASAuthorizationController_setDelegate(
                NativeHashCode,
                ISN_MonoPCallback.ActionToIntPtr<SA_Error>(@delegate.DidCompleteWithError),
                ISN_MonoPCallback.ActionToIntPtr<ISN_ASAuthorizationAppleIDCredential>(@delegate.DidCompleteWithAuthorization));
        }
    }
}
