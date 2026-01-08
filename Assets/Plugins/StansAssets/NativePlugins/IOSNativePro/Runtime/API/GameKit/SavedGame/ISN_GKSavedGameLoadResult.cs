////////////////////////////////////////////////////////////////////////////////
//
// @module IOS Native Plugin
// @author Koretsky Konstantin (Stan's Assets)
// @support support@stansassets.com
// @website https://stansassets.com
//
////////////////////////////////////////////////////////////////////////////////

using System;
using SA.Foundation.Templates;
using UnityEngine;

namespace SA.iOS.GameKit
{
    /// <summary>
    /// Saved Game Load Result.
    /// </summary>
    [Serializable]
    public class ISN_GKSavedGameLoadResult : SA_Result
    {
        [SerializeField]
        string m_Data = string.Empty;

        ISN_GKSavedGameLoadResult(string data)
        {
            m_Data = data;
        }

        ISN_GKSavedGameLoadResult(SA_Error error)
            : base(error) { }

        /// <summary>
        /// Returns string representation of the data
        /// </summary>
        public new string StringData => m_Data;

        /// <summary>
        /// Returns bytes array representation of the data.
        /// </summary>
        public byte[] BytesArrayData => Convert.FromBase64String(m_Data);
    }
}
