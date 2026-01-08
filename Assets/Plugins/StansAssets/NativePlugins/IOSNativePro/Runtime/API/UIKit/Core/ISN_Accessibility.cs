using System;
using SA.Foundation.Templates;
using SA.iOS.Utilities;
using UnityEngine;
#if UNITY_IPHONE
using System.Runtime.InteropServices;

#endif

namespace SA.iOS.UIKit
{
    /// <summary>
    /// Make your apps accessible to everyone, including people with disabilities.
    /// </summary>
    public static class ISN_Accessibility
    {
#if UNITY_IPHONE
        [DllImport("__Internal")]
        static extern bool _ISN_IsGuidedAccessEnabled();

        [DllImport("__Internal")]
        static extern void _ISN_RequestGuidedAccessSession(bool enable, IntPtr callback);
#endif

        /// <summary>
        /// Returns a Boolean value indicating whether the app is running in Guided Access mode.
        /// </summary>
        public static bool UIAccessibilityIsGuidedAccessEnabled
        {
            get
            {
#if UNITY_IPHONE
                return _ISN_IsGuidedAccessEnabled();
#else
                return false;
#endif
            }
        }

        /// <summary>
        /// Transitions the app to or from Single App mode asynchronously.
        ///
        /// You can use this method to lock your app into Single App mode and to release it from that mode later.
        /// For example, a test-taking app might enter this mode at the beginning of a test
        /// and exit it when the user completes the test.
        /// Entering Single App mode is supported only for devices that are supervised
        /// using Mobile Device Management (MDM), and the app itself must be enabled for this mode by MDM.
        /// You must balance each call to enter Single App mode with a call to exit that mode.
        ///
        /// Because entering or exiting Single App mode might take some time,
        /// this method executes asynchronously and notifies you of the results using the <see cref="callback"/> block.
        /// </summary>
        /// <param name="enable">Specify <c>true</c> to put the device into Single App mode for this app
        /// or <c>false</c> to exit Single App mode.</param>
        /// <param name="callback">The block that notifies your app of the success or failure of the operation.</param>
        public static void UIAccessibilityRequestGuidedAccessSession(bool enable, Action<SA_Result> callback)
        {
#if UNITY_IPHONE
            _ISN_RequestGuidedAccessSession(enable, ISN_MonoPCallback.ActionToIntPtr(callback));
#endif
        }
    }
}
