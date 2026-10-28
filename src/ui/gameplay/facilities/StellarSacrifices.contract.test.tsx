import { renderToStaticMarkup } from 'react-dom/server'
import { IntlProvider } from 'react-intl'
import { expect, test } from 'vitest'
import fixture from '../../../../test/fixtures/schema-08-canonical-idb1-main-save.txt?raw'
import { hydrateGameState } from '../../../game-state/mapping'
import { prepareIdb1Save } from '../../../save/prepare'
import { deriveBasicDysonState } from '../../../simulation/canonicalDysonDerivation'
import { FacilityDetailsContent } from './FacilityPresentation'
import messages from '../../i18n/catalogs/compiled/en.json'
import type { MessageFormatElement } from 'react-intl'

test.each([false, true])('Stellar facility detail uses the correct description (Fractured: %s) and bounded formula', fractured => {
  const baseline = hydrateGameState(prepareIdb1Save(fixture).prepared)
  const state = { ...baseline.state,
    dyson: { ...baseline.state.dyson, facilities: { ...baseline.state.dyson.facilities, galactic_brains: [0, 1] as const } },
    skills: { ...baseline.state.skills, byId: Object.fromEntries(Object.entries(baseline.state.skills.byId).map(([id, skill]) => [id, {
      ...skill, owned: ['stellarSacrifices', 'stellarObliteration', 'supernova'].includes(id),
    }])) },
    discovery: { unlocked: true, completions: 0n, progress: 0, startingPower: 0n, speedUpgrades: 0n },
    challenges: { ...baseline.state.challenges!, galvanizedSkillIds: fractured ? ['stellarSacrifices'] : [] },
  }
  const result = deriveBasicDysonState(state, baseline.compatibilityTuning, { permanentDoubleIp: false }, {
    ...baseline.skillEffectEvaluationSnapshot, panelsPerSecond: 1e300, panelLifetimeSeconds: 1e100,
  })
  if (!result.ok) throw new Error(JSON.stringify(result.issues))
  const html = renderToStaticMarkup(<IntlProvider locale="en" messages={messages as Record<string, MessageFormatElement[]>}>
    <FacilityDetailsContent locale="en" facilityId="galactic_brains" fact={result.value.facilityFacts.galactic_brains} gameSpeed={1} />
  </IntlProvider>)
  expect(html).toContain('highest')
  expect(html).toContain(fractured ? 'No Bots required or consumed.' : 'Bots')
  expect(html).not.toMatch(/<bdi>(?:Infinity|NaN|∞)/)
  if (fractured) expect(html).not.toContain('Sacrifices Bots')
})
