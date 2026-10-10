import type { FarmingResource } from '../../../game-state/types'
import type { FarmingRow } from '../../../simulation/farming'
import { InlineImageSymbol } from '../../components'
import { CivilizationSymbol } from './CivilizationSymbol'
import goods from '../../assets/skill-icons/farmingGoods.webp'
import fields from '../../assets/skill-icons/farmingFields.webp'
import woodlot from '../../assets/skill-icons/farmingWoodlot.webp'
import homes from '../../assets/skill-icons/farmingHomes.webp'
import granary from '../../assets/skill-icons/farmingGranary.webp'
import pasture from '../../assets/skill-icons/farmingPasture.webp'
import kiln from '../../assets/skill-icons/farmingKiln.webp'
import waterworks from '../../assets/skill-icons/farmingWaterworks.webp'
import hall from '../../assets/skill-icons/farmingHall.webp'
export type FarmingSymbolId = FarmingResource | FarmingRow | 'worker' | 'granary'
const icons={goods,fields,woodlot,homes,granary,pasture,kiln,waterworks,hall,intensiveCultivation:fields,townMarket:hall}
export function FarmingSymbol({resource}:{resource:FarmingSymbolId}){
 if(resource==='food'||resource==='materials'||resource==='tools'||resource==='worker')return <CivilizationSymbol resource={resource}/>
 if(resource==='workshop'||resource==='guildWorkshop')return <CivilizationSymbol resource="tools"/>
 return <InlineImageSymbol src={icons[resource]} symbol={resource} tint maskMode="alpha" className="civilization-symbol"/>
}
