using SA.iOS.Utilities;

namespace SA.iOS.AuthenticationServices
{
    /// <summary>
    /// A mechanism for generating requests to perform keychain credential sharing.
    /// </summary>
    public class ISN_ASAuthorizationPasswordProvider  : ISN_NativeObject
    {
        /// <summary>
        /// Create Password instance.
        /// </summary>
        public ISN_ASAuthorizationPasswordProvider()
            : base(ISN_AuthenticationServicesLib.ISN_ASAuthorizationPasswordProvider_init()) { }

        /// <summary>
        /// Creates a new password authorization request.
        /// </summary>
        /// <returns>A password authorization request that you can execute with an instance of <see cref="ISN_ASAuthorizationController"/>.</returns>
        public ISN_IASAuthorizationAppleIDRequest CreateRequest()
        {
            var requestHash = ISN_AuthenticationServicesLib.ISN_ASAuthorizationPasswordProvider_createRequest(NativeHashCode);
            return new ISN_ASAuthorizationSingleSignOnRequest(requestHash);
        }
    }
}
