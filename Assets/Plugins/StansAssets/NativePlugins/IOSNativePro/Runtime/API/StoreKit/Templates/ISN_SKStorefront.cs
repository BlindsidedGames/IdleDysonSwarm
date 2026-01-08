using System;
using UnityEngine;

namespace SA.iOS.StoreKit
{
    /// <summary>
    /// An object containing the location and unique identifier of an Apple App Store storefront.
    /// SKStorefront exposes storefront information as a read-only property in <see cref="ISN_SKPaymentQueue"/>.
    ///
    /// In-app products you create through App Store Connect are available for sale in every region with an App Store. You can use the storefront information to determine the customer's region, and offer in-app products suitable for that region.
    /// You must maintain your own list of product identifiers and the storefronts in which you want to make them available.
    ///
    /// Note
    /// Do not save the storefront information with your user information; it can change at any time.
    /// Always get the storefront identifier immediately prior to displaying product information
    /// or availability to the user in your app.
    /// Storefront information may not be used to develop or enhance a user profile,
    /// or track customers for advertising or marketing purposes.
    /// </summary>
    [Serializable]
    public class ISN_SKStorefront
    {
        [SerializeField]
        string m_CountryCode = string.Empty;
        [SerializeField]
        string m_Identifier = string.Empty;

        /// <summary>
        /// The three-letter code representing the country associated with the App Store storefront.
        /// This property uses the ISO 3166-1 Alpha-3 country code representation.
        /// </summary>
        public string CountryCode => m_CountryCode;

        /// <summary>
        /// A value defined by Apple that uniquely identifies an App Store storefront.
        /// </summary>
        public string Identifier => m_Identifier;
    }
}
