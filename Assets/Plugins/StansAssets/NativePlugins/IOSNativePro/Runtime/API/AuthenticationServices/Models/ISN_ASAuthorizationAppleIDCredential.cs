using System;
using UnityEngine;
using SA.iOS.Foundation;

namespace SA.iOS.AuthenticationServices
{
    /// <summary>
    /// A credential that results from a successful Apple ID authentication.
    /// </summary>
    [Serializable]
    public class ISN_ASAuthorizationAppleIDCredential
    {
        [SerializeField]
        string m_User = string.Empty;
        [SerializeField]
        string m_State = string.Empty;
        [SerializeField]
        string m_AuthorizationCode = string.Empty;
        [SerializeField]
        string m_IdentityToken = string.Empty;
        [SerializeField]
        string m_Email = string.Empty;
        [SerializeField]
        ISN_NSPersonNameComponents m_FullName = null;

        byte[] m_IdentityTokenData;
        byte[] m_AuthorizationData;

        /// <summary>
        /// An identifier associated with the authenticated user.
        /// </summary>
        public string User => m_User;

        /// <summary>
        /// An arbitrary string that your app provided to the request that generated the credential.
        /// </summary>
        public string State => m_State;

        /// <summary>
        /// A short-lived token used by your app for proof of authorization when interacting with the app’s server counterpart.
        /// </summary>
        public byte[] AuthorizationCode
        {
            get
            {
                if (string.IsNullOrEmpty(m_AuthorizationCode))
                    return null;

                if (m_AuthorizationData == null)
                    m_AuthorizationData = Convert.FromBase64String(m_AuthorizationCode);

                return m_AuthorizationData;
            }
        }

        /// <summary>
        /// A JSON Web Token (JWT) that securely communicates information about the user to your app.
        /// </summary>
        public byte[] IdentityToken
        {
            get
            {
                if (string.IsNullOrEmpty(m_IdentityToken))
                    return null;

                if (m_IdentityTokenData == null)
                    m_IdentityTokenData = Convert.FromBase64String(m_IdentityToken);

                return m_IdentityTokenData;
            }
        }

        /// <summary>
        /// The user’s email address.
        /// </summary>
        public string Email => m_Email;

        /// <summary>
        /// The user’s name.
        /// </summary>
        public ISN_NSPersonNameComponents FullName => m_FullName;
    }
}
