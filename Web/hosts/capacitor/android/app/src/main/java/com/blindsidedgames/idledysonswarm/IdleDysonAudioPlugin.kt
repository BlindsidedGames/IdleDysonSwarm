package com.blindsidedgames.idledysonswarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.SoundPool
import android.os.Build
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "IdleDysonAudio")
class IdleDysonAudioPlugin : Plugin() {
    private lateinit var audioManager: AudioManager
    private var player: ExoPlayer? = null
    private var soundPool: SoundPool? = null
    private var buttonSoundId = 0
    private var preparedMusicAsset: String? = null
    private var intended = false
    private var resumeAfterFocus = false
    private var musicVolume = 0.7f
    private var effectsVolume = 0.5f
    private var muted = false
    private var outputSuspended = false
    private var focusRequest: AudioFocusRequest? = null

    private val focusListener = AudioManager.OnAudioFocusChangeListener { change ->
        activity.runOnUiThread {
            when (change) {
                AudioManager.AUDIOFOCUS_GAIN -> {
                    player?.volume = effectiveMusicVolume()
                    if (resumeAfterFocus && intended && !muted) player?.play()
                    resumeAfterFocus = false
                }
                AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK ->
                    player?.volume = effectiveMusicVolume() * 0.2f
                AudioManager.AUDIOFOCUS_LOSS_TRANSIENT -> {
                    resumeAfterFocus = player?.isPlaying == true
                    player?.pause()
                }
                AudioManager.AUDIOFOCUS_LOSS -> {
                    resumeAfterFocus = false
                    intended = false
                    outputSuspended = true
                    player?.pause()
                }
            }
        }
    }

    private val noisyReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == AudioManager.ACTION_AUDIO_BECOMING_NOISY) {
                resumeAfterFocus = false
                intended = false
                outputSuspended = true
                player?.pause()
            }
        }
    }

    override fun load() {
        audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        val filter = IntentFilter(AudioManager.ACTION_AUDIO_BECOMING_NOISY)
        if (Build.VERSION.SDK_INT >= 33) {
            context.registerReceiver(noisyReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            @Suppress("DEPRECATION") context.registerReceiver(noisyReceiver, filter)
        }
    }

    @PluginMethod
    fun prepare(call: PluginCall) = onMain(call) {
        val musicAsset = call.getString("musicAsset")
            ?: throw IllegalArgumentException("musicAsset is required")
        val buttonAsset = call.getString("buttonAsset")
            ?: throw IllegalArgumentException("buttonAsset is required")
        if (preparedMusicAsset != musicAsset) {
            player?.release()
            val mediaAttributes = androidx.media3.common.AudioAttributes.Builder()
                .setUsage(C.USAGE_GAME)
                .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
                .build()
            player = ExoPlayer.Builder(context).build().also {
                it.setAudioAttributes(mediaAttributes, false)
                it.repeatMode = Player.REPEAT_MODE_ONE
                it.setMediaItem(MediaItem.fromUri("asset:///$musicAsset"))
                it.prepare()
                it.volume = effectiveMusicVolume()
            }
            preparedMusicAsset = musicAsset
        }
        if (soundPool == null) {
            val effectsAttributes = AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_GAME)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build()
            soundPool = SoundPool.Builder()
                .setMaxStreams(4)
                .setAudioAttributes(effectsAttributes)
                .build()
            context.assets.openFd(buttonAsset).use {
                buttonSoundId = soundPool?.load(it, 1) ?: 0
            }
        }
        call.resolve()
    }

    @PluginMethod
    fun playMusic(call: PluginCall) = onMain(call) {
        intended = true
        if (!muted && !outputSuspended && player?.isPlaying != true && requestFocus()) {
            player?.volume = effectiveMusicVolume()
            resumeAfterFocus = false
            player?.play()
        }
        call.resolve()
    }

    @PluginMethod
    fun pauseMusic(call: PluginCall) = onMain(call) {
        player?.pause()
        resumeAfterFocus = false
        player?.volume = effectiveMusicVolume()
        abandonFocus()
        call.resolve()
    }

    @PluginMethod
    fun setVolumes(call: PluginCall) = onMain(call) {
        musicVolume = (call.getFloat("musicVolume", 0.7f) ?: 0.7f).coerceIn(0f, 1f)
        effectsVolume = (call.getFloat("effectsVolume", 0.5f) ?: 0.5f).coerceIn(0f, 1f)
        muted = call.getBoolean("muted", false) ?: false
        player?.volume = effectiveMusicVolume()
        if (muted) player?.pause()
        call.resolve()
    }

    @PluginMethod
    fun playButton(call: PluginCall) = onMain(call) {
        if (!muted && buttonSoundId != 0) {
            soundPool?.play(buttonSoundId, effectsVolume, effectsVolume, 1, 0, 1f)
        }
        call.resolve()
    }

    @PluginMethod
    fun recoverOutput(call: PluginCall) = onMain(call) {
        outputSuspended = false
        call.resolve()
    }

    @PluginMethod
    fun release(call: PluginCall) = onMain(call) {
        intended = false
        player?.release()
        player = null
        soundPool?.release()
        soundPool = null
        buttonSoundId = 0
        preparedMusicAsset = null
        abandonFocus()
        call.resolve()
    }

    override fun handleOnDestroy() {
        try { context.unregisterReceiver(noisyReceiver) } catch (_: IllegalArgumentException) {}
        player?.release()
        soundPool?.release()
        abandonFocus()
        super.handleOnDestroy()
    }

    private fun effectiveMusicVolume() = if (muted) 0f else musicVolume

    private fun requestFocus(): Boolean {
        abandonFocus()
        val attributes = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_GAME)
            .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
            .build()
        val request = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
            .setAudioAttributes(attributes)
            .setOnAudioFocusChangeListener(focusListener)
            .setWillPauseWhenDucked(false)
            .build()
        focusRequest = request
        return audioManager.requestAudioFocus(request) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
    }

    private fun abandonFocus() {
        focusRequest?.let { audioManager.abandonAudioFocusRequest(it) }
        focusRequest = null
    }

    private fun onMain(call: PluginCall, action: () -> Unit) {
        activity.runOnUiThread {
            try { action() } catch (error: Exception) {
                call.reject("Native audio operation failed.", "audio-operation-failed", error)
            }
        }
    }
}
