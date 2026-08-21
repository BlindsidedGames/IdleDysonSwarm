import { readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('native audio integration', () => {
  test('selects the shared Web backend for Browser/Electron and Capacitor backend for mobile', () => {
    const composition = read('src/audio/composition.ts')
    expect(composition).toContain("target === 'ios' || target === 'android'")
    expect(composition).toContain('new CapacitorAudioBackend(target)')
    expect(composition).toContain('new WebAudioBackend')
    const bridge = read('src/audio/capacitorAudioBackend.ts')
    expect(bridge).toContain("this.target === 'ios'")
    expect(bridge).toContain("'public/audio/button.wav'")
    expect(bridge).toContain("'public/audio/button.ogg'")
  })

  test('wires Android Media3, SoundPool, game attributes, focus, noisy output, and release', () => {
    const source = read('hosts/capacitor/android/app/src/main/java/com/blindsidedgames/idledysonswarm/IdleDysonAudioPlugin.kt')
    expect(source).toContain('ExoPlayer')
    expect(source).toContain('SoundPool')
    expect(source).toContain('USAGE_GAME')
    expect(source).toContain('AudioFocusRequest')
    expect(source).toMatch(
      /AUDIOFOCUS_LOSS\s*->\s*\{[\s\S]*?outputSuspended = true[\s\S]*?player\?\.pause\(\)/,
    )
    expect(source).toContain('ACTION_AUDIO_BECOMING_NOISY')
    expect(source).toContain('REPEAT_MODE_ONE')
    expect(source).toContain('release()')
    expect(read('hosts/capacitor/android/app/build.gradle')).toContain('media3-exoplayer')
    expect(read('hosts/capacitor/android/app/src/main/java/com/blindsidedgames/idledysonswarm/MainActivity.java')).toContain('IdleDysonAudioPlugin.class')
  })

  test('wires iOS ambient mixing, AVPlayer looping, preloaded cue, interruptions, and route changes', () => {
    const source = read('hosts/capacitor/ios/App/App/IdleDysonAudioPlugin.swift')
    expect(source).toContain('AVQueuePlayer')
    expect(source).toContain('AVPlayerLooper')
    expect(source).toContain('AVAudioPlayer')
    expect(source).toContain('setCategory(.ambient')
    expect(source).toContain('.mixWithOthers')
    expect(source).toContain('interruptionNotification')
    expect(source).toContain('routeChangeNotification')
    expect(read('hosts/capacitor/ios/App/App.xcodeproj/project.pbxproj')).toContain('IdleDysonAudioPlugin.swift in Sources')
    expect(read('hosts/capacitor/ios/App/App/SceneDelegate.swift')).toContain(
      'registerPluginInstance(IdleDysonAudioPlugin())',
    )
  })

  test('bundles bounded delivery assets and preserves the source masters', () => {
    expect(statSync(resolve(process.cwd(), 'public/audio/ids-soundtrack.m4a')).size).toBeLessThan(8_000_000)
    expect(statSync(resolve(process.cwd(), 'public/audio/button.ogg')).size).toBe(6_021)
    expect(statSync(resolve(process.cwd(), 'public/audio/button.wav')).size).toBeLessThan(20_000)
    expect(statSync(resolve(process.cwd(), 'source-assets/audio/IDS-master.wav')).size).toBe(57_882_296)
  })
})
