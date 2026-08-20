import AVFoundation
import Capacitor

@objc(IdleDysonAudioPlugin)
public final class IdleDysonAudioPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "IdleDysonAudioPlugin"
    public let jsName = "IdleDysonAudio"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "prepare", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "playMusic", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pauseMusic", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setVolumes", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "playButton", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "recoverOutput", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "release", returnType: CAPPluginReturnPromise),
    ]

    private var player: AVQueuePlayer?
    private var looper: AVPlayerLooper?
    private var buttonPlayer: AVAudioPlayer?
    private var observers: [NSObjectProtocol] = []
    private var intended = false
    private var resumeAfterInterruption = false
    private var musicVolume: Float = 0.7
    private var effectsVolume: Float = 0.5
    private var muted = false
    private var outputSuspended = false

    @objc override public func load() {
        let session = AVAudioSession.sharedInstance()
        try? session.setCategory(.ambient, mode: .default, options: [.mixWithOthers])
        try? session.setActive(true)
        let center = NotificationCenter.default
        observers = [
            center.addObserver(forName: AVAudioSession.interruptionNotification, object: session, queue: .main) {
                [weak self] notification in self?.handleInterruption(notification)
            },
            center.addObserver(forName: AVAudioSession.routeChangeNotification, object: session, queue: .main) {
                [weak self] notification in self?.handleRouteChange(notification)
            },
        ]
    }

    deinit {
        for observer in observers { NotificationCenter.default.removeObserver(observer) }
    }

    @objc public func prepare(_ call: CAPPluginCall) {
        do {
            if player == nil {
                let musicURL = try assetURL(call.getString("musicAsset") ?? "")
                let item = AVPlayerItem(url: musicURL)
                let queue = AVQueuePlayer()
                player = queue
                looper = AVPlayerLooper(player: queue, templateItem: item)
                queue.volume = effectiveMusicVolume
            }
            if buttonPlayer == nil {
                let buttonURL = try assetURL(call.getString("buttonAsset") ?? "")
                buttonPlayer = try AVAudioPlayer(contentsOf: buttonURL)
                buttonPlayer?.prepareToPlay()
                buttonPlayer?.volume = muted ? 0 : effectsVolume
            }
            call.resolve()
        } catch { call.reject("Native audio assets could not be prepared.", "audio-prepare-failed", error) }
    }

    @objc public func playMusic(_ call: CAPPluginCall) {
        intended = true
        if !muted && !outputSuspended { player?.play() }
        call.resolve()
    }

    @objc public func pauseMusic(_ call: CAPPluginCall) {
        player?.pause()
        call.resolve()
    }

    @objc public func setVolumes(_ call: CAPPluginCall) {
        musicVolume = Float(min(1, max(0, call.getDouble("musicVolume") ?? 0.7)))
        effectsVolume = Float(min(1, max(0, call.getDouble("effectsVolume") ?? 0.5)))
        muted = call.getBool("muted") ?? false
        player?.volume = effectiveMusicVolume
        buttonPlayer?.volume = muted ? 0 : effectsVolume
        if muted { player?.pause() }
        call.resolve()
    }

    @objc public func playButton(_ call: CAPPluginCall) {
        if !muted {
            buttonPlayer?.currentTime = 0
            buttonPlayer?.play()
        }
        call.resolve()
    }

    @objc public func recoverOutput(_ call: CAPPluginCall) {
        outputSuspended = false
        call.resolve()
    }

    @objc public func release(_ call: CAPPluginCall) {
        intended = false
        outputSuspended = true
        player?.pause()
        player = nil
        looper = nil
        buttonPlayer?.stop()
        buttonPlayer = nil
        call.resolve()
    }

    private var effectiveMusicVolume: Float { muted ? 0 : musicVolume }

    private func assetURL(_ relativePath: String) throws -> URL {
        guard !relativePath.isEmpty else { throw AudioError.missingAsset }
        let url = Bundle.main.bundleURL.appendingPathComponent(relativePath)
        guard FileManager.default.fileExists(atPath: url.path) else { throw AudioError.missingAsset }
        return url
    }

    private func handleInterruption(_ notification: Notification) {
        guard let raw = notification.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt,
              let type = AVAudioSession.InterruptionType(rawValue: raw) else { return }
        if type == .began {
            resumeAfterInterruption = player?.timeControlStatus == .playing
            player?.pause()
        } else {
            let rawOptions = notification.userInfo?[AVAudioSessionInterruptionOptionKey] as? UInt ?? 0
            let mayResume = AVAudioSession.InterruptionOptions(rawValue: rawOptions).contains(.shouldResume)
            guard mayResume && resumeAfterInterruption && intended && !muted else {
                resumeAfterInterruption = false
                return
            }
            resumeAfterInterruption = false
            try? AVAudioSession.sharedInstance().setActive(true)
            player?.play()
        }
    }

    private func handleRouteChange(_ notification: Notification) {
        guard let raw = notification.userInfo?[AVAudioSessionRouteChangeReasonKey] as? UInt,
              AVAudioSession.RouteChangeReason(rawValue: raw) == .oldDeviceUnavailable else { return }
        resumeAfterInterruption = false
        intended = false
        outputSuspended = true
        player?.pause()
    }

    private enum AudioError: Error { case missingAsset }
}
