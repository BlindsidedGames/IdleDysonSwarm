import { mkdirSync, writeFileSync } from 'node:fs'
import { startDevelopmentServer, openChromiumPage } from './performance/chromiumHarness'

// No game launch: this entry imports only a Map-backed control fixture. The
// shared harness creates a disposable profile and supplies --use-mock-keychain
// on macOS. Block every non-loopback request before navigating to the fixture.
const output = 'output/classic-modern/ui'
mkdirSync(output, { recursive: true })
const server = await startDevelopmentServer(process.cwd(), 5196)
let page: Awaited<ReturnType<typeof openChromiumPage>> | undefined
try {
  page = await openChromiumPage({ id: 'mode-control', width: 1280, height: 900, deviceScaleFactor: 1, cpuThrottleRate: 1 }, server.url)
  await page.cdp.send('Fetch.enable', { patterns: [{ urlPattern: '*', requestStage: 'Request' }] })
  page.cdp.on<{ requestId: string; request: { url: string } }>('Fetch.requestPaused', p => {
    const local = p.request.url.startsWith('http://127.0.0.1:5196/') || p.request.url.startsWith('data:') || p.request.url.startsWith('blob:')
    void page!.cdp.send(local ? 'Fetch.continueRequest' : 'Fetch.failRequest', local ? { requestId: p.requestId } : { requestId: p.requestId, errorReason: 'BlockedByClient' })
  })
  const errors: string[] = []
  page.cdp.on<{ exceptionDetails: { text: string; exception?: { description?: string } } }>('Runtime.exceptionThrown', p => errors.push(p.exceptionDetails.exception?.description ?? p.exceptionDetails.text))
  const fixture = server.url + 'scripts/modes-preview/index.html'
  await page.navigate(fixture)
  await page.waitForSelector('.game-mode-switch button', 20000)
  const capture = async (name: string) => {
    const shot = await page!.cdp.send<{ data: string }>('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
    writeFileSync(`${output}/${name}.png`, Buffer.from(shot.data, 'base64'))
  }
  const click = async (selector: string) => page!.evaluate(`document.querySelector(${JSON.stringify(selector)})?.click()`)
  await capture('desktop-collapsed')
  await click('.game-mode-switch > button')
  await page.waitForSelector('.game-mode-switch__options')
  await capture('desktop-expanded')
  await click('.game-mode-switch__options > button:last-of-type')
  await page.waitForSelector('.game-mode-switch__confirmation')
  await capture('desktop-confirmation')
  const measurements = []
  for (const scale of [0.8, 1, 1.3, 1.5]) {
    await page.evaluate(`localStorage.setItem('idle-dyson-swarm:desktop-interface-scale','${scale}');window.dispatchEvent(new Event('idle-dyson-swarm:desktop-interface-scale:changed'))`)
    await page.evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))')
    measurements.push(await page.evaluate(`({scale:${scale},overflow:document.documentElement.scrollWidth>innerWidth,buttons:[...document.querySelectorAll('.game-mode-switch button')].map(b=>({text:b.textContent,width:b.getBoundingClientRect().width,height:b.getBoundingClientRect().height}))})`))
    await capture('desktop-scale-' + scale)
  }
  // Complete migration; modern->Classic is a saved-mode switch, never a conversion.
  await click('.game-mode-switch__confirmation > button')
  await page.waitForSelector('.game-mode-switch > button')
  await page.evaluate('new Promise(resolve => setTimeout(resolve,100))')
  const migrated = await page.evaluate(`document.querySelector('.game-mode-switch')?.textContent?.includes('Modern')`)
  if (!migrated) throw Error('Migration control did not select Modern')
  await click('.game-mode-switch > button'); await click('.game-mode-switch__options > button')
  await page.evaluate('new Promise(resolve => setTimeout(resolve,100))')
  await click('.game-mode-switch > button')
  await capture('destination-conflict')
  const conflict = await page.evaluate(`document.querySelector('.game-mode-switch')?.textContent?.includes('already have a Modern save')`)
  if (!conflict) throw Error('Existing modern conflict was not shown')
  await page.cdp.send('Emulation.setDeviceMetricsOverride', { width: 360, height: 800, deviceScaleFactor: 1, mobile: true })
  await page.navigate(fixture + '?long=1')
  await page.waitForSelector('.game-mode-switch > button')
  await page.evaluate(`document.documentElement.style.fontSize='130%';document.querySelector('.dyson-shell__menu-toggle')?.click()`)
  // Find the real shell More/menu button if the responsive control differs.
  await page.evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')==='More');b?.click()})()`)
  await page.evaluate(`document.querySelector('.game-mode-switch > button')?.click();document.querySelector('.game-mode-switch__options > button:last-of-type')?.click();document.querySelector('.game-mode-switch')?.scrollIntoView({block:'end'})`)
  await capture('mobile-long-text-130')
  measurements.push(await page.evaluate(`({mobile:true,overflow:document.documentElement.scrollWidth>innerWidth,buttons:[...document.querySelectorAll('.game-mode-switch button')].map(b=>({text:b.textContent,width:b.getBoundingClientRect().width,height:b.getBoundingClientRect().height}))})`))
  await page.cdp.send('Emulation.setDeviceMetricsOverride', { width: 800, height: 360, deviceScaleFactor: 1, mobile: true })
  await page.evaluate(`document.querySelector('.game-mode-switch')?.scrollIntoView({block:'end'})`)
  await capture('landscape-long-text')
  if (errors.length) throw Error(errors.join('\n'))
  writeFileSync(`${output}/results.json`, JSON.stringify({ environment: page.environment, measurements, errors, migration: true, conflict: true }, null, 2))
  console.log(JSON.stringify({ output, measurements, errors }))
} finally { await page?.close(); await server.stop() }
