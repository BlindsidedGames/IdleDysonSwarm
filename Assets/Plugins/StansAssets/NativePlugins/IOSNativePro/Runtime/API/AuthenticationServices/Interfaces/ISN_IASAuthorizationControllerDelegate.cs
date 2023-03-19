using SA.Foundation.Templates;

namespace SA.iOS.AuthenticationServices
{
    /// <summary>
    /// An interface for providing information about the outcome of an authorization request.
    /// </summary>
    public interface ISN_IASAuthorizationControllerDelegate
    {
        /// <summary>
        /// Tells the delegate that authorization completed successfully.
        /// </summary>
        /// <param name="credential">Information provided about a user after successful authentication.</param>
        void DidCompleteWithAuthorization(ISN_ASAuthorizationAppleIDCredential credential);

        /// <summary>
        /// Tells the delegate that authorization failed, and provides an error to explain why.
        /// </summary>
        /// <param name="error">An error that explains why authorization failed using one of the codes in <see cref="ISN_ASAuthorizationError"/>.</param>
        void DidCompleteWithError(SA_Error error);
    }
}
