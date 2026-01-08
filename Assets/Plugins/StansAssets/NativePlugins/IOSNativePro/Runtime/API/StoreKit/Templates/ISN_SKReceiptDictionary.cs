using System;
using System.Collections.Generic;
using UnityEngine;

namespace SA.iOS.StoreKit
{
    /// <summary>
    /// <see cref="ISN_SKReceiptRefreshRequest"/> properties dictionary
    /// </summary>
    [Serializable]
    public class ISN_SKReceiptDictionary
    {
        [SerializeField]
        List<ISN_SKReceiptProperty> m_Keys = new List<ISN_SKReceiptProperty>();
        [SerializeField]
        List<int> m_Values = new List<int>();

        /// <summary>
        /// Add the specified key and value.
        /// </summary>
        /// <returns>The add.</returns>
        /// <param name="key">Property Key.</param>
        /// <param name="value">Property Value.</param>
        public void Add(ISN_SKReceiptProperty key, int value)
        {
            m_Keys.Add(key);
            m_Values.Add(value);
        }
    }
}
