using System;
using System.Collections.Generic;
using UnityEngine;

namespace SA.iOS.Foundation
{
    /// <summary>
    /// Array representation model.
    /// Use to send data to the native part using JSONUtility.
    /// </summary>
    [Serializable]
    public class ISN_NSArrayModel
    {
        [SerializeField]
        List<string> m_Value = new List<string>();

        /// <summary>
        /// Adds list item to the model.
        /// </summary>
        /// <param name="item"></param>
        public void Add(string item)
        {
            m_Value.Add(item);
        }

        /// <summary>
        /// List values
        /// </summary>
        public List<string> Value => m_Value;
    }
}
