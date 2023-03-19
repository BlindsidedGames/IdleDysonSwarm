using System;
using UnityEngine;
using SA.Foundation.Templates;

namespace SA.iOS.GameKit
{
    /// <summary>
    /// Game Kit signature generation result
    /// </summary>
    [Serializable]
    public class ISN_GKIdentityVerificationSignatureResult : SA_Result
    {
#pragma warning disable 649
        [SerializeField]
        string m_PublicKeyUrl;
        [SerializeField]
        string m_Signature;
        [SerializeField]
        string m_Salt;
        [SerializeField]
        long m_Timestamp;
#pragma warning restore 649

        internal ISN_GKIdentityVerificationSignatureResult(SA_Error error)
            : base(error) { }

        /// <summary>
        /// The URL for the public encryption key.
        /// </summary>
        public string PublicKeyUrl => m_PublicKeyUrl;

        /// <summary>
        /// The date and time that the signature was created.
        /// </summary>
        public long Timestamp => m_Timestamp;

        /// <summary>
        /// The verification signature data generated.
        /// </summary>
        public byte[] Signature => Convert.FromBase64String(m_Signature);

        /// <summary>
        /// The verification signature data generated.
        /// </summary>
        public string SignatureAsBse64String => m_Signature;

        /// <summary>
        /// A random NSString used to compute the hash and keep it randomized.
        /// </summary>
        public byte[] Salt =>  Convert.FromBase64String(m_Salt);

        /// <summary>
        /// A random NSString used to compute the hash and keep it randomized.
        /// </summary>
        public string SaltAsBse64String => m_Salt;
    }
}
