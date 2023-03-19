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

namespace SA.iOS.Foundation
{
    [Serializable]
    class ISN_NSKeyValueResult : SA_Result
    {
        [SerializeField]
        ISN_NSKeyValueObject m_KeyValueObject;

        public ISN_NSKeyValueResult(ISN_NSKeyValueObject keyValueObject)
            : base()
        {
            m_KeyValueObject = keyValueObject;
        }

        public ISN_NSKeyValueResult(SA_Error error)
            : base(error) { }

        /// <summary>
        /// Returns the object associated with the specified key.
        /// </summary>
        public ISN_NSKeyValueObject KeyValueObject => m_KeyValueObject;
    }
}
