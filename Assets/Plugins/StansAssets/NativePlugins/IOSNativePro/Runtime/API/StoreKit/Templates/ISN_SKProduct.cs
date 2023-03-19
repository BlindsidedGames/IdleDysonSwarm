////////////////////////////////////////////////////////////////////////////////
//
// @module IOS Native Plugin
// @author Osipov Stanislav (Stan's Assets)
// @support support@stansassets.com
// @website https://stansassets.com
//
////////////////////////////////////////////////////////////////////////////////

using System;
using System.Collections.Generic;
using System.Globalization;
using UnityEngine;
using SA.iOS.Foundation;
using SA.iOS.Utilities;

namespace SA.iOS.StoreKit
{
    /// <summary>
    /// Information about a product previously registered in App Store Connect.
    /// </summary>
    [Serializable]
    public class ISN_SKProduct : ISN_NativeObject
    {
        //Getting the Product Identifier

        [SerializeField]
        string m_ProductIdentifier = string.Empty;

        //Getting Product Attributes
        [SerializeField]
        string m_LocalizedDescription = string.Empty;
        [SerializeField]
        string m_LocalizedTitle = "New Product";

        //Getting Pricing Information
        [SerializeField]
        float m_Price = 0.99f;
        [SerializeField]
        ISN_NSLocale m_PriceLocale = null;
        [SerializeField]
        ISN_SKProductDiscount m_IntroductoryPrice = null;

        [SerializeField]
        List<ISN_SKProductDiscount> m_Discounts = new List<ISN_SKProductDiscount>();

        //Getting the Subscription Period and Duration
        [SerializeField]
        ISN_SKProductSubscriptionPeriod m_SubscriptionPeriod = null;

        //Additional data
        [SerializeField]
        string m_LocalizedPrice = string.Empty;
        [SerializeField]
        ISN_SKProductEditorData m_EditorData = new ISN_SKProductEditorData();

        /// <summary>
        /// The string that identifies the product to the Apple App Store.
        /// </summary>
        public string ProductIdentifier
        {
            get => m_ProductIdentifier;
            set => m_ProductIdentifier = value;
        }

        /// <summary>
        /// A description of the product.
        /// </summary>
        public string LocalizedDescription
        {
            get => m_LocalizedDescription;
            set => m_LocalizedDescription = value;
        }

        /// <summary>
        /// The name of the product.
        /// </summary>
        public string LocalizedTitle
        {
            get => m_LocalizedTitle;
            set => m_LocalizedTitle = value;
        }

        /// <summary>
        /// The cost of the product in the local currency.
        /// </summary>
        public float Price
        {
            get => m_Price;
            set => m_Price = value;
        }

        /// <summary>
        /// The locale used to format the price of the product.
        /// </summary>
        public ISN_NSLocale PriceLocale => m_PriceLocale;

        /// <summary>
        /// An array of subscription offers available for the product.
        /// The discounts array contains all of the subscription offers
        /// that you set up in App Store Connect for this product `productIdentifier`.
        /// It's up to the logic in your app to decide which offer to present to the user.
        /// </summary>
        public List<ISN_SKProductDiscount> Discounts => m_Discounts;

        /// <summary>
        /// The object containing introductory price information for the product.
        /// </summary>
        public ISN_SKProductDiscount IntroductoryPrice => m_IntroductoryPrice;

        /// <summary>
        /// The period details for products that are subscriptions.
        /// </summary>
        public ISN_SKProductSubscriptionPeriod SubscriptionPeriod => m_SubscriptionPeriod;

        /// <summary>
        /// Gets the price in micros.
        /// </summary>
        public long PriceInMicros => Convert.ToInt64(m_Price * 1000000f);

        /// <summary>
        /// The locale used to format the price of the product.
        /// </summary>
        public string LocalizedPrice
        {
            get
            {
                if (string.IsNullOrEmpty(m_LocalizedPrice))
                    return Price.ToString(CultureInfo.InvariantCulture) + " " + "$";
                else
                    return m_LocalizedPrice;
            }
        }

        //--------------------------------------
        // ISN_SKProductEditorData
        //--------------------------------------

        /// <summary>
        /// Type of the product
        /// </summary>
        public ISN_SKProductType Type
        {
            get => m_EditorData.ProductType;
            set => m_EditorData.ProductType = value;
        }

        /// <summary>
        /// Gets icon of the product
        /// </summary>
        public Texture2D Icon
        {
            get => m_EditorData.Texture;
            set => m_EditorData.Texture = value;
        }

        /// <summary>
        /// Gets and updates Price Tier
        /// </summary>
        internal ISN_SKPriceTier PriceTier
        {
            get => m_EditorData.PriceTier;
            set
            {
                if (m_EditorData.PriceTier != value)
                {
                    m_EditorData.PriceTier = value;
                    m_Price = ISN_SKUtil.GetPriceByTier(m_EditorData.PriceTier);
                }
            }
        }

        /// <summary>
        /// Contains data that is only can be set using the Editor Plugin Settings
        /// </summary>
        internal ISN_SKProductEditorData EditorData
        {
            get => m_EditorData;
            set => m_EditorData = value;
        }
    }
}
