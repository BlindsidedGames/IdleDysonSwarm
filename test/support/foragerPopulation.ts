import type { CanonicalGameStateV1 } from '../../src/game-state/types'
import { advanceCivilization, buyCivilizationHunting, buyCivilizationHousing } from '../../src/simulation/civilization'
export function growForager(state:CanonicalGameStateV1, population=160n):CanonicalGameStateV1 {
 for(let n=0;n<100000;n++){
  if((state.civilization?.workers??0n)>=population)return state
  state=advanceCivilization(state,10)
  state=buyCivilizationHunting(state)??state
  state=buyCivilizationHousing(state,'camp')??buyCivilizationHousing(state,'tent')??state
 }
 throw Error('Manual Forager progression did not reach its population goal')
}
