# Achievement Ideas

## Implemented

- First of each bot producer (1 bot, 1 assembly line, 1 data center, 1 planet)
- 1 infinity point, 1 quantum shard, 1 strange matter, 1 influence
- Maxing secrets (27 secrets of the universe)
- All divisions purchased
- Skill unlocks: Terrific, Pureness, Unlimited Power, Stellar Job, Paragon of Quantum
- Avocato unlock
- Unlocking dev options
- Purchasing all counteractions (meteor, AI, GW)
- Fully discovering speed and translation upgrades (speed8, translation8)
- Banking skill unlock

## TODO - Still Need Implementation

These achievements require additional condition types or game state tracking:

### SKILLS_ASSIGNED - All Skill Points Assigned
- **Condition needed:** Check if all available skill points have been assigned
- **Implementation:** Need to compare `skillPointsTree` against total skills owned
- **Notes:** Requires calculating total assignable points vs points used

### EASTER_AVOCADOS - Avocados Skill
- **Condition needed:** Check if the "avocados" skill is assigned in skill tree
- **Implementation:** Need to find the correct skill ID for the avocados easter egg skill
- **Notes:** Couldn't locate "avocados" skill reference in codebase - may have different name

### EASTER_SECRETS - Secret Hunter
- **Condition needed:** Check if all secret buttons have been clicked
- **Implementation:** Requires adding tracking for discovered secrets to save data
- **Notes:** Need to add `HashSet<string>` or `List<string>` to track which secrets have been found

### ALL_SIMULATION_UPGRADES - Simulation Complete
- **Condition needed:** AND condition of all simulation upgrade flags
- **Implementation:** Create AndCondition with all simulation flags:
  - engineering1-3
  - shipping1-2
  - worldTrade1-3
  - worldPeace1-4
  - mathematics1-3
  - advancedPhysics1-4
  - hunter1-4, gatherer1-4
  - workerBoost, citiesBoost, factoriesBoost
  - bots1-2, rockets1-3
  - sfacs1-3, railguns1-2
- **Notes:** Large condition, may want to create programmatically

## Other Ideas (Not Yet Planned)

- Easter egg obv (need specifics)
- x amounts of the minor quantum upgrades (need thresholds)