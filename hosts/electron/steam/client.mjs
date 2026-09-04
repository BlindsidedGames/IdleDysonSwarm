import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
const require = createRequire(import.meta.url)
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
export async function until(read, done, timeout = 10000) {
  const deadline = Date.now() + timeout
  do { const value = read(); if (done(value)) return value; await sleep(50) } while (Date.now() < deadline)
  throw new Error('Steam operation timed out')
}
export function loadSteamClient({ distribution, runtimeDirectory = fileURLToPath(new URL('./runtime/', import.meta.url)) }) {
  if (distribution !== 'steam') return null
  try {
    const native = require(`${runtimeDirectory}/ids_steam.node`)
    native.initialize()
    const boundNative = bindSteamAccount(native)
    const timer = setInterval(() => { try { native.pump() } catch { /* Operation reports failure. */ } }, 50)
    timer.unref()
    return { native: boundNative, close() { clearInterval(timer); native.clearPresence(); native.shutdown() } }
  } catch (error) { console.warn('Steam services unavailable:', error.message); return null }
}
/** A running game never publishes the previous player's state to a new account. */
export function bindSteamAccount(native) {
  const account = native.identity()
  if (!/^\d{17}$/.test(account)) throw new Error('Steam identity unavailable')
  let changed = false
  return new Proxy(native, {
    get(target, key) {
      const method = target[key]
      if (typeof method !== 'function') return method
      return (...args) => {
        if (target.identity() !== account) changed = true
        if (changed) throw new Error('Steam account changed; restart the game')
        return method(...args)
      }
    },
  })
}
const statMap = Object.freeze({
  'stat.highest_bot_exponent': 'HIGHEST_BOT_EXPONENT',
  'stat.highest_influence_exponent': 'HIGHEST_INFLUENCE_EXPONENT',
  'stat.skill_points_assigned': 'SKILL_POINTS_ASSIGNED',
  'stat.avotation_secrets_found': 'SECRETS_FOUND',
  'stat.secrets_of_universe': 'SECRETE_OF_THE_UNIVERSE',
})
export async function createSteamPublication(client, { readDeveloperOptions = async () => false } = {}) {
  const map = JSON.parse(await readFile(new URL('./achievement-map.json', import.meta.url), 'utf8'))
  return new SteamPublication(client?.native ?? null, map, readDeveloperOptions)
}
export class SteamPublication {
  constructor(native, map, readDeveloperOptions = async () => false) {
    this.native = native; this.map = map; this.readDeveloperOptions = readDeveloperOptions
    this.scheduled = false; this.sessionSeconds = 0; this.playBase = null; this.lastClock = performance.now();
    this.clock = setInterval(() => { const now = performance.now(); const elapsed = (now-this.lastClock)/1000; this.lastClock=now; if (elapsed > 0 && elapsed < 5) this.sessionSeconds += elapsed },1000); this.clock.unref();
    this.account = null; this.pending = new Set(); this.statistics = {}; this.presence = ''; this.queue = Promise.resolve(); this.dirty = false
    this.timer = setInterval(() => { void this.flush().catch(() => undefined) }, 30000); this.timer.unref()
  }
  async available() { try { return this.native !== null && Boolean(this.identity()) } catch { return false } }
  validate(facts) {
    if (!facts || !Array.isArray(facts.unlocked) || facts.unlocked.length > 27 || !facts.statistics || typeof facts.statistics !== 'object' || typeof facts.presence !== 'string' || facts.presence.length > 100) throw new Error('Invalid achievement facts')
    if (facts.progression !== undefined) {
      const p = facts.progression
      if (!p || !['bots','avocadoMultiplier'].every(key => Number.isFinite(p[key]) && p[key] >= 0) || !['infinityPoints','quantumPoints'].every(key => typeof p[key] === 'string' && /^\d{1,20}$/.test(p[key])) || typeof p.realityUnlocked !== 'boolean' || typeof p.avocadoUnlocked !== 'boolean') throw new Error('Invalid presence facts')
    }
    for (const id of facts.unlocked) if (!Object.hasOwn(this.map,id)) throw new Error('Unknown achievement')
    for (const [id, value] of Object.entries(facts.statistics)) if (!Object.hasOwn(statMap,id) || !Number.isInteger(value) || value < 0 || value > 2147483647) throw new Error('Invalid statistic')
  }
  identity() {
    const id = this.native.identity()
    if (!/^\d{17}$/.test(id)) throw new Error('Steam identity unavailable')
    if (this.account !== id) {this.account = id; this.pending.clear(); this.statistics = {}; this.dirty=false; this.playBase=null;this.sessionSeconds=0}
    return id
  }
  submit(facts) {
    this.validate(facts)
    if (!this.native) return Promise.resolve()
    this.identity()
    for (const id of facts.unlocked) this.pending.add(id)
    for (const [id,value] of Object.entries(facts.statistics)) this.statistics[id] = id === 'stat.skill_points_assigned' ? value : Math.max(value,this.statistics[id] ?? 0)
    this.presence = facts.progression ? formatPresence(facts.progression) : facts.presence
    if (!this.scheduled) {
      this.scheduled = true
      this.scheduledTimer = setTimeout(() => { this.scheduled=false; void this.flush().catch(() => undefined) },1000)
      this.scheduledTimer.unref()
    }
    return Promise.resolve()
  }
  flush() {
    const run = this.queue.then(async () => {
      if (!this.native) return
      const account = this.identity()
      const developer = await this.readDeveloperOptions()
      if (this.native.identity() !== account) { this.identity(); return }
      for (const id of this.pending) {
        if (id === 'achievement.developer_options' && !developer) { this.pending.delete(id); continue }
        if (this.native.achievement(this.map[id])) this.pending.delete(id)
        else if (this.native.unlock(this.map[id])) {this.pending.delete(id);this.dirty=true}
      }
      for (const [id,value] of Object.entries(this.statistics)) {
        const remote = this.native.stat(statMap[id], 'int')
        const target = id === 'stat.skill_points_assigned' ? value : Math.max(remote,value)
        if (target !== remote && this.native.setStat(statMap[id], target, 'int')) this.dirty=true
      }
      const playTime = this.native.stat('TOTAL_PLAY_TIME', 'float')
      if (this.playBase === null) this.playBase = playTime
      const targetTime = Math.max(playTime, this.playBase + this.sessionSeconds)
      if (targetTime > playTime && this.native.setStat('TOTAL_PLAY_TIME', targetTime, 'float')) this.dirty=true
      this.native.presence(this.presence)
      if (!this.dirty || !this.native.storeStats()) return
      const result = await until(() => this.native.storedResult(), value => value !== 0, 2000)
      if (result !== 1) throw new Error('Steam statistics storage failed')
      this.dirty=false
    })
    this.queue = run.catch(() => undefined)
    return run
  }
  close() {clearInterval(this.timer);clearInterval(this.clock);clearTimeout(this.scheduledTimer)}
}
export function formatPresence(p) {
  const number = value => {
    if (value === Number.MAX_VALUE) return 'MAX'
    if (value < 1000) return value.toFixed(0)
    if (value >= 1e15) return value.toExponential(2)
    const group=Math.floor(Math.log10(value)/3)
    return `${(value/10**(group*3)).toFixed(2)}${['','K','M','B','T'][group]}`
  }
  if (p.avocadoUnlocked) return `${number(p.avocadoMultiplier)}x Avocado | ${p.quantumPoints} QP`
  if (p.realityUnlocked) return `Reality | ${p.quantumPoints} QP`
  if (BigInt(p.quantumPoints)>0n) return `${p.quantumPoints} QP | ${p.infinityPoints} IP`
  if (BigInt(p.infinityPoints)>0n) return `${p.infinityPoints} IP | ${number(p.bots)} Bots`
  return `${number(p.bots)} Bots`
}
export function inventoryBinding(client) {
  if (!client) return null
  const native = client.native
  const identity = () => native.identity()
  const items = async () => {
    const account = identity(); const handle = native.inventory()
    try {
      const result = await until(() => native.inventoryResult(handle), r => r.status !== 22)
      if (result.status !== 1 || identity() !== account) throw new Error('Inventory unavailable')
      return result.items
    } finally { native.destroyResult(handle) }
  }
  return {
    getAuthenticatedSteamId: async () => identity(),
    getAllItems: items,
    async requestLocalizedPrices(ids) {
      const call = native.requestPrices()
      const result = await until(() => native.callResult(call, 'prices'), r => !r.pending)
      if (result.result !== 1) throw new Error('Prices unavailable')
      return ids.map(itemDefId => ({itemDefId,localizedPrice:formatSteamPrice(native.price(itemDefId),result.currency)}))
    },
    async startPurchase(itemDefId) {
      const account = identity()
      const count = rows => rows.filter(r => r.itemDefId === itemDefId).reduce((sum,r) => sum+r.quantity,0)
      const before = count(await items())
      const call = native.startPurchase(itemDefId)
      const result = await until(() => native.callResult(call,'purchase'),r => !r.pending)
      if (result.result !== 1) return {status:result.result===52 ? 'cancelled':'failed'}
      const deadline = Date.now()+120000
      do {
        if (identity() !== account) return {status:'failed'}
        if (count(await items()) > before) return {status:'completed'}
        await sleep(1000)
      } while(Date.now()<deadline)
      return {status:'pending'}
    },
  }
}

/** Steam prices use hundredths even for JPY and KWD (unlike ISO minor units). */
export function formatSteamPrice(amount, currency, locale) {
  if (!Number.isSafeInteger(amount) || amount < 0 || !/^[A-Z]{3}$/.test(currency)) throw new Error('Invalid Steam price')
  return new Intl.NumberFormat(locale,{style:'currency',currency}).format(amount/100)
}
