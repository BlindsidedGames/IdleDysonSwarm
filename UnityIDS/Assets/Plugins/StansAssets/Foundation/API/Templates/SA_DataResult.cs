using System;
using UnityEngine;

namespace SA.Foundation.Templates
{
    [Serializable]
    public class SA_DataResult : SA_Result
    {
        [SerializeField]
        protected string m_Data = string.Empty;

        public SA_DataResult(SA_iResult result)
            : base(result) { }

        internal string Data => m_Data;
    }
}
