import { createHash, randomUUID } from 'node:crypto'
import { lstat, mkdir, open, readFile, readdir, rename } from 'node:fs/promises'
import { dirname, join } from 'node:path'

const stateFile = 'offline-profile.json'
const maximumFileBytes = 32 * 1024 * 1024
const maximumProfileBytes = 256 * 1024 * 1024
const fingerprintPattern = /^[a-f0-9]{64}$/
const recoveryPattern = /^[a-f0-9-]{36}$/

async function rejectLinks(path) {
  for (let cursor = path; ; cursor = dirname(cursor)) {
    try {
      if ((await lstat(cursor)).isSymbolicLink()) throw new Error('Unsafe offline save path')
    } catch (error) { if (error.code !== 'ENOENT') throw error }
    if (dirname(cursor) === cursor) return
  }
}

async function syncDirectory(path) {
  let handle
  try { handle = await open(path, 'r'); await handle.sync() }
  catch (error) { if (!['EINVAL', 'ENOTSUP', 'EPERM', 'EISDIR'].includes(error.code)) throw error }
  finally { await handle?.close() }
}

async function writeDurably(path, bytes) {
  await mkdir(dirname(path), { recursive: true })
  const handle = await open(path, 'wx', 0o600)
  try { await handle.writeFile(bytes); await handle.sync() }
  finally { await handle.close() }
  await syncDirectory(dirname(path))
}

async function writeSelection(accountDirectory, state) {
  const temporary = join(accountDirectory, `${stateFile}.${randomUUID()}.tmp`)
  await writeDurably(temporary, JSON.stringify(state))
  await rename(temporary, join(accountDirectory, stateFile))
  await syncDirectory(accountDirectory)
}

async function readProfile(root) {
  await rejectLinks(root)
  const files = []
  let totalBytes = 0
  async function visit(relative, depth) {
    if (depth > 12) throw new Error('Offline save directory is too deep')
    let info
    const path = join(root, relative)
    try { info = await lstat(path) } catch (error) { if (error.code === 'ENOENT') return; throw error }
    if (info.isSymbolicLink()) throw new Error('Unsafe offline save path')
    if (info.isDirectory()) {
      const children = (await readdir(path)).sort()
      for (const name of children) await visit(join(relative, name), depth + 1)
      return
    }
    if (!info.isFile() || info.size > maximumFileBytes) throw new Error('Invalid offline save file')
    totalBytes += info.size
    if (totalBytes > maximumProfileBytes || files.length >= 256) throw new Error('Offline save profile is too large')
    const bytes = await readFile(path)
    files.push({ relative, bytes })
  }
  // Copy the complete save/recovery transaction, including pending checkpoints
  // and Stored Time journals. Diagnostics and entitlement caches are excluded.
  for (const folder of ['save', 'backups', 'recovery']) await visit(folder, 0)
  return files
}

/** Select an account-owned copy; never overwrite either original profile. */
export async function selectSteamSaveRoot({ offlineRoot, accountDirectory, ensureIdentity, choose }) {
  ensureIdentity()
  await rejectLinks(accountDirectory)
  await mkdir(accountDirectory, { recursive: true })
  const statePath = join(accountDirectory, stateFile)
  await rejectLinks(statePath)
  let state = { version: 1, recovery: null, handledFingerprint: null }
  let hasSelection = false
  try {
    if ((await lstat(statePath)).size > 4096) throw new Error('Invalid offline profile selection')
    state = JSON.parse(await readFile(statePath, 'utf8'))
    hasSelection = true
    if (state?.version !== 1 ||
        !(state.recovery === null || recoveryPattern.test(state.recovery)) ||
        !(state.handledFingerprint === null || fingerprintPattern.test(state.handledFingerprint))) {
      throw new Error('Invalid offline profile selection')
    }
  } catch (error) { if (error.code !== 'ENOENT') throw error }
  const recoveryDirectory = join(accountDirectory, 'offline-recovery')
  await rejectLinks(recoveryDirectory)
  if (!hasSelection) {
    try {
      if ((await readdir(recoveryDirectory)).length > 0) throw new Error('Offline profile selection is missing')
    } catch (error) { if (error.code !== 'ENOENT') throw error }
  }
  const selectedRoot = state.recovery === null
    ? join(accountDirectory, 'web-runtime-v1')
    : join(accountDirectory, 'offline-recovery', state.recovery, 'web-runtime-v1')
  await rejectLinks(selectedRoot)
  // A missing selected profile must not silently become a fresh game.
  if (state.recovery !== null && !(await lstat(selectedRoot)).isDirectory()) throw new Error('Recovered offline profile is missing')
  const files = await readProfile(offlineRoot)
  const hasCheckpoint = files.some(({ relative }) =>
    /^(save|backups)[/\\]idle_dyson_swarm_web_save(?:\.[123])?\.idsw(?:\.tmp)?$/.test(relative))
  if (!hasCheckpoint) return selectedRoot
  const hash = createHash('sha256')
  for (const { relative, bytes } of files) hash.update(JSON.stringify([relative, bytes.length])).update(bytes)
  const fingerprint = hash.digest('hex')
  if (fingerprint === state.handledFingerprint) return selectedRoot
  const choice = await choose()
  ensureIdentity()
  if (choice === 'later') return selectedRoot
  if (choice !== 'offline' && choice !== 'account') throw new Error('Invalid offline save choice')
  let root = selectedRoot
  let recovery = state.recovery
  if (choice === 'offline') {
    // Commit the old selection first. A crash while copying can then retry;
    // loss of the selection file later cannot silently load an older profile.
    if (!hasSelection) await writeSelection(accountDirectory, state)
    recovery = randomUUID()
    root = join(accountDirectory, 'offline-recovery', recovery, 'web-runtime-v1')
    await rejectLinks(root)
    for (const { relative, bytes } of files) await writeDurably(join(root, relative), bytes)
    // Persist every new directory entry before committing the root pointer.
    const directories = new Set()
    for (const { relative } of files) {
      for (let path = dirname(join(root, relative)); path !== accountDirectory; path = dirname(path)) directories.add(path)
    }
    for (const path of [...directories].sort((a, b) => b.length - a.length)) await syncDirectory(path)
  }
  ensureIdentity()
  await writeSelection(accountDirectory, { version: 1, recovery, handledFingerprint: fingerprint })
  return root
}
