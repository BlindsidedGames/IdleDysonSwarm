using SA.iOS.Foundation;
using SA.iOS.Utilities;

namespace SA.iOS.Photos
{
    /// <summary>
    /// A set of options that affect the filtering, sorting, and management of results that Photos returns when you fetch asset or collection objects.
    /// </summary>
    public class ISN_PHFetchOptions : ISN_NativeObject
    {
        int m_FetchLimit;
        ISN_NSSortDescriptor m_SortDescriptor;

        public ISN_PHFetchOptions()
        {
            NativeHashCode = ISN_PHNativeAPI.PHFetchOption_Init();
        }

        /// <summary>
        /// The maximum number of objects to include in the fetch result.
        ///
        /// With the default fetch limit of zero, Photos returns all requested assets or collections in a fetch result.
        /// Change this value to fetch more efficiently in situations where a potentially very large result is not needed.
        /// </summary>
        public int FetchLimit
        {
            get => m_FetchLimit;
            set
            {
                m_FetchLimit = value;
                ISN_PHNativeAPI.PHFetchOption_setFetchLimit(NativeHashCode, m_FetchLimit);
            }
        }

        /// <summary>
        /// Sort descriptor specifying an order for the fetched objects.
        /// </summary>
        public ISN_NSSortDescriptor SortDescriptor
        {
            get => m_SortDescriptor;
            set
            {
                m_SortDescriptor = value;
                ISN_PHNativeAPI.PHFetchOption_setSortDescriptor(NativeHashCode, m_SortDescriptor.NativeHashCode);
            }
        }
    }
}
