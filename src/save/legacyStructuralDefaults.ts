/** Compatibility defaults shared by legacy save migration and numeric repair.
 * These are legacy DTO fields, not the current gameplay balance authority.
 */
export const LEGACY_INFINITY_STRUCTURAL_DEFAULTS: Readonly<Record<string, number>> = {
  moneyMulti: 1,
  scienceMulti: 1,
  panelsPerSecMulti: 1,
  panelLifetime: 10,
  assemblyLineModifier: 1,
  managerModifier: 1,
  serverModifier: 1,
  dataCenterModifier: 1,
  planetModifier: 1,
  matrioshkaBrainModifier: 1,
  birchPlanetModifier: 1,
  galacticBrainModifier: 1,
  scienceBoostPercent: 0.05,
  moneyMultiUpgradePercent: 0.05,
  assemblyLineUpgradePercent: 0.03,
  aiManagerUpgradePercent: 0.03,
  serverUpgradePercent: 0.03,
  dataCenterUpgradePercent: 0.03,
  planetUpgradePercent: 0.03,
  matrioshkaUpgradePercent: 0.03,
  birchUpgradePercent: 0.03,
  galacticUpgradePercent: 0.03,
}
