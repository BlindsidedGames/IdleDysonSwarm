import { resolve } from 'node:path'
import {
  openChromiumPage,
  startDevelopmentServer,
  type ChromiumPage,
} from './performance/chromiumHarness'

const webRoot = resolve(import.meta.dirname, '..')
const server = await startDevelopmentServer(webRoot, 4_229)
let page: ChromiumPage | undefined

try {
  page = await openChromiumPage({
    id: 'number-typography-390x844',
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    cpuThrottleRate: 1,
  }, server.url)
  await page.navigate(server.url)
  const evidence = await renderedWidthEvidence(page)
  const failures = evidence.samples.filter(
    (sample) => Math.abs(sample.leftWidth - sample.rightWidth) > 0.01,
  )
  if (evidence.faceErrors.length > 0 || failures.length > 0) {
    throw new Error(
      `Tabular number rendering failed: ${JSON.stringify(evidence, null, 2)}`,
    )
  }
  console.log(JSON.stringify(evidence, null, 2))
} finally {
  await page?.close()
  await server.stop()
}

async function renderedWidthEvidence(page: ChromiumPage) {
  return page.evaluate<{
    readonly computedFamily: string
    readonly faceErrors: readonly string[]
    readonly samples: readonly {
      readonly weight: string
      readonly left: string
      readonly right: string
      readonly leftWidth: number
      readonly rightWidth: number
    }[]
  }>(`(async () => {
    const exemplar = document.querySelector('[data-resource="total-bots"] .ui-resource-value__value')
      ?? document.querySelector('.ui-resource-value__value')
    if (!(exemplar instanceof HTMLElement)) {
      throw new Error('Resource header exemplar is unavailable.')
    }
    const computed = getComputedStyle(exemplar)
    const container = document.createElement('div')
    container.setAttribute('data-tabular-browser-regression', '')
    container.style.cssText = 'position:fixed;left:-10000px;top:0;white-space:nowrap;'
    const pairs = [
      ['111.11', '888.88'],
      ['853T', '854T'],
      ['$90.0T', '$90.1T'],
    ]
    const samples = []
    for (const weight of ['400', '600', '700']) {
      for (const [left, right] of pairs) {
        const widths = []
        for (const text of [left, right]) {
          const span = document.createElement('span')
          span.textContent = text
          span.style.cssText = [
            'display:inline-block',
            'font-family:' + computed.fontFamily,
            'font-size:40px',
            'font-weight:' + weight,
            'font-style:normal',
            'font-variant-numeric:tabular-nums',
            'font-feature-settings:"tnum" 1',
            'letter-spacing:normal',
          ].join(';')
          container.append(span)
          widths.push(span)
        }
        samples.push({ weight, left, right, spans: widths })
      }
    }
    document.body.append(container)
    await document.fonts.ready
    const faceErrors = [...document.fonts]
      .filter((face) => face.family === 'IDS Lexend Tabular Digits')
      .filter((face) => face.status === 'error')
      .map((face) => face.weight)
    const measured = samples.map(({ weight, left, right, spans }) => ({
      weight,
      left,
      right,
      leftWidth: spans[0].getBoundingClientRect().width,
      rightWidth: spans[1].getBoundingClientRect().width,
    }))
    container.remove()
    return {
      computedFamily: computed.fontFamily,
      faceErrors,
      samples: measured,
    }
  })()`)
}
