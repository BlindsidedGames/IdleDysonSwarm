using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace SA.iOS.StoreKit
{
    /// <summary>
    /// An object containing the subscription period duration information.
    /// </summary>
    [Serializable]
    public class ISN_SKProductSubscriptionPeriod
    {
        //Getting Subscription Period Details
        [SerializeField]
        int m_NumberOfUnits;

        [SerializeField]
        ISN_SKProductPeriodUnit m_Unit;

        /// <summary>
        /// The number of units per subscription period.
        /// </summary>
        public int NumberOfUnits
        {
            get => m_NumberOfUnits;
            set => m_NumberOfUnits = value;
        }

        /// <summary>
        /// The increment of time that a subscription period is specified in.
        /// </summary>
        public ISN_SKProductPeriodUnit Unit
        {
            get => m_Unit;
            set => m_Unit = value;
        }
    }
}
