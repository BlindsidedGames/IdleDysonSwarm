import { mkdir, readFile, writeFile, open, rename, lstat, realpath } from 'node:fs/promises'
import { resolve, relative, dirname, isAbsolute } from 'node:path'

const maximumBytes = 32 * 1024 * 1024
function safePath(root, path) {
  if (typeof path !== 'string' || !path || path.includes('\0') || path.includes('\\') || isAbsolute(path) || /^[a-z]:/i.test(path) || path.split('/').some(part => !part || part === '.' || part === '..')) throw Error('Unsafe mode file path')
  return resolve(root, path)
}
async function noLinks(path) {
  for (let current = path; ; current = dirname(current)) {
    try { if ((await lstat(current)).isSymbolicLink()) throw Error('Mode storage cannot traverse symbolic links') }
    catch (error) { if (error.code !== 'ENOENT') throw error }
    if (dirname(current) === current) return
  }
}
async function syncDirectory(path) {
  let handle
  try { handle = await open(path, 'r'); await handle.sync() }
  catch (error) { if (!['EINVAL', 'ENOTSUP', 'EPERM', 'EISDIR'].includes(error.code)) throw error }
  finally { await handle?.close() }
}
function files(root, writable) {
  const locate = async path => { const target = safePath(root, path); await noLinks(target); return target }
  const readText = async path => {
    const target = await locate(path), info = await lstat(target)
    if (!info.isFile() || info.size > maximumBytes) throw Error('Unsupported mode save file')
    return readFile(target, 'utf8')
  }
  const reader = { async exists(path) { try { const info = await lstat(await locate(path)); if (!info.isFile()) throw Error('Mode path is not a file'); return true } catch (error) { if (error.code === 'ENOENT') return false; throw error } }, readText }
  if (!writable) return Object.freeze(reader)
  const writeText = async (path, text) => {
    if (typeof text !== 'string' || Buffer.byteLength(text) > maximumBytes) throw Error('Mode save exceeds size limit')
    const target = await locate(path)
    await mkdir(dirname(target), { recursive: true }); await noLinks(target)
    await writeFile(target, text, { mode: 0o600 })
    const handle = await open(target, 'r'); try { await handle.sync() } finally { await handle.close() }
    await syncDirectory(dirname(target))
  }
  return Object.freeze({ ...reader, writeText, copy: async (a, b) => writeText(b, await readText(a)),
    async replaceAtomically(a, b) {
      const source = await locate(a), destination = await locate(b)
      if (source === destination) throw Error('Atomic replacement requires distinct mode paths')
      await readText(a)
      await mkdir(dirname(destination), { recursive: true }); await noLinks(destination)
      const handle = await open(source, 'r'); try { await handle.sync() } finally { await handle.close() }
      await rename(source, destination); await syncDirectory(dirname(destination))
      if (dirname(source) !== dirname(destination)) await syncDirectory(dirname(source))
    },
  })
}

/** Host-process binding; paths never originate in renderer input. It is not
 * registered on IPC or selected by the existing beta launch. Production root
 * selection remains behind baseline/acceptance gates. Tests use mkdtemp roots. */
export async function bindElectronModeFiles({ destination, publicClassic, modernBeta, discoverUnity }) {
  const roots = [destination, publicClassic, modernBeta].map(path => {
    if (typeof path !== 'string' || !isAbsolute(path)) throw Error('Mode roots require absolute host-owned paths')
    return resolve(path)
  })
  for (const root of roots) await noLinks(root)
  for (const a of roots) for (const b of roots) if (a !== b && (!relative(a, b).startsWith('..') || !relative(b, a).startsWith('..'))) throw Error('Mode storage roots must not overlap')
  if (new Set(roots).size !== 3) throw Error('Mode storage roots must be distinct')
  await mkdir(roots[0], { recursive: true })
  const destinationRoot = await realpath(roots[0])
  return { destination: { namespace: 'idleds-dual-modes-v1', files: files(destinationRoot, true) },
    publicClassic: { namespace: 'web-runtime-v1', files: files(roots[1], false) },
    modernBeta: { namespace: 'idleds-rework-beta-v1', files: files(roots[2], false) },
    unity: { discoverCandidates: discoverUnity },
  }
}
