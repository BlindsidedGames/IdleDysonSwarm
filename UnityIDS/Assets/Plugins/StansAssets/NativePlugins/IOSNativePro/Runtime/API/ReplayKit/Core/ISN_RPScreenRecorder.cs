using System;
using SA.Foundation.Templates;
using SA.Foundation.Events;

namespace SA.iOS.ReplayKit
{
    /// <summary>
    /// The shared recorder object providing the ability to record audio and video of your app.
    /// </summary>
    public static class ISN_RPScreenRecorder
    {
        /// <summary>
        /// Starts recording the app display.
        ///
        /// When <see cref="StartRecording"/> is first called, an alert window appears asking the user to confirm recording.
        /// This alert window is also presented if it has been longer than 8 minutes
        /// since the last time <see cref="StartRecording"/> was called.
        /// </summary>
        /// <param name="callback">A callback that is called when the request completes.</param>
        public static void StartRecording(Action<SA_Result> callback)
        {
            ISN_RPNativeLib.Api.StartRecording(callback);
        }

        /// <summary>
        /// Stops the current recording.
        ///
        /// When recording stops and there is no error associated with the recording,
        /// present the the resulting preview view controller using <see cref="ISN_RPPreviewViewController"/>.
        /// The user will see the built-in preview view controller, providing them with the option to trim, cut,
        /// and share the recording. On the iPad, the preview view controller will be presented as popover.
        /// </summary>
        /// <param name="callback">A callback that is called when the request completes.</param>
        public static void StopRecording(Action<ISN_RPStopResult> callback)
        {
            ISN_RPNativeLib.Api.StopRecording(callback);
        }

        /// <summary>
        /// Discards the current recording.
        ///
        /// Method can only be called after the <see cref="StopRecording"/> callback has been called.
        /// Use the handler block to do any required cleanup, including setting any <see cref="ISN_RPPreviewViewController"/> references to null.
        /// </summary>
        /// <param name="callback">Callback.</param>
        public static void DiscardRecording(Action callback)
        {
            ISN_RPNativeLib.Api.DiscardRecording(callback);
        }

        /// <summary>
        /// A Boolean value that indicates whether the screen recorder is available for recording.
        /// </summary>
        public static bool IsAvailable => ISN_RPNativeLib.Api.IsReplayKitAvailable();

        /// <summary>
        /// A Boolean value that indicates whether the app is currently recording.
        /// </summary>
        public static bool IsRecording => ISN_RPNativeLib.Api.IsReplayKitRecording();

        /// <summary>
        /// A Boolean value that indicates whether the microphone is currently enabled.
        /// </summary>
        public static bool IsMicrophoneEnabled
        {
            get => ISN_RPNativeLib.Api.IsReplayKitMicEnabled();
            set => ISN_RPNativeLib.Api.SetMicrophoneEnabled(value);
        }

        /// <summary>
        /// Gets the did stop recording.
        ///
        /// This method is called when recording stops due to an error or a change in recording availability.
        /// If any part of the stopped recording is available,
        /// an instance of <see cref="ISN_RPStopResult"/> is returned.
        /// </summary>
        public static SA_iEvent<ISN_RPStopResult> DidStopRecording => ISN_RPNativeLib.Api.DidStopRecording;

        /// <summary>
        /// Indicates that the recorder has changed states between disabled and enabled.
        ///
        /// Screen recording can be unavailable due to unsupported hardware,
        /// the user’s device displaying information over Airplay or through a TVOut session,
        /// or another app using the shared recorder.
        /// </summary>
        public static SA_iEvent DidChangeAvailability => ISN_RPNativeLib.Api.DidChangeAvailability;
    }
}
