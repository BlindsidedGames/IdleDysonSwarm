////////////////////////////////////////////////////////////////////////////////
//
// @module IOS Native Plugin
// @author Osipov Stanislav (Stan's Assets)
// @support support@stansassets.com
// @website https://stansassets.com
//
////////////////////////////////////////////////////////////////////////////////

using SA.iOS.Utilities;

namespace SA.iOS.StoreKit
{
    /// <summary>
    /// App Store receipt.
    /// </summary>
    public class ISN_SKAppStoreReceipt
    {
        internal ISN_SKAppStoreReceipt(string data)
        {
            if (data.Length > 0)
                try
                {
                    Data = System.Convert.FromBase64String(data);
                    AsBase64String = data;
                }
                catch (System.Exception ex)
                {
                    ISN_Logger.LogError("Can't parse the receipt: " + ex.Message);
                }
        }

        /// <summary>
        /// The receipt data
        /// </summary>
        public byte[] Data { get; } = { };

        /// <summary>
        /// The receipt data represented as Base64String
        /// </summary>
        public string AsBase64String { get; } = string.Empty;
    }
}
