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
    public class SA_Error : SA_iError
    {
        [SerializeField]
        int m_code;
        [SerializeField]
        string m_message = string.Empty;

        //--------------------------------------
        // Initialization
        //--------------------------------------

        /// <summary>
        /// Initializes a new instance of the <see cref="SA_Error"/> class,
        /// with predefined <see cref="Code"/> and <see cref="Message"/> s
        /// </summary>
        /// <param name="code">instance error <see cref="Code"/>.</param>
        /// <param name="message">instance error <see cref="Message"/>.</param>
        public SA_Error(int code, string message = "")
        {
            m_code = code;
            m_message = message;
        }

        //--------------------------------------
        // Get / Set
        //--------------------------------------

        public int Code => m_code;

        public string Message => m_message;

        public string FullMessage
        {
            get
            {
                if (Message.StartsWith(Code.ToString()))
                    return Message;
                else
                    return Code + "::" + Message;
            }
        }
    }
}
