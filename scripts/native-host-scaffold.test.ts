import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

function read(relativePath: string): string {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8')
}

describe('native host scaffold', () => {
  it('uses generated 4.0 release metadata above the Unity build floor', () => {
    const source = JSON.parse(read('hosts/native-release.json')) as {
      marketingVersion: string
      defaultReleaseCandidateId: string
      unityBuildFloor: number
    }
    expect(source.marketingVersion).toBe('4.0.0')
    expect(source.defaultReleaseCandidateId).toMatch(/^\d{10}$/)
    expect(Number(source.defaultReleaseCandidateId)).toBeGreaterThan(
      source.unityBuildFloor,
    )
    const android = read(
      'hosts/capacitor/android/release-version.gradle',
    )
    const releaseCandidateId = android.match(
      /ext\.idsReleaseCandidateId = (\d{10})/,
    )?.[1]
    expect(releaseCandidateId).toMatch(/^\d{10}$/)
    expect(Number(releaseCandidateId)).toBeGreaterThan(
      source.unityBuildFloor,
    )
    const appleBuildNumber =
      `${releaseCandidateId?.slice(2, 6)}.` +
      `${releaseCandidateId?.slice(6, 8)}.` +
      releaseCandidateId?.slice(8, 10)
    expect(read('hosts/capacitor/ios/release-version.xcconfig'))
      .toContain(`CURRENT_PROJECT_VERSION = ${appleBuildNumber}`)
    const electron = read('hosts/electron/release-version.yml')
    expect(electron).toContain(
      `buildVersion: "${releaseCandidateId}"`,
    )
    expect(electron)
      .toContain('version: "4.0.0"')
  })

  it('keeps debug builds open, Android fail-closed, and Xcode locally managed', () => {
    const variables = read('hosts/capacitor/android/variables.gradle')
    const gradle = read('hosts/capacitor/android/app/build.gradle')
    expect(variables).toContain('minSdkVersion = 26')
    expect(gradle).toContain('applicationIdSuffix ".debug"')
    expect(gradle).toContain('versionNameSuffix "-debug"')
    expect(gradle).toContain('Idle Dyson Swarm (Debug)')
    expect(gradle).toContain("contains('release')")
    expect(gradle).toContain('IDS_ANDROID_KEYSTORE_PASSWORD')
    expect(gradle).toMatch(
      /if\s*\(\s*releaseBuildRequested\s*&&\s*!releaseSigningConfigured\s*&&\s*!unsignedReleaseExplicitlyAllowed\s*\)/,
    )

    const project = read(
      'hosts/capacitor/ios/App/App.xcodeproj/project.pbxproj',
    )
    expect(project).toContain('CODE_SIGN_STYLE = Automatic;')
    expect(project).toMatch(/DEVELOPMENT_TEAM = [A-Z0-9]+;/)
    expect(project).toContain('PROVISIONING_PROFILE_SPECIFIER = "";')
    expect(project).not.toContain('$(IDS_DEVELOPMENT_TEAM)')
  })

  it('denies Electron permissions and waits for runtime readiness', () => {
    const electronMain = read('hosts/electron/main.mjs')
    const rendererMain = read('src/main.tsx')
    expect(electronMain).toContain('setPermissionCheckHandler(() => false)')
    expect(electronMain).toContain('callback(false)')
    expect(electronMain).toContain('waitForRendererReady(window)')
    expect(rendererMain).toContain("snapshot.phase !== 'ready'")
    expect(rendererMain).toContain('idle-dyson-swarm-runtime-ready')
    expect(electronMain).toContain('app.requestSingleInstanceLock()')
    expect(electronMain).toContain('requestRendererCheckpoint(window)')
  })

  it('uses approved application artwork instead of template branding', () => {
    const brandingScript = read('scripts/generate-native-branding.ps1')
    const builder = read('hosts/electron/electron-builder.yml')
    expect(brandingScript).toContain(
      'source-assets\\branding\\unity-app-icon.png',
    )
    expect(brandingScript).not.toContain('..\\Assets')
    expect(builder).toContain('icon: public/icons/pwa-icon-512.png')
    expect(read(
      'hosts/capacitor/android/app/src/main/res/values/ic_launcher_background.xml',
    )).toContain('#2F1738')
  })
})
