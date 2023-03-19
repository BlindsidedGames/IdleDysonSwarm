using SA.iOS.Utilities;

namespace SA.iOS.Foundation
{
    /// <summary>
    /// An immutable description of how to order a collection of objects based on a property common to all the objects.
    /// </summary>
    public class ISN_NSSortDescriptor : ISN_NativeObject
    {
        /// <summary>
        /// Initializes a sort descriptor a given key path and sort order.
        /// </summary>
        /// <param name="key">T
        /// he key path to use when performing a comparison.
        /// For information about key paths, see
        /// <see cref="https://developer.apple.com/library/archive/documentation/Cocoa/Conceptual/KeyValueCoding/index.html#//apple_ref/doc/uid/10000107i"/>
        /// </param>
        /// <param name="ascending"><c>true</c> if the receiver specifies sorting in ascending order, otherwise <c>false</c>.</param>
        public ISN_NSSortDescriptor(string key, bool ascending)
        {
            NativeHashCode = ISN_NSNativeModelsAPI.NSSortDescriptor_Init(key, ascending);
        }
    }
}
