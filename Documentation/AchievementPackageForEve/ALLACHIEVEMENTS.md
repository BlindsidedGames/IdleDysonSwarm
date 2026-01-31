# Steam Achievements

## Steam Stats (for progress tracking)

These stats are tracked on Steam and used for achievement progress display:

| Stat Name | Type | Description | Used By |
|-----------|------|-------------|---------|
| `TOTAL_PLAY_TIME` | float | Total seconds played | - |
| `HIGHEST_BOT_EXPONENT` | int | Highest power of 10 reached for bots (e.g., 1e19 = 19) | `BOTS_42QI` |
| `HIGHEST_INFLUENCE_EXPONENT` | int | Highest power of 10 reached for influence | - |
| `SKILL_POINTS_ASSIGNED` | int | Total skill points assigned in skill tree | `SKILLS_ASSIGNED` |
| `SECRETS_FOUND` | int | Number of secret buttons discovered | `EASTER_SECRETS` |

---

## Implemented (27)

### First Milestones
| Steam ID | Display Name | Description | Condition |
|----------|--------------|-------------|-----------|
| `FIRST_BOT` | Hello, World! | Build your first bot. | bots >= 1 |
| `FIRST_ASSEMBLY_LINE` | Assembly Required | Build your first Assembly Line. | assembly_lines >= 1 |
| `FIRST_DATA_CENTER` | Data Driven | Build your first Data Center. | data_centers >= 1 |
| `FIRST_PLANET` | Planetary Expansion | Colonize your first Planet. | planets >= 1 |
| `FIRST_INFLUENCE` | Influential | Earn your first Influence point. | influence >= 1 |
| `FIRST_INFINITY_POINT` | Infinity and Beyond | Earn your first Infinity Point. | infinityPoints >= 1 |
| `FIRST_QUANTUM_SHARD` | Quantum Leap | Earn your first Quantum Shard. | quantumPoints >= 1 |
| `FIRST_STRANGE_MATTER` | Strange New Worlds | Collect your first Strange Matter. | strangeMatter >= 1 |
| `FIRST_AI_MANAGER` | AI Assisted | Build your first AI Manager. | ai_managers >= 1 |
| `FIRST_SERVER` | Server Room | Build your first Server. | servers >= 1 |

### Prestige Progression
| Steam ID | Display Name | Description | Condition |
|----------|--------------|-------------|-----------|
| `SECRETS_MAXED` | Master of Secrets | Unlock all 27 Secrets of the Universe. | secretsOfTheUniverse >= 27 |
| `DIVISIONS_COMPLETE` | Division Master | Purchase all Divisions. | divisionsPurchased >= 10 |

### Quantum Upgrades
| Steam ID | Display Name | Description | Condition |
|----------|--------------|-------------|-----------|
| `UNLOCK_TERRA` | Terrific | Unlock the Terra quantum line. | terra == true |
| `UNLOCK_PURITY` | Pureness | Unlock the Purity quantum line. | purity == true |
| `UNLOCK_POWER` | Unlimited Power | Unlock the Power quantum line. | power == true |
| `UNLOCK_STELLAR` | Stellar Job | Unlock the Stellar quantum line. | stellar == true |
| `UNLOCK_PARAGADE` | Paragon of Quantum | Unlock the Paragade quantum line. | paragade == true |
| `UNLOCK_AVOCATO` | Avocato Unlocked | Purchase the Avocato system. | avocatoPurchased == true |

### Simulation/Disaster
| Steam ID | Display Name | Description | Condition |
|----------|--------------|-------------|-----------|
| `ALL_COUNTERACTIONS` | Crisis Averted | Counter all three disasters. | counterMeteor AND counterAi AND counterGw |
| `ALL_SPEED_UPGRADES` | Maximum Speed | Purchase all simulation speed upgrades. | speed8 == true |
| `ALL_TRANSLATION_UPGRADES` | Lost in Translation | Purchase all translation upgrades. | translation8 == true |
| `ALL_SIMULATION_UPGRADES` | Simulation Complete | Purchase all simulation upgrades. | All 59 simulation flags |

### Easter Eggs
| Steam ID | Display Name | Description | Condition | Hidden |
|----------|--------------|-------------|-----------|--------|
| `DEV_OPTIONS` | Developer Mode | Unlock developer options. | debugOptions == true | Yes |
| `EASTER_SECRETS` | Secret Hunter | Find all secret buttons. | secretsFound >= 10 | No |
| `EASTER_AVOCADOS` | Avocados! | Unlock the Avocados skill. | avocados skill owned | No |

### Progress-Based Achievements
| Steam ID | Display Name | Description | Stat | Target | Notes |
|----------|--------------|-------------|------|--------|-------|
| `BOTS_42QI` | The Answer | Reach 42 Quintillion bots. | `HIGHEST_BOT_EXPONENT` | 19 | 42Qi = 4.2e19, so exponent >= 19 triggers it |
| `SKILLS_ASSIGNED` | Point Blank | Assign 42 skill points. | `SKILL_POINTS_ASSIGNED` | 42 | Counts total cost of owned skills |

---

## Summary

| Status | Count |
|--------|-------|
| Implemented | 27 |
| **Total** | **27** |

---

## Quick Reference - All Steam IDs

```
# All 27 Implemented
FIRST_BOT
FIRST_ASSEMBLY_LINE
FIRST_DATA_CENTER
FIRST_PLANET
FIRST_INFLUENCE
FIRST_INFINITY_POINT
FIRST_QUANTUM_SHARD
FIRST_STRANGE_MATTER
FIRST_AI_MANAGER
FIRST_SERVER
SECRETS_MAXED
DIVISIONS_COMPLETE
UNLOCK_TERRA
UNLOCK_PURITY
UNLOCK_POWER
UNLOCK_STELLAR
UNLOCK_PARAGADE
UNLOCK_AVOCATO
ALL_COUNTERACTIONS
ALL_SPEED_UPGRADES
ALL_TRANSLATION_UPGRADES
ALL_SIMULATION_UPGRADES
DEV_OPTIONS
EASTER_SECRETS
EASTER_AVOCADOS
BOTS_42QI
SKILLS_ASSIGNED
```

---

## Steam Stats to Configure

In Steamworks dashboard under Stats & Achievements > Stats, create:

| API Name | Type | Default | Increment Only | Max Change |
|----------|------|---------|----------------|------------|
| `TOTAL_PLAY_TIME` | FLOAT | 0 | Yes | - |
| `HIGHEST_BOT_EXPONENT` | INT | 0 | Yes | - |
| `HIGHEST_INFLUENCE_EXPONENT` | INT | 0 | Yes | - |
| `SKILL_POINTS_ASSIGNED` | INT | 0 | No | - |
| `SECRETS_FOUND` | INT | 0 | Yes | - |

---

## Achievement Progress Implementation

For achievements with progress bars, use `SteamUserStats.IndicateAchievementProgress()`:

```csharp
// Example: Show progress for BOTS_42QI
int currentExponent = GetIntStat("HIGHEST_BOT_EXPONENT");
SteamUserStats.IndicateAchievementProgress("BOTS_42QI", (uint)currentExponent, 19);

// Example: Show progress for SKILLS_ASSIGNED
int skillPoints = GetIntStat("SKILL_POINTS_ASSIGNED");
SteamUserStats.IndicateAchievementProgress("SKILLS_ASSIGNED", (uint)skillPoints, 42);

// Example: Show progress for EASTER_SECRETS
int secretsFound = GetIntStat("SECRETS_FOUND");
SteamUserStats.IndicateAchievementProgress("EASTER_SECRETS", (uint)secretsFound, 10);
```

---

## Notes for Steamworks Dashboard Setup

When creating achievements in the Steamworks dashboard:

1. **Achievement API Name**: Use the Steam IDs listed above (e.g., `FIRST_BOT`)
2. **Display Name**: Use the Display Name from the tables
3. **Description**: Use the Description from the tables
4. **Hidden**: Set to Yes only for `DEV_OPTIONS`
5. **Icon (Achieved)**: Upload achievement artwork
6. **Icon (Not Achieved)**: Upload greyed-out version

### Progress-Based Achievements Setup

For achievements that show progress (BOTS_42QI, SKILLS_ASSIGNED, EASTER_SECRETS):
1. Create the associated stat in the Stats section first
2. The game will call `IndicateAchievementProgress()` to update the progress bar
3. Progress shows as "X/Y" in the Steam overlay
