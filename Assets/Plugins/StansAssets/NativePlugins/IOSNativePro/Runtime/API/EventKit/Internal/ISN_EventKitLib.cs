namespace SA.iOS.EventKit
{
    static class ISN_EventKitLib
    {
        static ISN_EventKitAPI s_Api;
        public static ISN_EventKitAPI Api => s_Api ?? (s_Api = ISN_EventKitNativeAPI.Instance);
    }
}
