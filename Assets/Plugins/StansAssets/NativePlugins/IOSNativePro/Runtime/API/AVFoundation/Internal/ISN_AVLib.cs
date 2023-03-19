namespace SA.iOS.AVFoundation.Internal
{
    /// <summary>
    /// This class is for plugin internal use only
    /// </summary>
    static class ISN_AVLib
    {
        public static ISN_iAVAPI Api =>ISN_AVNativeAPI.Instance;
    }
}
