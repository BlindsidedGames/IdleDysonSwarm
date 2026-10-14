import type { CivilizationResource } from '../../../simulation/civilization'
import { InlineImageSymbol } from '../../components'
import catalystIcon from '../../assets/currency-galvanizer.png'
import foodIcon from '../../assets/skill-icons/foragerFood.webp'
import materialsIcon from '../../assets/skill-icons/foragerMaterials.webp'
import toolsIcon from '../../assets/skill-icons/foragerTools.webp'
import gameIcon from '../../assets/skill-icons/foragerGame.webp'
import hidesIcon from '../../assets/skill-icons/foragerHides.webp'
import provisionsIcon from '../../assets/skill-icons/foragerProvisions.webp'
import sheltersIcon from '../../assets/skill-icons/foragerShelters.webp'
import campsIcon from '../../assets/skill-icons/foragerCamps.webp'
import chieftainIcon from '../../assets/skill-icons/foragerChieftain.webp'
import workerIcon from '../../assets/skill-icons/foragerWorker.webp'

import springIcon from '../../assets/skill-icons/seasonSpring.webp'
import summerIcon from '../../assets/skill-icons/seasonSummer.webp'
import autumnIcon from '../../assets/skill-icons/seasonAutumn.webp'
import winterIcon from '../../assets/skill-icons/seasonWinter.webp'

const seasons = { spring: springIcon, summer: summerIcon, autumn: autumnIcon, winter: winterIcon }
export function SeasonSymbol({ season }: { season: keyof typeof seasons }) {
  return <InlineImageSymbol src={seasons[season]} symbol={season} tint maskMode="alpha" className="civilization-symbol" />
}

/** Approved flat artwork; alpha masks retain transparent cutouts and route ink. */
const icons: Record<CivilizationResource | 'worker' | 'chieftain', string> = {
  food: foodIcon,
  materials: materialsIcon,
  tools: toolsIcon,
  hides: gameIcon,
  clothing: hidesIcon,
  provisions: provisionsIcon,
  shelters: sheltersIcon,
  camps: campsIcon,
  worker: workerIcon,
  chieftain: chieftainIcon,
}
export function CivilizationSymbol({ resource }: { resource: CivilizationResource | 'worker' | 'chieftain' | 'catalyst' }) {
  if (resource === 'catalyst') return <InlineImageSymbol src={catalystIcon} symbol="catalyst" tint maskMode="luminance" className="civilization-symbol" />
  return <InlineImageSymbol src={icons[resource]} symbol={resource} tint maskMode="alpha" className="civilization-symbol" />
}
