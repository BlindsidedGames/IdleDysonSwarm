using System;
using UnityEngine;
using SA.iOS.UIKit;
using StansAssets.Foundation.Async;

namespace SA.iOS.Examples
{
    public class ISN_UIKitExample : ISN_BaseIOSFeaturePreview
    {
        [SerializeField]
        Texture2D m_icon = null;

        void Awake()
        {
            ISN_UIDateTimePicker.OnPickerDateChanged.AddListener(date =>
            {
                Debug.Log("User changed a date to: " + date.ToLongDateString());
            });
        }

        void OnGUI()
        {
            UpdateToStartPos();

            GUI.Label(new Rect(StartX, StartY, Screen.width, 40), "Popups", style);

            StartY += YLableStep;
            if (GUI.Button(new Rect(StartX, StartY, buttonWidth, buttonHeight), "Load Store"))
            {
                var alert = new ISN_UIAlertController("My Alert", "granted", ISN_UIAlertControllerStyle.Alert);
                var defaultAction = new ISN_UIAlertAction("Ok", ISN_UIAlertActionStyle.Default, () =>
                {
                    //Do something
                });

                defaultAction.SetImage(m_icon);

                alert.AddAction(defaultAction);
                alert.Present();

                CoroutineUtility.WaitForSeconds(3f, () =>
                {
                    alert.Dismiss();
                });
            }

            StartX = XStartPos;
            StartY += YButtonStep;

            if (GUI.Button(new Rect(StartX, StartY, buttonWidth, buttonHeight), "Perform Buy #1"))
            {
                var alert = new ISN_UIAlertController("My Alert", "declined", ISN_UIAlertControllerStyle.Alert);
                var defaultAction = new ISN_UIAlertAction("Ok", ISN_UIAlertActionStyle.Default, () =>
                {
                    //Do something
                });

                var defaultAction2 = new ISN_UIAlertAction("No", ISN_UIAlertActionStyle.Default, () =>
                {
                    //Do something
                });

                defaultAction.Enabled = true;
                defaultAction2.Enabled = false;

                var prefAction = new ISN_UIAlertAction("Hit me", ISN_UIAlertActionStyle.Default, () =>
                {
                    //Do something
                    Debug.Log("Got it!!!!");
                });

                prefAction.MakePreferred();

                alert.AddAction(defaultAction);
                alert.AddAction(defaultAction2);
                alert.AddAction(prefAction);
                alert.Present();
            }

            StartX += XButtonStep;
            if (GUI.Button(new Rect(StartX, StartY, buttonWidth, buttonHeight), "Perform Buy #2"))
            {
                ISN_Preloader.LockScreen();

                CoroutineUtility.WaitForSeconds(3f, ISN_Preloader.UnlockScreen);
            }

            StartX = XStartPos;
            StartY += YButtonStep;
            if (GUI.Button(new Rect(StartX, StartY, buttonWidth, buttonHeight), "Calendar Picker"))
                ISN_UICalendar.PickDate(date =>
                {
                    Debug.Log("User picked date: " + date.ToLongDateString());
                });

            StartX += XButtonStep;
            if (GUI.Button(new Rect(StartX, StartY, buttonWidth, buttonHeight), "Date Time Picker"))
            {
                //20 days ago
                var starDate = DateTime.Now;
                starDate = starDate.AddDays(-20);

                var picker = new ISN_UIDateTimePicker();
                picker.SetDate(starDate);

                picker.Show(date =>
                {
                    Debug.Log("User picked date: " + date.ToLongDateString());
                });
            }

            StartX += XButtonStep;
            if (GUI.Button(new Rect(StartX, StartY, buttonWidth, buttonHeight), "Date Picker"))
            {
                //20 days ago
                var starDate = DateTime.Now;
                starDate = starDate.AddDays(-20);

                var picker = new ISN_UIDateTimePicker();
                picker.SetDate(starDate);
                picker.DatePickerMode = ISN_UIDateTimePickerMode.Date;

                picker.Show((DateTime date) =>
                {
                    Debug.Log("User picked date: " + date.ToLongDateString());
                });
            }

            StartX += XButtonStep;
            if (GUI.Button(new Rect(StartX, StartY, buttonWidth, buttonHeight), "Time Picker"))
            {
                //20 hours ago
                var starDate = DateTime.Now;
                starDate = starDate.AddHours(-20);

                var picker = new ISN_UIDateTimePicker();
                picker.SetDate(starDate);
                picker.DatePickerMode = ISN_UIDateTimePickerMode.Time;
                picker.MinuteInterval = 30;

                picker.Show((DateTime date) =>
                {
                    Debug.Log("User picked date: " + date.ToLongDateString());
                });
            }

            StartX += XButtonStep;
            if (GUI.Button(new Rect(StartX, StartY, buttonWidth, buttonHeight), "Countdown Timer"))
            {
                var picker = new ISN_UIDateTimePicker();
                picker.DatePickerMode = ISN_UIDateTimePickerMode.CountdownTimer;
                picker.MinuteInterval = 10;

                //Set countdown start duration
                var hours = 5;
                var minutes = 20;
                var seconds = 0;
                var span = new TimeSpan(hours, minutes, seconds);
                picker.SetCountDownDuration(span);

                picker.Show(date =>
                {
                    Debug.Log("User picked date: " + date.ToLongDateString());
                });
            }
        }
    }
}
