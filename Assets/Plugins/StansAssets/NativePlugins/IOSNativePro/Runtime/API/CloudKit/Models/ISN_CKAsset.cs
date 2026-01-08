using System;

namespace SA.iOS.CloudKit
{
    /// <summary>
    /// An object representing a large file associated with a record.
    /// Use asset objects to incorporate external files—such as image, sound, video, text, and binary data files—into your app’s records.
    /// You can also use assets in places where the data you want to assign to a field is more than a few kilobytes in size.
    /// To associate an asset with a record, assign it as the value of one of the record’s fields.
    /// </summary>
    public class ISN_CKAsset
    {
        string m_assetUrl;

        public ISN_CKAsset(string URL) {
            m_assetUrl = URL;
        }

        /// <sumamry>
        /// Get or set url for this CKAsset.
        /// </summary>
        public string AssetURL {
            get => m_assetUrl;
            set => m_assetUrl = value;
        }
    }
}
