// UI fixture only: no game runtime, native bridge, IDB, account or Cloud code.
import { createRoot } from 'react-dom/client'
import { IntlProvider } from 'react-intl'
import { GameModeController } from '../../src/modes/modeController'
import { ModeSaveStore } from '../../src/modes/modeSaveStore'
import { GameModeControllerContext } from '../../src/ui/gameplay/shell/GameModeControllerContext'
import { DysonGameplayShell } from '../../src/ui/gameplay/shell/DysonGameplayShell'
import { Button } from '../../src/ui/components'
import '../../src/index.css'

if (!['127.0.0.1', 'localhost'].includes(location.hostname)) throw new Error('UI fixture is loopback-only.')
const files = new Map<string, string>()
const storage = {
  exists: async (p: string) => files.has(p), readText: async (p: string) => { if (!files.has(p)) throw Error('missing synthetic save'); return files.get(p)! },
  writeText: async (p: string, text: string) => { files.set(p, text) }, copy: async (a: string, b: string) => { files.set(b, files.get(a)!) },
  replaceAtomically: async (a: string, b: string) => { files.set(b, files.get(a)!); files.delete(a) }, discoverLegacyCandidates: async () => [],
}
const codec = { validate: (text: string) => { if (!text.startsWith('synthetic:')) throw Error('Fixture accepts only synthetic strings') }, createFresh: () => 'synthetic:fresh' }
const controller = new GameModeController(new ModeSaveStore(storage, { classic: codec, modern: codec }, () => undefined), {
  classic: async context => ({ quiesce: async () => context.initialSave, close: async () => undefined }),
  modern: async context => ({ quiesce: async () => context.initialSave, close: async () => undefined }),
}, () => 'synthetic:migrated')
await controller.start({ discovery: 'complete', saves: { classic: 'synthetic:classic' } })
const long = new URLSearchParams(location.search).has('long')
const messages: Record<string, string> = long ? {
  'modes.switch': 'Spielmodus und gespeicherter Fortschritt: {mode}',
  'modes.classic': 'Klassische Spielversion', 'modes.modern': 'Moderne Spielversion',
  'modes.continue': '{mode} mit gespeichertem Fortschritt fortsetzen', 'modes.start': '{mode} mit neuem Spielstand beginnen',
  'modes.separate': 'Jeder Spielmodus behält seinen eigenen, getrennten Spielstand.',
  'modes.migrate': 'Fortschritt der klassischen Spielversion übertragen', 'modes.confirm': 'Einmalige Übertragung bestätigen', 'modes.cancel': 'Abbrechen',
  'modes.oneWay': 'Klassischen Fortschritt in die moderne Spielversion kopieren? Dein klassischer Spielstand bleibt verfügbar. Moderner Fortschritt kann nicht zurückübertragen werden.',
  'modes.conflict': 'Du hast bereits einen modernen Spielstand. Setze ihn fort, um seinen Fortschritt zu behalten.',
} : {}
createRoot(document.getElementById('root')!).render(<IntlProvider locale={long ? 'de' : 'en'} messages={messages}>
  <GameModeControllerContext.Provider value={controller}>
    <DysonGameplayShell direction="ltr" skipLinkLabel="Skip to fixture" menuHeading="Idle Dyson Swarm" closeMenuLabel="Close menu" openMenuLabel="Open menu" moreMenuLabel="More" heading="Mode control fixture" releaseFooter="Local UI fixture · synthetic saves"
      navigation={{ ariaLabel: 'Game navigation', items: [{ id: 'bots', label: 'Bots', onActivate: () => undefined, bottom: true }, { id: 'infinity', label: 'Infinity', onActivate: () => undefined, bottom: true }, { id: 'settings', label: 'Settings', onActivate: () => undefined }] }}
      resources={{ ariaLabel: 'Resources', cash: { label: 'Cash', value: '0' }, totalBots: { label: 'Bots', value: '0' } }} hasVisibleFacilities={false} facilities={null}
      sidePanelSupplement={<p>Disposable UI fixture</p>}
      routeContent={{ ariaLabel: 'Fixture', content: <section><p>This fixture exercises the drawer control. No gameplay runs here.</p><Button>Shared button reference</Button></section> }} />
  </GameModeControllerContext.Provider>
</IntlProvider>)
