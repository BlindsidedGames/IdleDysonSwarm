import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, basename } from 'node:path'
import { openChromiumPage, startProductionPreview, delay } from './performance/chromiumHarness'
import { parseCatalog } from '../src/promotions/catalog'

const root = process.cwd()
const bundled = parseCatalog(JSON.parse(readFileSync('src/promotions/bundled.json', 'utf8')))
const game = bundled.games.find(game => game.id === 'echoes')!
const banner = readFileSync(resolve('src/promotions/assets', basename(game.banner)))
const fixture = { ...bundled, revision: 'qa-remote', games: [{ ...game, id: 'qa-new-game',
  banner: '/promotions/images/qa-new-game.123456789abc.webp',
  copy: { en: { title: 'QA Remote Game', description: 'Downloaded catalog and artwork.' } },
}] }
const server = await startProductionPreview(root, 5198)
const page = await openChromiumPage({ id: 'promotions', width: 360, height: 780, deviceScaleFactor: 1, cpuThrottleRate: 1 }, server.url)
const errors: string[] = []
page.cdp.on<{ exceptionDetails: { text: string } }>('Runtime.exceptionThrown', event => errors.push(event.exceptionDetails.text))
const cache = `new Promise((resolve,reject)=>{const r=indexedDB.open('blindsided-promotions-v1',1);r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result;const tx=db.transaction('cache');const q=tx.objectStore('cache').get('current');q.onsuccess=()=>resolve(q.result&&({revision:q.result.catalog.revision,images:Object.keys(q.result.images)}));tx.oncomplete=()=>db.close()}})`
try {
  await page.cdp.send('Fetch.enable', { patterns: [{ urlPattern: 'https://www.blindsidedgames.com/promotions/*' }] })
  page.cdp.on<{ requestId: string; request: { url: string } }>('Fetch.requestPaused', event => {
    const json = event.request.url.endsWith('.json')
    void page.cdp.send('Fetch.fulfillRequest', { requestId: event.requestId, responseCode: 200,
      responseHeaders: [{ name: 'Content-Type', value: json ? 'application/json' : 'image/webp' }, { name: 'Access-Control-Allow-Origin', value: '*' }],
      body: (json ? Buffer.from(JSON.stringify(fixture)) : banner).toString('base64'),
    })
  })
  await page.navigate(server.url)
  let ready = false
  for (let i = 0; i < 100; i++) {
    const value = await page.evaluate<{ revision: string; images: string[] } | undefined>(cache)
    if (value?.revision === 'qa-remote' && value.images.length === 1) { ready = true; break }
    await delay(100)
  }
  if (!ready) throw new Error('Remote catalog and image were not persisted')
  await page.evaluate(`navigator.serviceWorker.ready.then(()=>true)`)
  for (let i=0;i<100 && !await page.evaluate('Boolean(navigator.serviceWorker.controller)');i++) await delay(100)
  if (!await page.evaluate('Boolean(navigator.serviceWorker.controller)')) throw new Error('PWA has no controlling worker')
  await page.cdp.send('Fetch.disable')
  await page.cdp.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 })
  await page.navigate(server.url)
  await page.evaluate(`document.documentElement.style.fontSize='130%'; Array.from(document.querySelectorAll('button')).find(b=>/Store/.test(b.getAttribute('aria-label')||b.textContent||''))?.click()`)
  await page.waitForSelector('.store-boost__browse')
  await page.evaluate(`document.querySelector('.store-boost__browse').click()`)
  await page.waitForSelector('.store-promo__banner img')
  await delay(200)
  const assertCard = async () => {
    const result = await page.evaluate<{ loaded: boolean; overflow: boolean; title: boolean }>(`({ loaded: Array.from(document.querySelectorAll('.store-promo__banner img')).some(i=>i.complete&&i.naturalWidth===960&&i.src.startsWith('blob:')), overflow: document.documentElement.scrollWidth>innerWidth, title: Array.from(document.querySelectorAll('.facility-details-dialog')).some(x=>x.textContent.includes('QA Remote Game')) || document.body.innerText.includes('QA Remote Game') })`)
    if (!result.loaded || result.overflow || !result.title) throw new Error(`Offline card failed: ${JSON.stringify(result)}`)
  }
  await assertCard()
  mkdirSync('output/diagnostics/promotions', { recursive: true })
  for (const stage of ['browse', 'claim']) {
    if (stage === 'claim') {
      await page.evaluate(`Array.from(document.querySelectorAll('button')).filter(b=>b.getAttribute('aria-label')==='Close').at(-1)?.click()`)
      await page.evaluate(`document.querySelector('.store-boost .store-surface__purchase-action').click()`)
      await delay(200)
      await assertCard()
    }
    const screenshot = await page.cdp.send<{ data: string }>('Page.captureScreenshot', { format: 'png' })
    writeFileSync(`output/diagnostics/promotions/${stage}-offline-360.png`, Buffer.from(screenshot.data, 'base64'))
  }
  await page.evaluate(`document.querySelector('.store-promo__actions .store-surface__purchase-action').click()`)
  await delay(200)
  if (await page.evaluate(`Boolean(document.querySelector('.store-promo__actions'))`)) throw new Error('Boost claim did not dismiss the card')
  if (!await page.evaluate(`document.querySelector('.store-boost__status')?.textContent.includes('remaining')`)) throw new Error('Boost was not applied offline')
  if (errors.length) throw new Error(errors.join('\n'))
  console.log('PASS: website-only new game + image, real IndexedDB, offline PWA reload, both views at 360px/130%, no overflow or runtime exceptions.')
} finally { await page.close(); await server.stop() }
