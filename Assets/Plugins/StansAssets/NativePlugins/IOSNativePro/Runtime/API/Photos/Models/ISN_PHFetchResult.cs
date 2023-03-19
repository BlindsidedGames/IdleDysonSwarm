using SA.iOS.Utilities;

namespace SA.iOS.Photos
{
    /// <summary>
    /// An ordered list of assets or collections returned from a Photos fetch method.
    /// </summary>
    /// <typeparam name="TAssetType">Result objects type</typeparam>
    public class ISN_PHFetchResult<TAssetType> : ISN_NativeObject where TAssetType : ISN_NativeObject, new()
    {
        /// <summary>
        /// The first object in the fetch result.
        /// You specify the ordering of a fetch result in the PHFetchOptions object you pass to a fetch method.
        ///
        /// Returns <c>null</c> if the fetch result is empty.
        /// </summary>
        public TAssetType FirstObject
        {
            get
            {
                var objectHashCode = ISN_PHNativeAPI.PHFetchResult_firstObject(NativeHashCode);
                var asset = new TAssetType();
                asset.SetNativeHashCode(objectHashCode);
                return asset;
            }
        }
    }
}
