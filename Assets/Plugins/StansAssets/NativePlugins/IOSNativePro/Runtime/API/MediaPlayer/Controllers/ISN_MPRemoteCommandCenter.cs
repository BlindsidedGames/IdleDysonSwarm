#if (UNITY_IPHONE || UNITY_IOS) && MEDIA_PLAYER_API_ENABLED && !UNITY_EDITOR
 #define API_ENABLED
#endif

using System;
using SA.Foundation.Events;
using SA.Foundation.Templates;
using SA.iOS.Utilities;

#if API_ENABLED
using System.Runtime.InteropServices;
#endif

namespace SA.iOS.MediaPlayer
{
    /// <summary>
    /// Static class that responds to remote control events sent by external accessories and system controls.
    /// </summary>
    public static class ISN_MPRemoteCommandCenter
    {
#if API_ENABLED
        [DllImport("__Internal")] static extern void _ISN_MP_OnPlayCommand(IntPtr callback);
        [DllImport("__Internal")] static extern void _ISN_MP_OnPauseCommand(IntPtr callback);
        [DllImport("__Internal")] static extern void _ISN_MP_OnStopCommand(IntPtr callback);

        [DllImport("__Internal")] static extern void _ISN_MP_OnNextTrackCommand(IntPtr callback);
        [DllImport("__Internal")] static extern void _ISN_MP_OnPreviousTrackCommand(IntPtr callback);

#endif
        static SA_Event s_OnPlayCommand = null;

        /// <summary>
        /// The command object for starting playback of the current item.
        ///
        /// Use the object in this property to register your app’s handler for pausing the currently playing track.
        /// In your handler, play the current item from the point at which the track was paused,
        /// or from the beginning if the item was not paused.
        /// You can disable the command if your app does not support it.
        /// </summary>
        public static SA_iEvent OnPlayCommand
        {
            get
            {
                if (s_OnPlayCommand == null)
                {
                    s_OnPlayCommand = new SA_Event();

#if API_ENABLED
                    _ISN_MP_OnPlayCommand(ISN_MonoPCallback.ActionToIntPtr<SA_Result>((result) => {
                        s_OnPlayCommand.Invoke();
                    }));
#endif
                }

                return s_OnPlayCommand;
            }
        }

        static SA_Event s_OnPauseCommand = null;

        /// <summary>
        /// The command object for pausing playback of the current item.
        ///
        /// Use the object in this property to register your app’s handler for pausing the currently playing track.
        /// In your handler, pause playback of the current item but maintain the current play position.
        /// You can disable the command if your app does not support it.
        /// </summary>
        public static SA_iEvent OnPauseCommand
        {
            get
            {
                if (s_OnPauseCommand == null)
                {
                    s_OnPauseCommand = new SA_Event();

#if API_ENABLED
                    _ISN_MP_OnPauseCommand(ISN_MonoPCallback.ActionToIntPtr<SA_Result>((result) => {
                        s_OnPauseCommand.Invoke();
                    }));
#endif
                }

                return s_OnPauseCommand;
            }
        }

        static SA_Event s_OnStopCommand = null;

        /// <summary>
        /// The command object for stopping playback of the current item.
        ///
        /// Use the object in this property to register your app’s handler for stopping playback of the current track.
        /// In your handler, stop playback the current item.
        /// You can disable the command if your app does not support it.
        /// </summary>
        public static SA_iEvent OnStopCommand
        {
            get
            {
                if (s_OnStopCommand == null)
                {
                    s_OnStopCommand = new SA_Event();

#if API_ENABLED
                    _ISN_MP_OnStopCommand(ISN_MonoPCallback.ActionToIntPtr<SA_Result>((result) => {
                        s_OnStopCommand.Invoke();
                    }));
#endif
                }

                return s_OnStopCommand;
            }
        }

        static SA_Event s_OnNextTrackCommand = null;

        /// <summary>
        /// The command object for selecting the next track.
        ///
        /// Use the object in this property to register your app’s handler for selecting the next track.
        /// In your handler, select the media item that follows the current media item.
        /// You can disable the command if your app does not support it.
        /// </summary>
        public static SA_iEvent OnNextTrackCommand
        {
            get
            {
                if (s_OnNextTrackCommand == null)
                {
                    s_OnNextTrackCommand = new SA_Event();

#if API_ENABLED
                    _ISN_MP_OnNextTrackCommand(ISN_MonoPCallback.ActionToIntPtr<SA_Result>((result) => {
                        s_OnNextTrackCommand.Invoke();
                    }));
#endif
                }

                return s_OnNextTrackCommand;
            }
        }

        static SA_Event s_OnPreviousTrackCommand = null;

        /// <summary>
        /// The command object for selecting the previous track.
        ///
        /// Use the object in this property to register your app’s handler for selecting the previous track.
        /// In your handler, select the media item that precedes the current media item.
        /// You can disable the command if your app does not support it.
        /// </summary>
        /// <value>The on previous track command.</value>
        public static SA_iEvent OnPreviousTrackCommand
        {
            get
            {
                if (s_OnPreviousTrackCommand == null)
                {
                    s_OnPreviousTrackCommand = new SA_Event();

#if API_ENABLED
                    _ISN_MP_OnPreviousTrackCommand(ISN_MonoPCallback.ActionToIntPtr<SA_Result>((result) => {
                        s_OnPreviousTrackCommand.Invoke();
                    }));
#endif
                }

                return s_OnPlayCommand;
            }
        }
    }
}
