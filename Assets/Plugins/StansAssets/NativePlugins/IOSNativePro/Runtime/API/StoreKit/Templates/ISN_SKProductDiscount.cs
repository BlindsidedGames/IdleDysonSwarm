using UnityEngine;
using System;
using SA.iOS.Foundation;

namespace SA.iOS.StoreKit
{
    /// <summary>
    /// The details of a discount offer for a subscription product.
    /// </summary>
    [Serializable]
    public class ISN_SKProductDiscount
    {
        [SerializeField] string m_Identifier;
        [SerializeField] int m_NumberOfPeriods;
        [SerializeField] ISN_SKProductDiscountType m_Type;


        [SerializeField] float m_Price = 0.99f;
        [SerializeField] ISN_NSLocale m_PriceLocale = null;
        [SerializeField] ISN_SKPaymentMode m_PaymentMode = ISN_SKPaymentMode.SKProductDiscountPaymentModeFreeTrial;

        //Getting the Discount Duration
        [SerializeField] int m_NumberOfUnits = 0;
        [SerializeField] ISN_SKProductSubscriptionPeriod m_SubscriptionPeriod = null;

        [SerializeField] string m_LocalizedPrice = string.Empty;

        /// <summary>
        /// The discount price of the product in the local currency.
        /// </summary>
        public float Price
        {
            get => m_Price;
            set => m_Price = value;
        }

        /// <summary>
        /// A string used to uniquely identify a discount offer for a product.
        /// </summary>
        public string Identifier => m_Identifier;

        /// <summary>
        /// An integer that indicates the number of periods the product discount is available.
        ///
        /// A product discount may be available for one or more periods.
        /// The period, defined in <see cref="SubscriptionPeriod"/>, is a set number of days,
        /// weeks, months, or years.
        ///
        /// The total length of time that a product discount is available is calculated
        /// by multiplying the numberOfPeriods by the period.
        ///
        /// Note that the discount period is independent of the product subscription period.
        /// </summary>
        public int NumberOfPeriods => m_NumberOfPeriods;

        /// <summary>
        /// The type of discount offer.
        /// </summary>
        public ISN_SKProductDiscountType Type => m_Type;


        /// <summary>
        /// The locale used to format the discount price of the product.
        /// </summary>
        public ISN_NSLocale PriceLocale => m_PriceLocale;

        /// <summary>
        /// The payment mode for this product discount.
        /// </summary>
        public ISN_SKPaymentMode PaymentMode
        {
            get => m_PaymentMode;
            set => m_PaymentMode = value;
        }

        /// <summary>
        /// An integer that indicates the number of periods the product discount is available.
        /// </summary>
        public int NumberOfUnits
        {
            get => m_NumberOfUnits;
            set => m_NumberOfUnits = value;
        }

        /// <summary>
        /// An object that defines the period for the product discount.
        /// </summary>
        public ISN_SKProductSubscriptionPeriod SubscriptionPeriod
        {
            get => m_SubscriptionPeriod;
            set => m_SubscriptionPeriod = value;
        }

        /// <summary>
        /// The locale used to format the price of the product.
        /// </summary>
        public string LocalizedPrice
        {
            get => m_LocalizedPrice;
            set => m_LocalizedPrice = value;
        }
    }
}
