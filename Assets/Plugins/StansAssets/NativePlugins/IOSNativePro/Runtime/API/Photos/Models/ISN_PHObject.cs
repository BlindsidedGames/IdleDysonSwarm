using SA.iOS.Utilities;

namespace SA.iOS.Photos
{
    /// <summary>
    /// The abstract superclass for Photos model objects (assets and collections).
    /// </summary>
    public abstract class ISN_PHObject : ISN_NativeObject
    {
        /// <summary>
        /// A unique string that persistently identifies the object.
        /// </summary>
        public string LocalIdentifier => ISN_PHNativeAPI.PHAsset_localIdentifier(NativeHashCode);
    }
}
