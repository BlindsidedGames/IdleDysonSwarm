import type { CivilizationResource } from '../../../simulation/civilization'
import { InlineImageSymbol } from '../../components'
import catalystIcon from '../../assets/currency-galvanizer.png'
import foodIcon from '../../assets/skill-icons/foragerFood.webp'
import materialsIcon from '../../assets/skill-icons/foragerMaterials.webp'
import toolsIcon from '../../assets/skill-icons/foragerTools.webp'
import hidesIcon from '../../assets/skill-icons/foragerHides.webp'
import clothingIcon from '../../assets/skill-icons/foragerClothing.webp'
import provisionsIcon from '../../assets/skill-icons/foragerProvisions.webp'
import sheltersIcon from '../../assets/skill-icons/foragerShelters.webp'
import campsIcon from '../../assets/skill-icons/foragerCamps.webp'
import workerIcon from '../../assets/skill-icons/foragerWorker.webp'

/** Approved flat artwork; alpha masks retain transparent cutouts and route ink. */
const icons: Record<CivilizationResource | 'worker', string> = {
  food: foodIcon,
  materials: materialsIcon,
  tools: toolsIcon,
  hides: hidesIcon,
  clothing: clothingIcon,
  provisions: provisionsIcon,
  shelters: sheltersIcon,
  camps: campsIcon,
  worker: workerIcon,
}
export function CivilizationSymbol({ resource }: { resource: CivilizationResource | 'worker' | 'catalyst' }) {
  if (resource === 'catalyst') return <InlineImageSymbol src={catalystIcon} symbol="catalyst" tint maskMode="luminance" className="civilization-symbol" />
  return <InlineImageSymbol src={icons[resource]} symbol={resource} tint maskMode="alpha" className="civilization-symbol" />
}
