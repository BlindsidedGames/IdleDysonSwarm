import { mkdir, open, readFile, rename, stat, lstat, unlink } from 'node:fs/promises'
import { realpathSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
const hash = text => createHash('sha256').update(text).digest('hex')
const maximumBytes = 32*1024*1024
function validateSnapshot(text, namespace) {
  if (typeof text === 'string' && text.startsWith('IDLEDS:') && namespace !== 'idleds-modern-v1') throw new Error('IDLEDS Cloud publication requires an approved isolated account namespace')
  const prefix = namespace === 'idleds-modern-v1' ? 'IDLEDS:' : 'IDSWEB1:'
  if (typeof text !== 'string' || !text.startsWith(prefix) || Buffer.byteLength(text) > maximumBytes) throw new Error('Invalid portable Cloud snapshot')
}
async function rejectLinks(path) {
  let current = path
  while (true) {
    try { if ((await lstat(current)).isSymbolicLink()) throw new Error('Unsafe cloud path') } catch(error) { if(error.code !== 'ENOENT') throw error }
    const parent = dirname(current)
    if (parent === current) return
    current = parent
  }
}
async function read(path) {
  await rejectLinks(path)
  try {if ((await lstat(path)).isSymbolicLink() || (await stat(path)).size>maximumBytes) throw new Error('Unsafe cloud file');return await readFile(path,'utf8')}catch(error){if(error.code==='ENOENT')return null;throw error}
}
async function write(path,text,beforeReplace) {
  await rejectLinks(path)
  await mkdir(dirname(path),{recursive:true})
  const temporary=`${path}.${randomUUID()}.tmp`
  const handle=await open(temporary,'wx',0o600)
  try {await handle.writeFile(text);await handle.sync()}finally{await handle.close()}
  try {
    // Backup rotation and preparing/fsyncing the temporary file yield to
    // external writers. Check immediately before the destructive rename.
    await beforeReplace?.()
    await rename(temporary,path)
  } catch(error) {
    try { await unlink(temporary) } catch { /* Preserve the original failure. */ }
    throw error
  }
  let directory
  try { directory=await open(dirname(path),'r'); await directory.sync() }
  catch(error) { if(!['EINVAL','ENOTSUP','EPERM','EISDIR'].includes(error.code)) throw error }
  finally { await directory?.close() }
}
export class SteamCloud {
  constructor({userData,account,identity,choose,namespace}) {
    if (!/^\d{17}$/.test(account)) throw new Error('Steam identity unavailable')
    if (namespace !== undefined && !['idleds-classic-v1', 'idleds-modern-v1'].includes(namespace)) throw new Error('Unsupported mode Cloud namespace')
    mkdirSync(userData, {recursive:true})
    userData = realpathSync(userData)
    this.readSucceeded = false
    this.account=account;this.identity=identity;this.prompt=choose;this.namespace=namespace
    this.directory=join(userData,'steam-cloud',account)
    this.filePrefix=namespace === 'idleds-modern-v1' ? 'modern-' : ''
    this.localDirectory=join(userData,'steam-local',account,...(namespace ? [namespace] : []))
    this.marker=join(this.localDirectory,'cloud-sha256.txt')
    this.queue=Promise.resolve()
  }
  file(name){return join(this.directory,this.filePrefix+name)}
  ensureIdentity(){if(this.identity()!==this.account)throw new Error('Steam account changed; restart before saving to Cloud')}
  /** Upgrade evidence only: no acknowledgement, marker or download writes. */
  async readHistorical(){
    this.ensureIdentity()
    return await read(this.file('current.idsw'))
  }
  async readForUpgrade(){ return this.readHistorical() }
  async readBackupsForUpgrade(){ return this.readHistoricalBackups() }
  async readHistoricalBackups(){
    this.ensureIdentity()
    const texts=[]
    for(let index=1;index<=3;index++) { const text=await read(this.file(`backup-${index}.idsw`)); if(text!==null)texts.push(text) }
    return texts
  }
  async read(){
    this.readSucceeded = false
    this.downloadedHash = null
    this.ensureIdentity()
    const text=await read(this.file('current.idsw'))
    const changed=text!==null&&hash(text)!==await read(this.marker)
    if(changed) await write(join(this.localDirectory,'downloads',`${hash(text)}.idsw`),text)
    this.downloadedHash = changed ? hash(text) : null
    this.readSucceeded = true
    return changed?text:null
  }
  async readBackups(){
    this.ensureIdentity()
    const texts=[]
    for(let index=1;index<=3;index++) {
      try { const text=await read(this.file(`backup-${index}.idsw`)); if(text!==null) texts.push(text) }
      catch { /* Keep unreadable backups untouched and try the next candidate. */ }
    }
    return texts
  }
  async acknowledge(text){
    // A recovered download may have a damaged header. Acknowledge its exact
    // bytes after recovery, without treating them as a publishable snapshot.
    if(typeof text !== 'string' || Buffer.byteLength(text)>maximumBytes) throw new Error('Invalid Cloud acknowledgement')
    this.ensureIdentity()
    if(await read(this.file('current.idsw'))!==text) throw new Error('Cloud changed before acknowledgement; restart to resolve it')
    await write(this.marker,hash(text),async()=>{
      this.ensureIdentity()
      if(await read(this.file('current.idsw'))!==text) throw new Error('Cloud changed before acknowledgement; restart to resolve it')
    })
  }
  async choose(local,remote){
    validateSnapshot(local,this.namespace);validateSnapshot(remote,this.namespace)
    this.ensureIdentity()
    const folder=join(this.localDirectory,'conflicts',randomUUID())
    await write(join(folder,'local.idsw'),local);await write(join(folder,'cloud.idsw'),remote)
    // A normal handoff changes only the remote branch of the last synced
    // snapshot. Unknown baselines, local progress, and backup recovery still
    // require a choice; never infer recency from device clocks.
    if (this.readSucceeded && hash(remote) === this.downloadedHash && hash(local) === await read(this.marker)) return 'cloud'
    return this.prompt(local,remote)
  }
  publish(text){
    try { validateSnapshot(text,this.namespace) } catch(error) { return Promise.reject(error) }
    const run=this.queue.then(async()=>{
      this.ensureIdentity()
      if(!this.readSucceeded) throw new Error('Cloud startup read failed; publication disabled')
      const current=this.file('current.idsw')
      const previousCurrent=await read(current)
      if(previousCurrent===text){await this.acknowledge(text);return}
      if(previousCurrent!==null && hash(previousCurrent)!==await read(this.marker)) throw new Error('Cloud changed before publication; restart to resolve it')
      for(let i=3;i>=1;i--){const source=i===1?current:this.file(`backup-${i-1}.idsw`);const previous=await read(source);if(previous!==null)await write(this.file(`backup-${i}.idsw`),previous)}
      await write(current,text,async()=>{
        this.ensureIdentity()
        if(await read(current)!==previousCurrent) throw new Error('Cloud changed during publication; restart to resolve it')
      })
      await this.acknowledge(text)
    })
    this.queue=run.catch(()=>undefined);return run
  }
}
