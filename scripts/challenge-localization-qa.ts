import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { startDevelopmentServer, openChromiumPage, delay } from './performance/chromiumHarness'
import { importSaveThroughSettings } from './performance/browserFixtureImport'

// Synthetic save only, disposable profile, sandbox enabled, mock Keychain and loopback-only requests.
const output = process.env.CHALLENGE_QA_OUTPUT ?? 'output/challenge-localization'
mkdirSync(output, { recursive: true })
const port = 5199
const server = await startDevelopmentServer(process.cwd(), port)
const page = await openChromiumPage({ id: 'challenge-localization', width: 1280, height: 900, deviceScaleFactor: 1, cpuThrottleRate: 1 }, server.url).catch(async error => { await server.stop(); throw error })
const errors: string[] = [], results: unknown[] = [], captures: string[] = []
page.cdp.on<{ exceptionDetails: { text: string } }>('Runtime.exceptionThrown', p => errors.push(p.exceptionDetails.text))
await page.cdp.send('Fetch.enable', { patterns: [{ urlPattern: '*', requestStage: 'Request' }] })
page.cdp.on<{ requestId: string; request: { url: string } }>('Fetch.requestPaused', p => {
  const local = p.request.url.startsWith(`http://127.0.0.1:${port}/`) || p.request.url.startsWith('data:') || p.request.url.startsWith('blob:')
  void page.cdp.send(local ? 'Fetch.continueRequest' : 'Fetch.failRequest', local ? { requestId: p.requestId } : { requestId: p.requestId, errorReason: 'BlockedByClient' })
})
async function capture(id: string) {
  const png = await page.cdp.send<{ data: string }>('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  writeFileSync(`${output}/${id}.png`, Buffer.from(png.data, 'base64')); captures.push(`${id}.png`)
}
async function openChallenges() {
  await page.evaluate(`document.querySelector('[data-navigation-id="challenges"] .dyson-navigation__link')?.click()`)
  await page.waitForSelector('.challenges-surface', 30000)
  await page.evaluate(`document.querySelector('.challenges-surface > .ui-collapsible-section > h2 > button[aria-expanded="false"]')?.click()`)
  await delay(200)
}
async function inspect(id: string) {
  const value = await page.evaluate<{ id: string; locale: string; dir: string; cards: number; overflow: boolean; minimumWidth: number; minimumHeight: number; unnamed: number; clipped: string[] }>(`(() => {
    const root=document.querySelector('.challenges-surface'),buttons=[...root.querySelectorAll('button')].filter(b=>b.getClientRects().length), bounds=buttons.map(b=>b.getBoundingClientRect());
    const texts=[...root.querySelectorAll('button,p,h3,.ui-collapsible-section__title')].filter(e=>e.getClientRects().length);
    const action=root.querySelector('article button:not(:disabled)'),style=action&&getComputedStyle(action);
    return {id:${JSON.stringify(id)},locale:document.documentElement.dataset.locale,dir:document.documentElement.dir,cards:root.querySelectorAll('article').length,overflow:document.documentElement.scrollWidth>innerWidth,minimumWidth:Math.min(...bounds.map(r=>r.width)),minimumHeight:Math.min(...bounds.map(r=>r.height)),unnamed:buttons.filter(b=>!(b.getAttribute('aria-label')||b.textContent||'').trim()).length,clipped:texts.filter(b=>b.scrollWidth>b.clientWidth+1).map(b=>b.textContent),actionStyle:style&&{color:style.color,background:style.backgroundColor,image:style.backgroundImage,opacity:style.opacity,fontSize:style.fontSize,fontWeight:style.fontWeight}}
  })()`)
  results.push(value)
  if (value.cards !== 9 || value.overflow || value.minimumWidth < 43.99 || value.minimumHeight < 43.99 || value.unnamed || value.clipped.length) throw Error(`Challenge layout/accessibility failed: ${JSON.stringify(value)}`)
}
async function metrics(width: number, height: number, text = 1) {
  await page.cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 768 })
  await page.evaluate(`document.documentElement.style.fontSize=${JSON.stringify(`${text * 100}%`)}`)
  await delay(500)
}
async function reach(selector: string) {
  await page.evaluate(`document.querySelector(${JSON.stringify(selector)})?.scrollIntoView({block:'end'})`)
  await delay(300)
  const reachable = await page.evaluate<boolean>(`(() => {const b=document.querySelector(${JSON.stringify(selector)}),r=b?.getBoundingClientRect();if(!r)return false;const x=r.left+r.width/2,y=r.top+r.height/2;return x>=0&&x<innerWidth&&y>=0&&y<innerHeight&&b.contains(document.elementFromPoint(x,y))})()`)
  if(!reachable)throw Error(`Visible target is occluded or unreachable: ${selector}`)
}
async function key(key: string, code: string, keyCode: number) {
  await page.cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: keyCode, ...(key === 'Enter' ? { text: '\r', unmodifiedText: '\r' } : {}) })
  await page.cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: keyCode })
  await delay(100)
}
try {
  await page.navigate(server.url); await page.waitForSelector('.dyson-shell', 30000)
  const saveText = readFileSync(`${output}/synthetic-save.txt`, 'utf8')
  await importSaveThroughSettings(page, { saveText, saveSha256: createHash('sha256').update(saveText).digest('hex') })
  for (const locale of (process.env.CHALLENGE_QA_LOCALES?.split(',') ?? ['fr','de','es-419','pt-BR','ru','ja','zh-CN','en-XA','ar-XB'])) {
    await metrics(1280, 900)
    await page.evaluate(`localStorage.setItem('idle-dyson-swarm.presentation-locale',${JSON.stringify(locale)})`)
    await page.cdp.send('Page.navigate', { url: server.url }); await page.waitForSelector('.dyson-shell', 30000); await openChallenges()
    console.log(`Inspecting ${locale}`)
    await inspect(`${locale}-desktop`); await capture(`${locale}-desktop`)
    // Check translated rule disclosure, and keyboard opening/cancelling of restart confirmation.
    await page.evaluate(`document.querySelector('.challenges-surface .ui-collapsible-section .ui-collapsible-section button[aria-expanded="false"]')?.click(); document.querySelector('.challenges-surface article button')?.focus()`)
    await key('Enter', 'Enter', 13)
    if (!await page.evaluate<boolean>(`!!document.querySelector('.infinity-challenge-card__confirmation')`)) throw Error(`${locale}: keyboard failed to open confirmation`)
    if (!await page.evaluate<boolean>(`document.activeElement===document.querySelector('.infinity-challenge-card__actions button:first-child')`)) throw Error(`${locale}: confirmation did not receive keyboard focus`)
    await metrics(360, 800, 1.3)
    await reach('.infinity-challenge-card__actions button:last-child')
    await inspect(`${locale}-mobile-confirmation`); await capture(`${locale}-mobile-confirmation`)
    await page.evaluate(`document.querySelector('.infinity-challenge-card__actions button:last-child')?.click()`)
    if (!await page.evaluate<boolean>(`document.activeElement===document.querySelector('.challenges-surface article button')`)) throw Error(`${locale}: Cancel lost focus`)
    await reach('.challenges-surface article:last-child button')
    await inspect(`${locale}-mobile-last`); await capture(`${locale}-mobile-last`)
    if (['de','ru','ja','ar-XB'].includes(locale)) {
      await metrics(320,800,2); await reach('.challenges-surface article:last-child button'); await inspect(`${locale}-narrow-text200`); await capture(`${locale}-narrow-text200`)
      await page.evaluate(`(() => {let e=document.querySelector('.challenges-surface');while(e){e.scrollTop=0;e=e.parentElement}window.scrollTo(0,0)})()`); await delay(300); await capture(`${locale}-narrow-top`)
    }
    if (locale === 'de') {
      await metrics(1280,900)
      for (const scale of [0.8,1,1.3,1.5]) {
        await page.evaluate(`localStorage.setItem('idle-dyson-swarm:desktop-interface-scale','${scale}');window.dispatchEvent(new Event('idle-dyson-swarm:desktop-interface-scale:changed'))`)
        await inspect(`de-interface${scale}`); await capture(`de-interface${scale}`)
      }
      await page.evaluate(`localStorage.setItem('idle-dyson-swarm:desktop-interface-scale','1');window.dispatchEvent(new Event('idle-dyson-swarm:desktop-interface-scale:changed'))`)
      await metrics(800,360,1.3); await inspect('de-landscape'); await capture('de-landscape')
    }
    if (locale === 'de' || locale === 'ar-XB') {
      const ax = await page.cdp.send('Accessibility.getFullAXTree')
      writeFileSync(`${output}/${locale}-accessibility.json`, JSON.stringify(ax,null,2))
    }
    await metrics(360,800,1.3)
    await page.evaluate(`document.querySelectorAll('.challenges-surface article')[7].querySelector('button').click()`)
    await reach('.infinity-challenge-card__actions button:first-child')
    await page.evaluate(`document.querySelector('.infinity-challenge-card__actions button:first-child').click()`)
    await page.waitForSelector('.challenges-surface article [role="status"]',30000)
    await inspect(`${locale}-active`)
    await reach('.challenges-surface article:nth-of-type(8) button'); await capture(`${locale}-active`)
    // The real entry renders both earned-IP and paid-purchase progress in this locale.
    const activeText = await page.evaluate<string>(`document.querySelectorAll('.challenges-surface article')[7].textContent`)
    results.push({id:`${locale}-active-progress`,activeText})
    await page.evaluate(`document.querySelectorAll('.challenges-surface article')[7].querySelector('button').click()`)
    await page.evaluate(`document.querySelector('.infinity-challenge-card__actions button:first-child').click()`)
    await delay(300)
    if(await page.evaluate<boolean>(`!!document.querySelector('.challenges-surface article [role="status"]')`))throw Error(`${locale}: abandon did not finish`)
    if(!await page.evaluate<boolean>(`document.activeElement===document.querySelectorAll('.challenges-surface article')[7].querySelector('button')`))throw Error(`${locale}: saved abandonment lost focus`)
  }
  await metrics(360,800,1.3)
  await page.evaluate(`document.querySelector('.challenges-surface article button')?.scrollIntoView({block:'center'})`)
  await page.cdp.send('DOM.enable'); await page.cdp.send('CSS.enable')
  const doc = await page.cdp.send<{ root: { nodeId: number } }>('DOM.getDocument')
  const action = await page.cdp.send<{ nodeId: number }>('DOM.querySelector', { nodeId: doc.root.nodeId, selector: '.challenges-surface article button:not(:disabled)' })
  for (const pseudo of ['hover','active']) {
    await page.cdp.send('CSS.forcePseudoState', { nodeId: action.nodeId, forcedPseudoClasses: [pseudo] })
    await delay(200); await inspect(`action-${pseudo}`); await capture(`action-${pseudo}`)
  }
  await page.cdp.send('CSS.forcePseudoState', { nodeId: action.nodeId, forcedPseudoClasses: [] })
  await page.cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
  await delay(200); await inspect('reduced-motion'); await capture('reduced-motion')
  await page.cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'forced-colors', value: 'active' }] })
  await delay(200); await inspect('forced-colors'); await capture('forced-colors')
  await page.cdp.send('Emulation.setEmulatedMedia', { features: [] })
  // Current Research reference at the same usable mobile width and text scale.
  await metrics(360,800,1.3)
  await page.evaluate(`document.querySelector('[data-navigation-id="research"] .dyson-navigation__link')?.click()`)
  await delay(200); await capture('research-reference-mobile')
  if (errors.length) throw Error(`Runtime exceptions: ${errors.join('; ')}`)
} finally {
  writeFileSync(`${output}/results.json`,JSON.stringify({environment:page.environment,results,captures,errors,limits:['Browser emulation only; native hosts and screen-reader delivery unverified.','Fluent-speaker review pending.']},null,2))
  await page.close(); await server.stop()
}
console.log(JSON.stringify({checks:results.length,captures:captures.length,errors}))
