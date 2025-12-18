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
using SA.Foundation.Templates;
using SA.iOS.Utilities;
#if ((UNITY_IPHONE || UNITY_TVOS) && REPLAY_KIT_API_ENABLED)
using System.Runtime.InteropServices;

#endif

namespace SA.iOS.ReplayKit
{
    class ISN_RPNativeAPI : ISN_Singleton<ISN_RPNativeAPI>, ISN_iRRAPI
    {
#if ((UNITY_IPHONE || UNITY_TVOS) && REPLAY_KIT_API_ENABLED)
        [DllImport("__Internal")]
        static extern void _ISN_StartRecording();

        [DllImport("__Internal")]
        static extern void _ISN_StopRecording();

        [DllImport("__Internal")]
        static extern void _ISN_DiscardRecording();

        [DllImport("__Internal")]
        static extern void _ISN_ShowVideoShareDialog();

        [DllImport("__Internal")]
        static extern bool _ISN_IsReplayKitAvaliable();

        [DllImport("__Internal")]
        static extern bool _ISN_IsReplayKitRecording();

        [DllImport("__Internal")]
        static extern bool _ISN_IsReplayKitMicEnabled();

        [DllImport("__Internal")]
        static extern void _ISN_SetMicrophoneEnabled(bool enabled);
#endif

        readonly SA_Event<ISN_RPStopResult> m_didStopRecording = new SA_Event<ISN_RPStopResult>();
        readonly SA_Event m_didChangeAvailability = new SA_Event();

        Action<SA_Result> m_startRecordingCallback = delegate { };

        public void StartRecording(Action<SA_Result> callback)
        {
            m_startRecordingCallback = callback;
#if ((UNITY_IPHONE || UNITY_TVOS) && REPLAY_KIT_API_ENABLED)
            _ISN_StartRecording();
#endif
        }

        void OnRecorStartResult(string data)
        {
            var result = JsonUtility.FromJson<SA_Result>(data);
            m_startRecordingCallback.Invoke(result);
        }

        Action<ISN_RPStopResult> m_stopRecordingCallback = delegate { };

        public void StopRecording(Action<ISN_RPStopResult> callback)
        {
            m_stopRecordingCallback = callback;
#if ((UNITY_IPHONE || UNITY_TVOS) && REPLAY_KIT_API_ENABLED)
            _ISN_StopRecording();
#endif
        }

        void OnRecorStopResult(string data)
        {
            var result = JsonUtility.FromJson<ISN_RPStopResult>(data);
            if (result.HasPreviewController) result.PreviewController = new ISN_RPPreviewViewController();

            m_stopRecordingCallback.Invoke(result);
        }

        Action m_discardRecordingCallback = delegate { };

        public void DiscardRecording(Action callback)
        {
            m_discardRecordingCallback = callback;
#if ((UNITY_IPHONE || UNITY_TVOS) && REPLAY_KIT_API_ENABLED)
            _ISN_DiscardRecording();
#endif
        }

        void OnRecordDiscard(string data)
        {
            m_discardRecordingCallback.Invoke();
        }

        Action<ISN_PRPreviewResult> m_shareDialogCallback = delegate { };

        public void ShowVideoShareDialog(Action<ISN_PRPreviewResult> callback)
        {
            m_shareDialogCallback = callback;
#if ((UNITY_IPHONE || UNITY_TVOS) && REPLAY_KIT_API_ENABLED)
            _ISN_ShowVideoShareDialog();
#endif
        }

        void OnShareDialogResult(string data)
        {
            var result = JsonUtility.FromJson<ISN_PRPreviewResult>(data);
            m_shareDialogCallback.Invoke(result);
        }

        public bool IsReplayKitAvailable()
        {
#if ((UNITY_IPHONE || UNITY_TVOS) && REPLAY_KIT_API_ENABLED)
            return _ISN_IsReplayKitAvaliable();
#else
            return false;
#endif
        }

        public bool IsReplayKitRecording()
        {
#if ((UNITY_IPHONE || UNITY_TVOS) && REPLAY_KIT_API_ENABLED)
            return _ISN_IsReplayKitRecording();
#else
            return false;
#endif
        }

        public bool IsReplayKitMicEnabled()
        {
#if ((UNITY_IPHONE || UNITY_TVOS) && REPLAY_KIT_API_ENABLED)
            return _ISN_IsReplayKitMicEnabled();
#else
            return false;
#endif
        }

        public SA_iEvent<ISN_RPStopResult> DidStopRecording => m_didStopRecording;

        public SA_iEvent DidChangeAvailability => m_didChangeAvailability;

        public void SetMicrophoneEnabled(bool enabled)
        {
#if ((UNITY_IPHONE || UNITY_TVOS) && REPLAY_KIT_API_ENABLED)
            _ISN_SetMicrophoneEnabled(enabled);
#endif
        }

        void OnRecorderDidChangeAvailability()
        {
            m_didChangeAvailability.Invoke();
        }

        void OnRecorderStopRecordingWithError(string data)
        {
            var result = JsonUtility.FromJson<ISN_RPStopResult>(data);
            if (result.HasPreviewController) result.PreviewController = new ISN_RPPreviewViewController();

            m_didStopRecording.Invoke(result);
        }
    }
}
