import { growForager } from '../../../../test/support/foragerPopulation'
import { expect, test } from 'vitest'
import { EMPTY_CIVILIZATION } from '../../../simulation/civilization'
import { hydrateGameState } from '../../../game-state/mapping'
import { createUnityFirstRunPreparedSave } from '../../../application/firstRun/unityFirstRunSave'
const initial = hydrateGameState(createUnityFirstRunPreparedSave({startedAtUtc:'2026-10-14T00:00:00Z'})).state
const unlocked = {...initial,dyson:{...initial.dyson,goalStage:10n},meta:{...initial.meta,reworkMigrationChoice:'keep' as const}}
import { foragerEraPresentation } from './civilizationEraPresentation'

test('Forager remains active without a following era, including after opening completion',()=>{
 const c=growForager(unlocked).civilization!
 expect(foragerEraPresentation(c)).toEqual({kind:'activities',eraId:'forager'})
})
test('a genuine following-era context projects exactly one retained generator/output source',()=>{
 const c=growForager(unlocked).civilization!
 const view=foragerEraPresentation(c,'synthetic-following-era')
 expect(view.kind).toBe('generator');if(view.kind!=='generator')return
 expect(view.source).toBe(c);expect(view.source.resources).toBe(c.resources);expect(view.feedsEraId).toBe('synthetic-following-era')
 expect(view.source.awardedCatalystMilestoneIds).toHaveLength(6)
})
test('an unfinished era never loses its jobs through a premature transition context',()=>{
 expect(foragerEraPresentation(EMPTY_CIVILIZATION,'synthetic-following-era')).toEqual({kind:'activities',eraId:'forager'})
})
