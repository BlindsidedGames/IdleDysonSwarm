using UnityEngine;
using SA.Foundation.Utility;

namespace SA.iOS.CloudKit.Internal
{
    /// <summary>
    /// This class is for plugin internal use only
    /// </summary>
    static class ISN_CloudKitLib
    {
        public static ISN_CloudKitAPI Api => ISN_CloudKitNativeAPI.Instance;
    }
}
