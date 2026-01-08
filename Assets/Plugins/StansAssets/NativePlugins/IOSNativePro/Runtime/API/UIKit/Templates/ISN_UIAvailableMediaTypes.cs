using System;
using System.Collections.Generic;
using UnityEngine;

namespace SA.iOS.UIKit
{
    [Serializable]
    public class ISN_UIAvailableMediaTypes
    {
#pragma warning disable 649
        [SerializeField]
        List<string> m_Types;
#pragma warning restore 649

        /// <summary>
        /// Gets the types.
        /// </summary>
        /// <value>The types.</value>
        public List<string> Types => m_Types;
    }
}
