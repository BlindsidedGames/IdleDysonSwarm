import { expect, test } from 'vitest'
import { EMPTY_CIVILIZATION, advanceCivilization } from '../../../simulation/civilization'
import type { CanonicalGameStateV1 } from '../../../game-state/types'
import { foragerEraPresentation } from './civilizationEraPresentation'

test('Forager remains active without a following era, including after opening completion',()=>{
 const c=advanceCivilization({meta:{reworkMigrationChoice:'keep'}} as CanonicalGameStateV1,9000).civilization!
 expect(foragerEraPresentation(c)).toEqual({kind:'activities',eraId:'forager'})
})
test('a genuine following-era context projects exactly one retained generator/output source',()=>{
 const c=advanceCivilization({meta:{reworkMigrationChoice:'keep'}} as CanonicalGameStateV1,9000).civilization!
 const view=foragerEraPresentation(c,'synthetic-following-era')
 expect(view.kind).toBe('generator');if(view.kind!=='generator')return
 expect(view.source).toBe(c);expect(view.source.resources).toBe(c.resources);expect(view.feedsEraId).toBe('synthetic-following-era')
 expect(view.source.awardedCatalystMilestoneIds).toHaveLength(7)
})
test('an unfinished era never loses its jobs through a premature transition context',()=>{
 expect(foragerEraPresentation(EMPTY_CIVILIZATION,'synthetic-following-era')).toEqual({kind:'activities',eraId:'forager'})
})
