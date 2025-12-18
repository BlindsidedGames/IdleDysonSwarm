////////////////////////////////////////////////////////////////////////////////
//
// @module Assets Common Lib
// @author Osipov Stanislav (Stan's Assets)
// @support support@stansassets.com
// @website https://stansassets.com
//
////////////////////////////////////////////////////////////////////////////////

using System;
using UnityEngine;

namespace SA.Foundation.Templates
{
    /// <inheritdoc />
    [Serializable]
    public class SA_Result : SA_iResult
    {
        [SerializeField]
        protected SA_Error m_error = null;
        [SerializeField]
        protected string m_requestId = string.Empty;

        [SerializeField]
        protected string m_stringData = string.Empty;

        //--------------------------------------
        // Initialization
        //--------------------------------------

        /// <summary>
        /// Initializes a new instance of the <see cref="SA_Result"/> class.
        /// </summary>
        public SA_Result() { }

        public SA_Result(SA_iResult result)
        {
            m_error = result.Error;
        }

        /// <summary>
        /// Initializes a new instance of the <see cref="SA_Result"/> class with predefined error
        /// </summary>
        /// <param name="error">A predefined result error object.</param>
        public SA_Result(SA_Error error)
        {
            SetError(error);
        }

        //--------------------------------------
        // Public Methods
        //--------------------------------------

        public void SetError(SA_Error error)
        {
            m_error = error;
        }

        //--------------------------------------
        // Get / Set
        //--------------------------------------

        public SA_Error Error => m_error;
        internal string StringData => m_stringData;

        public bool HasError
        {
            get
            {
                if (m_error == null || string.IsNullOrEmpty(m_error.Message) && Error.Code == default(int)) return false;

                return true;
            }
        }

        public bool IsSucceeded => !HasError;

        public bool IsFailed => HasError;

        public string RequestId
        {
            get => m_requestId;
            set => m_requestId = value;
        }

        public string ToJson()
        {
            return JsonUtility.ToJson(this);
        }
    }
}
