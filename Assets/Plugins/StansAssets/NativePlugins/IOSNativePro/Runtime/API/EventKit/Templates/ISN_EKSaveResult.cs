using System;
using UnityEngine;
using SA.Foundation.Templates;

namespace SA.iOS.EventKit
{
    /// <summary>
    /// EventKit saving result that contains result of saving
    /// events or reminders and their identifier.
    /// </summary>
    [Serializable]
    public class ISN_EKSaveResult
    {
        [SerializeField]
        string m_Identifier = string.Empty;
        [SerializeField]
        SA_Result m_Result = new SA_Result();

        /// <summary>
        /// Events or reminder identifier in EventKit.
        /// Need for removing or updating them.
        /// </summary>
        public string Identifier => m_Identifier;

        /// <summary>
        /// Result of saving events and reminders by using EventKit.
        /// </summary>
        public SA_Result Result => m_Result;
    }
}
