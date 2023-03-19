////////////////////////////////////////////////////////////////////////////////
//  
// @module IOS Native Plugin for Unity3D 
// @author Osipov Stanislav (Stan's Assets) 
// @support stans.assets@gmail.com 
//
////////////////////////////////////////////////////////////////////////////////

using System;
using UnityEngine;
using SA.iOS.ReplayKit;
using SA.iOS.UIKit;

namespace SA.iOS.Examples
{
    public class ISN_ReplayKitUseExample : ISN_BaseIOSFeaturePreview
    {
        void Awake()
        {
            ISN_RPScreenRecorder.DidChangeAvailability.AddSafeListener(this, () =>
            {
                //Do something
            });

            ISN_RPScreenRecorder.DidStopRecording.AddSafeListener(this, OnRecordStopped);
        }

        bool IsRecording = false;

        //--------------------------------------
        //  PUBLIC METHODS
        //--------------------------------------
        void OnGUI()
        {
            UpdateToStartPos();

            GUI.Label(new Rect(StartX, StartY, Screen.width, 40), "Replay Kit", style);

            StartY += YLableStep;

            GUI.enabled = !IsRecording;

            if (GUI.Button(new Rect(StartX, StartY, buttonWidth, buttonHeight), "Start Recording"))
                ISN_RPScreenRecorder.StartRecording((result) =>
                {
                    if (result.IsSucceeded) IsRecording = true;
                });

            GUI.enabled = IsRecording;

            StartX += XButtonStep;
            if (GUI.Button(new Rect(StartX, StartY, buttonWidth, buttonHeight), "Stop Recording")) ISN_RPScreenRecorder.StopRecording(OnRecordStopped);
        }

        void OnRecordStopped(ISN_RPStopResult result)
        {
            //TODO ask if we want to SN_RPScreenRecorder.DiscardRecording() 

            IsRecording = false;
            if (result.HasPreviewController)
                result.PreviewController.Present((presetResult) =>
                {
                    Debug.Log("presetResult.ActivityTypes.Count: " + presetResult.ActivityTypes.Count);
                });
        }
    }
}
