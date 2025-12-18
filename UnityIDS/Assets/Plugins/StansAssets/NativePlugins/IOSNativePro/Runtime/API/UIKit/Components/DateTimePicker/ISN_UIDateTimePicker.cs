////////////////////////////////////////////////////////////////////////////////
//
// @module IOS Native Plugin
// @author Osipov Stanislav (Stan's Assets)
// @support support@stansassets.com
// @website https://stansassets.com
//
////////////////////////////////////////////////////////////////////////////////

using UnityEngine;
using System;
using SA.Foundation.Events;
#if UNITY_IPHONE
using System.Runtime.InteropServices;
#endif
using SA.iOS.Utilities;
using StansAssets.Foundation;

namespace SA.iOS.UIKit
{
    /// <summary>
    /// A control used for the inputting of date and time values.
    /// https://developer.apple.com/documentation/uikit/uidatepicker?language=objc
    /// </summary>
    [Serializable]
    public class ISN_UIDateTimePicker
    {
        static SA_Event<DateTime> m_onPickerDateChanged = null;

#if UNITY_IPHONE
        [DllImport("__Internal")]
        static extern void _ISN_ShowDP(string picker, IntPtr callback);

        [DllImport("__Internal")]
        static extern void _ISN_UIRegisterDPChangeCallback(IntPtr callback);
#endif

#pragma warning disable 414

        [SerializeField]
        int m_MinuteInterval = 1;
        [SerializeField]
        ISN_UIDateTimePickerMode m_DatePickerMode = ISN_UIDateTimePickerMode.DateAndTime;
        [SerializeField]
        long m_StartDate = -1;
        [SerializeField]
        long m_CountDownDuration = -1;

#pragma warning restore 414

        //--------------------------------------
        // Public Methods
        //--------------------------------------

        public void Show(Action<DateTime> callback)
        {
            if (Application.isEditor)
            {
                callback.Invoke(DateTime.Now);
                return;
            }

#if UNITY_IPHONE
            var json = JsonUtility.ToJson(this);
            _ISN_ShowDP(json, ISN_MonoPCallback.ActionToIntPtr<string>((time) =>
            {
                var dt = DateTime.Parse(time);
                callback.Invoke(dt);
            }));
#endif
        }

        /// <summary>
        /// Sets the date to display in the date picker
        /// </summary>
        public void SetDate(DateTime date)
        {
            m_StartDate = TimeUtility.ToUnixTime(date);
        }

        /// <summary>
        /// Use this property to get and set the currently selected value when the date picker’s mode property
        /// is set to <see cref="ISN_UIDateTimePickerMode.CountdownTimer"/>.
        /// This property is of type <see cref="TimeSpan"/> and therefore is measured in seconds,
        /// although the date picker displays only hours and minutes.
        /// If the mode of the date picker is not <see cref="ISN_UIDateTimePickerMode.CountdownTimer"/>,
        /// this value is undefined; refer instead to the date property.
        /// The default value is 0.0 and the maximum value is 23:59 (86,399 seconds).
        /// </summary>
        /// <param name="duration">Duration.</param>
        public void SetCountDownDuration(TimeSpan duration)
        {
            m_CountDownDuration = (long)duration.TotalSeconds;
        }

        //--------------------------------------
        // Get / Set
        //--------------------------------------

        /// <summary>
        /// Use this property to change the type of information displayed by the date picker.
        /// It determines whether the date picker allows selection of a date,
        /// a time, both date and time, or a countdown time.
        /// The default mode is <see cref="ISN_UIDateTimePickerMode.DateAndTime"/>.
        /// See <see cref="ISN_UIDateTimePickerMode"/> for a list of mode constants.
        /// </summary>
        public ISN_UIDateTimePickerMode DatePickerMode
        {
            get => m_DatePickerMode;

            set => m_DatePickerMode = value;
        }

        /// <summary>
        /// The interval at which the date picker should display minutes.
        ///
        /// Use this property to set the interval displayed by the minutes wheel (for example, 15 minutes).
        /// The interval value must be evenly divided into 60;
        /// if it is not, the default value is used.
        /// The default and minimum values are 1; the maximum value is 30.
        /// </summary>
        public int MinuteInterval
        {
            get => m_MinuteInterval;

            set => m_MinuteInterval = value;
        }

        //--------------------------------------
        // Events
        //--------------------------------------

        /// <summary>
        /// The event is fired every time user changes the date while using picker in any mode
        /// </summary>
        public static SA_iEvent<DateTime> OnPickerDateChanged
        {
            get
            {
                if (m_onPickerDateChanged == null)
                {
                    m_onPickerDateChanged = new SA_Event<DateTime>();

                    if (!Application.isEditor)
                    {
#if UNITY_IPHONE
                        _ISN_UIRegisterDPChangeCallback(ISN_MonoPCallback.ActionToIntPtr<string>(OnPickerDateChangedNativeEvent));
#endif
                    }
                }

                return m_onPickerDateChanged;
            }
        }

        static void OnPickerDateChangedNativeEvent(string time)
        {
            var dt = DateTime.Parse(time);
            m_onPickerDateChanged.Invoke(dt);
        }
    }
}
