import type { FarmingPurchase, FarmingResource } from '../../../game-state/types'
import { InlineImageSymbol } from '../../components'
import { CivilizationSymbol } from './CivilizationSymbol'
import fields from '../../assets/skill-icons/farmingFields.webp'
import woodland from '../../assets/skill-icons/farmingWoodlot.webp'
import homes from '../../assets/skill-icons/farmingHomes.webp'
import granary from '../../assets/skill-icons/farmingGranary.webp'
import pasture from '../../assets/skill-icons/farmingPasture.webp'
import waterworks from '../../assets/skill-icons/farmingWaterworks.webp'
import burials from '../../assets/skill-icons/farmingBurials.webp'
import jobs from '../../assets/skill-icons/farmingJobs.webp'
import hall from '../../assets/skill-icons/farmingHall.webp'

export type FarmingSymbolId = FarmingResource | FarmingPurchase | 'worker' | 'land' | 'burials' | 'jobs'
const icons = { jobs, burials, land: woodland, loggingCamp: woodland, house: homes, field: fields,
  granary, pasture, shrine: hall, shamanTraining: hall, irrigation: waterworks }
export function FarmingSymbol({ resource }: { resource: FarmingSymbolId }) {
  if (resource === 'food' || resource === 'materials' || resource === 'tools' || resource === 'worker') return <CivilizationSymbol resource={resource} />
  if (resource === 'workshop') return <CivilizationSymbol resource="tools" />
  return <InlineImageSymbol src={icons[resource]} symbol={resource} tint maskMode="alpha" className="civilization-symbol" />
}
