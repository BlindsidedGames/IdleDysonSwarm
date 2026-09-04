import { readFile, access, writeFile, mkdir, rename } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { resolve, join } from 'node:path'
import { parse } from 'yaml'
import { build, Platform, Arch } from 'electron-builder'
const target = process.argv[2]
const targets = { windows: [Platform.WINDOWS, Arch.x64, 'win32-x64'], linux: [Platform.LINUX, Arch.x64, 'linux-x64'], macos: [Platform.MAC, Arch.universal, 'darwin-universal'] }
if (!targets[target]) throw new Error('Specify windows, linux or macos')
const [platform, arch, nativeTarget] = targets[target]
const nativeRoot = resolve('hosts/electron/steam/runtime', nativeTarget)
const library = target === 'windows' ? 'steam_api64.dll' : target === 'linux' ? 'libsteam_api.so' : 'libsteam_api.dylib'
await access(join(nativeRoot, 'ids_steam.node')); await access(join(nativeRoot, library))
const binary = execFileSync('file', [join(nativeRoot, 'ids_steam.node')], { encoding: 'utf8' })
if (target === 'windows' ? !binary.includes('PE32+') : target === 'linux' ? !binary.includes('ELF 64-bit') : !binary.includes('universal binary')) throw new Error('Wrong native addon format')
const config = parse(await readFile('hosts/electron/electron-builder.yml', 'utf8'))
// Let the builder fetch the target runtime, not copy this Mac's installed Electron.
delete config.electronDist
config.extraResources = [{ from: nativeRoot, to: 'steam', filter: ['ids_steam.node', library] }]
config.directories.output = `release/steam/${target}`
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
config.extraMetadata = { idsDesktopDistribution: 'steam', idsSourceCommit: commit }
// Renderer ASAR is architecture-neutral; native binaries live in extraResources.
if(target === 'macos') config.mac.mergeASARs = false
if(target === 'windows') config.win.signAndEditExecutable = false
await build({ targets: platform.createTarget('dir', arch), config, publish: 'never' })
if(target === 'linux') {
  const packageInfo = JSON.parse(await readFile('package.json', 'utf8'))
  const unpacked = join(config.directories.output, 'linux-unpacked')
  await rename(join(unpacked, packageInfo.name), join(unpacked, 'Idle Dyson Swarm.x86_64'))
}
await mkdir(config.directories.output, { recursive: true })
await writeFile(join(config.directories.output, 'provenance.json'), JSON.stringify({ sourceCommit: commit, target, nativeTarget, builtAt: new Date().toISOString(), steamBuildId: null }, null, 2)+'\n')
