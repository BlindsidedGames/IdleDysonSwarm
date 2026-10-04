import { stellarFracturedMessages } from './stellarMessages'
import { skillMessages as messages } from './messages'

export const galvanizedEffectMessages: Readonly<Record<string, typeof messages.galvEconomic>> = {
  tasteOfPower: messages.galvPowerTaste,
  indulgingInPower: messages.galvPowerIndulging,
  addictionToPower: messages.galvPowerAddiction,
  agressiveAlgorithms: messages.galvAlgorithms,
  burnOut: messages.galvBurnout,
  coldFusion: messages.galvColdFusion,
  dimensionalCatCables: messages.galvCables,
  economicDominance: messages.galvEconomic,
  endOfTheLine: messages.galvEndLine,
  fusionReactors: messages.galvFusion,
  scientificDominance: messages.galvScientific,
  shouldersOfPrecursors: messages.galvPrecursors,
  worthySacrifice: messages.galvWorthy,
  shouldersOfTheEnlightened: messages.galvEnlightened,
  ...stellarFracturedMessages,
}
