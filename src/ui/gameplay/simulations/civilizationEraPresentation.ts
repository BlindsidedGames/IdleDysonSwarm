import type { DeepReadonly } from '../../../core/contracts'
import type { CivilizationState } from '../../../game-state/types'
import { civilizationOpeningComplete } from '../../../simulation/civilization'

export type ForagerEraPresentation =
  | { readonly kind: 'activities'; readonly eraId: 'forager' }
  | { readonly kind: 'generator'; readonly eraId: 'forager'; readonly feedsEraId: string; readonly source: DeepReadonly<CivilizationState> }

/** Only a real following-era owner requests a handoff. Completion alone never
 * exposes unfinished gameplay. The retained canonical economy becomes one
 * generator/output source; this projection neither resets jobs nor earns rewards. */
export function foragerEraPresentation(state: DeepReadonly<CivilizationState>, activeEraId = 'forager'): ForagerEraPresentation {
  return activeEraId !== 'forager' && civilizationOpeningComplete(state)
    ? { kind: 'generator', eraId: 'forager', feedsEraId: activeEraId, source: state }
    : { kind: 'activities', eraId: 'forager' }
}
