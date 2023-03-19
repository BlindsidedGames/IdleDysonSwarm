using System;
using SA.iOS.Utilities;
#if UNITY_IPHONE
using System.Runtime.InteropServices;

#endif

namespace SA.iOS.UIKit
{
    /// <summary>
    /// Utility methods to work with iOS calendar.
    /// </summary>
    public static class ISN_UICalendar
    {
#if UNITY_IPHONE
        [DllImport("__Internal")]
        static extern void _ISN_PickDate(int startYear, IntPtr callback);
#else
        static void _ISN_PickDate(int startYear, IntPtr callback) { }
#endif

        /// <summary>
        /// Allows user to pick a date using the native iOS calendar view.
        /// </summary>
        /// <param name="callback">Callback with picked date once user is finished.</param>
        /// <param name="startFromYear">Optional. Year the calendar will start from.</param>
        public static void PickDate(Action<DateTime> callback, int startFromYear = 0)
        {
            _ISN_PickDate(startFromYear, ISN_MonoPCallback.ActionToIntPtr<string>((time) =>
            {
                UnityEngine.Debug.Log("here date pick: " + time);
                var dt = DateTime.Parse(time);
                callback.Invoke(dt);
            }));
        }
    }
}
