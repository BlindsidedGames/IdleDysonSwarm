import { mkdir, open, readFile, rename, stat, lstat } from 'node:fs/promises'
import { realpathSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
const hash = text => createHash('sha256').update(text).digest('hex')
const maximumBytes = 32*1024*1024
function validateSnapshot(text) {
  if (typeof text !== 'string' || !text.startsWith('IDSWEB1:') || Buffer.byteLength(text) > maximumBytes) throw new Error('Invalid portable Cloud snapshot')
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
async function write(path,text) {
  await rejectLinks(path)
  await mkdir(dirname(path),{recursive:true})
  const temporary=`${path}.${randomUUID()}.tmp`
  const handle=await open(temporary,'wx',0o600)
  try {await handle.writeFile(text);await handle.sync()}finally{await handle.close()}
  await rename(temporary,path)
  let directory
  try { directory=await open(dirname(path),'r'); await directory.sync() }
  catch(error) { if(!['EINVAL','ENOTSUP','EPERM','EISDIR'].includes(error.code)) throw error }
  finally { await directory?.close() }
}
export class SteamCloud {
  constructor({userData,account,identity,choose}) {
    if (!/^\d{17}$/.test(account)) throw new Error('Steam identity unavailable')
    mkdirSync(userData, {recursive:true})
    userData = realpathSync(userData)
    this.readSucceeded = false
    this.account=account;this.identity=identity;this.prompt=choose
    this.directory=join(userData,'steam-cloud',account)
    this.localDirectory=join(userData,'steam-local',account)
    this.marker=join(this.localDirectory,'cloud-sha256.txt')
    this.queue=Promise.resolve()
  }
  ensureIdentity(){if(this.identity()!==this.account)throw new Error('Steam account changed; restart before saving to Cloud')}
  async read(){
    this.readSucceeded = false
    this.downloadedHash = null
    this.ensureIdentity()
    const text=await read(join(this.directory,'current.idsw'))
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
      try { const text=await read(join(this.directory,`backup-${index}.idsw`)); if(text!==null) texts.push(text) }
      catch { /* Keep unreadable backups untouched and try the next candidate. */ }
    }
    return texts
  }
  async acknowledge(text){
    // A recovered download may have a damaged header. Acknowledge its exact
    // bytes after recovery, without treating them as a publishable snapshot.
    if(typeof text !== 'string' || Buffer.byteLength(text)>maximumBytes) throw new Error('Invalid Cloud acknowledgement')
    this.ensureIdentity();await write(this.marker,hash(text))
  }
  async choose(local,remote){
    validateSnapshot(local);validateSnapshot(remote)
    this.ensureIdentity()
    const folder=join(this.localDirectory,'conflicts',randomUUID())
    await write(join(folder,'local.idsw'),local);await write(join(folder,'cloud.idsw'),remote)
    // A normal handoff changes only the remote branch of the last synced
    // snapshot. Unknown baselines, local progress, and backup recovery still
    // require a choice; never infer recency from device clocks.
    if (this.readSucceeded && hash(remote) === this.downloadedHash && hash(local) === await read(this.marker)) return 'cloud'
    return this.prompt()
  }
  publish(text){
    try { validateSnapshot(text) } catch(error) { return Promise.reject(error) }
    const run=this.queue.then(async()=>{
      this.ensureIdentity()
      if(!this.readSucceeded) throw new Error('Cloud startup read failed; publication disabled')
      const current=join(this.directory,'current.idsw')
      if(await read(current)===text){await this.acknowledge(text);return}
      for(let i=3;i>=1;i--){const source=i===1?current:join(this.directory,`backup-${i-1}.idsw`);const previous=await read(source);if(previous!==null)await write(join(this.directory,`backup-${i}.idsw`),previous)}
      await write(current,text);await this.acknowledge(text)
    })
    this.queue=run.catch(()=>undefined);return run
  }
}
