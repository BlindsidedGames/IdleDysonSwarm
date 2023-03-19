//#define REPLAY_KIT_API_ENABLED
////////////////////////////////////////////////////////////////////////////////
//
// @module IOS Native Plugin
// @author Osipov Stanislav (Stan's Assets)
// @support support@stansassets.com
// @website https://stansassets.com
//
////////////////////////////////////////////////////////////////////////////////

using System;
using SA.Foundation.Events;
using SA.Foundation.Templates;

namespace SA.iOS.ReplayKit
{
    interface ISN_iRRAPI
    {
        void StartRecording(Action<SA_Result> callback);
        void StopRecording(Action<ISN_RPStopResult> callback);
        void DiscardRecording(Action callback);

        void ShowVideoShareDialog(Action<ISN_PRPreviewResult> callback);

        void SetMicrophoneEnabled(bool enabled);

        bool IsReplayKitAvailable();
        bool IsReplayKitRecording();
        bool IsReplayKitMicEnabled();

        SA_iEvent<ISN_RPStopResult> DidStopRecording { get; }
        SA_iEvent DidChangeAvailability { get; }
    }
}
