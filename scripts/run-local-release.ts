import { execFileSync, spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createNativeReleaseArtifactManifest } from './create-native-release-manifest'
import {
  resolveNativeReleaseMetadata,
  syncNativeRelease,
  type NativeReleaseSource,
} from './sync-native-release'

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url))
export const REPOSITORY_ROOT = resolve(SCRIPT_DIRECTORY, '..')
export const LOCAL_RELEASE_ROOT = resolve(REPOSITORY_ROOT, 'output/local-release')
export const LOCAL_SIGNING_DIRECTORY = resolve(
  process.env.HOME ?? '',
  'Library/Application Support/Blindsided Games/Idle Dyson Swarm/signing',
)
export const LOCAL_ANDROID_KEYSTORE = resolve(
  LOCAL_SIGNING_DIRECTORY,
  'idledysonswarm.keystore',
)
export const LOCAL_JAVA_HOME = resolve(
  process.env.HOME ?? '',
  'Library/Application Support/Blindsided Games/Idle Dyson Swarm/java/jdk-21.0.12.1+1/Contents/Home',
)
export const LOCAL_ANDROID_HOME = resolve(
  process.env.HOME ?? '',
  'Library/Android/sdk',
)
export const ANDROID_KEY_ALIAS = 'idledysonswarm'
export const ANDROID_KEYSTORE_PASSWORD_SERVICE =
  'com.blindsidedgames.idledysonswarm.android.keystore-password'
export const ANDROID_KEY_PASSWORD_SERVICE =
  'com.blindsidedgames.idledysonswarm.android.key-password'

export interface LocalReleaseOptions {
  readonly releaseId?: string
  readonly websiteRef?: string
  readonly cleanInstall: boolean
  readonly androidOnly: boolean
}

export function parseLocalReleaseArguments(
  arguments_: readonly string[],
): LocalReleaseOptions {
  let releaseId: string | undefined
  let websiteRef: string | undefined
  let cleanInstall = false
  let androidOnly = false
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index]
    if (argument === '--clean-install') cleanInstall = true
    else if (argument === '--android-only') androidOnly = true
    else if (argument === '--release-id' || argument === '--website-ref') {
      const value = arguments_[index + 1]
      if (value === undefined || value.startsWith('--')) {
        throw new Error(`Missing value for ${argument}.`)
      }
      if (argument === '--release-id') releaseId = value
      else websiteRef = value
      index += 1
    } else {
      throw new Error(`Unsupported local-release argument: ${argument}`)
    }
  }
  if (websiteRef !== undefined && !/^[0-9a-f]{40}$/i.test(websiteRef)) {
    throw new Error('--website-ref must be a complete 40-character Git commit SHA.')
  }
  return Object.freeze({ releaseId, websiteRef, cleanInstall, androidOnly })
}

export function createAndroidSigningEnvironment(
  keystorePassword: string,
  keyPassword: string,
): NodeJS.ProcessEnv {
  return {
    ...process.env,
    JAVA_HOME: process.env.JAVA_HOME || LOCAL_JAVA_HOME,
    ANDROID_HOME: process.env.ANDROID_HOME || LOCAL_ANDROID_HOME,
    ORG_GRADLE_PROJECT_IDS_ANDROID_KEYSTORE_PATH:
      process.env.IDS_ANDROID_KEYSTORE_PATH || LOCAL_ANDROID_KEYSTORE,
    ORG_GRADLE_PROJECT_IDS_ANDROID_KEYSTORE_PASSWORD: keystorePassword,
    ORG_GRADLE_PROJECT_IDS_ANDROID_KEY_ALIAS:
      process.env.IDS_ANDROID_KEY_ALIAS || ANDROID_KEY_ALIAS,
    ORG_GRADLE_PROJECT_IDS_ANDROID_KEY_PASSWORD: keyPassword,
  }
}

export async function runLocalRelease(options: LocalReleaseOptions): Promise<void> {
  requireMacOs()
  requireCleanCheckout()
  const source = JSON.parse(readFileSync(
    resolve(REPOSITORY_ROOT, 'hosts/native-release.json'),
    'utf8',
  )) as NativeReleaseSource
  const metadata = resolveNativeReleaseMetadata(source, options.releaseId)
  const sourceCommit = git('rev-parse', 'HEAD')
  const sourceDateEpoch = Number(git('show', '-s', '--format=%ct', 'HEAD'))

  if (options.cleanInstall) run('npm', ['ci'])
  await syncNativeRelease(metadata.releaseCandidateId)
  run('npm', ['test', '--', '--maxWorkers=1'])
  run('npm', ['run', 'lint'])
  run('npm', ['run', 'i18n:check'])
  run('npm', ['run', 'build'])
  run('npm', ['run', 'native:electron:check'])
  run('npm', ['run', 'build:native'], {
    IDS_RELEASE_CANDIDATE_ID: metadata.releaseCandidateId,
  })
  requireCleanCheckout()

  const keystorePath = process.env.IDS_ANDROID_KEYSTORE_PATH || LOCAL_ANDROID_KEYSTORE
  const javaHome = process.env.JAVA_HOME || LOCAL_JAVA_HOME
  const androidHome = process.env.ANDROID_HOME || LOCAL_ANDROID_HOME
  requireFile(keystorePath, 'Android upload keystore')
  requireFile(resolve(javaHome, 'bin/java'), 'Java 21 runtime')
  requireFile(androidHome, 'Android SDK')
  const keystorePassword = readKeychainPassword(ANDROID_KEYSTORE_PASSWORD_SERVICE)
  const keyPassword = readKeychainPassword(ANDROID_KEY_PASSWORD_SERVICE)
  const signingEnvironment = createAndroidSigningEnvironment(
    keystorePassword,
    keyPassword,
  )

  run('npm', ['--prefix', 'hosts/capacitor', 'run', 'sync:android'])
  run('bash', ['./gradlew', 'bundleRelease', '--no-daemon'], signingEnvironment,
    resolve(REPOSITORY_ROOT, 'hosts/capacitor/android'))

  const androidOutput = resolve(
    LOCAL_RELEASE_ROOT,
    metadata.releaseCandidateId,
    'android',
  )
  mkdirSync(androidOutput, { recursive: true })
  const androidArtifact = resolve(
    androidOutput,
    `idle-dyson-swarm-${metadata.releaseCandidateId}.aab`,
  )
  copyFileSync(
    resolve(REPOSITORY_ROOT, 'hosts/capacitor/android/app/build/outputs/bundle/release/app-release.aab'),
    androidArtifact,
  )
  await createNativeReleaseArtifactManifest({
    releaseCandidateId: metadata.releaseCandidateId,
    sourceCommit,
    sourceDateEpoch,
    platform: 'android',
    securityProfile: 'release-signed',
    outputDirectory: androidOutput,
    artifactPaths: [androidArtifact],
  })

  if (!options.androidOnly) {
    run('npm', ['--prefix', 'hosts/capacitor', 'run', 'sync:ios'])
  }
  if (options.websiteRef !== undefined) {
    run('npm', [
      'run',
      'website:promotion:prepare',
      '--',
      '--release-id',
      metadata.releaseCandidateId,
      '--source-sha',
      sourceCommit,
      '--website-ref',
      options.websiteRef,
    ])
  }

  process.stdout.write(`\nLocal release ${metadata.releaseCandidateId} is ready.\n`)
  process.stdout.write(`Android: ${androidOutput}\n`)
  if (!options.androidOnly) {
    process.stdout.write(
      'iOS: open hosts/capacitor/ios/App/App.xcodeproj, then use Product > Archive and upload through Organizer.\n',
    )
  }
}

function requireMacOs(): void {
  if (process.platform !== 'darwin') {
    throw new Error('The protected local release command must run on the release Mac.')
  }
}

function requireCleanCheckout(): void {
  const status = git('status', '--porcelain')
  if (status.length > 0) {
    throw new Error(
      'The local release checkout is not clean. Commit or intentionally set aside changes before creating publishable artifacts.',
    )
  }
}

function readKeychainPassword(service: string): string {
  return execFileSync(
    '/usr/bin/security',
    ['find-generic-password', '-a', ANDROID_KEY_ALIAS, '-s', service, '-w'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] },
  ).trim()
}

function requireFile(path: string, label: string): void {
  if (!existsSync(path)) throw new Error(`${label} is missing at ${path}.`)
}

function git(...arguments_: string[]): string {
  return execFileSync('git', arguments_, {
    cwd: REPOSITORY_ROOT,
    encoding: 'utf8',
  }).trim()
}

function run(
  command: string,
  arguments_: readonly string[],
  additionalEnvironment: NodeJS.ProcessEnv = {},
  workingDirectory = REPOSITORY_ROOT,
): void {
  process.stdout.write(`\n> ${command} ${arguments_.join(' ')}\n`)
  const result = spawnSync(command, [...arguments_], {
    cwd: workingDirectory,
    env: { ...process.env, ...additionalEnvironment },
    stdio: 'inherit',
  })
  if (result.error !== undefined) throw result.error
  if (result.status !== 0) {
    throw new Error(`${command} failed with exit code ${result.status ?? 'unknown'}.`)
  }
}

const invokedPath = process.argv[1]
if (
  invokedPath !== undefined &&
  pathToFileURL(resolve(invokedPath)).href === import.meta.url
) {
  await runLocalRelease(parseLocalReleaseArguments(process.argv.slice(2)))
}
