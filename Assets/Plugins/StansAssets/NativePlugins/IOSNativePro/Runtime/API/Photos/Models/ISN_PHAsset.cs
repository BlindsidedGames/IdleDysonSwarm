namespace SA.iOS.Photos
{
    /// <summary>
    /// A representation of an image, video, or Live Photo in the Photos library.
    /// </summary>
    public class ISN_PHAsset : ISN_PHObject
    {
        /// <summary>
        /// Retrieves all assets matching the specified options.
        /// </summary>
        /// <param name="options">
        /// Options that specify a filter predicate and sort order for the fetched assets,
        /// or <c>null</c> to use default options. For details, see <see cref="ISN_PHFetchOptions"/>.
        /// </param>
        /// <returns>
        /// A fetch result that contains the requested <see cref="ISN_PHAsset"/> objects, or an empty fetch result if no objects match the request.
        /// </returns>
        public static ISN_PHFetchResult<ISN_PHAsset> FetchAssetsWithOptions(ISN_PHFetchOptions options)
        {
            var resultHash = ISN_PHNativeAPI.PHAsset_fetchAssetsWithOptions(options.NativeHashCode);
            var result = new ISN_PHFetchResult<ISN_PHAsset>();
            result.SetNativeHashCode(resultHash);
            return result;
        }
    }
}
