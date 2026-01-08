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
    class ISN_RPEditorAPI : ISN_iRRAPI
    {
        readonly SA_Event<ISN_RPStopResult> m_didStopRecording = new SA_Event<ISN_RPStopResult>();
        readonly SA_Event m_didChangeAvailability = new SA_Event();

        public SA_iEvent<ISN_RPStopResult> DidStopRecording => m_didStopRecording;

        public SA_iEvent DidChangeAvailability => m_didChangeAvailability;

        public void DiscardRecording(Action callback) { }

        public bool IsReplayKitAvailable()
        {
            return false;
        }

        public bool IsReplayKitMicEnabled()
        {
            return false;
        }

        public bool IsReplayKitRecording()
        {
            return false;
        }

        public void ShowVideoShareDialog(Action<ISN_PRPreviewResult> callback) { }

        public void StartRecording(Action<SA_Result> callback) { }

        public void StopRecording(Action<ISN_RPStopResult> callback) { }

        public void SetMicrophoneEnabled(bool enabled) { }
    }
}
