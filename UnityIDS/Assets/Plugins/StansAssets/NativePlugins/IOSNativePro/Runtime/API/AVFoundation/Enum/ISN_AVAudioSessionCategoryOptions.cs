using System;

namespace SA.iOS.AVFoundation
{
    /// <summary>
    /// Constants that specify optional audio behaviors.
    /// </summary>
    [Flags]
    public enum ISN_AVAudioSessionCategoryOptions
    {
        /// <summary>
        /// An option that indicates whether audio from this session mixes with audio from active sessions in other audio apps.
        /// </summary>
        MixWithOthers = 0x1,

        /// <summary>
        /// An option that reduces the volume of other audio session while audio from this session plays.
        /// </summary>
        DuckOthers = 0x2,

        /// <summary>
        /// An option that determines whether to pause spoken audio content from other sessions when your app plays its audio.
        /// </summary>
        InterruptSpokenAudioAndMixWithOthers = 0x11,

        /// <summary>
        /// An option that determines whether Bluetooth hands-free devices appear as available input routes.
        /// </summary>
        AllowBluetooth = 0x4,

        /// <summary>
        /// An option that determines whether you can stream audio from this session to Bluetooth devices that support the Advanced Audio Distribution Profile (A2DP).
        /// </summary>
        AllowBluetoothA2DP = 0x20,

        /// <summary>
        /// An option that determines whether you can stream audio from this session to AirPlay devices.
        /// </summary>
        AllowAirPlay = 0x40,

        /// <summary>
        /// An option that determines whether audio from the session defaults to the built-in speaker instead of the receiver.
        /// </summary>
        DefaultToSpeaker = 0x8,
    }
}
