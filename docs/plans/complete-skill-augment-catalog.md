# Complete skill augment catalogue

**Revision 2 · 30 September 2026 · proposal, not implemented.**

**485 new augments across all 97 currently unaugmented skills.** Menus have 3–7 choices and average exactly five. Costs span 1–5 SP; deeper paths have ordinary prerequisites, which count once toward the same 42-SP budget. The seven existing augmented parents and their 31 augments remain unchanged.

Read the [proposal](complete-skill-augments.md), [mathematics](complete-skill-augment-math.md), [branch and budget analysis](complete-skill-augment-branches.md) and [current-system reference](complete-skill-augment-reference.md). Player-facing copy stays short; formulas and source/reset rules live in Details. These strings have not been added to gameplay or localization.

Each parent must be **Fractured**. This unlocks its menu, makes the base effect cost 0 SP, and removes the base’s ordinary restrictions. It does **not** remove augment-to-augment prerequisites. A capstone’s “entry SP” includes every prerequisite, with a shared ancestor counted once. Buying several capstones uses the union of their closures, not the sum of their individual entry figures.

All 485 are refundable. Refunding a prerequisite removes its purchased descendants atomically and returns their costs once, matching current transactions. Refunds do not refill coupons, reward flags or timers. Commitment Issues still forbids refunds. Functional donors and native facility unlocks remain necessary.

Natural own-bar completions qualify for augment rewards only when a full bar of directly time-earned progress is available in the provenance ledger. New packets and incoming bar transfers do not create that credit; each qualifying source event is identified once and can fan out once to its assigned augments. This prevents a packet-completed bar becoming another reward source on the next frame.

New continuous bonuses to the same stat add. Native price growth is preserved; new amount discounts share a 50% ceiling. New SRS charging, Cash-bonus strength and basic-facility-bonus strength each share a +100% ceiling. SRS is a passive assigned timer with no charge maximum or Scatter action. Charging bonuses add seconds to its base charging rate; they do not multiply existing augment terms. New unlaunched-panel retention shares a 30% ceiling. Explicit Fragment identities remain the existing seven base skills and two Production Scaling augments; new nodes are specializations, not extra Fragments.

Discovery retires research and Scientist allocation. Every affected entry has an explicit replacement using natural own-bar completions, native progress, Cash prices or bounded bonuses. No entry discounts SP, Catalysts, Quantum Shards or Transcendence Points, grants a paid Discovery purchase, or gives a permanent Discovery power level. Shared speed weights remain 1, ½ and ¼; explicitly named final-tier bonuses are not weighted again.

Game-time durations follow the canonical advance clock; genuine absence uses real time and bank spending uses processed time. Fixed education/Discovery progress packets are raw units, never multiplied again by speed. Donor rates are quoted once from native production before new bonuses or packets; grants cannot recursively emit purchases, Tinker, volleys, resets or augment completion rewards.

## Family index

| Family | Parents | Augments | Mean choices |
| --- | ---: | ---: | ---: |
| [Production](#production) | 8 | 40 | 5.00 |
| [Economy](#economy) | 11 | 63 | 5.73 |
| [Panels](#panels) | 13 | 65 | 5.00 |
| [Power](#power) | 8 | 39 | 4.88 |
| [Networks](#networks) | 15 | 77 | 5.13 |
| [Worlds](#worlds) | 7 | 32 | 4.57 |
| [Knowledge](#knowledge) | 7 | 35 | 5.00 |
| [Terra](#terra) | 7 | 30 | 4.29 |
| [Fragments](#fragments) | 3 | 14 | 4.67 |
| [Stellar](#stellar) | 5 | 29 | 5.80 |
| [Ethics](#ethics) | 6 | 30 | 5.00 |
| [Purity](#purity) | 3 | 13 | 4.33 |
| [Reserves](#reserves) | 4 | 18 | 4.50 |

## Parent index

| Parent | Choices | Entire menu SP | Deepest entry SP | Depth |
| --- | ---: | ---: | ---: | ---: |
| [20s Lifetime](#panellifetime20tree) | 4 | 7 | 4 | 2 |
| [Addiction to Power](#addictiontopower) | 5 | 13 | 13 | 3 |
| [Aggressive Algorithms](#agressivealgorithms) | 5 | 11 | 11 | 3 |
| [AI Managers](#aimanagertree) | 5 | 12 | 12 | 3 |
| [Androids](#androids) | 6 | 15 | 14 | 3 |
| [Artificially Enhanced Panels](#artificiallyenhancedpanels) | 5 | 12 | 12 | 3 |
| [Assembly Lines](#assemblylinetree) | 5 | 10 | 10 | 3 |
| [Assembly Megalines](#assemblymegalines) | 5 | 13 | 13 | 3 |
| [Avocados](#avocados) | 5 | 11 | 11 | 3 |
| [Banking](#banking) | 3 | 9 | 9 | 2 |
| [Burnout](#burnout) | 4 | 8 | 4 | 2 |
| [Citadel Council](#citadelcouncil) | 6 | 15 | 15 | 4 |
| [Cluster Networking](#clusternetworking) | 5 | 11 | 11 | 3 |
| [Cold Fusion](#coldfusion) | 6 | 15 | 15 | 4 |
| [Data Centers](#datacentertree) | 6 | 16 | 16 | 4 |
| [Dimensional CAT cables](#dimensionalcatcables) | 4 | 10 | 6 | 2 |
| [Dyson Subsidies](#dysonsubsidies) | 4 | 8 | 5 | 2 |
| [Economic Dominance](#economicdominance) | 7 | 18 | 18 | 4 |
| [Economic Revolution](#economicrevolution) | 6 | 14 | 11 | 3 |
| [End of the Line](#endoftheline) | 3 | 7 | 7 | 2 |
| [Fragment Assembly](#fragmentassembly) | 4 | 10 | 10 | 3 |
| [Fusion Reactors](#fusionreactors) | 6 | 15 | 15 | 3 |
| [Galactic Paradigm Shift](#galacticpradigmshift) | 4 | 10 | 10 | 3 |
| [Higgs Boson](#higgsboson) | 5 | 11 | 11 | 3 |
| [Hubble Telescope](#hubbletelescope) | 4 | 7 | 4 | 2 |
| [Hypercube Networks](#hypercubenetworks) | 4 | 9 | 9 | 3 |
| [Idle Electric Sheep](#idleelectricsheep) | 6 | 15 | 15 | 4 |
| [Idle Spaceflight](#idlespaceflight) | 5 | 12 | 12 | 3 |
| [Indulging in Power](#indulginginpower) | 4 | 8 | 4 | 2 |
| [Investment](#investmentportfolio) | 4 | 9 | 9 | 3 |
| [James Webb Telescope](#jameswebbtelescope) | 5 | 12 | 12 | 3 |
| [Monetary Policy](#monetarypolicy) | 6 | 14 | 14 | 4 |
| [One Minute Plan](#oneminuteplan) | 4 | 8 | 8 | 3 |
| [Panel Maintenance](#panelmaintenance) | 5 | 11 | 11 | 3 |
| [Panel Warranty](#panelwarranty) | 5 | 12 | 12 | 3 |
| [Paragon](#paragon) | 5 | 12 | 12 | 3 |
| [Parallel Computation](#parallelcomputation) | 6 | 15 | 15 | 4 |
| [Parallel Processing](#parallelprocessing) | 6 | 12 | 11 | 3 |
| [Planet Assembly](#planetassembly) | 4 | 9 | 8 | 2 |
| [Planets](#planetstree) | 6 | 15 | 15 | 4 |
| [Pocket Androids](#pocketandroids) | 5 | 12 | 11 | 3 |
| [Pocket Dimensions](#pocketdimensions) | 6 | 14 | 13 | 3 |
| [Pocket Multiverse](#pocketmultiverse) | 5 | 14 | 14 | 3 |
| [Pocket Protectors](#pocketprotectors) | 4 | 7 | 4 | 2 |
| [Power Overwhelming](#poweroverwhelming) | 6 | 16 | 16 | 4 |
| [Power Underwhelming](#powerunderwhelming) | 6 | 15 | 15 | 4 |
| [Progressive Assembly](#progressiveassembly) | 5 | 13 | 13 | 3 |
| [Purity of Body](#purityofbody) | 4 | 8 | 8 | 3 |
| [Purity of Essence](#purityofsessence) | 5 | 11 | 11 | 3 |
| [Purity of Mind](#purityofmind) | 4 | 8 | 8 | 3 |
| [Quantum Computing](#quantumcomputing) | 7 | 18 | 18 | 4 |
| [Reapers](#reapers) | 5 | 14 | 14 | 3 |
| [Regulated Academia](#regulatedacademia) | 5 | 11 | 11 | 3 |
| [Renegade](#renegade) | 4 | 9 | 9 | 3 |
| [Renewable Energy](#renewableenergy) | 5 | 13 | 13 | 3 |
| [Repeatable Research](#repeatableresearch) | 7 | 19 | 19 | 4 |
| [Rocket Mania](#rocketmania) | 5 | 15 | 15 | 3 |
| [Rudimentary Singularity](#rudimentarysingularity) | 7 | 15 | 15 | 5 |
| [Saren](#saren) | 5 | 14 | 14 | 3 |
| [Science *2](#doublesciencetree) | 4 | 8 | 8 | 3 |
| [Science Boost](#producedassciencetree) | 5 | 12 | 12 | 3 |
| [Scientific Dominance](#scientificdominance) | 7 | 19 | 19 | 4 |
| [Scientific Planets](#scientificplanets) | 6 | 17 | 17 | 4 |
| [Scientific Revolution](#scientificrevolution) | 6 | 17 | 17 | 4 |
| [Servers](#servertree) | 5 | 11 | 11 | 3 |
| [Shell Worlds](#shellworlds) | 4 | 11 | 11 | 3 |
| [Shepherd](#shepherd) | 5 | 13 | 13 | 3 |
| [Shoulder Surgery](#shouldersurgery) | 3 | 7 | 7 | 2 |
| [Shoulders of Giants](#shouldersofgiants) | 6 | 15 | 15 | 4 |
| [Shoulders of Precursors](#shouldersofprecursors) | 6 | 16 | 16 | 4 |
| [Shoulders of the Enlightened](#shouldersoftheenlightened) | 5 | 12 | 12 | 3 |
| [Shoulders of the Fallen](#shouldersofthefallen) | 5 | 11 | 11 | 3 |
| [Shoulders of the Revolution](#shouldersoftherevolution) | 5 | 12 | 12 | 3 |
| [Solar Bubbles](#solarbubbles) | 4 | 8 | 5 | 2 |
| [Staying Power](#stayingpower) | 5 | 14 | 14 | 3 |
| [Stellar Dominance](#stellardominance) | 6 | 16 | 16 | 4 |
| [Stellar Improvements](#stellarimprovements) | 4 | 9 | 6 | 2 |
| [Stellar Obliteration](#stellarobliteration) | 6 | 15 | 15 | 4 |
| [Stellar Sacrifices](#stellarsacrifices) | 7 | 18 | 18 | 4 |
| [Supercharged Power](#superchargedpower) | 6 | 15 | 15 | 3 |
| [Supernova](#supernova) | 6 | 16 | 16 | 4 |
| [Taste of Power](#tasteofpower) | 4 | 8 | 4 | 2 |
| [Terra Eculeo](#terraeculeo) | 4 | 8 | 5 | 2 |
| [Terra Firma](#terrafirma) | 5 | 13 | 13 | 3 |
| [Terra Gloriae](#terragloriae) | 5 | 11 | 11 | 3 |
| [Terra Infirma](#terrainfirma) | 4 | 9 | 9 | 3 |
| [Terra Irradient](#terrairradiant) | 3 | 7 | 7 | 2 |
| [Terra Nova](#terranova) | 5 | 12 | 12 | 3 |
| [Terra Nullius](#terranullius) | 4 | 8 | 8 | 3 |
| [Terraforming Protocols](#terraformingprotocols) | 5 | 12 | 12 | 3 |
| [Unsuspicious Algorithms](#unsuspiciousalgorithms) | 4 | 8 | 5 | 2 |
| [Versatile Production Tactics](#versatileproductiontactics) | 6 | 14 | 14 | 4 |
| [What could’ve been](#whatcouldhavebeen) | 5 | 13 | 13 | 3 |
| [What Will Come to Pass](#whatwillcometopass) | 5 | 12 | 12 | 3 |
| [Worker Boost](#workerboost) | 5 | 12 | 7 | 3 |
| [Worker Efficiency](#workerefficiencytree) | 4 | 8 | 5 | 2 |
| [Worthy Sacrifice](#worthysacrifice) | 4 | 8 | 8 | 3 |

## Production

<a id="assemblylinetree"></a>
### Assembly Lines

Base ID: `assemblyLineTree` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **5 choices · entire menu 10 SP.**

**Branch design:** Two starting paths lead to industrial batch production or active Simulation work; a joint capstone turns education into predictable factory throughput.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Batch Testing | 1 | 1 | Fractured parent | Each facility type with 50 paid purchases adds 10% Bot production. Bonuses are additive. | The first forty-nine were quality assurance. |
| Factory Seconds | 1 | 1 | Fractured parent | Tinker advances Simulation Factories by 1 second, once every 2 seconds. | The assembly instructions came with a time machine. |
| Shift Pattern | 2 | 3 | Batch Testing | Every 25 paid Assembly Lines grants 10 seconds of panel production, up to 30 seconds per minute. | The conveyor has learned a new dance. |
| Quality Circle | 2 | 3 | Factory Seconds | Completing a Simulation subject adds 100% Assembly Line production for 2 minutes. Bonuses are additive. | Everyone passed. Even the conveyor. |
| Lights Out Factory | 4 | 10 | Shift Pattern, Quality Circle | Fully educated Simulations add 200% Bot production and 100% Factory output. Bonuses are additive. | The machines finally graduated without us. |

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Batch Testing** — `subskill.assemblyLineTree.batchTesting` · entry · depth 1 · 1 SP including prerequisites.

b_Bots = 0.10 * count(types with paid purchases >= 50); maximum 8 types.

- Systems: Bots, Purchases. Limit: +80% Bots.
- Source: paid purchases only. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Factory Seconds** — `subskill.assemblyLineTree.factorySeconds` · entry · depth 1 · 1 SP including prerequisites.

On an eligible Tinker completion grant 1 game second of native Factory production; 2 game-second cooldown; snapshot producers and input stock first.

- Systems: Tinker, Simulation Factories. Limit: 0.5 extra Factory seconds per game second.
- Source: native Factory production. New ledger reset: Infinity.
- Interaction: nonrecursive production grant.

**Shift Pattern** — `subskill.assemblyLineTree.shiftPattern` · specialization · depth 2 · 3 SP including prerequisites.

Paid-purchase thresholds n=25,50,... consume one durable threshold flag. Grant 10 seconds of native panel output through a 30-second-per-60-game-second bucket; bucket starts empty.

- Systems: Assembly Lines, Panels. Limit: 30 production seconds per game minute.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: production grant.

**Quality Circle** — `subskill.assemblyLineTree.qualityCircle` · specialization · depth 2 · 3 SP including prerequisites.

Natural subject completion refreshes one 120-game-second window; no stacking or grant-caused completion trigger.

- Systems: Education, Bots. Limit: +100% Bots.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Lights Out Factory** — `subskill.assemblyLineTree.lightsOutFactory` · capstone · depth 3 · 10 SP including prerequisites.

While all six native subject-completion flags are set, b_Bots=2 and b_Factory=1. No extra game updates.

- Systems: Bots, Simulation Factories, Education. Limit: +200% Bots, +100% Factories.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="aimanagertree"></a>
### AI Managers

Base ID: `aiManagerTree` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **5 choices · entire menu 12 SP.**

**Branch design:** Manager stock supports a reserve strategy; influence and allocation become a separate staffing path rather than another Bot multiplier.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Middle Management | 1 | 1 | Fractured parent | Each unspent Skill Point adds 4% AI Manager output, up to 80%. Bonuses are additive. | They have scheduled a meeting about your spare points. |
| Cross Training | 2 | 2 | Fractured parent | Every 30 tenfold increases in AI Managers adds 100% Influence generation, up to 200%. Bonuses are additive. | The managers have discovered another department to manage. |
| Delegated Decisions | 2 | 4 | Cross Training | Tinker grants 5 seconds of Influence generation, up to 20 seconds per minute. | I have forwarded this to your superior. |
| Flexible Staffing | 3 | 4 | Middle Management | Within 10% of equal Worker and Scientist allocation, AI Managers produce 150% more. Bonuses are additive. | Nobody remembers whose department this is. |
| Succession Plan | 4 | 12 | Flexible Staffing, Delegated Decisions | Keep 20 generated AI Managers and 10 Assembly Lines through Infinity. | The organization chart survives the heat death. |

**After Discovery**

- **Flexible Staffing:** During the first half of Discovery, AI Managers produce 150% more. Bonuses are additive.

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Middle Management** — `subskill.aiManagerTree.middleManagement` · entry · depth 1 · 1 SP including prerequisites.

b_AIManagerOutput=min(.8,.04*actualUnspentSP), applied to native AI Manager production of Assembly Lines. No points are created or virtually refunded.

- Systems: Skill Points, Assembly Lines. Limit: +80% Lines.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Cross Training** — `subskill.aiManagerTree.crossTraining` · entry · depth 1 · 2 SP including prerequisites.

b_Influence = min(2, log10(1 + ownedManagers) / 30). Applies to generation before normal batch capacity.

- Systems: AI Managers, Reality. Limit: +200% Influence generation.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Delegated Decisions** — `subskill.aiManagerTree.delegatedDecisions` · specialization · depth 2 · 4 SP including prerequisites.

An eligible native Tinker completion grants 5 seconds of Reality Influence through a 20-second-per-minute bucket; Auto Gather does not emit Tinker.

- Systems: Tinker, Influence. Limit: 20 Influence seconds per game minute.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: production grant.

**Flexible Staffing** — `subskill.aiManagerTree.flexibleStaffing` · specialization · depth 2 · 4 SP including prerequisites.

Before Discovery: Use allocation fractions before production: abs(workerFraction-scientistFraction)<=0.10 gives b_ManagerOutput=1.5; no phantom allocated Bots.
After Discovery: Native unfinished Discovery fraction<.5 enables b_Manager=1.5. Scientist allocation is retired.

- Systems: Allocation, AI Managers. Limit: +150% Manager output.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Succession Plan** — `subskill.aiManagerTree.successionPlan` · capstone · depth 3 · 12 SP including prerequisites.

At the ending reset take min(20,generatedManagers) and min(10,generatedLines). Retained stock is generated, not paid; shared competing retentions take maximum, not sum.

- Systems: Infinity, AI Managers, Assembly Lines. Limit: 20 Managers and 10 Lines.
- Source: ending generated stock only. New ledger reset: Quantum.
- Interaction: retention.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="servertree"></a>
### Servers

Base ID: `serverTree` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **5 choices · entire menu 11 SP.**

**Branch design:** Research bursts, return bonuses and scheduler pacing give Servers distinct active, offline and continuous-output choices.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Round Robin | 1 | 1 | Fractured parent | Purchased research grants 2 seconds of Server output per level, up to 10 seconds per minute. | Every breakthrough gets its own little server. |
| Wake on LAN | 1 | 1 | Fractured parent | Returning after an hour away adds 100% Server production for 5 minutes. Bonuses are additive. | Have you tried leaving it off for a while? |
| Maintenance Window | 2 | 3 | Round Robin | After 5 minutes without research purchases, Servers gain 100% output. Bonuses are additive. | Please restart the universe at your convenience. |
| Hibernation Image | 3 | 4 | Wake on LAN | Returning after 2 hours away retains 5 minutes of Server research strength for your next Infinity. | The server woke up with homework completed. |
| Time Slicing | 4 | 11 | Maintenance Window, Hibernation Image | Every minute, Servers grant 15 seconds of AI Manager output and 5 seconds of Simulation Bot output. | Each process gets a turn at reality. |

**After Discovery**

- **Round Robin:** Natural Discovery completions grant 10 seconds of Server output, up to 10 seconds per minute.
- **Maintenance Window:** After 5 minutes without a natural Discovery completion, Servers gain 100% output. Bonuses are additive.
- **Hibernation Image:** Returning after 2 hours away prepares 50% extra Server output for 5 minutes after your next Infinity. Bonuses are additive.

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Round Robin** — `subskill.serverTree.roundRobin` · entry · depth 1 · 1 SP including prerequisites.

Token bucket holds 10 native Server-output seconds and refills at 1/6 second per game second; each paid level consumes up to 2 tokens. Generated levels do not trigger.

- Systems: Research, Servers. Limit: +1/6 native Server throughput.
- Source: paid research; natural Discovery completions. New ledger reset: Infinity.
- Interaction: nonrecursive production grant.

**Wake on LAN** — `subskill.serverTree.wakeonLAN` · entry · depth 1 · 1 SP including prerequisites.

Requires 3600 newly accrued real away seconds while assigned. Earn at most one 300 game-second burst per absence; no stacking; no replay-generated triggers.

- Systems: Offline Time, Servers. Limit: +100% Servers for 300 game seconds.
- Source: genuine away time. New ledger reset: Infinity.
- Interaction: away trigger ledger.

**Maintenance Window** — `subskill.serverTree.maintenanceWindow` · specialization · depth 2 · 3 SP including prerequisites.

Before Discovery: Time since last genuine research purchase >=300 game seconds gives b_ServerOutput=1; clock is never reset by refunds.
After Discovery: Absolute age since last qualifying natural own-bar completion>=300 gives b_Server=1. No new-grant completion counts as a source.

- Systems: Servers, Research. Limit: +100% Server output.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Hibernation Image** — `subskill.serverTree.hibernationImage` · specialization · depth 2 · 4 SP including prerequisites.

Before Discovery: Qualifying real absence stores a single snapshot of current Server research bonus. Next Infinity applies min(snapshotBonus,2) as a new Server-output coefficient for 300 game seconds; consume once and require ownership at reset.
After Discovery: One genuine>=7200-real-second absence prepares one entitlement. At next qualified Infinity consume it and create a300-game-second b_Server=.5 window; no retired research snapshot.

- Systems: Stored Time, Research, Infinity. Limit: +200% Server output for 5 minutes.
- Discovery limit: +50% Server output for 5 minutes.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Quantum.
- Interaction: limited retention.

**Time Slicing** — `subskill.serverTree.timeSlicing` · capstone · depth 3 · 11 SP including prerequisites.

Assigned game clock crosses each 60-second boundary once. Credit two producer snapshots through their separate 15/60 and 5/60 throughput limits; no source event recursion.

- Systems: Servers, AI Managers, Simulation Bots. Limit: 15 Manager seconds and 5 Simulation Bot seconds per minute.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: production grant.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="datacentertree"></a>
### Data Centers

Base ID: `dataCenterTree` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **6 choices · entire menu 16 SP.**

**Branch design:** The archive path preserves research; the education path supports Simulations. A distinct cold-cache branch improves actual research purchasing.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Cold Storage | 3 | 3 | Fractured parent | Keep up to 10 purchased facility research levels through Infinity. | Please do not defrost the hard drives. |
| Archive Fever | 1 | 1 | Fractured parent | Each completed Simulation subject adds 15% Data Center production. Bonuses are additive. | The reading list has acquired its own gravity. |
| Cold Cache | 2 | 5 | Cold Storage | Every 50 paid Data Centers makes your next facility research level 25% cheaper. | The answer was behind the refrigerator. |
| Distributed Campus | 2 | 3 | Archive Fever | Each 100 paid Data Centers adds 10% Simulation education speed, up to 100%. Bonuses are additive. | The lecture hall is now a network drive. |
| Archive Restoration | 3 | 8 | Cold Cache | Purchased facility research grants 10 seconds of Data Center output after Infinity, up to 100 seconds. | Please restore from the last responsible backup. |
| Knowledge Vault | 5 | 16 | Archive Restoration, Distributed Campus | Cold Storage keeps 30 purchased research levels; completed subjects add 30% Data Center output each. Bonuses are additive. | Somewhere, a librarian has become a megastructure. |

**After Discovery**

- **Cold Storage:** Keep up to 60 seconds of naturally earned Discovery progress through Infinity.
- **Cold Cache:** Every 50 paid Data Centers makes your next Data Center 25% cheaper.
- **Archive Restoration:** Your first 10 natural discoveries after Infinity each grant 10 seconds of Data Center output.
- **Knowledge Vault:** Cold Storage keeps 2 minutes of Discovery progress; completed subjects add 30% Data Center output each. Bonuses are additive.

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Cold Storage** — `subskill.dataCenterTree.coldStorage` · entry · depth 1 · 3 SP including prerequisites.

Retain the first 10 paid facility-research levels in purchase order. Free/generated levels and cost discounts do not count as purchases. The retained level sets the next price normally. Discovery: retain min(60, directly earned own-bar raw progress), max with other same-bar retention, never full completions.

- Systems: Research, Infinity. Limit: 10 retained paid levels.
- Source: paid levels; direct Discovery progress. New ledger reset: Infinity.
- Interaction: retention ledger.

**Archive Fever** — `subskill.dataCenterTree.archiveFever` · entry · depth 1 · 1 SP including prerequisites.

b_DataCenters = 0.15 * completedEducationSubjects, maximum 6.

- Systems: Education, Data Centers. Limit: +90% Data Centers.
- Source: current state. New ledger reset: Native education state: survives Infinity; follows Dream/Quantum resets.
- Interaction: bounded bonus.

**Cold Cache** — `subskill.dataCenterTree.coldCache` · specialization · depth 2 · 5 SP including prerequisites.

Before Discovery: Paid DC thresholds generate at most one outstanding coupon; settled native research purchase consumes it. The reduction shares the 50% research-price ceiling, never changes growth factors.
After Discovery: Actual paid DC thresholds prepare one outstanding .25 Cash coupon for one native DC unit; shared .50 price ceiling; real purchase consumes it.

- Systems: Data Centers, Research prices. Limit: one 25% coupon.
- Discovery limit: one25% DC Cash coupon.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: coupon.

**Distributed Campus** — `subskill.dataCenterTree.distributedCampus` · specialization · depth 2 · 3 SP including prerequisites.

b_Education=min(1,0.1*floor(paidDataCenters/100)). After subject completion use its existing outputs, never an extra full Simulation tick.

- Systems: Data Centers, Education. Limit: +100% education.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Archive Restoration** — `subskill.dataCenterTree.archiveRestoration` · specialization · depth 3 · 8 SP including prerequisites.

Before Discovery: During first 120 game seconds after Infinity, each true facility research level credits 10 seconds of native DC-to-Server output; per-Infinity lifetime entitlement 100 seconds. No coupon/retained level emits a purchase.
After Discovery: First ten qualifying natural own-bar completions per Infinity each credit10 native DC production seconds. No120-second window in this phase; total100 seconds, flags survive refund.

- Systems: Research, Infinity, Data Centers. Limit: 100 DC production seconds per Infinity.
- Discovery limit: 100 DC seconds per Infinity.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: finite recovery grant.

**Knowledge Vault** — `subskill.dataCenterTree.knowledgeVault` · capstone · depth 4 · 16 SP including prerequisites.

Before Discovery: Replace Cold Storage retention ceiling 10 by 30, applied once with other retentions by maximum. Replace Archive Fever coefficient .15 by .30 per completed subject, not an additional .30.
After Discovery: Replace Cold Storage raw-progress retention ceiling60 by120 raw units, at most current unfinished own-bar progress, max with other entitlements. b_DC=.30*completedSubjects, cap1.8.

- Systems: Research, Education, Infinity, Data Centers. Limit: 30 research levels; +180% DC output.
- Discovery limit: 120 raw progress units; +180% DC output.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Quantum.
- Interaction: capstone enhancement.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="planetstree"></a>
### Planets

Base ID: `planetsTree` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **6 choices · entire menu 15 SP.**

**Branch design:** Planet ownership opens health, governance and launch logistics. Late choices commit to inhabited worlds or megastructure entry.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Orbital Clinics | 1 | 1 | Fractured parent | Every 25 paid Planets adds 5% Panel Lifetime, up to 100%. Bonuses are additive. | Routine maintenance, now with an atmosphere. |
| Local Government | 2 | 2 | Fractured parent | Simulation education is 25% faster while you own 20 Planets. Bonuses are additive. | The committee approved a very small curriculum. |
| Orbital Logistics | 2 | 4 | Local Government | Space Factories consume 15% fewer Factories while you own 100 Planets. | Your delivery has entered low orbit. |
| Public Health | 2 | 3 | Orbital Clinics | Above 10 minutes of Panel Lifetime, Simulation Housing produces 100% more Workers. Bonuses are additive. | The atmosphere comes with dental cover. |
| Planetary Charter | 3 | 7 | Orbital Logistics | Your first paid megastructure of each type costs 25% less Cash. | The zoning meeting was surprisingly brief. |
| Living Worlds | 5 | 15 | Public Health, Planetary Charter | Each completed subject adds 20% Planet output and 10% Panel Lifetime. Bonuses are additive. | A planet is more than a large filing cabinet. |

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Orbital Clinics** — `subskill.planetsTree.orbitalClinics` · entry · depth 1 · 1 SP including prerequisites.

b_Lifetime = min(1, 0.05 * floor(paidPlanets / 25)); real purchases only.

- Systems: Planets, Lifetime. Limit: +100% Lifetime.
- Source: paid Planets only. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Local Government** — `subskill.planetsTree.localGovernment` · entry · depth 1 · 2 SP including prerequisites.

b_Education = 0.25 if totalPlanets >= 20 else 0; one shared additive education-speed channel.

- Systems: Planets, Education. Limit: +25% education speed.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Orbital Logistics** — `subskill.planetsTree.orbitalLogistics` · specialization · depth 2 · 4 SP including prerequisites.

Apply .15 amount discount to the conservative Space Factory input quote; Rockets unchanged; shared input-price ceiling .50.

- Systems: Planets, Space Factories. Limit: 15% Factory-input discount.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: input discount.

**Public Health** — `subskill.planetsTree.publicHealth` · specialization · depth 2 · 3 SP including prerequisites.

While native derived panelLifetime>=600 game seconds, b_HousingWorkerOutput=1; no additional residents fabricated without a represented production credit.

- Systems: Panel Lifetime, Housing. Limit: +100% Housing output.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Planetary Charter** — `subskill.planetsTree.planetaryCharter` · specialization · depth 3 · 7 SP including prerequisites.

One paid Cash discount per megastructure type per Infinity. Evaluate before debit; durable flag consumes only when transaction settles, including under buy-max. No free generated trigger.

- Systems: Planets, Megastructure prices. Limit: three 25% purchase discounts per Infinity.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: first-purchase discount.

**Living Worlds** — `subskill.planetsTree.livingWorlds` · capstone · depth 4 · 15 SP including prerequisites.

b_PlanetOutput=.20*completedSubjects; b_Lifetime=.10*completedSubjects, each counted once from native six subject flags.

- Systems: Education, Planets, Panel Lifetime. Limit: +120% Planet output; +60% Lifetime.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="workerefficiencytree"></a>
### Worker Efficiency

Base ID: `workerEfficiencyTree` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **4 choices · entire menu 8 SP.**

**Branch design:** Gather storage and decay salvage are the two roots; the worker-allocation route rewards sustained labour without turning credited decay into spendable income.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Long Lunch | 1 | 1 | Fractured parent | Reality holds four manual Gather batches. With Auto Gather, Influence generation is 25% higher. Bonuses are additive. | One lunch break. Four times the paperwork. |
| Recycling Shift | 2 | 2 | Fractured parent | Every 10 million panels decayed grants 1 second of Cash production, up to 12 seconds per minute. | The bins are sorted by stellar classification. |
| Shift Handover | 2 | 3 | Long Lunch | Allocation changes grant 15 seconds of panels every 5 minutes. With Bot Multitasking, panels rise 25%. Bonuses are additive. | The next shift has brought its own universe. |
| Circular Workforce | 3 | 5 | Recycling Shift | With at least half your Bots as Workers, physical panel decay adds up to 100% Influence generation. Bonuses are additive. | Every departing panel leaves a job reference. |

**After Discovery**

- **Shift Handover:** Panel production is 25% higher. Bonuses are additive.

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Long Lunch** — `subskill.workerEfficiencyTree.longLunch` · entry · depth 1 · 1 SP including prerequisites.

Manual capacity512; Gather conservatively converts every complete128-worker batch, retaining leftovers. With Auto Gather, capacity is irrelevant and b_Influence=.25 instead. No loss of three batches at Gather.

- Systems: Workers, Reality. Limit: 512 manual Workers or +25% automatic Influence.
- Source: actual generated Reality workers. New ledger reset: Infinity.
- Interaction: conservative batch settlement.

**Recycling Shift** — `subskill.workerEfficiencyTree.recyclingShift` · entry · depth 1 · 2 SP including prerequisites.

Use physical decay, excluding multiplied decay credit. A 12-second bucket refills at 0.2 per game second; grant native Cash seconds only.

- Systems: Decay, Cash. Limit: +20% native Cash throughput.
- Source: physical panel decay. New ledger reset: Infinity.
- Interaction: nonrecursive production grant.

**Shift Handover** — `subskill.workerEfficiencyTree.shiftHandover` · specialization · depth 2 · 3 SP including prerequisites.

Before Discovery: Trigger only a real allocation change of at least 10 percentage points. 300-game-second absolute cooldown, initially empty; credit 15 seconds native panel output; no unassign bypass. With native Bot Multitasking, replace the change-trigger grant by b_Panels=.25.
After Discovery: After Discovery or native Bot Multitasking unlock, allocation is not an actionable slider: replace the allocation-change reward with b_Panels=.25. Never award both.

- Systems: Allocation, Panels. Limit: 15 panel seconds per 5 game minutes.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: production grant.

**Circular Workforce** — `subskill.workerEfficiencyTree.circularWorkforce` · specialization · depth 2 · 5 SP including prerequisites.

b_Influence= workerFraction>=.5 ? min(1,.10*log10(1+physicalDecayPerSecond)) : 0. Use physical decay only, excluding Supermassive Panels’s extra credited decay.

- Systems: Allocation, Physical decay, Influence. Limit: +100% Influence.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="doublesciencetree"></a>
### Science *2

Base ID: `doubleScienceTree` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **4 choices · entire menu 8 SP.**

**Branch design:** Science has an immediate research path and an education path; a final choice changes the reward for completed experiments rather than adding redundant Science multipliers.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Peer Review | 1 | 1 | Fractured parent | Each different research type purchased this Infinity adds 5% Science, up to 50%. Bonuses are additive. | The other reviewer is also a bot. |
| Lab Assistants | 1 | 1 | Fractured parent | Simulation education is 1% faster per 10 Science Boost levels, up to 100%. Bonuses are additive. | The lab coats are mostly pockets. |
| Open Laboratory | 2 | 3 | Peer Review | Buying a new research type adds 100% Science for 1 minute. Bonuses are additive. | The experiment escaped. We published it anyway. |
| Research Fellowship | 4 | 8 | Open Laboratory, Lab Assistants | Fully educated Simulations make facility research 30% cheaper and Science Boosts 100% stronger. Bonuses are additive. | Your grant has received tenure. |

**After Discovery**

- **Peer Review:** Your first five natural Discoveries this Infinity add 5% Discovery speed each. Bonuses are additive.
- **Lab Assistants:** Each natural Discovery adds 2% Simulation education speed, up to 100%. Bonuses are additive.
- **Open Laboratory:** Natural Discovery completions add 2% progress to the next bar, up to 10% per minute.
- **Research Fellowship:** Fully educated Simulations add 25% tree speed and 25% SRS charging speed. Bonuses are additive.

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Peer Review** — `subskill.doubleScienceTree.peerReview` · entry · depth 1 · 1 SP including prerequisites.

b_Science = min(0.5, 0.05 * distinctPaidResearchTypes); after Discovery use five natural Discovery completions at +5% each, capped +25% speed.

- Systems: Research, Discovery. Limit: +50% Science; +25% Discovery speed.
- Source: paid research types; natural completions. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Lab Assistants** — `subskill.doubleScienceTree.labAssistants` · entry · depth 1 · 1 SP including prerequisites.

b_Education = min(1, floor(scienceBoostLevels/10) * 0.01). Discovery variant min(1, 0.02 * naturalDiscoveryCompletions).

- Systems: Science Boost, Education. Limit: +100% education speed.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Open Laboratory** — `subskill.doubleScienceTree.openLaboratory` · specialization · depth 2 · 3 SP including prerequisites.

First true paid level in a research ID refreshes one 60-game-second Science window, at most once per ID per Infinity. Before Discovery only. After Discovery natural completion grants a raw .02 unfinished Discovery bar once per completion through a .10-bar-per-minute bucket.

- Systems: Science, Research, Discovery. Limit: +100% Science; later .10 raw bar per game minute.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Research Fellowship** — `subskill.doubleScienceTree.researchFellowship` · capstone · depth 3 · 8 SP including prerequisites.

Before Discovery: While all six native subjects are complete, research quote reduction .30 shares the .50 ceiling and b_ScienceBoostStrength=1.
After Discovery: All six native subject flags enable shared tree speed .25 weighted1/.5/.25 and SRS charging .25 under the new+100% speed ceiling. No retired research discount.

- Systems: Education, Research, Discovery. Limit: 30% research discount; +100% boost strength.
- Discovery limit: +25% tree speed and SRS charging.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="assemblymegalines"></a>
### Assembly Megalines

Base ID: `assemblyMegaLines` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **5 choices · entire menu 13 SP.**

**Branch design:** The purchase bridge and production bridge can grow independently; a compact joint route supports high-count Assembly Line economics.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Assembly Votes | 2 | 2 | Fractured parent | 10% of Cash spent on Assembly Lines helps pay for your next Planet, up to 25% of its price. | The factories are demanding representation. |
| Factory Towns | 2 | 2 | Fractured parent | Every 20 tenfold increases in Assembly Lines adds 50% Planet output, up to 200%. Bonuses are additive. | The suburbs now manufacture their own suburbs. |
| Municipal Bonds | 2 | 4 | Assembly Votes | Every 25 paid Planets gives your next 10 Assembly Lines a 25% Cash discount. | A small bond issue. Several large planets. |
| Factory District | 3 | 5 | Factory Towns | With 100 paid Planets, Assembly Lines produce 150% more Bots. Bonuses are additive. | Industrial zoning has become a celestial event. |
| Civic Megaline | 4 | 13 | Municipal Bonds, Factory District | Planets also lower AI Manager Cash prices, capped at a 40% reduction. | Middle management has been rezoned. |

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Assembly Votes** — `subskill.assemblyMegaLines.assemblyVotes` · entry · depth 1 · 2 SP including prerequisites.

Accumulate0.10*actual Cash debited for Lines. Apply min(voucher,.25*nativePlanetQuote,(.5-otherNewDiscount)*nativePlanetQuote); consume exactly the applied voucher. Other new discounts plus voucher may not exceed50% of the native quote. Deferred Billing earns zero.

- Systems: Assembly Lines, Planet purchases. Limit: 25% of the next Planet price.
- Source: actual Cash debits. New ledger reset: Infinity.
- Interaction: conservative voucher.

**Factory Towns** — `subskill.assemblyMegaLines.factoryTowns` · entry · depth 1 · 2 SP including prerequisites.

b_PlanetOutput = min(2, 0.025 * log10(1 + totalLines)); boosts Planets making Data Centers, not every source of Planets.

- Systems: Assembly Lines, Planets. Limit: +200% Planet output.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Municipal Bonds** — `subskill.assemblyMegaLines.municipalBonds` · specialization · depth 2 · 4 SP including prerequisites.

One outstanding 10-unit coupon pack; paid Planet thresholds only. Each coupon applies to an actual Line quote, shares .50 ceiling, persists through refund and cannot pay generated units.

- Systems: Planets, Assembly Line prices. Limit: 10 coupons at 25%.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: coupon.

**Factory District** — `subskill.assemblyMegaLines.factoryDistrict` · specialization · depth 2 · 5 SP including prerequisites.

b_Bots=1.5 if paidPlanets>=100, else 0. Terra virtual counts and retained/generated Planets do not satisfy it.

- Systems: Planets, Bots. Limit: +150% Bots.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Civic Megaline** — `subskill.assemblyMegaLines.civicMegaline` · capstone · depth 3 · 13 SP including prerequisites.

d_Manager=min(.40,.05*log10(1+ownedPlanets)); apply as a bounded new quote discount, not by extending Assembly Megalines’ uncapped native denominator to another stage.

- Systems: Planets, AI Manager prices. Limit: 40% Manager Cash discount.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded price bridge.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>


## Economy

<a id="workerboost"></a>
### Worker Boost

Base ID: `workerBoost` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **5 choices · entire menu 12 SP.**

**Branch design:** Workers can specialize in active pay, saved time or political influence; the costly union route uses Cash research without creating an unrestricted resource conversion.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Union Dues | 1 | 1 | Fractured parent | Each 10% assigned to Workers adds 5% Influence generation. Bonuses are additive. | Collective bargaining has reached another universe. |
| Paid Breaks | 2 | 2 | Fractured parent | After 5 minutes without Tinkering, gain 50% Cash and 25% Bot production. Bonuses are additive. | The bots have negotiated a productivity break. |
| Time and a Half | 2 | 3 | Union Dues | Tinker grants 5 seconds of Cash production while Workers hold at least half your Bots, up to 20 seconds per minute. | The universe has agreed to pay overtime. |
| Right to Disconnect | 3 | 5 | Paid Breaks | Cash production is 150% higher while spending Stored Time. Bonuses are additive. | Please contact the next galaxy during business hours. |
| Collective Agreement | 4 | 7 | Time and a Half | Cash Boost strength adds up to 200% Influence generation. Bonuses are additive. | Management has recognized the swarm. |

**After Discovery**

- **Union Dues:** Influence generation is 50% higher. Bonuses are additive.
- **Time and a Half:** Tinker grants 5 seconds of Cash production, up to 20 seconds per minute.

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Union Dues** — `subskill.workerBoost.unionDues` · entry · depth 1 · 1 SP including prerequisites.

Before Discovery: b_Influence=.50*nativeWorkerFraction. With Bot Multitasking the fraction is1, never two allocations.
After Discovery: All IDS Bots are Workers after Discovery. The native 10 allocation bands therefore give b_Influence=.50 without a fictitious slider.

- Systems: Bot allocation, Reality. Limit: +50% Influence generation.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Paid Breaks** — `subskill.workerBoost.paidBreaks` · entry · depth 1 · 2 SP including prerequisites.

Eligibility follows 300 assigned game seconds since last Tinker; spending Stored Time advances it. b_Cash=.5, b_Bots=.25; Tinker clears the timer.

- Systems: Idle play, Cash, Bots. Limit: +50% Cash and +25% Bots.
- Source: current state. New ledger reset: Infinity.
- Interaction: assigned-time condition.

**Time and a Half** — `subskill.workerBoost.timeAndAHalf` · specialization · depth 2 · 3 SP including prerequisites.

Before Discovery: Eligible Tinker completions use a 20-Cash-second-per-game-minute empty bucket; require workerFraction>=.5 at settlement.
After Discovery: Same native Tinker bucket20/60, no Worker condition since all Bots are Workers.

- Systems: Workers, Tinker, Cash. Limit: 20 Cash seconds per game minute.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: production grant.

**Right to Disconnect** — `subskill.workerBoost.rightToDisconnect` · specialization · depth 2 · 5 SP including prerequisites.

b_Cash=1.5 only for source=stored-time; do not also award an absence credit or extra game seconds.

- Systems: Cash, Stored Time. Limit: +150% Cash.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Collective Agreement** — `subskill.workerBoost.collectiveAgreement` · capstone · depth 3 · 7 SP including prerequisites.

b_Influence=min(2,.10*log10(1+nativeCashBoostMultiplier)). Quote native research multiplier, excluding this augment and other new packets.

- Systems: Cash research, Influence. Limit: +200% Influence.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="producedassciencetree"></a>
### Science Boost

Base ID: `producedAsScienceTree` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **5 choices · entire menu 12 SP.**

**Branch design:** Scientist allocation supports education, practical facility work or a launch program. Discovery replaces Science-specific returns explicitly.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Graduate Intake | 1 | 1 | Fractured parent | Each 10% assigned to Science adds 5% Simulation education speed. Bonuses are additive. | The university accepts applicants from every timeline. |
| Practical Thesis | 2 | 2 | Fractured parent | Purchased Science Boosts grant 1 second of Assembly Line output, up to 15 seconds per minute. | It turns out the thesis was an assembly manual. |
| Research Placements | 2 | 3 | Graduate Intake | With at least half your Bots as Scientists, Simulation Bots produce 100% more Rockets. Bonuses are additive. | The internship includes launch privileges. |
| Field Experiment | 3 | 5 | Practical Thesis | Every 50 purchased Science Boosts grants 15 seconds of Planet output, up to 30 seconds per minute. | The test planet is no longer hypothetical. |
| Institute of Applied Swarming | 4 | 12 | Research Placements, Field Experiment | With equal Worker and Scientist allocation, education is 150% faster and Planets produce 100% more. Bonuses are additive. | The faculty has achieved a productive compromise. |

**After Discovery**

- **Graduate Intake:** Simulation education is 50% faster. Bonuses are additive.
- **Practical Thesis:** Natural Discoveries grant 15 seconds of Assembly Line output, up to 15 seconds per minute.
- **Research Placements:** During the second half of Discovery, Simulation Bots produce 100% more Rockets. Bonuses are additive.
- **Field Experiment:** Natural Discovery completions grant 10 seconds of Planet output, up to 30 seconds per minute.
- **Institute of Applied Swarming:** Natural discoveries add 150% education speed and 100% Planet output for 2 minutes. Bonuses are additive.

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Graduate Intake** — `subskill.producedAsScienceTree.graduateIntake` · entry · depth 1 · 1 SP including prerequisites.

b_Education = 0.5 * scienceAllocation; Multitasking uses 100%; after Discovery the condition is always full.

- Systems: Bot allocation, Education. Limit: +50% education speed.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Practical Thesis** — `subskill.producedAsScienceTree.practicalThesis` · entry · depth 1 · 2 SP including prerequisites.

A native Line-output bucket refills at .25 second per game second, holds 15, and grants 1 per paid Science Boost. After Discovery each natural completion requests 15.

- Systems: Science Boost, Assembly Lines. Limit: +25% native Line throughput.
- Source: paid Science Boosts; natural completions. New ledger reset: Infinity.
- Interaction: nonrecursive production grant.

**Research Placements** — `subskill.producedAsScienceTree.researchPlacements` · specialization · depth 2 · 3 SP including prerequisites.

Before Discovery: b_SimulationRocketOutput=1 if scientistFraction>=.5; Rockets remain a represented native production credit, never a free launch.
After Discovery: Native unfinished Discovery fraction>=.5 enables b_Rockets=1, replacing the retired Scientist condition.

- Systems: Scientists, Simulation Bots, Rockets. Limit: +100% Rocket output.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Field Experiment** — `subskill.producedAsScienceTree.fieldExperiment` · specialization · depth 2 · 5 SP including prerequisites.

Paid Science Boost thresholds n=50,100,... grant through 30-Planet-second-per-minute bucket. After Discovery natural completion grants 10 Planet seconds, same bucket; neither grants nor generated research emit threshold events.

- Systems: Science research, Planets, Discovery. Limit: 30 Planet seconds per game minute.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: production grant.

**Institute of Applied Swarming** — `subskill.producedAsScienceTree.instituteOfAppliedSwarming` · capstone · depth 3 · 12 SP including prerequisites.

Before Discovery: Exact allocation slider fractions must match and both be positive. b_Education=1.5, b_PlanetOutput=1; evaluate once from the pre-production allocation.
After Discovery: Each qualifying natural own-bar completion refreshes one120-game-second window with b_Education=1.5,b_Planet=1. Grant-caused completions do not refresh; no stacking.

- Systems: Allocation, Education, Planets. Limit: +150% education; +100% Planet output.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="economicrevolution"></a>
### Economic Revolution

Base ID: `economicRevolution` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **6 choices · entire menu 14 SP.**

**Branch design:** A workers’ economy branches into construction finance and universal education; steady cash can instead support ongoing Simulation production.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Public Works | 2 | 2 | Fractured parent | While at least half your Bots are Workers, facility Cash prices are 15% lower. | The budget finally includes actual buildings. |
| Venture Schools | 1 | 1 | Fractured parent | Buying a new facility type advances each unfinished Simulation subject by 30 seconds, once per type this Infinity. | The donors would like their names on the rocket. |
| Construction Fund | 2 | 4 | Public Works | Every 100 paid basic facilities earns a 25% discount on your next megastructure. | The revolution has approved a capital project. |
| Evening Classes | 2 | 3 | Venture Schools | With at least half your Bots as Workers, unfinished Simulation subjects progress 75% faster. Bonuses are additive. | After work, the workers study the work. |
| Municipal Services | 3 | 5 | Public Works | Holding 5 minutes of Cash income adds 100% Simulation Factory and Space Factory output. Bonuses are additive. | The tax office has purchased a rocket. |
| Revolutionary Dividend | 4 | 11 | Construction Fund, Evening Classes | Fully educated Simulations add 200% Cash and 100% Bot production. Bonuses are additive. | The five-year plan has arrived early. |

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Public Works** — `subskill.economicRevolution.publicWorks` · entry · depth 1 · 2 SP including prerequisites.

Discount coefficient d=.15 while workerAllocation>=.5 or Multitasking/Discovery. Part of the shared new-discount cap of 50%; never changes the growth exponent.

- Systems: Bot allocation, Purchases. Limit: 15% facility price reduction.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Venture Schools** — `subskill.economicRevolution.ventureSchools` · entry · depth 1 · 1 SP including prerequisites.

One entitlement per genuinely paid facility type, 8 maximum; grant progress only, no automatic subject rewards before ordinary settlement.

- Systems: Purchases, Education. Limit: 240 education seconds per subject per Infinity.
- Source: first paid purchase of each type. New ledger reset: Infinity.
- Interaction: one-shot ledger.

**Construction Fund** — `subskill.economicRevolution.constructionFund` · specialization · depth 2 · 4 SP including prerequisites.

Aggregate actual basic-facility purchases cross 100-unit thresholds; one coupon outstanding, never created by Terra virtual counts; consume on a settled paid mega quote, sharing .50 cap.

- Systems: Purchases, Megastructure prices. Limit: one 25% coupon.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: coupon.

**Evening Classes** — `subskill.economicRevolution.eveningClasses` · specialization · depth 2 · 3 SP including prerequisites.

b_Education=.75 if workerFraction>=.5; only native education progress is accelerated, not fixed grant packets.

- Systems: Workers, Education. Limit: +75% education.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Municipal Services** — `subskill.economicRevolution.municipalServices` · specialization · depth 2 · 5 SP including prerequisites.

Use native pre-new-bonus Cash rate C0. money>=300*C0 and C0>0 gives b_Factory=b_SpaceFactory=1; conserve every native input debit.

- Systems: Cash reserve, Simulation production. Limit: +100% Factory and Space Factory output.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Revolutionary Dividend** — `subskill.economicRevolution.revolutionaryDividend` · capstone · depth 3 · 11 SP including prerequisites.

All six completed native subjects enable b_Cash=2,b_Bots=1; completed flags are the condition, not six grant-generated completion events.

- Systems: Education, Cash, Bots. Limit: +200% Cash; +100% Bots.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="scientificrevolution"></a>
### Scientific Revolution

Base ID: `scientificRevolution` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **6 choices · entire menu 17 SP.**

**Branch design:** The academia root can deepen into cheaper research; the teaching root spreads natural progress and ends in a separate launch specialization.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Open Access | 2 | 2 | Fractured parent | While at least half your Bots are Scientists, percentage research costs 20% less. | The paywall has mysteriously become a window. |
| Continuing Education | 2 | 2 | Fractured parent | Completing a Simulation subject advances the slowest unfinished subject by 2 minutes. | Please keep your student ID through the apocalypse. |
| Common Curriculum | 2 | 4 | Continuing Education | With at least half your Bots as Scientists, the slowest Simulation subject receives 25% of the fastest subject’s natural progress. | The faculty has finally shared its notes. |
| Research Cooperative | 3 | 5 | Open Access | Each completed subject adds 3% facility research discount, up to 18%. | Peer review now comes with bulk purchasing. |
| Public Experiment | 3 | 7 | Common Curriculum | The first successful Railgun volley each minute grants 10 seconds of Server output. | Your hypothesis has left the atmosphere. |
| Scientific Mandate | 5 | 17 | Research Cooperative, Public Experiment | With half your Bots as Scientists, Science Boosts and Simulation education are 150% stronger. Bonuses are additive. | The evidence has won a majority. |

**After Discovery**

- **Open Access:** Adds 25% Discovery speed. Bonuses are additive.
- **Common Curriculum:** During the second half of Discovery, the slowest subject receives 25% of the fastest subject’s natural progress.
- **Research Cooperative:** Each completed subject adds 3% Discovery strength, up to 18%. Bonuses are additive.
- **Scientific Mandate:** During the second half of Discovery, tree speed rises 50% and education is 150% faster. Bonuses are additive.

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Open Access** — `subskill.scientificRevolution.openAccess` · entry · depth 1 · 2 SP including prerequisites.

d_Research=.20 while scienceAllocation>=.5 or Multitasking; no effect on Durability. Discovery variant adds .25 speed while assigned.

- Systems: Bot allocation, Research. Limit: 20% percentage-research discount; +25% Discovery speed.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Continuing Education** — `subskill.scientificRevolution.continuingEducation` · entry · depth 1 · 2 SP including prerequisites.

Each native subject completion grants120 raw progress to one other unfinished subject. Six source entitlements per Dream run, only completions after assignment. Grants cannot trigger further augment awards.

- Systems: Education, Shared progress. Limit: Six120-progress grants per Dream run.
- Source: current state. New ledger reset: Dream run.
- Interaction: nonrecursive completion ledger.

**Common Curriculum** — `subskill.scientificRevolution.commonCurriculum` · specialization · depth 2 · 4 SP including prerequisites.

Before Discovery: Each interval copy .25 of the fastest unfinished subject’s native raw progress to the slowest distinct unfinished subject. Native donor excludes transfers/grants. Ties use stable subject IDs.
After Discovery: Native Discovery fraction>=.5 gates the same .25 nonrecursive raw education transfer; distinct unfinished donor/target, native own progress excludes all copies.

- Systems: Scientists, Education. Limit: 25% native raw-progress transfer.
- Discovery limit: 25% one-donor progress transfer.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: nonrecursive progress transfer.

**Research Cooperative** — `subskill.scientificRevolution.researchCooperative` · specialization · depth 2 · 5 SP including prerequisites.

Before Discovery: d_Research=.03*completedSubjects, shares .50 quote cap.
After Discovery: Shared native Discovery/Elevation bonus enhancement .03*completedSubjects, cap.18. Applies to bonus above1 once, never to TP prices or Enlightenment Lifetime.

- Systems: Education, Research prices, Discovery. Limit: 18% research/strength-price discount.
- Discovery limit: +18% strength enhancement.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: price discount.

**Public Experiment** — `subskill.scientificRevolution.publicExperiment` · specialization · depth 3 · 7 SP including prerequisites.

At most one native successful volley per 60 game seconds consumes an initially empty token and grants 10 seconds of native Server-to-Manager output. Panel and Energy debits still settle fully.

- Systems: Railguns, Servers. Limit: 10 Server seconds per game minute.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: production grant.

**Scientific Mandate** — `subskill.scientificRevolution.scientificMandate` · capstone · depth 4 · 17 SP including prerequisites.

Before Discovery: scientistFraction>=.5 enables b_ScienceBoostStrength=1.5,b_Education=1.5.
After Discovery: Native unfinished Discovery fraction>=.5 enables shared tree speed .50 weighted by tier and b_Education=1.5; no Scientist predicate.

- Systems: Scientists, Research strength, Education, Discovery. Limit: +150% research strength/education; later +50% tree speed.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="economicdominance"></a>
### Economic Dominance

Base ID: `economicDominance` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **7 choices · entire menu 18 SP.**

**Branch design:** A broad capital branch offers reserves, research subsidies, city development and megastructure purchasing; the capstone requires a real allocation commitment.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Cash Reserve | 1 | 1 | Fractured parent | Holding one minute of Cash income adds 100% Bot production. Bonuses are additive. | The emergency fund has become self-aware. |
| Private Observatory | 2 | 2 | Fractured parent | Each 1% of average facility Cash discounts adds 1% Science production, up to 50%. Bonuses are additive. | Nothing says scientific freedom like a billionaire telescope. |
| Collateral | 2 | 3 | Cash Reserve | Holding 10 minutes of Cash income reduces megastructure Cash prices by 20%. | Your collateral is several solar systems. |
| Cross Subsidy | 2 | 4 | Private Observatory | With at least half your Bots as Workers, facility research costs 20% less. | The profitable department has received a invoice. |
| Company Town | 3 | 6 | Collateral | Cash reserves above 1 hour of income make Simulation Cities produce 100% more Workers. Bonuses are additive. | The company owns the local gravitational field. |
| Tax Shelter | 3 | 7 | Cross Subsidy | Paid facility purchases reduce your next Solar or Fusion Influence price by 1%, up to 25%. | The offshore account is now literally offshore. |
| Industrial Hegemony | 5 | 18 | Company Town, Tax Shelter | With at least 75% Workers, Cash gains 300% production and megastructures gain 100% output. Bonuses are additive. | The economy now has its own constellation. |

**After Discovery**

- **Private Observatory:** Each 1% of average facility Cash discounts adds 0.3% Discovery speed, up to 15%. Bonuses are additive.
- **Cross Subsidy:** During the first half of Discovery, tree speed is 20% higher. Bonuses are additive.
- **Industrial Hegemony:** Cash production rises 300% and megastructures gain 100% output. Bonuses are additive.

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Cash Reserve** — `subskill.economicDominance.cashReserve` · entry · depth 1 · 1 SP including prerequisites.

b_Bots = 1 if balanceCash >= 60 * unaugmentedCashPerSecond and nativeCashRate>0 else 0. Snapshot the quoted rate without this augment and other new Cash grants.

- Systems: Cash reserve, Bots. Limit: +100% Bots.
- Source: current state. New ledger reset: Infinity.
- Interaction: noncircular affordability condition.

**Private Observatory** — `subskill.economicDominance.privateObservatory` · entry · depth 1 · 2 SP including prerequisites.

Let d be the mean active new-augment Cash discount across five next basic-facility quotes, bounded0..0.5. b_Science=d; b_Discovery=.3*d. Native Terra price effects do not qualify.

- Systems: Discounts, Science. Limit: +50% Science; +15% Discovery speed.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded quote dependency.

**Collateral** — `subskill.economicDominance.collateral` · specialization · depth 2 · 3 SP including prerequisites.

Native Cash rate C0>0 and money>=600*C0 enables d_Mega=.20; price amount only, no exponent/index change.

- Systems: Cash reserve, Megastructure prices. Limit: 20% Cash discount.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: price discount.

**Cross Subsidy** — `subskill.economicDominance.crossSubsidy` · specialization · depth 2 · 4 SP including prerequisites.

Before Discovery: workerFraction>=.5 gives .20 research quote discount, sharing .50 ceiling.
After Discovery: Fraction<.5 enables shared weighted tree-speed bonus .20. No research or TP price discount.

- Systems: Workers, Research prices, Discovery. Limit: 20% research discount.
- Discovery limit: +20% tree speed.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: price discount.

**Company Town** — `subskill.economicDominance.companyTown` · specialization · depth 3 · 6 SP including prerequisites.

money>=3600*nativeCashRate>0 enables b_CityOutput=1. Keep City production input/timing rules; no Cash debit is implied by this condition.

- Systems: Cash reserve, Simulation Cities. Limit: +100% City output.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Tax Shelter** — `subskill.economicDominance.taxShelter` · specialization · depth 3 · 7 SP including prerequisites.

Each settled purchase adds .01 coupon strength up to .25; next Solar/Fusion purchase consumes it after quote settlement. Deferred Billing transactions with zero debit do not earn credit.

- Systems: Facility purchases, Influence prices. Limit: one 25% coupon.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: resource-conserving coupon.

**Industrial Hegemony** — `subskill.economicDominance.industrialHegemony` · capstone · depth 4 · 18 SP including prerequisites.

Before Discovery: workerFraction>=.75 enables b_Cash=3 and b_MegaOutput=1. Ordinary new stat channels add; Galactic Brain replication lambda remains untouched.
After Discovery: All Bots are Workers in this phase, so the native Worker threshold is satisfied. b_Cash=3,b_Mega=1; fixed Brain replication excluded.

- Systems: Workers, Cash, Megastructures. Limit: +300% Cash; +100% ordinary mega output.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="scientificdominance"></a>
### Scientific Dominance

Base ID: `scientificDominance` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **7 choices · entire menu 19 SP.**

**Branch design:** The science empire offers patents, preserved capital, education and energetic demonstrations. Its capstone strengthens research with an explicit Discovery replacement.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Technology Transfer | 2 | 2 | Fractured parent | Each 50 purchased research levels adds 10% Cash, up to 200%. Bonuses are additive. | The patent office has stopped asking what it does. |
| Applied Physics | 2 | 2 | Fractured parent | Fusion generators in Simulations produce 50% more Energy. Bonuses are additive. | The abstract contains several scorch marks. |
| Patent Office | 2 | 4 | Technology Transfer | Every 100 purchased research levels adds 25% Bot production, up to 150%. Bonuses are additive. | The patent includes all nearby universes. |
| Research Reserve | 2 | 4 | Technology Transfer | Keep up to 20 seconds of unspent Science income through Infinity, capped at 1 trillion. | The emergency fund is denominated in discoveries. |
| Public Demonstration | 3 | 5 | Applied Physics | Every 30 seconds with SRS assigned grants 10 seconds of Fusion Energy, up to 20 seconds per minute. | The safety presentation will be visible from orbit. |
| University Endowment | 3 | 7 | Patent Office | Fully educated Simulations add 150% Server production and 50% Solar output. Bonuses are additive. | The university has invested in a small sun. |
| Theory of Everything Practical | 5 | 19 | Research Reserve, Public Demonstration, University Endowment | Science Boosts are 200% stronger; fully educated Simulations add 100% Data Center output. Bonuses are additive. | At last, a theory with a power socket. |

**After Discovery**

- **Technology Transfer:** Each natural Discovery adds 5% Cash production, up to 200%. Bonuses are additive.
- **Patent Office:** Each 10 natural discoveries adds 25% Bot production, up to 150%. Bonuses are additive.
- **Research Reserve:** Keep up to 10% of an unfinished Discovery bar through Infinity.
- **Theory of Everything Practical:** Discovery strength is 60% stronger; fully educated Simulations add 100% Data Center output. Bonuses are additive.

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Technology Transfer** — `subskill.scientificDominance.technologyTransfer` · entry · depth 1 · 2 SP including prerequisites.

b_Cash=min(2, .1*floor(totalPaidResearch/50)); after Discovery use .05 per natural completion, cap2.

- Systems: Research, Cash. Limit: +200% Cash.
- Source: paid research; natural Discovery completions. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Applied Physics** — `subskill.scientificDominance.appliedPhysics` · entry · depth 1 · 2 SP including prerequisites.

b_FusionEnergy=.5; affects Fusion generation only, not launched-panel Energy, charge efficiency or Railgun payload.

- Systems: Science, Simulation Energy. Limit: +50% Fusion Energy.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Patent Office** — `subskill.scientificDominance.patentOffice` · specialization · depth 2 · 4 SP including prerequisites.

Before Discovery: b_Bots=min(1.5,.25*floor(totalPaidResearchLevels/100)). Generated Shoulders levels and retained levels do not count.
After Discovery: b_Bots=min(1.5,.25*floor(qualifyingNaturalDiscoveryCount/10)), count resets with native Discovery completions at Infinity; no TP purchase-level threshold.

- Systems: Research purchases, Bots, Discovery. Limit: +150% Bots.
- Discovery limit: +150% Bots.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Research Reserve** — `subskill.scientificDominance.researchReserve` · specialization · depth 2 · 4 SP including prerequisites.

Retain min(endingScience,20*nativeScienceRate,1e12); max with competing Science retentions. After Discovery carry min(.10,unfinishedDiscoveryFraction) raw bar once, not a completed reward.

- Systems: Science, Infinity, Discovery. Limit: 1e12 Science; later .10 unfinished bar.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Quantum.
- Interaction: retention.

**Public Demonstration** — `subskill.scientificDominance.publicDemonstration` · specialization · depth 2 · 5 SP including prerequisites.

Chronological owned-SRS game time crosses each30-second boundary once. Credit10 seconds of native Fusion Energy through an initially empty20-Fusion-second-per-game-minute bucket. Hot Start, Afterglow, faster charging and retained charge do not advance this clock. No Railgun action or full Simulation tick.

- Systems: SRS, Simulation Energy. Limit: 20 Fusion seconds per game minute.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: production grant.

**University Endowment** — `subskill.scientificDominance.universityEndowment` · specialization · depth 3 · 7 SP including prerequisites.

All six subject flags enable b_ServerOutput=1.5,b_Solar=0.5. No unfinished subject receives a free completion.

- Systems: Education, Servers, Energy. Limit: +150% Server output; +50% Solar.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Theory of Everything Practical** — `subskill.scientificDominance.theoryOfEverythingPractical` · capstone · depth 4 · 19 SP including prerequisites.

b_ScienceBoostStrength=2; b_DC=1 if all six subjects complete. After Discovery replace research-strength with shared +60% tier-weighted strength enhancement, not bar speed.

- Systems: Research strength, Education, Data Centers, Discovery. Limit: +200% research strength; +100% DC output.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="dysonsubsidies"></a>
### Dyson Subsidies

Base ID: `dysonSubsidies` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **4 choices · entire menu 8 SP.**

**Branch design:** The parent already changes role at the first star; two deeper choices preserve that early/late split instead of filling the tree with unrelated perks.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Development Grant | 1 | 1 | Fractured parent | Your first surrounded star grants 60 seconds of Cash production, once per Infinity. | Congratulations. Your star qualifies for assistance. |
| Rural Broadband | 2 | 2 | Fractured parent | Before your first star, Servers are 100% stronger. Afterwards, Data Centers are 100% stronger. Bonuses are additive. | At last, reception on the dark side of the planet. |
| Colonial Grant | 2 | 3 | Development Grant | Each newly surrounded star grants 10 seconds of Planet output, up to 30 seconds per minute. | The grant application has caught fire. |
| After Sunset | 3 | 5 | Rural Broadband | After your first surrounded star, physical panel decay adds up to 150% Cash production. Bonuses are additive. | The sunset pays for tomorrow’s sunrise. |

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Development Grant** — `subskill.dysonSubsidies.developmentGrant` · entry · depth 1 · 1 SP including prerequisites.

One award at the first upward crossing of one star after assignment; native Cash rate captured before reward; no award from reassigning in an already-qualified run.

- Systems: Stars, Cash. Limit: 60 native Cash seconds per Infinity.
- Source: physical star crossing. New ledger reset: Infinity.
- Interaction: one-shot threshold ledger.

**Rural Broadband** — `subskill.dysonSubsidies.ruralBroadband` · entry · depth 1 · 2 SP including prerequisites.

Two mutually exclusive +1 bonuses selected by physical active panels >=20000; one target only at any instant.

- Systems: Stars, Servers, Data Centers. Limit: +100% to one link.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Colonial Grant** — `subskill.dysonSubsidies.colonialGrant` · specialization · depth 2 · 3 SP including prerequisites.

Actual first crossings of native surrounded-star count consume flags through a 30-Planet-second-per-minute bucket; Supermassive Panels’s extra credited decay never fabricates a surrounded star.

- Systems: Stars, Planets. Limit: 30 Planet seconds per game minute.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: production grant.

**After Sunset** — `subskill.dysonSubsidies.afterSunset` · specialization · depth 2 · 5 SP including prerequisites.

nativeStars>=1 enables b_Cash=min(1.5,.05*log10(1+physicalPanelsDecayed)). Exclude credited decay and new panel credits when classifying physical decay.

- Systems: Stars, Physical decay, Cash. Limit: +150% Cash.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="monetarypolicy"></a>
### Monetary Policy

Base ID: `monetaryPolicy` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **6 choices · entire menu 14 SP.**

**Branch design:** Fragment coordination can support prices, liquidity, wages or influence; food diversification deepens into a separate monetary reserve branch.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Balanced Budget | 2 | 2 | Fractured parent | Each active Fragment reduces facility Cash prices by 2%, up to 18%. | The missing pieces balance the books. |
| Foreign Reserves | 1 | 1 | Fractured parent | Feeding Avocato adds 20% Cash per different food fed this Quantum, up to 60%. Bonuses are additive. | The treasury is diversifying into fruit. |
| Liquidity Injection | 2 | 4 | Balanced Budget | Each active Fragment grants 2 seconds of Cash production every minute. | The central bank has found another printer. |
| Food Futures | 2 | 3 | Foreign Reserves | After feeding all three foods this Quantum, facility research prices are 20% lower. | Avocato has cornered the lunch market. |
| Living Wage | 3 | 7 | Liquidity Injection | Each active Fragment adds 10% Influence generation and 5% Simulation Housing output, up to 90% and 45%. Bonuses are additive. | The minimum wage is now measured in planets. |
| Universal Reserve | 4 | 14 | Living Wage, Food Futures | With five active Fragments and a balanced Avocato diet, all ordinary facility output rises 100%. Bonuses are additive. | Every currency is backed by a sandwich. |

**After Discovery**

- **Food Futures:** After feeding all three foods this Quantum, tree speed is 25% higher. Bonuses are additive.

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Balanced Budget** — `subskill.monetaryPolicy.balancedBudget` · entry · depth 1 · 2 SP including prerequisites.

d_Cash=min(.18,.02*realFragmentCount); no virtual Fragments; participates in shared new-discount cap.

- Systems: Fragments, Purchases. Limit: 18% price reduction.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Foreign Reserves** — `subskill.monetaryPolicy.foreignReserves` · entry · depth 1 · 1 SP including prerequisites.

One flag per positive actual feed from IP, Influence and Strange Matter. b_Cash=.2*count(flags); no bonus on zero/failed feeds.

- Systems: Avocato, Cash. Limit: +60% Cash.
- Source: positive represented feed debits. New ledger reset: Quantum.
- Interaction: feed ledger.

**Liquidity Injection** — `subskill.monetaryPolicy.liquidityInjection` · specialization · depth 2 · 4 SP including prerequisites.

Once per assigned 60-game-second boundary grant min(18,2*activeNativeFragmentCount) seconds native Cash. Count explicit Fragment tags only; no new augment inherits them.

- Systems: Fragments, Cash. Limit: 18 Cash seconds per game minute.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: production grant.

**Food Futures** — `subskill.monetaryPolicy.foodFutures` · specialization · depth 2 · 3 SP including prerequisites.

Before Discovery: Three food-type feed flags require positive actual feed debits. Once all true enable .20 research price discount;
After Discovery: All three positive-debit current-Quantum feed flags enable shared weighted tree speed .25. No TP price or purchased strength-level change.

- Systems: Avocato, Research prices, Discovery. Limit: 20% research discount.
- Discovery limit: +25% tree speed.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Quantum.
- Interaction: price discount.

**Living Wage** — `subskill.monetaryPolicy.livingWage` · specialization · depth 3 · 7 SP including prerequisites.

b_Influence=.10*min(F,9); b_Housing=.05*min(F,9); explicit current Fragment identities, no generated-count event.

- Systems: Fragments, Influence, Housing. Limit: +90% Influence; +45% Housing.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Universal Reserve** — `subskill.monetaryPolicy.universalReserve` · capstone · depth 4 · 14 SP including prerequisites.

Require F>=5 and all three genuine feed flags; b_Facility=1. Exclude Convergence lambda and native Galactic Tinker-cap donor quoting.

- Systems: Fragments, Avocato, Facilities. Limit: +100% ordinary facility output.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Quantum.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="regulatedacademia"></a>
### Regulated Academia

Base ID: `regulatedAcademia` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **5 choices · entire menu 11 SP.**

**Branch design:** Fragment-funded faculty branches into purchased research and tailored education, with a shared capstone for completed learning.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Research Charter | 2 | 2 | Fractured parent | Each active Fragment adds 5% facility research strength, up to 45%. Bonuses are additive. | The syllabus arrived in seven incompatible pieces. |
| Elective Credit | 1 | 1 | Fractured parent | Your slowest unfinished Simulation subject progresses 50% faster. Bonuses are additive. | This course counts toward absolutely everything. |
| Accreditation | 2 | 4 | Research Charter | Each completed subject reduces facility research prices by 3%, up to 18%. | The certificate has become load-bearing. |
| Rotating Faculty | 2 | 3 | Elective Credit | Completing a subject grants 30 seconds of the slowest unfinished subject’s natural progress, once per subject each Simulation. | Your lecturer has moved to another dimension. |
| Grand Faculty | 4 | 11 | Accreditation, Rotating Faculty | With five active Fragments, completed subjects add 15% facility research strength and 10% education speed. Bonuses are additive. | All departments have agreed on the same universe. |

**After Discovery**

- **Research Charter:** Each active Fragment enhances Discovery and Elevation bonuses by 2%, up to 18%. Bonuses are additive.
- **Accreditation:** Each completed subject adds 10% Solar output, up to 60%. Bonuses are additive.
- **Grand Faculty:** With five active Fragments, completed subjects add 5% Discovery strength and 10% education speed. Bonuses are additive.

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Research Charter** — `subskill.regulatedAcademia.researchCharter` · entry · depth 1 · 2 SP including prerequisites.

Scale only bonus above 1 from paid facility research by 1+min(.45,.05*F); generated research is excluded from this extra layer. After Discovery add up to.18 shared Discovery strength enhancement at.02 per F, affecting native Discovery production and Elevation Cash/Bots enhancement, never Enlightenment Lifetime.

- Systems: Fragments, Research, Discovery. Limit: +45% research bonus strength; +18% Discovery enhancement.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Elective Credit** — `subskill.regulatedAcademia.electiveCredit` · entry · depth 1 · 1 SP including prerequisites.

Add .5 speed only to the unfinished subject with greatest remaining native game time; stable subject-id tiebreak; recompute on completion, not UI selection.

- Systems: Fragments, Education. Limit: +50% to one education subject.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Accreditation** — `subskill.regulatedAcademia.accreditation` · specialization · depth 2 · 4 SP including prerequisites.

Before Discovery: d_Research=.03*completedSubjects shares .50 research-price cap.
After Discovery: b_Solar=.10*completedSubjects, max.60. This replaces retired research pricing and does not discount TP.

- Systems: Education, Research prices, Discovery. Limit: 18% research discount.
- Discovery limit: +60% Solar.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: price discount.

**Rotating Faculty** — `subskill.regulatedAcademia.rotatingFaculty` · specialization · depth 2 · 3 SP including prerequisites.

Natural completion only. Credit 30 seconds of target base education rate as raw progress, without new education multiplier. Six donor flags per Dream epoch; no recursion.

- Systems: Education. Limit: six 30-base-second education grants per Simulation.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Dream.
- Interaction: raw progress grant.

**Grand Faculty** — `subskill.regulatedAcademia.grandFaculty` · capstone · depth 3 · 11 SP including prerequisites.

F>=5 enables b_FacilityResearch=.15*completedSubjects and b_Education=.10*completedSubjects. Discovery replaces research term with final +30% shared strength enhancement at six subjects, proportional to count.

- Systems: Fragments, Research strength, Education, Discovery. Limit: +90% research strength; +60% education.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="repeatableresearch"></a>
### Repeatable Research

Base ID: `repeatableResearch` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **7 choices · entire menu 19 SP.**

**Branch design:** A seven-choice research engine offers coupon pacing, saving, specialized strengthening and natural Discovery completion equivalents; the capstone requires both research paths.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Replication Study | 3 | 3 | Fractured parent | Five purchased levels of one research type earn a 50% discount on its next level. Couponed levels do not count. | Same experiment. Slightly cheaper clipboard. |
| Negative Results | 1 | 1 | Fractured parent | After 1 minute without buying research, gain 50% Science until your next purchase. Bonuses are additive. | We learned several things that do not work. |
| Bulk Citation | 2 | 5 | Replication Study | Each 25 purchased levels of one research type adds 5% of its strength, up to 100%. Bonuses are additive. | The bibliography requires its own galaxy. |
| Patient Experiment | 2 | 3 | Negative Results | After 5 minutes without research purchases, your next facility research level costs 40% less. | We are waiting for the result to become affordable. |
| Replication Budget | 3 | 6 | Replication Study | Five couponed research levels grant 20 seconds of Cash production, up to 40 seconds per minute. | The original experiment has acquired a finance department. |
| Longitudinal Study | 3 | 6 | Patient Experiment | Each 10 minutes without Infinity adds 20% research strength, up to 100%. Bonuses are additive. | The experiment now has grandchildren. |
| Living Literature | 5 | 19 | Bulk Citation, Replication Budget, Longitudinal Study | Purchased research strengthens all basic facilities by 2% per 50 levels, up to 200%. Bonuses are additive. | The literature has begun conducting its own experiments. |

**After Discovery**

- **Replication Study:** Every fifth natural Discovery fills another 10% of its progress bar.
- **Negative Results:** Discovery is 10% faster during the first half of its progress bar. Bonuses are additive.
- **Bulk Citation:** Each 10 natural discoveries adds 2.5% Discovery strength, up to 50%. Bonuses are additive.
- **Patient Experiment:** After 1 minute waiting, a natural discovery grants 10% progress for the next bar.
- **Replication Budget:** Every fifth natural discovery grants 20 seconds of Cash production, up to 40 seconds per minute.
- **Longitudinal Study:** Each 10 minutes without Infinity adds 10% Discovery strength, up to 50%. Bonuses are additive.
- **Living Literature:** Each 10 natural discoveries adds 5% basic facility output, up to 200%. Bonuses are additive.

**After Elevation**

- **Replication Study:** Natural Discoveries add 25% Elevation speed for 1 minute. Bonuses are additive.
- **Negative Results:** Elevation is 15% faster during the first half of its progress bar. Bonuses are additive.

**After Enlightenment**

- **Replication Study:** Natural Elevations add 25% Enlightenment speed for 1 minute. Bonuses are additive.
- **Negative Results:** Enlightenment is 15% faster during the first half of its progress bar. Bonuses are additive.

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Replication Study** — `subskill.repeatableResearch.replicationStudy` · entry · depth 1 · 3 SP including prerequisites.

Coupon per type after five actual paid levels without this coupon; reset the five-level counter on redemption and exclude the couponed level; one held coupon; applies to one next level after normal Repeatable Research quote and within shared 50% new-discount limit. Free levels earn no coupons. Discovery variant grants360 raw progress per fifth native completion, settled once with augment triggers disabled; never multiply by Discovery speed. Tier variant: one refreshable60-game-second window adds.25 directly to the next unlocked tier speed; replace the earlier-tier coupon/progress effect. No grant-generated completion can refresh it. The25% is the final tier-specific bonus, not weighted again.

- Systems: Research, Prices. Limit: 50% off one in six paid levels.
- Source: paid level groups; natural completions. New ledger reset: Infinity.
- Interaction: coupon ledger; no recursive progress.

**Negative Results** — `subskill.repeatableResearch.negativeResults` · entry · depth 1 · 1 SP including prerequisites.

Assigned game timer reaches60 then b_Science=.5; any actual research purchase clears it. After Discovery the first half of the natural Discovery cycle gains +10% speed. Tier variant: target only the highest unlocked tier with an additive.15 speed during its own first half; replace the base Discovery effect. It is a final tier-specific bonus, with no second tree weight.

- Systems: Research pacing, Science. Limit: +50% Science; +10% Discovery speed.
- Source: current state. New ledger reset: Infinity.
- Interaction: assigned-time condition.

**Bulk Citation** — `subskill.repeatableResearch.bulkCitation` · specialization · depth 2 · 5 SP including prerequisites.

Before Discovery: For each type separately b_Strength=min(1,.05*floor(truePaidLevels/25)). Generated/retained/couponed-free levels excluded.
After Discovery: b_SharedEnhancement=min(.50,.025*floor(qualifyingNaturalDiscoveryCount/10)); apply to native Discovery/Elevation bonus above1, not speed or TP purchases.

- Systems: Research purchases, Research strength, Discovery. Limit: +100% per-type strength; later +50%.
- Discovery limit: +50% strength enhancement.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Patient Experiment** — `subskill.repeatableResearch.patientExperiment` · specialization · depth 2 · 3 SP including prerequisites.

Before Discovery: After 300 game seconds without actual research debit, prepare one .40 coupon; settle consumes it and restarts clock. No instantaneous coupon renewal on refund.
After Discovery: A qualifying natural completion after>=60 game seconds since the last reward grants360 raw own-bar units. One reward per natural completion, empty60-second cooldown; grant-generated completion cannot qualify. Total reward<=.10*qualifying completion raw demand plus one360-unit boundary packet.

- Systems: Research prices, Waiting, Discovery. Limit: one 40% coupon.
- Discovery limit: one360-unit raw grant per60 game seconds.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: coupon.

**Replication Budget** — `subskill.repeatableResearch.replicationBudget` · specialization · depth 2 · 6 SP including prerequisites.

Before Discovery: Count settled eligible coupon-consumed paid research transactions by actual levels, not purchase calls; each fifth consumes a flag, grants through 40-Cash-second/min bucket. No grant buys another level.
After Discovery: Every fifth qualifying natural own-bar completion consumes a durable threshold and20 Cash-output seconds from40/60 token bucket. No coupon/TP level or grant completion source.

- Systems: Research coupons, Cash. Limit: 40 Cash seconds per game minute.
- Discovery limit: 40 Cash seconds per minute.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: production grant.

**Longitudinal Study** — `subskill.repeatableResearch.longitudinalStudy` · specialization · depth 3 · 6 SP including prerequisites.

b_Strength=min(1,.20*floor(nativeInfinityAge/600)); absolute age never restarted by assignments. Discovery replacement shared final enhancement .10 per tier-age step, cap .50.

- Systems: Research strength, Infinity age, Discovery. Limit: +100% strength; later +50%.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Living Literature** — `subskill.repeatableResearch.livingLiterature` · capstone · depth 4 · 19 SP including prerequisites.

Before Discovery: b_Basic=min(2,.02*floor(totalTruePaidResearchLevels/50));
After Discovery: b_Basic=min(2,.05*floor(qualifyingNaturalDiscoveryCount/10)); fixed Brain replication and research-level purchases unaffected.

- Systems: Research purchases, Basic facilities, Discovery. Limit: +200% ordinary basic output.
- Discovery limit: +200% basic output.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="idlespaceflight"></a>
### Idle Spaceflight

Base ID: `idleSpaceFlight` · Ordinary base cost: 3 SP; Fractured base: 0 SP. **5 choices · entire menu 12 SP.**

**Branch design:** Panel observations support distant education, launch reports or passive astronomy; the capstone rewards genuinely launched material rather than copying decay credits.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Remote Sensing | 2 | 2 | Fractured parent | Every 20 tenfold increases in active panels adds 50% Simulation education speed, up to 200%. Bonuses are additive. | The satellite has enrolled itself in physics. |
| Mission Reports | 1 | 1 | Fractured parent | Each successful Railgun volley grants 2 seconds of Science production, up to 12 seconds per minute. | The report is mostly photographs of things on fire. |
| Ground Control | 2 | 3 | Mission Reports | Holding enough Energy for a full Railgun charge adds 100% Science production. Bonuses are additive. | Mission control has stopped shouting for electricity. |
| Silent Observatory | 3 | 5 | Remote Sensing | After 10 minutes without Tinkering, Scientific Planets produce 100% more. Bonuses are additive. | For once, space is allowed to be quiet. |
| Permanent Mission | 4 | 12 | Ground Control, Silent Observatory | Launched Simulation panels add up to 150% Science and 100% education speed. Bonuses are additive. | The expedition has forgotten where home used to be. |

**After Discovery**

- **Mission Reports:** Successful Railgun volleys advance Discovery by 2 seconds, up to 12 seconds per minute.
- **Ground Control:** Holding enough Energy for a full Railgun charge adds 25% tree speed. Bonuses are additive.
- **Permanent Mission:** Launched Simulation panels add up to 50% tree speed and 100% education speed. Bonuses are additive.

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Remote Sensing** — `subskill.idleSpaceFlight.remoteSensing` · entry · depth 1 · 2 SP including prerequisites.

b_Education=min(2,.025*log10(1+physicalActivePanels)); no derived Science-rate input.

- Systems: Panels, Education. Limit: +200% education speed.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Mission Reports** — `subskill.idleSpaceFlight.missionReports` · entry · depth 1 · 1 SP including prerequisites.

A 12-second native Science bucket refills at.2/s; paid, positive, actual launch volleys only. After Discovery request2 fixed game seconds of Discovery progress per volley.

- Systems: Railgun, Science, Discovery. Limit: +20% native Science or direct Discovery throughput.
- Source: actual funded Railgun volleys. New ledger reset: Infinity.
- Interaction: nonrecursive grant.

**Ground Control** — `subskill.idleSpaceFlight.groundControl` · specialization · depth 2 · 3 SP including prerequisites.

Require Energy>=current conservative native charge quote and quote>0. b_Science=1; no implicit charge/fire action. After Discovery b_TreeSpeed=.25 weighted by tier.

- Systems: Railgun readiness, Science, Discovery. Limit: +100% Science; later +25% tree speed.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Silent Observatory** — `subskill.idleSpaceFlight.silentObservatory` · specialization · depth 2 · 5 SP including prerequisites.

Use time since genuine native Tinker completion, at least 600 game seconds; b_ScientificPlanets=1. This output is excluded from Shoulders’ research donor.

- Systems: Waiting, Scientific Planets. Limit: +100% Scientific Planets output.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Permanent Mission** — `subskill.idleSpaceFlight.permanentMission` · capstone · depth 3 · 12 SP including prerequisites.

For L=genuine launchedPanelStock, b_Science=min(1.5,.05*log10(1+L)); b_Education=min(1,log10(1+L)/40). After Discovery Science becomes min(.50,log10(1+L)/100) tier-weighted speed.

- Systems: Launched panels, Science, Education, Discovery. Limit: +150% Science; +100% education; later +50% tree speed.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Dream.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>


## Panels

<a id="panellifetime20tree"></a>
### 20s Lifetime

Base ID: `panelLifetime20Tree` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **4 choices · entire menu 7 SP.**

**Branch design:** A small lifetime parent gets four focused choices: Solar reserve, early recovery, lifetime-driven panels and a limited SRS-to-Energy bridge.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Spare Charge | 1 | 1 | Fractured parent | Panel Lifetime above 20 seconds adds 1% Simulation Solar output per 10 seconds, up to 100%. Bonuses are additive. | Please unplug the star before changing the battery. |
| Second Sunrise | 1 | 1 | Fractured parent | After 5 minutes without a reset, Simulation Solar generators produce 100% more Energy. Bonuses are additive. | The sun has agreed to work overtime. |
| Surface Treatment | 2 | 3 | Second Sunrise | Each minute of Panel Lifetime adds 10% panel production, up to 200%. Bonuses are additive. | Twenty seconds was only the primer coat. |
| Borrowed Sunlight | 3 | 4 | Spare Charge | Every minute with SRS assigned grants 30 seconds of Solar Energy. | We have borrowed tomorrow’s morning. |

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Spare Charge** — `subskill.panelLifetime20Tree.spareCharge` · entry · depth 1 · 1 SP including prerequisites.

b_Solar=min(1,max(0,Lifetime-20)/1000); affects native Solar Energy generation. Railgun charging remains an immediate paid transfer.

- Systems: Lifetime, Simulation Solar. Limit: +100% Solar Energy output.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Second Sunrise** — `subskill.panelLifetime20Tree.secondSunrise` · entry · depth 1 · 1 SP including prerequisites.

After 300 assigned game seconds in this Infinity, b_SolarEnergy=1. Pause assignment time on refund; reset at Infinity. Only native Solar generation.

- Systems: Idle play, Simulation Energy. Limit: +100% Solar Energy.
- Source: current state. New ledger reset: Infinity.
- Interaction: assigned-time condition.

**Surface Treatment** — `subskill.panelLifetime20Tree.surfaceTreatment` · specialization · depth 2 · 3 SP including prerequisites.

b_Panels=min(2,.10*floor(nativePanelLifetime/60)); lifetime quoted before new bonuses to prevent same-interval re-entry.

- Systems: Panel Lifetime, Panels. Limit: +200% panels.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Borrowed Sunlight** — `subskill.panelLifetime20Tree.borrowedSunlight` · specialization · depth 2 · 4 SP including prerequisites.

Chronological owned-SRS game time crosses each60-second boundary once; credit30 native Solar Energy seconds. Maximum30 Solar seconds per game minute. Source clock and flags survive refunds; SRS charge grants and retentions do not advance them.

- Systems: SRS, Solar Energy. Limit: 30 Solar seconds per game minute.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: production grant.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="panelmaintenance"></a>
### Panel Maintenance

Base ID: `panelMaintenance` · Ordinary base cost: 3 SP; Fractured base: 0 SP. **5 choices · entire menu 11 SP.**

**Branch design:** Maintenance branches between hands-on servicing and automatic factory support; a service capstone rewards worker allocation without borrowing credited decay.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Service Visit | 1 | 1 | Fractured parent | Tinker adds 10% Panel Lifetime for 1 minute, stacking up to 30%. Bonuses are additive. | We have come about your star’s extended warranty. |
| Preventive Maintenance | 2 | 2 | Fractured parent | Simulation Factories and Space Factories work 50% faster while Panel Lifetime is at least 5 minutes. Bonuses are additive. | It is much easier to repair things before they explode. |
| Service Contract | 2 | 4 | Preventive Maintenance | With at least half your Bots as Workers, Solar and Fusion Influence prices are 20% lower. | The warranty covers several nearby stars. |
| Rotation Roster | 2 | 3 | Service Visit | Tinker grants 10 seconds of panel production, up to 20 seconds per minute. | Everyone gets a turn holding the spanner. |
| Maintenance Depot | 4 | 11 | Rotation Roster, Service Contract | With at least half your Bots as Workers, Panel Lifetime and Factory output rise 100%. Bonuses are additive. | The spare parts have their own postcode. |

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Service Visit** — `subskill.panelMaintenance.serviceVisit` · entry · depth 1 · 1 SP including prerequisites.

At most three .10 stacks; each has its own 60 game-second expiry; a fourth completion refreshes the oldest. No offline Tinker.

- Systems: Tinker, Lifetime. Limit: +30% Lifetime.
- Source: current state. New ledger reset: Infinity.
- Interaction: finite timed stacks.

**Preventive Maintenance** — `subskill.panelMaintenance.preventiveMaintenance` · entry · depth 1 · 2 SP including prerequisites.

At Lifetime>=300, b_Factory=b_SpaceFactory=.5. Production still obeys native input and conversion rules.

- Systems: Lifetime, Simulation Factories. Limit: +50% to two Simulation producers.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Service Contract** — `subskill.panelMaintenance.serviceContract` · specialization · depth 2 · 4 SP including prerequisites.

workerFraction>=.5 enables .20 final Influence quote reduction for Solar/Fusion; shared .50 ceiling and actual debit settlement apply.

- Systems: Workers, Energy prices. Limit: 20% Influence discount.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: price discount.

**Rotation Roster** — `subskill.panelMaintenance.rotationRoster` · specialization · depth 2 · 3 SP including prerequisites.

Native Tinker completion credits one pre-new-bonus panel-rate snapshot through 20-panel-second-per-minute bucket. No panels are counted as physical decay before they decay.

- Systems: Tinker, Panels. Limit: 20 panel seconds per game minute.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: production grant.

**Maintenance Depot** — `subskill.panelMaintenance.maintenanceDepot` · capstone · depth 3 · 11 SP including prerequisites.

workerFraction>=.5 gives b_Lifetime=1,b_Factory=1; additive percentage lifetime channel, not multiplying each maintenance source independently.

- Systems: Workers, Panel Lifetime, Simulation Factories. Limit: +100% Lifetime; +100% Factory output.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="artificiallyenhancedpanels"></a>
### Artificially Enhanced Panels

Base ID: `artificiallyEnhancedPanels` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **5 choices · entire menu 12 SP.**

**Branch design:** Predictive manager intelligence can support durable stock or Solar cost reduction; the capstone joins lifetime and data infrastructure.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Smart Glass | 1 | 1 | Fractured parent | Each 50 tenfold increases in AI Managers adds 100% panel production, up to 200%. Bonuses are additive. | The panels can now argue with the sunlight. |
| Warranty Transfer | 3 | 3 | Fractured parent | Retain up to 30 seconds of this skill’s earned Panel Lifetime bonus through Infinity. | New universe. Same warranty department. |
| Predictive Servicing | 2 | 3 | Smart Glass | Every 40 tenfold increases in AI Managers reduces Solar Influence prices by 5%, up to 25%. | The panel reported a fault next Tuesday. |
| Memory Glass | 2 | 5 | Warranty Transfer | For 2 minutes after Infinity, Data Centers gain 100% output while Panel Lifetime exceeds 1 minute. Bonuses are additive. | The glass remembers how it used to shine. |
| Self Repairing Array | 4 | 12 | Predictive Servicing, Memory Glass | Each 50 tenfold increases in AI Managers adds 50% Panel Lifetime and Solar output, up to 200%. Bonuses are additive. | The warranty department has become sentient. |

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Smart Glass** — `subskill.artificiallyEnhancedPanels.smartGlass` · entry · depth 1 · 1 SP including prerequisites.

b_Panels=min(2,log10(1+Managers)/50); no lifetime input, avoiding a second lifetime loop.

- Systems: AI Managers, Panels. Limit: +200% Panels.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Warranty Transfer** — `subskill.artificiallyEnhancedPanels.warrantyTransfer` · entry · depth 1 · 3 SP including prerequisites.

Retain max(previous retained, min(30, 5*log10(max(1,Managers)))) while assigned at reset; use max(retained,current native bonus), never add both. Clear at Quantum.

- Systems: Lifetime, Infinity. Limit: 30 retained lifetime seconds.
- Source: parent bonus earned from actual Managers. New ledger reset: Quantum.
- Interaction: nonstacking retention.

**Predictive Servicing** — `subskill.artificiallyEnhancedPanels.predictiveServicing` · specialization · depth 2 · 3 SP including prerequisites.

d_Solar=min(.25,.05*floor(log10(max(1,ownedManagers))/40)); finite stock log, shared final quote discount cap.

- Systems: AI Managers, Solar prices. Limit: 25% Solar discount.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: price discount.

**Memory Glass** — `subskill.artificiallyEnhancedPanels.memoryGlass` · specialization · depth 2 · 5 SP including prerequisites.

Native Infinity age<120 and derivedLifetime>60 enables b_DC=1; ownership throughout window required; reassignment cannot restart age.

- Systems: Infinity, Panel Lifetime, Data Centers. Limit: +100% DC output for 2 minutes.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Self Repairing Array** — `subskill.artificiallyEnhancedPanels.selfRepairingArray` · capstone · depth 3 · 12 SP including prerequisites.

b=min(2,.50*floor(log10(max(1,ownedManagers))/50)); apply b independently to Lifetime and Solar additive channels. No extra physical decay credit.

- Systems: AI Managers, Panel Lifetime, Solar Energy. Limit: +200% Lifetime and Solar output.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="androids"></a>
### Androids

Base ID: `androids` · Ordinary base cost: 2 SP; Fractured base: 0 SP. **6 choices · entire menu 15 SP.**

**Branch design:** The ten-minute warm-up supports an early wage path, carried experience, cross-Android infrastructure and a mature Simulation workforce.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| First Shift | 2 | 2 | Fractured parent | When Androids finish warming up, advance Simulation production by 30 seconds, once per Infinity. | They spent the first ten minutes finding the on switch. |
| Night Shift | 2 | 2 | Fractured parent | Fully warmed Androids add 100% AI Manager production while spending Stored Time. Bonuses are additive. | The humans have gone home. The work has not. |
| Probation Period | 1 | 1 | Fractured parent | During Android warm-up, Cash production is 100% higher. Bonuses are additive. | Your probation lasts until the sun goes out. |
| Shift Memory | 3 | 5 | First Shift | Keep half of Android warm-up through Infinity, up to 5 minutes. | The replacement staff already know the coffee machine. |
| Double Coverage | 3 | 5 | Night Shift | Fully warmed Androids and Pocket Androids add 150% Server output. Bonuses are additive. | Two shifts. One suspiciously efficient species. |
| Android Embassy | 4 | 14 | Shift Memory, Double Coverage | Fully warmed Androids make Simulation Communities and Cities produce 100% more Workers. Bonuses are additive. | The ambassador has requested a charging cable. |

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**First Shift** — `subskill.androids.firstShift` · entry · depth 1 · 2 SP including prerequisites.

At native Androids assigned timer crossing600, one snapshot-bounded native Simulation production grant of30 game seconds. No automation, resets, education or Railgun volleys are replayed.

- Systems: Androids timer, Simulation production. Limit: 30 production seconds per Infinity.
- Source: current state. New ledger reset: Infinity.
- Interaction: one-shot nonrecursive grant.

**Night Shift** — `subskill.androids.nightShift` · entry · depth 1 · 2 SP including prerequisites.

b_Managers=1 only when parent timer>=600 and processing source is stored-time; does not mint bank time.

- Systems: Stored Time, AI Managers. Limit: +100% Managers during Stored Time.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Probation Period** — `subskill.androids.probationPeriod` · entry · depth 1 · 1 SP including prerequisites.

Owned native Android chargedTime<600 enables b_Cash=1. This naturally expires when fully warmed; refunds do not reset parent charge.

- Systems: Android warm-up, Cash. Limit: +100% Cash before full warm-up.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Shift Memory** — `subskill.androids.shiftMemory` · specialization · depth 2 · 5 SP including prerequisites.

Retain min(300,.5*endingAndroidCharge) game seconds if ending ownership qualifies; max against Council Continuity or other retention, never sum. Clear at Quantum.

- Systems: Android warm-up, Infinity. Limit: 300 retained warm-up seconds.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Quantum.
- Interaction: retention.

**Double Coverage** — `subskill.androids.doubleCoverage` · specialization · depth 2 · 5 SP including prerequisites.

Both native owned parent charge thresholds must be met; b_ServerOutput=1.5; an unowned functional donor cannot be invented by Fracturing a modifier.

- Systems: Androids, Pocket Androids, Servers. Limit: +150% Server output.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Android Embassy** — `subskill.androids.androidEmbassy` · capstone · depth 3 · 14 SP including prerequisites.

Android chargedTime>=600 enables b_Community=b_City=1; retain native Worker output timing and input requirements.

- Systems: Android warm-up, Communities, Cities. Limit: +100% Community/City output.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="renewableenergy"></a>
### Renewable Energy

Base ID: `renewableEnergy` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **5 choices · entire menu 13 SP.**

**Branch design:** The circular-energy parent has a cost path, a decay-to-reward path and a retained-energy capstone, all limited by actual physical sources.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Closed Circuit | 2 | 2 | Fractured parent | Panel Lifetime reduces Railgun Energy costs by 1% per minute, up to 25%. | The extension lead goes around the star twice. |
| Compost Cycle | 2 | 2 | Fractured parent | Each Black Hole grants 10% extra Strange Matter if Dyson panels decayed during that Simulation. Bonuses are additive. | The universe is biodegradable. |
| Wind Down | 2 | 4 | Closed Circuit | Each 10 minutes of Panel Lifetime reduces Fusion Influence prices by 5%, up to 25%. | The wind turbines have applied for immortality. |
| Renewal Certificate | 3 | 5 | Compost Cycle | Every 30 tenfold increases in physical Simulation panel decay adds 25% Strange Matter, up to 100%. Bonuses are additive. | The universe has issued a recycling receipt. |
| Turbine Reserve | 4 | 13 | Wind Down, Renewal Certificate | Keep up to 1 minute of unspent Solar Energy through a Black Hole. | Tomorrow’s wind was saved yesterday. |

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Closed Circuit** — `subskill.renewableEnergy.closedCircuit` · entry · depth 1 · 2 SP including prerequisites.

d_Charge=min(.25,Lifetime/6000); debit discounted actual Energy once; no refund from fired projectiles. Separate charge-cost target, within global new-discount cap.

- Systems: Lifetime, Railgun Energy. Limit: 25% charge-cost reduction.
- Source: current state. New ledger reset: Infinity.
- Interaction: conservative Energy transfer.

**Compost Cycle** — `subskill.renewableEnergy.compostCycle` · entry · depth 1 · 2 SP including prerequisites.

Bonus=.1*actual native Black Hole reward, rounded once with remainder retained per Quantum; qualifying positive physical Dyson panel decay during that Dream run. Simulation launched panels have no decay process.

- Systems: Decay, Black Hole, Strange Matter. Limit: +10% Black Hole reward.
- Source: physical Dyson panel decay during the current Dream run. New ledger reset: Dream run.
- Interaction: base reward only.

**Wind Down** — `subskill.renewableEnergy.windDown` · specialization · depth 2 · 4 SP including prerequisites.

d_Fusion=min(.25,.05*floor(nativeLifetime/600)); amount discount only, .50 shared cap. Quote lifetime once before new same-interval updates.

- Systems: Panel Lifetime, Fusion prices. Limit: 25% Fusion discount.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: price discount.

**Renewal Certificate** — `subskill.renewableEnergy.renewalCertificate` · specialization · depth 2 · 5 SP including prerequisites.

b_StrangeMatter=min(1,.25*floor(log10(1+physicalDreamDysonPanelsDecayed)/30)); only Dream-local physical Dyson decay, excluding launched or credited IDS decay.

- Systems: Physical Simulation decay, Black Holes. Limit: +100% Strange Matter.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Dream.
- Interaction: bounded bonus.

**Turbine Reserve** — `subskill.renewableEnergy.turbineReserve` · capstone · depth 3 · 13 SP including prerequisites.

On actual rewarded Black Hole retain min(endingEnergy,60*nativeSolarEnergyRate). Snapshot before Dream reset; one application, max with competing Energy retentions. Cannot refill after refund.

- Systems: Solar Energy, Black Holes. Limit: 60 native Solar seconds of retained Energy.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Dream.
- Interaction: retention.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="panelwarranty"></a>
### Panel Warranty

Base ID: `panelWarranty` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **5 choices · entire menu 12 SP.**

**Branch design:** Fragment coverage can protect panels, education or factories; the capstone extends only the selected coverage rather than doubling every existing Fragment exponent.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Replacement Stock | 3 | 3 | Fractured parent | Each active Fragment preserves 2% of stored Simulation panels through a Black Hole, up to 18%. | The replacement universe is still under warranty. |
| Fine Print | 1 | 1 | Fractured parent | Each active Fragment adds 3% Simulation education speed, up to 27%. Bonuses are additive. | The terms and conditions are now a degree course. |
| Service History | 2 | 5 | Replacement Stock | Each active Fragment adds 5% Factory output, up to 45%, after 10 minutes without a Black Hole. Bonuses are additive. | The paperwork has outlived the panels. |
| Lifetime Clause | 2 | 3 | Fine Print | Each completed Simulation subject adds 10% Panel Lifetime. Bonuses are additive. | The fine print now contains an extra century. |
| Extended Cover | 4 | 12 | Service History, Lifetime Clause | Replacement Stock retains up to 27% of unlaunched panels; fully educated Simulations add 100% Space Factory output. Bonuses are additive. | The exclusions page has finally been excluded. |

**After Enlightenment**

- **Fine Print:** Each active Fragment adds 3% education speed and 1% Enlightenment speed, capped at 27% and 9%. Bonuses are additive.

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Replacement Stock** — `subskill.panelWarranty.replacementStock` · entry · depth 1 · 3 SP including prerequisites.

Retain floor(min(.18,.02*F)*unlaunchedPanels); no launched panels, Energy, charge, resources already counted in the Black Hole reward or other retained grants qualify.

- Systems: Fragments, Stored panels, Black Hole. Limit: 18% unlaunched-panel retention.
- Source: unlaunched, unrewarded Simulation panels. New ledger reset: Quantum.
- Interaction: reward versus retention partition.

**Fine Print** — `subskill.panelWarranty.finePrint` · entry · depth 1 · 1 SP including prerequisites.

b_Education=min(.27,.03*realF). New augments do not increase F. Enlightenment variant keeps the education bonus and adds min(.09,.01*F) directly to Enlightenment speed. This final tier-specific coefficient is not weighted again.

- Systems: Fragments, Education. Limit: +27% education speed.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Service History** — `subskill.panelWarranty.serviceHistory` · specialization · depth 2 · 5 SP including prerequisites.

Dream age>=600 enables b_Factory=.05*min(F,9). Use explicit native Fragment tags; no new fragment identity or recursive factory grant.

- Systems: Fragments, Simulation age, Factories. Limit: +45% Factory output.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Lifetime Clause** — `subskill.panelWarranty.lifetimeClause` · specialization · depth 2 · 3 SP including prerequisites.

b_Lifetime=.10*completedSubjects, maximum .60, independent of Warranty’s native 5*2^(F-1) seconds.

- Systems: Education, Panel Lifetime. Limit: +60% Lifetime.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Extended Cover** — `subskill.panelWarranty.extendedCover` · capstone · depth 3 · 12 SP including prerequisites.

Replace Replacement Stock .02*F/cap .18 by .03*F/cap .27. Combine all new unlaunched-panel retentions into .30 max once. All six subject flags enable b_SpaceFactory=1.

- Systems: Fragments, Black Holes, Space Factories. Limit: 27% panel entitlement; +100% Space Factories.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Dream.
- Interaction: capstone enhancement.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="fusionreactors"></a>
### Fusion Reactors

Base ID: `fusionReactors` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **6 choices · entire menu 15 SP.**

**Branch design:** Fusion offers actual Energy efficiency, a paid Energy-to-Cash recipe, research infrastructure and a deep panel-plant specialization.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| District Heating | 2 | 2 | Fractured parent | Fusion Energy generation also adds up to 100% Cash production, gaining 10% per tenfold increase. Bonuses are additive. | The entire neighbourhood is pleasantly radioactive. |
| Fuel Standards | 1 | 1 | Fractured parent | Simulation Fusion generators cost 20% less Influence and produce 25% more Energy. Bonuses are additive. | Now with a reassuringly official sticker. |
| Cogeneration | 2 | 4 | District Heating | Once per minute, spend one full Railgun charge of Energy for 20 seconds of Cash production. | The power station has opened a gift shop. |
| Heavy Water | 2 | 3 | Fuel Standards | Fully educated Simulations reduce Railgun Energy prices by 20%. | The water is now carrying a qualification. |
| Reactor Campus | 3 | 4 | Fuel Standards | Every 25 paid Fusion generators adds 10% facility research strength, up to 100%. Bonuses are additive. | The lecture theatre has developed a core. |
| Stellar Utility | 5 | 15 | Cogeneration, Heavy Water, Reactor Campus | With Solar and Fusion generators, panel production rises 300% and Fusion Energy rises 150%. Bonuses are additive. | Your local utility has become a small star. |

**After Discovery**

- **Reactor Campus:** Every 25 paid Fusion generators adds 5% Discovery strength, up to 50%. Bonuses are additive.

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**District Heating** — `subskill.fusionReactors.districtHeating` · entry · depth 1 · 2 SP including prerequisites.

b_Cash=min(1,.1*log10(1+nativeFusionEnergyPerSecond)); exclude energy grants.

- Systems: Simulation Fusion, Cash. Limit: +100% Cash.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Fuel Standards** — `subskill.fusionReactors.fuelStandards` · entry · depth 1 · 1 SP including prerequisites.

d_FusionPurchase=.20, b_FusionOutput=.25; ordinary quantity and geometric cost growth remain unchanged.

- Systems: Simulation Fusion, Influence prices. Limit: 20% Fusion Influence discount and +25% output.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded producer investment.

**Cogeneration** — `subskill.fusionReactors.cogeneration` · specialization · depth 2 · 4 SP including prerequisites.

Optional action quotes current native full-volley Energy requirement; debit it conservatively if represented and positive, then grant 20 native Cash seconds. One initially empty token per 60 game seconds; never also charge/fire.

- Systems: Energy, Cash, Railgun quote. Limit: 20 Cash seconds per game minute.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: paid resource conversion.

**Heavy Water** — `subskill.fusionReactors.heavyWater` · specialization · depth 2 · 3 SP including prerequisites.

All six subject flags enable .20 Energy quote discount, shares .50 cap. Energy debit and launch payload remain native.

- Systems: Education, Railgun Energy. Limit: 20% Energy discount.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: price discount.

**Reactor Campus** — `subskill.fusionReactors.reactorCampus` · specialization · depth 2 · 4 SP including prerequisites.

b_FacilityResearch=min(1,.10*floor(actualFusionPurchasesThisDream/25)). Discovery replaces with .05 per step/cap .50 strength enhancement.

- Systems: Fusion purchases, Research strength, Discovery. Limit: +100% research strength; later +50%.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Dream.
- Interaction: bounded bonus.

**Stellar Utility** — `subskill.fusionReactors.stellarUtility` · capstone · depth 3 · 15 SP including prerequisites.

Require both current native generator stocks >0; b_Panels=3,b_FusionOutput=1.5. No cross-feeding Energy grants into generator counts.

- Systems: Solar, Fusion, Panels. Limit: +300% panels; +150% Fusion.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="coldfusion"></a>
### Cold Fusion

Base ID: `coldFusion` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **6 choices · entire menu 15 SP.**

**Branch design:** Cold storage, Solar ignition and cryogenic research form three paths; the advanced choice keeps a modest SRS charge rather than introducing a new charge-rate fiction.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Cryogenic Servers | 2 | 2 | Fractured parent | While Science exceeds Cash, Servers gain 100% production. Bonuses are additive. | The server room has become a very expensive fridge. |
| Cold Start | 2 | 2 | Fractured parent | Your first Solar purchase each Simulation includes 1 minute of its Energy output. | This reactor has a remarkably good ignition warranty. |
| Thermal Separation | 2 | 4 | Cryogenic Servers | While Science exceeds Cash, Solar Energy output rises 100%. Bonuses are additive. | The hot side has stopped speaking to the cold side. |
| Cryogenic Archive | 2 | 2 | Fractured parent | Keep 5 purchased facility research levels through Infinity. | The research is still fresh after the heat death. |
| Superconducting Path | 3 | 9 | Thermal Separation, Cold Start | While owning Solar and Fusion generators, Data Centers gain 150% output. Bonuses are additive. | Resistance has left the building. |
| Frozen Charge | 4 | 15 | Cryogenic Archive, Superconducting Path | Keep up to 1 minute of SRS charge through Infinity. | Please defrost the singularity before use. |

**After Discovery**

- **Cryogenic Servers:** Servers gain 100% production during the second half of Discovery’s progress bar. Bonuses are additive.
- **Thermal Separation:** With Discovery at least half full, Solar Energy output rises 100%. Bonuses are additive.
- **Cryogenic Archive:** Keep up to 5% of an unfinished Discovery bar through Infinity.

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Cryogenic Servers** — `subskill.coldFusion.cryogenicServers` · entry · depth 1 · 2 SP including prerequisites.

b_Servers=1 while ScienceBalance>CashBalance. After Discovery use Discovery progress>=50% of its own bar; includes no automatic science conversion.

- Systems: Resource balance, Servers. Limit: +100% Servers.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Cold Start** — `subskill.coldFusion.coldStart` · entry · depth 1 · 2 SP including prerequisites.

After the first positive paid Solar purchase each Dream run, grant60*nativeSolarRate after that purchase. One entitlement per Dream run; no grant from assignment or restored stock. Normal launch settlement must spend this Energy later.

- Systems: Dream resets, Solar Energy. Limit: 60 native Solar seconds per Dream run.
- Source: current state. New ledger reset: Dream run.
- Interaction: reset seed, no direct reward.

**Thermal Separation** — `subskill.coldFusion.thermalSeparation` · specialization · depth 2 · 4 SP including prerequisites.

Before Discovery compare positive current Science and Cash stocks. After Discovery use unfinished Discovery fraction>=.5. b_Solar=1; not an Energy charging-speed change.

- Systems: Science balance, Solar, Discovery. Limit: +100% Solar.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Cryogenic Archive** — `subskill.coldFusion.cryogenicArchive` · entry · depth 1 · 2 SP including prerequisites.

Retain at most five genuine purchased levels allocated by fixed research-ID order; max with Cold Storage and other retention. Discovery replace with min(.05,unfinishedDiscoveryFraction) raw bar.

- Systems: Research, Infinity, Discovery. Limit: 5 research levels; later .05 unfinished bar.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Quantum.
- Interaction: retention.

**Superconducting Path** — `subskill.coldFusion.superconductingPath` · specialization · depth 3 · 9 SP including prerequisites.

Require both native generator stocks positive; b_DC=1.5; temporary outside-Dyson generator existence is a condition only.

- Systems: Energy infrastructure, Data Centers. Limit: +150% DC output.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Frozen Charge** — `subskill.coldFusion.frozenCharge` · capstone · depth 4 · 15 SP including prerequisites.

Retain min(60,endingSrsCharge) seconds. Apply maximum against Hot Start and other existing charge restoration; never add to Research Activity/Memory history. Existing SRS charge is uncapped; restore by maximum against the complete native reset result, without inventing a capacity or stacking the same residual. Retained charge is not newly earned Stellar Memory charge.

- Systems: SRS, Infinity. Limit: 60 retained SRS charge seconds.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Quantum.
- Interaction: retention.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="burnout"></a>
### Burnout

Base ID: `burnOut` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **4 choices · entire menu 8 SP.**

**Branch design:** A compact heat tree supports salvage, short education bursts, hot Solar output and a limited cooling reserve.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Heat Recovery | 2 | 2 | Fractured parent | Every 30 tenfold increases in physical panels decayed adds 100% Data Center production, up to 200%. Bonuses are additive. | Waste heat is just another department’s heating budget. |
| Flash Course | 1 | 1 | Fractured parent | For the first minute after an Infinity, Simulation education is 100% faster. Bonuses are additive. | The syllabus has a very short shelf life. |
| Waste Heat | 2 | 4 | Heat Recovery | Physical panel decay adds up to 150% Solar Energy output. Bonuses are additive. | The smoke has become part of the power grid. |
| Cooling Interval | 3 | 4 | Flash Course | Completing a subject grants 30 seconds of panel production, once per subject each Simulation. | The lesson ended before the radiator did. |

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Heat Recovery** — `subskill.burnOut.heatRecovery` · entry · depth 1 · 2 SP including prerequisites.

b_DataCenters=min(2,log10(1+physicalDecaysThisInfinity)/30). Supermassive Panels credit does not multiply this input.

- Systems: Decay, Data Centers. Limit: +200% Data Centers.
- Source: physical decay only. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Flash Course** — `subskill.burnOut.flashCourse` · entry · depth 1 · 1 SP including prerequisites.

One60 game-second education window per awarded Infinity; remaining time cannot stack; challenge restarts and assignment toggles do not start it.

- Systems: Infinity, Education. Limit: +100% education for 60 game seconds.
- Source: current state. New ledger reset: Infinity.
- Interaction: one window per real reset.

**Waste Heat** — `subskill.burnOut.wasteHeat` · specialization · depth 2 · 4 SP including prerequisites.

b_Solar=min(1.5,.05*log10(1+physicalDysonDecayPerSecond)); Supermassive Panels’s extra credited decay never supplies thermal energy.

- Systems: Physical decay, Solar Energy. Limit: +150% Solar output.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Cooling Interval** — `subskill.burnOut.coolingInterval` · specialization · depth 2 · 4 SP including prerequisites.

Six durable natural-completion source flags per Dream; each grants 30 native panel seconds. Grant-caused completions cannot trigger it; no retained panels count as decayed.

- Systems: Education, Panels. Limit: 180 panel seconds per Simulation.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Dream.
- Interaction: finite production grant.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="worthysacrifice"></a>
### Worthy Sacrifice

Base ID: `worthySacrifice` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **4 choices · entire menu 8 SP.**

**Branch design:** The parent trades lifetime for Lines; its compact augment tree makes that theme useful through controlled savings and education without further sacrifices.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Salvage Rights | 1 | 1 | Fractured parent | Tinker also grants 2 seconds of Cash production, up to 10 seconds per minute. | The scrap pile has been reclassified as an investment. |
| Durable Lessons | 1 | 1 | Fractured parent | Each different Durability research purchased this Quantum adds 10% Simulation education speed. Bonuses are additive. | Some lessons survive the equipment. |
| Salvage Yard | 2 | 3 | Salvage Rights | Each 100 paid Assembly Lines reduces Space Factory Factory costs by 5%, up to 25%. | The unwanted assembly line has become a rocket. |
| Hard Earned Wisdom | 4 | 8 | Durable Lessons, Salvage Yard | Completing all subjects adds 150% Assembly Line production and 50% Panel Lifetime. Bonuses are additive. | We learned something before everything burned down. |

**After Discovery**

- **Durable Lessons:** The first natural completion of each Discovery tier this Quantum adds 10% Simulation education speed. Bonuses are additive.

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Salvage Rights** — `subskill.worthySacrifice.salvageRights` · entry · depth 1 · 1 SP including prerequisites.

Native Cash-output bucket capacity10, refill1/6 per game second. Tinker completions request2; never replay Tinker offline.

- Systems: Tinker, Cash. Limit: +1/6 native Cash throughput.
- Source: current state. New ledger reset: Infinity.
- Interaction: nonrecursive production grant.

**Durable Lessons** — `subskill.worthySacrifice.durableLessons` · entry · depth 1 · 1 SP including prerequisites.

Count four distinct paid Durability research IDs this Quantum, maximum4; no repeat award for rebuying across Infinity. Discovery variant requires one natural completion of each unlocked tier, 10% each, max30%.

- Systems: Durability, Education. Limit: +40% education; +30% after Discovery.
- Source: current state. New ledger reset: Quantum.
- Interaction: distinct-source ledger.

**Salvage Yard** — `subskill.worthySacrifice.salvageYard` · specialization · depth 2 · 3 SP including prerequisites.

d_FactoryInput=min(.25,.05*floor(truePaidLines/100)), shares .50 input-quote cap; Rockets still debit fully.

- Systems: Assembly Lines, Space Factory inputs. Limit: 25% Factory-input discount.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: input discount.

**Hard Earned Wisdom** — `subskill.worthySacrifice.hardEarnedWisdom` · capstone · depth 3 · 8 SP including prerequisites.

All six native completion flags enable b_Bots=1.5,b_Lifetime=.5; no modification to native Fracture penalty removal.

- Systems: Education, Bots, Panel Lifetime. Limit: +150% Bots; +50% Lifetime.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="stayingpower"></a>
### Staying Power

Base ID: `stayingPower` · Ordinary base cost: 2 SP; Fractured base: 0 SP. **5 choices · entire menu 14 SP.**

**Branch design:** Long-lived panels offer steady planets, parked charge, offline settlement or patient research; the final node rewards an uninterrupted push.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Settled In | 2 | 2 | Fractured parent | Every 10 minutes this augment stays assigned adds 25% Planet output, up to 200%. Bonuses are additive. | You have finally worked out where the sockets are. |
| Overnight Parking | 3 | 3 | Fractured parent | Keep up to one volley of unspent Railgun charge through a Black Hole. | The parking meter accepts collapsed stars. |
| Settled Worlds | 2 | 4 | Settled In | After 30 minutes without Infinity, Scientific Planets and Planet Assembly gain 100% output. Bonuses are additive. | The planets have unpacked their furniture. |
| Long Lease | 2 | 5 | Overnight Parking | Returning after an hour away adds 50% Panel Lifetime for 10 minutes. Bonuses are additive. | Your tenancy was renewed while you were asleep. |
| Permanent Settlement | 5 | 14 | Settled Worlds, Long Lease | After 1 hour without Infinity, Planets and megastructures produce 200% more. Bonuses are additive. | The temporary outpost has acquired a history department. |

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Settled In** — `subskill.stayingPower.settledIn` · entry · depth 1 · 2 SP including prerequisites.

b_Planets=min(2,assignedGameSeconds/2400); pause on refund, reset Infinity.

- Systems: Assigned time, Planets. Limit: +200% Planet output.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded time ramp.

**Overnight Parking** — `subskill.stayingPower.overnightParking` · entry · depth 1 · 3 SP including prerequisites.

Retain min(unspentCharge,nativeBaseMaximumCharge) after a genuine Black Hole. Cap against the restored machine too. Do not retain Energy or launched panels, and do not count charge in reward.

- Systems: Railgun, Black Hole. Limit: One base volley of actual unspent charge.
- Source: current state. New ledger reset: Dream run.
- Interaction: unspent charge retention.

**Settled Worlds** — `subskill.stayingPower.settledWorlds` · specialization · depth 2 · 4 SP including prerequisites.

Native Infinity age>=1800 enables two additive source bonuses of 1. Extra Scientific Planets stay outside Shoulders’ research donor.

- Systems: Infinity age, Planet generators. Limit: +100% two Planet sources.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Long Lease** — `subskill.stayingPower.longLease` · specialization · depth 2 · 5 SP including prerequisites.

A genuine >=3600-real-second absence prepares one 600-game-second return window, b_Lifetime=.5. Overlapping returns refresh at most one window, never sum.

- Systems: Stored Time, Panel Lifetime. Limit: +50% Lifetime for 10 minutes.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Quantum.
- Interaction: absence window.

**Permanent Settlement** — `subskill.stayingPower.permanentSettlement` · capstone · depth 3 · 14 SP including prerequisites.

Native Infinity age>=3600 gives b_Planet=b_Mega=2. Convergence lambda unchanged; only ordinary link outputs scale.

- Systems: Infinity age, Planets, Megastructures. Limit: +200% ordinary Planet and mega output.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="oneminuteplan"></a>
### One Minute Plan

Base ID: `oneMinutePlan` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **4 choices · entire menu 8 SP.**

**Branch design:** Four tightly related choices use the parent’s minute threshold: regular facility handoffs, education income, lifetime planning and a measured launch timetable.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Minute Hand | 2 | 2 | Fractured parent | Each minute assigned grants 10 seconds of your lowest-producing basic facility’s output. | The five-year plan has been aggressively shortened. |
| Meeting Adjourned | 1 | 1 | Fractured parent | For 1 minute after completing a Simulation subject, Cash production is 100% higher. Bonuses are additive. | A breakthrough was achieved by ending the meeting. |
| Sixty Second Budget | 2 | 4 | Minute Hand | Above 1 minute of Panel Lifetime, facility Cash prices are 15% lower. | The committee has successfully planned one minute. |
| Minute Orbit | 3 | 8 | Meeting Adjourned, Sixty Second Budget | Every minute, gain 10 seconds of Solar output and 5 seconds of Space Factory output. | The timetable includes a short trip around the sun. |

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Minute Hand** — `subskill.oneMinutePlan.minuteHand` · entry · depth 1 · 2 SP including prerequisites.

Choose the basic link with smallest native output / max(1, owned output resource); grant10 native production seconds once per60 assigned seconds; ties use chain order; grants excluded from rate.

- Systems: Time, Facility chain. Limit: +1/6 native throughput to one link.
- Source: current state. New ledger reset: Infinity.
- Interaction: nonrecursive bottleneck grant.

**Meeting Adjourned** — `subskill.oneMinutePlan.meetingAdjourned` · entry · depth 1 · 1 SP including prerequisites.

Natural subject completion sets a60 game-second Cash window; repeated completions refresh, do not stack; maximum +1 Cash bonus.

- Systems: Education, Cash. Limit: +100% Cash for 60 game seconds.
- Source: current state. New ledger reset: Infinity.
- Interaction: finite event window.

**Sixty Second Budget** — `subskill.oneMinutePlan.sixtySecondBudget` · specialization · depth 2 · 4 SP including prerequisites.

Derived native Lifetime>=60 enables .15 amount reduction across facilities; .50 shared quote ceiling, no growth-factor change.

- Systems: Panel Lifetime, Facility prices. Limit: 15% Cash discount.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: price discount.

**Minute Orbit** — `subskill.oneMinutePlan.minuteOrbit` · specialization · depth 3 · 8 SP including prerequisites.

Assigned clock crosses each 60-game-second boundary once. Use separate Solar Energy and Space Factory producer snapshots; Space Factory grant consumes its represented native production inputs.

- Systems: Solar Energy, Space Factories. Limit: 10 Solar seconds and 5 Space Factory seconds per minute.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: production grant.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="versatileproductiontactics"></a>
### Versatile Production Tactics

Base ID: `versatileProductionTactics` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **6 choices · entire menu 14 SP.**

**Branch design:** A flexible worker can specialize in Tinker, education, launch logistics or the current production bottleneck; the final node combines rather than recursively chains those sources.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Flexible Shift | 2 | 2 | Fractured parent | Your slowest basic facility gains 100% production. Bonuses are additive. | Everyone is qualified to press this button. |
| Practical Rotation | 1 | 1 | Fractured parent | Tinker advances the slowest unfinished Simulation subject by 1 second, once every 2 seconds. | Today’s homework involves a spanner. |
| Cross Discipline | 2 | 3 | Practical Rotation | Each completed subject adds 10% AI Manager output, up to 60%. Bonuses are additive. | The job description now says “and everything else.” |
| Adaptive Tooling | 2 | 4 | Flexible Shift | Tinker adds 20% output to your weakest basic facility for 30 seconds. Bonuses are additive. | The adjustable spanner has adjusted reality. |
| Launch Rotation | 3 | 6 | Cross Discipline | Completing Shipping grants 1 minute of Simulation Bot Rocket output, once per Simulation. | Your rotation now includes orbital duties. |
| Universal Toolkit | 4 | 14 | Adaptive Tooling, Launch Rotation | Your weakest basic facility gains 200% output; Tinker adds 50% Influence for 1 minute. Bonuses are additive. | This tool is approved for use on universes. |

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Flexible Shift** — `subskill.versatileProductionTactics.flexibleShift` · entry · depth 1 · 2 SP including prerequisites.

Pick the basic link with lowest native output / max(1,current output stock), excluding new augment bonuses. Stable ties; update every60 game seconds to prevent selection oscillation.

- Systems: Facility chain, Bottlenecks. Limit: +100% to one basic link.
- Source: current state. New ledger reset: Infinity.
- Interaction: snapshot selection.

**Practical Rotation** — `subskill.versatileProductionTactics.practicalRotation` · entry · depth 1 · 1 SP including prerequisites.

Grant1 fixed base education-progress second to the slowest unfinished subject; funded Tinker completion trigger, cooldown2 game seconds; grant cannot trigger another augment.

- Systems: Tinker, Education. Limit: 0.5 education progress seconds per game second.
- Source: current state. New ledger reset: Infinity.
- Interaction: nonrecursive progress grant.

**Cross Discipline** — `subskill.versatileProductionTactics.crossDiscipline` · specialization · depth 2 · 3 SP including prerequisites.

b_Manager=.10*completedSubjects; no copied/granted completion emits a second event.

- Systems: Education, AI Managers. Limit: +60% Manager output.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Adaptive Tooling** — `subskill.versatileProductionTactics.adaptiveTooling` · specialization · depth 2 · 4 SP including prerequisites.

Choose smallest native fractional growth rate R_i/max(1,stock_i), stable ID tie-break; successful Tinker refreshes one .20 target window; no stacking across changing target.

- Systems: Tinker, Bottleneck facilities. Limit: +20% one basic output for 30 seconds.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Launch Rotation** — `subskill.versatileProductionTactics.launchRotation` · specialization · depth 3 · 6 SP including prerequisites.

Native Shipping completion consumes one durable Dream-epoch flag; grant 60 seconds native Bot-to-Rocket output, never directly launches panels.

- Systems: Education, Rockets. Limit: 60 Rocket-production seconds per Simulation.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Dream.
- Interaction: finite production grant.

**Universal Toolkit** — `subskill.versatileProductionTactics.universalToolkit` · capstone · depth 4 · 14 SP including prerequisites.

Replace Flexible Shift coefficient 1 by 2 for one target selected by native fractional growth. Tinker refreshes one b_Influence=.5/60-second window. Exclude new bonuses when choosing bottleneck.

- Systems: Bottleneck facilities, Tinker, Influence. Limit: +200% one basic output; +50% Influence.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: capstone enhancement.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>


## Power

<a id="superchargedpower"></a>
### Supercharged Power

Base ID: `superchargedPower` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **6 choices · entire menu 15 SP.**

**Branch design:** The grid links Simulation generation to facilities, then branches into launch reserves, reset-safe Energy or a broad late infrastructure bonus.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Common Grid | 2 | 2 | Fractured parent | Simulation Solar and Fusion generators add 1% facility production per tenfold increase in combined Energy output, up to 100%. Bonuses are additive. | The cable between universes is slightly too short. |
| Power Surge | 1 | 1 | Fractured parent | Buying a Quantum upgrade adds 100% panel production for 2 minutes. Bonuses are additive. | The warranty excludes enthusiastic use. |
| Grid Inertia | 2 | 4 | Common Grid | Above 30 minutes of SRS charge, basic facility output is 50% higher. Bonuses are additive. | The grid has briefly forgotten which way time flows. |
| Common Batteries | 2 | 4 | Common Grid | Holding Energy for two full Railgun charges adds 100% Solar output. Bonuses are additive. | The backup battery now has a backup sun. |
| Grid Restart | 3 | 4 | Power Surge | Keep up to 30 seconds of Fusion Energy through a Black Hole. | The universe is restarting. Please hold. |
| Unified Utility | 5 | 15 | Grid Inertia, Common Batteries, Grid Restart | With Solar and Fusion generators, ordinary facility output rises 150% and Energy output rises 100%. Bonuses are additive. | The entire universe is on the same bill. |

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Common Grid** — `subskill.superchargedPower.commonGrid` · entry · depth 1 · 2 SP including prerequisites.

b_eachFacility=min(1,.01*log10(1+nativeSolarPlusFusionEnergyRate)); launched panels and Energy grants excluded. Applies to eight native chain outputs, not Brain duplication.

- Systems: Simulation Energy, Facility chain. Limit: +100% native facility production.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded cross-system source.

**Power Surge** — `subskill.superchargedPower.powerSurge` · entry · depth 1 · 1 SP including prerequisites.

A paid Quantum purchase sets120 game seconds of +1 panel bonus. Bulk purchases refresh once, do not multiply duration.

- Systems: Quantum upgrades, Panels. Limit: +100% Panels for 120 game seconds.
- Source: current state. New ledger reset: Infinity.
- Interaction: finite event window.

**Grid Inertia** — `subskill.superchargedPower.gridInertia` · specialization · depth 2 · 4 SP including prerequisites.

Current owned native SRS charge>=1800 enables b_Basic=.5 on the five existing SRS facility targets. Hot Start can satisfy the threshold intentionally. This neither creates charge nor modifies megastructures or Convergence.

- Systems: SRS, Facilities. Limit: +50% basic output.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Common Batteries** — `subskill.superchargedPower.commonBatteries` · specialization · depth 2 · 4 SP including prerequisites.

Native full charge quote Q>0 and Energy>=2Q enables b_Solar=1. The condition does not charge Railguns or reserve the same Energy twice.

- Systems: Energy reserve, Solar. Limit: +100% Solar output.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Grid Restart** — `subskill.superchargedPower.gridRestart` · specialization · depth 2 · 4 SP including prerequisites.

Retain min(endingEnergy,30*nativeFusionRate) after an actual rewarded Black Hole; max with other Energy retention entitlements, no generator retention.

- Systems: Fusion Energy, Black Holes. Limit: 30 Fusion seconds of retained Energy.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Dream.
- Interaction: retention.

**Unified Utility** — `subskill.superchargedPower.unifiedUtility` · capstone · depth 3 · 15 SP including prerequisites.

Both positive native generator stocks enable b_Facility=1.5,b_Solar=b_Fusion=1. Keep fixed Brain replication lambda separate.

- Systems: Energy infrastructure, Facilities. Limit: +150% facilities; +100% Energy.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="tasteofpower"></a>
### Taste of Power

Base ID: `tasteOfPower` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **4 choices · entire menu 8 SP.**

**Branch design:** A four-choice introductory power branch keeps milestones separate from real purchase triggers and adds a small path into Simulation launch economics.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Sample Pack | 2 | 2 | Fractured parent | The first 10 paid purchases of each facility count twice for the 50 and 100 purchase milestones. | One free sample. An unreasonable number of forms. |
| Civic Appetite | 1 | 1 | Fractured parent | Community and Factory boosts last 50% longer in Simulations. Bonuses are additive. | Power tastes better with a town attached. |
| Acquired Taste | 2 | 4 | Sample Pack | Each basic facility with 100 paid purchases adds 20% panel production, up to 100%. Bonuses are additive. | The sample was considerably larger than expected. |
| Dinner Reservation | 3 | 4 | Civic Appetite | Before owning a Galactic Brain, Space Factories consume 20% fewer Rockets. | We have reserved a table outside the galaxy. |

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Sample Pack** — `subskill.tasteOfPower.samplePack` · entry · depth 1 · 2 SP including prerequisites.

Virtual milestone count = effective count + min(10, truePaidCount); affects only 50/100 milestone checks, not costs, ownership, Swarm scaling or Pooled Purchases.

- Systems: Paid purchases, Milestones. Limit: 10 virtual milestone purchases per type.
- Source: current state. New ledger reset: Infinity.
- Interaction: scoped virtual count.

**Civic Appetite** — `subskill.tasteOfPower.civicAppetite` · entry · depth 1 · 1 SP including prerequisites.

Multiply only native paid boost duration by1.5; recharge does not refund resources or stack duplicate boosts beyond native refresh semantics.

- Systems: Simulation Community, Factory boosts. Limit: +50% paid boost duration.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded duration change.

**Acquired Taste** — `subskill.tasteOfPower.acquiredTaste` · specialization · depth 2 · 4 SP including prerequisites.

b_Panels=.20*count(basicTypes with actualPaid>=100), max1. Sample Pack and Terra virtual milestone counts are not actual purchases here.

- Systems: Paid milestones, Panels. Limit: +100% panels.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Dinner Reservation** — `subskill.tasteOfPower.dinnerReservation` · specialization · depth 2 · 4 SP including prerequisites.

totalNativeGalacticBrains==0 gives .20 Rocket-input quote discount. Count legitimate generated/paid Brains; shared .50 input ceiling; no discount to cash or lambda.

- Systems: Megastructure progression, Space Factory Rockets. Limit: 20% Rocket-input discount.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: input discount.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="indulginginpower"></a>
### Indulging in Power

Base ID: `indulgingInPower` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **4 choices · entire menu 8 SP.**

**Branch design:** The second power parent offers milestone specialization or an actual paid-boost window; four choices match its narrower mechanic.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Second Helping | 2 | 2 | Fractured parent | Each facility type with 100 paid purchases adds 5% megastructure output. Bonuses are additive. | The buffet now serves planetary systems. |
| Idle Consumption | 1 | 1 | Fractured parent | While a paid Simulation boost is active, Cash and Science production are 25% higher. Bonuses are additive. | We are calling it a productive lunch. |
| Sated | 2 | 4 | Second Helping | Owning 100 paid purchases of every basic facility adds 200% panel production. Bonuses are additive. | That should be enough power for one afternoon. |
| Power Table | 3 | 4 | Idle Consumption | While a paid Simulation boost is active, Solar and Fusion output rise 100%. Bonuses are additive. | The buffet is powered by two competing stars. |

**After Discovery**

- **Idle Consumption:** While a paid Simulation boost is active, gain 25% Cash and 10% Discovery speed. Bonuses are additive.

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Second Helping** — `subskill.indulgingInPower.secondHelping` · entry · depth 1 · 2 SP including prerequisites.

b_eachMega=min(.4,.05*count(realPaid>=100)); output of Matrioshka/Birch/Galactic only, never duplication.

- Systems: Paid purchases, Megastructures. Limit: +40% each native megastructure output.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Idle Consumption** — `subskill.indulgingInPower.idleConsumption` · entry · depth 1 · 1 SP including prerequisites.

A single OR condition over native Community/Factory boost clocks adds .25 Cash and Science; does not count multiple simultaneous boosts twice.

- Systems: Simulation boosts, Cash, Science. Limit: +25% Cash/Science; +10% Discovery speed.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Sated** — `subskill.indulgingInPower.sated` · specialization · depth 2 · 4 SP including prerequisites.

All five actual basic paid counts>=100 enable b_Panels=2. Paid zero-Cash milestone counts can satisfy ownership but never invent spending rebate credit.

- Systems: Paid milestones, Panels. Limit: +200% panels.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Power Table** — `subskill.indulgingInPower.powerTable` · specialization · depth 2 · 4 SP including prerequisites.

Use native positive paid Community/Factory boost timers; b_Solar=b_Fusion=1. New grants cannot prolong the original boost except an explicit duration node.

- Systems: Paid Simulation boosts, Energy. Limit: +100% Solar/Fusion.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="addictiontopower"></a>
### Addiction to Power

Base ID: `addictionToPower` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **5 choices · entire menu 13 SP.**

**Branch design:** The stock-spending root has an active research alternative; the patient root grows into stored-time output and a stable-load specialization.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Spending Habit | 2 | 2 | Fractured parent | Cash spent on facilities adds up to 200% Bot production, gaining 10% per tenfold increase. Bonuses are additive. | The purchase confirmation is the best part. |
| Power Nap | 2 | 2 | Fractured parent | After 10 minutes without changing Skills, SRS charges 25% faster. Bonuses are additive. | Even your ambitions need a lie-down. |
| Power Budget | 2 | 4 | Spending Habit | Each 50 paid facility research levels grants 10 seconds of panel production, up to 30 seconds per minute. | The budget has a line item for “more.” |
| Steady Dose | 3 | 5 | Power Nap | After 30 minutes without changing Skills, Cash and Science gain 100% production. Bonuses are additive. | The universe has developed a very regular habit. |
| Dependency Management | 4 | 13 | Power Budget, Steady Dose | Spending Stored Time with an unchanged 10-minute loadout adds 200% basic facility output. Bonuses are additive. | We have successfully scheduled our dependency. |

**After Discovery**

- **Power Budget:** Every fifth natural discovery grants 10 seconds of panel production, up to 30 seconds per minute.
- **Steady Dose:** After 30 minutes without changing Skills, Cash rises 100% and tree speed rises 25%. Bonuses are additive.

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Spending Habit** — `subskill.addictionToPower.spendingHabit` · entry · depth 1 · 2 SP including prerequisites.

b_Bots=min(2,.1*log10(1+actualCashSpentThisInfinity)); free/retained counts and Deferred Billing excluded.

- Systems: Cash spending, Bots. Limit: +200% Bots.
- Source: actual Cash debits. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Power Nap** — `subskill.addictionToPower.powerNap` · entry · depth 1 · 2 SP including prerequisites.

Add.25 earned SRS charge seconds per game second while assigned stability timer>=600 and SRS is owned. Any assignment/refund or preset change restarts stability; no permanent-bank multiplier on this extra rate.

- Systems: Skill stability, SRS. Limit: +25% native SRS charging.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded source-rate bonus.

**Power Budget** — `subskill.addictionToPower.powerBudget` · specialization · depth 2 · 4 SP including prerequisites.

Before Discovery: Thresholds over actual paid facility research levels, not generated research, grant through 30-panel-second/min bucket.
After Discovery: Native own-bar threshold count5 credits10 panel-output seconds through30/60 bucket. No purchased TP strength-level condition.

- Systems: Research purchases, Panels, Discovery. Limit: 30 panel seconds per game minute.
- Discovery limit: 30 panel seconds per minute.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: production grant.

**Steady Dose** — `subskill.addictionToPower.steadyDose` · specialization · depth 2 · 5 SP including prerequisites.

Native loadout-change timestamp must stay >=1800 game seconds old, including both assignment and refund. Discovery replaces Science with +25% tier-weighted tree speed; Cash stays1.

- Systems: Stable loadout, Cash, Science, Discovery. Limit: +100% Cash/Science; later +25% tree speed.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Dependency Management** — `subskill.addictionToPower.dependencyManagement` · capstone · depth 3 · 13 SP including prerequisites.

source=stored-time and loadoutAge>=600 gives b_Basic=2. No additional bank credit, no fixed Brain rate enhancement, all age clocks survive refund.

- Systems: Stored Time, Stable loadout, Basic facilities. Limit: +200% basic output.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="poweroverwhelming"></a>
### Power Overwhelming

Base ID: `powerOverwhelming` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **6 choices · entire menu 16 SP.**

**Branch design:** The native exponent remains unchanged. Four deeper choices explore cash reserves, endowments, carried capital and bounded lifetime support.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Liquid Assets | 2 | 2 | Fractured parent | For every 20 tenfold increases in Cash held, facility prices fall 2%, up to 20%. | The assets are technically plasma. |
| Endowment | 2 | 2 | Fractured parent | Holding 100 seconds of Cash income makes Simulation education 50% faster. Bonuses are additive. | The university has agreed to name a dimension after you. |
| Interest Payment | 2 | 4 | Liquid Assets | Every minute, holding 10 minutes of Cash income grants 10 seconds of Server output. | Your savings account has generated a manager. |
| Private Campus | 2 | 4 | Endowment | Holding 30 minutes of Cash income adds 100% Factory output. Bonuses are additive. | The campus has purchased its own horizon. |
| Trust Fund | 3 | 7 | Interest Payment | Keep up to 1 minute of unspent Cash income through Infinity, capped at 1 trillion. | The trustees have survived another universe. |
| Comfortable Eternity | 5 | 16 | Trust Fund, Private Campus | Holding 1 hour of Cash income adds 200% Panel Lifetime and 150% Planet output. Bonuses are additive. | Retirement has become an astronomical timescale. |

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Liquid Assets** — `subskill.powerOverwhelming.liquidAssets` · entry · depth 1 · 2 SP including prerequisites.

d_Facility=min(.2,.001*log10(1+Cash)); shared new-discount cap50%; no exponent change.

- Systems: Cash reserve, Facility prices. Limit: 20% price reduction.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Endowment** — `subskill.powerOverwhelming.endowment` · entry · depth 1 · 2 SP including prerequisites.

b_Education=.5 if nativeCashRate>0 and cashBalance>=100*nativeCashRate; use rates before new Cash effects/grants.

- Systems: Cash reserve, Education. Limit: +50% education speed.
- Source: current state. New ledger reset: Infinity.
- Interaction: noncircular reserve condition.

**Interest Payment** — `subskill.powerOverwhelming.interestPayment` · specialization · depth 2 · 4 SP including prerequisites.

Require nativeCashRate>0 and money>=600*nativeCashRate at each assigned 60-game-second boundary. Credit 10 native Server seconds; no Cash stock converted without a debit.

- Systems: Cash reserve, Servers. Limit: 10 Server seconds per game minute.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: production grant.

**Private Campus** — `subskill.powerOverwhelming.privateCampus` · specialization · depth 2 · 4 SP including prerequisites.

money>=1800*nativeCashRate>0 gives b_Factory=1. Preserve native Factory input/timer requirements.

- Systems: Cash reserve, Simulation Factories. Limit: +100% Factory output.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Trust Fund** — `subskill.powerOverwhelming.trustFund` · specialization · depth 3 · 7 SP including prerequisites.

Retain min(endingCash,60*nativeCashRate,1e12); apply maximum against all other Cash retentions once. No extra SP bank or paid count.

- Systems: Cash, Infinity. Limit: 1e12 or 60 Cash seconds.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Quantum.
- Interaction: retention.

**Comfortable Eternity** — `subskill.powerOverwhelming.comfortableEternity` · capstone · depth 4 · 16 SP including prerequisites.

money>=3600*nativeCashRate>0 enables b_Lifetime=2,b_Planet=1.5. Apply new channels after native Cash^1.03; do not raise the exponent or compound new modifiers.

- Systems: Cash reserve, Panel Lifetime, Planets. Limit: +200% Lifetime; +150% Planet output.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="powerunderwhelming"></a>
### Power Underwhelming

Base ID: `powerUnderwhelming` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **6 choices · entire menu 15 SP.**

**Branch design:** The science exponent is left intact. Incomplete learning supports near-term output; completed learning unlocks practical production, with Discovery equivalents throughout.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Rainy Day Research | 2 | 2 | Fractured parent | Holding 100 seconds of Science income adds 100% Data Center production. Bonuses are additive. | The forecast calls for scattered peer review. |
| Loose Ends | 1 | 1 | Fractured parent | Each unfinished Simulation subject adds 5% Science production. Bonuses are additive. | An incomplete answer is still an answer, apparently. |
| Research Rain | 2 | 4 | Rainy Day Research | Purchased research grants 5 seconds of panel production, up to 20 seconds per minute. | Today’s forecast includes scattered hypotheses. |
| Unfinished Business | 2 | 3 | Loose Ends | Each unfinished subject adds 5% Simulation Factory output. Bonuses are additive. | We have unfinished business in several realities. |
| Scientific Futures | 3 | 7 | Research Rain | Holding 10 minutes of Science income reduces research prices by 25%. | Tomorrow’s discoveries have been refinanced. |
| Quiet Proof | 5 | 15 | Scientific Futures, Unfinished Business | Fully educated Simulations add 200% Science and Data Center output. Bonuses are additive. | The proof was waiting in the margin. |

**After Discovery**

- **Rainy Day Research:** Data Centers gain 100% production while Discovery is at least 75% complete. Bonuses are additive.
- **Loose Ends:** Each unfinished Simulation subject adds 2.5% Discovery speed. Bonuses are additive.
- **Research Rain:** Natural discoveries grant 5 seconds of panel production, up to 20 seconds per minute.
- **Scientific Futures:** With Discovery at least three-quarters full, facility Cash prices are 15% lower.
- **Quiet Proof:** Fully educated Simulations add 50% tree speed and 200% Data Center output. Bonuses are additive.

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Rainy Day Research** — `subskill.powerUnderwhelming.rainyDayResearch` · entry · depth 1 · 2 SP including prerequisites.

b_DataCenters=1 when ScienceBalance>=100*nativeScienceRate and nativeScienceRate>0. Discovery variant requires own progress>=75%.

- Systems: Science reserve, Data Centers. Limit: +100% Data Centers.
- Source: current state. New ledger reset: Infinity.
- Interaction: noncircular reserve condition.

**Loose Ends** — `subskill.powerUnderwhelming.looseEnds` · entry · depth 1 · 1 SP including prerequisites.

b_Science=.05*unfinishedSubjects, max6. Discovery variant b_Discovery=.025*unfinishedSubjects, max.15.

- Systems: Education, Science. Limit: +30% Science; +15% Discovery speed.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Research Rain** — `subskill.powerUnderwhelming.researchRain` · specialization · depth 2 · 4 SP including prerequisites.

Before Discovery: Actual purchased research levels consume 20-panel-second/min bucket.
After Discovery: Each qualifying natural own-bar completion consumes5 panel seconds from20/60 bucket; raw grant completions cannot trigger.

- Systems: Research purchases, Panels, Discovery. Limit: 20 panel seconds per game minute.
- Discovery limit: 20 panel seconds per minute.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: production grant.

**Unfinished Business** — `subskill.powerUnderwhelming.unfinishedBusiness` · specialization · depth 2 · 3 SP including prerequisites.

b_Factory=.05*count(unfinishedNativeSubjects), maximum .30; native unfinished flags, not repeated completion events.

- Systems: Education, Factories. Limit: +30% Factory output.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Scientific Futures** — `subskill.powerUnderwhelming.scientificFutures` · specialization · depth 3 · 7 SP including prerequisites.

Before Discovery: Before Discovery require nativeScienceRate>0 and Science>=600*rate; .25 research discount.
After Discovery: Native unfinished fraction>=.75 enables .15 facility Cash quote reduction under.50 ceiling; no research or TP pricing remains.

- Systems: Science reserve, Research prices, Discovery. Limit: 25% research/strength discount.
- Discovery limit: 15% facility Cash discount.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: price discount.

**Quiet Proof** — `subskill.powerUnderwhelming.quietProof` · capstone · depth 4 · 15 SP including prerequisites.

All six completed subjects enable b_Science=2,b_DC=2. After Discovery Science becomes final +50% weighted tree speed. All bonuses are applied after native Science^1.05.

- Systems: Education, Science, Data Centers, Discovery. Limit: +200% Science/DC; later +50% tree speed.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="endoftheline"></a>
### End of the Line

Base ID: `endOfTheLine` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **3 choices · entire menu 7 SP.**

**Branch design:** This terminal parent gets a compact three-choice finish: paid milestones, recorded Bot progress and a joint panel-production specialization.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Final Inspection | 1 | 1 | Fractured parent | After 50 paid Assembly Lines, their 50-purchase milestone also improves AI Managers by 50%. Bonuses are additive. | Everything leaves with a reassuring little sticker. |
| Assembly Record | 2 | 2 | Fractured parent | Every 20 tenfold increases in Bots advances Simulation production by 10 seconds, once per milestone each Infinity. | The production counter has requested a larger screen. |
| End Credits | 4 | 7 | Final Inspection, Assembly Record | With 100 paid Assembly Lines, Bots and panels gain 200% production. Bonuses are additive. | The credits are longer than the assembly line. |

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Final Inspection** — `subskill.endOfTheLine.finalInspection` · entry · depth 1 · 1 SP including prerequisites.

b_Managers=.5 if truePaidLines>=50; copied once, not proportional to the original milestone or augmented count.

- Systems: Assembly Lines, AI Managers. Limit: +50% Managers.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Assembly Record** — `subskill.endOfTheLine.assemblyRecord` · entry · depth 1 · 2 SP including prerequisites.

Thresholds10^20 through10^240 from native plus ordinary earned Bots; grant10 snapshot-bounded native Simulation production seconds per distinct threshold, max12; exclude generated rewards as retrigger sources.

- Systems: Bot milestones, Simulation production. Limit: 120 production seconds per Infinity.
- Source: current state. New ledger reset: Infinity.
- Interaction: one-shot nonrecursive grants.

**End Credits** — `subskill.endOfTheLine.endCredits` · capstone · depth 2 · 7 SP including prerequisites.

truePaidAssemblyLines>=100 enables b_Bots=b_Panels=2. Does not restore or alter the parent’s removed Fracture penalty or native manual-layer flags.

- Systems: Assembly Lines, Bots, Panels. Limit: +200% Bots and panels.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="rocketmania"></a>
### Rocket Mania

Base ID: `rocketMania` · Ordinary base cost: 3 SP; Fractured base: 0 SP. **5 choices · entire menu 15 SP.**

**Branch design:** A launch-speed path and survey path meet in an orbital manufacturing capstone; Rocket reserves support prices without bypassing launches or Energy debits.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Launch Window | 3 | 3 | Fractured parent | Railguns fire 25% faster while you hold enough Energy for their next full charge. Bonuses are additive. | The launch window is mostly smoke. |
| Orbital Survey | 2 | 2 | Fractured parent | Launched Simulation panels boost Scientific Planets, Planet Assembly and Shell Worlds by 50% per 20 tenfold increases, up to 200%. Bonuses are additive. | A remarkably detailed map of places you have hit. |
| Launch Manifest | 2 | 5 | Launch Window | Each tenfold increase in stored Rockets reduces Space Factory Rocket prices by 1%, up to 20%. | Please declare any planets in your luggage. |
| Stage Separation | 3 | 5 | Orbital Survey | Railgun volleys launch 50% more panels while enough panels and Energy are available. Bonuses are additive. | The second stage would like to become a galaxy. |
| Orbital Industry | 5 | 15 | Launch Manifest, Stage Separation | Launched panels add up to 200% Space Factory output and 100% megastructure output. Bonuses are additive. | The factory floor is now in orbit. |

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Launch Window** — `subskill.rocketMania.launchWindow` · entry · depth 1 · 3 SP including prerequisites.

Reduce native firing interval by20% (=25% frequency), require the ordinary next full-charge Energy quote; no free Energy, charge or payload.

- Systems: Railgun cadence, Energy. Limit: +25% eligible firing frequency.
- Source: current state. New ledger reset: Infinity.
- Interaction: funded action speed.

**Orbital Survey** — `subskill.rocketMania.orbitalSurvey` · entry · depth 1 · 2 SP including prerequisites.

b_DirectPlanetGeneration=min(2,.025*log10(1+physicallyLaunchedPanels)); Scientific/Assembly/Shell native generators only; no Stellar source or Galactic duplication.

- Systems: Launched panels, Planet generation. Limit: +200% direct native Planet generation.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded cross-system source.

**Launch Manifest** — `subskill.rocketMania.launchManifest` · specialization · depth 2 · 5 SP including prerequisites.

d_RocketInput=min(.20,.01*log10(1+currentStoredRockets)); amount quote only, native Factory input unchanged, .50 input discount cap.

- Systems: Rocket reserve, Space Factory inputs. Limit: 20% Rocket-input discount.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: input discount.

**Stage Separation** — `subskill.rocketMania.stageSeparation` · specialization · depth 2 · 5 SP including prerequisites.

Add .50 to native payload-capacity channel, then recompute conservative charge and panel debits for actual final payload. No multiplication of free retained charge into a larger unpaid volley.

- Systems: Railguns, Launched panels. Limit: +50% payload capacity.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: paid payload capacity.

**Orbital Industry** — `subskill.rocketMania.orbitalIndustry` · capstone · depth 3 · 15 SP including prerequisites.

b_SpaceFactory=min(2,.05*log10(1+nativeLaunchedPanelStock)); b_Mega=min(1,.025*log10(1+stock)). Exclude new grants from launch stock until actually launched; Brain lambda unaffected.

- Systems: Launched panels, Space Factories, Megastructures. Limit: +200% Space Factories; +100% ordinary mega output.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Dream.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>


## Networks

<a id="pocketdimensions"></a>
### Pocket Dimensions

Base ID: `pocketDimensions` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **6 choices · entire menu 14 SP.**

**Branch design:** The pocket generator supports tenants, reset storage and a new raw-output Planet source; the deep branch joins dimensional housing to real education.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Tenant Fees | 1 | 1 | Fractured parent | Pocket Dimensions add 10% Influence generation per tenfold increase in their output, up to 100%. Bonuses are additive. | Rent is due in every dimension simultaneously. |
| Emergency Exit | 3 | 3 | Fractured parent | Keep up to 10 generated Data Centers through Infinity. | Please locate your nearest non-Euclidean exit. |
| Rent Free | 1 | 1 | Fractured parent | Before your first surrounded star, basic facility Cash prices are 15% lower. | The first universe’s rent is on us. |
| Dimensional Storage | 2 | 5 | Emergency Exit | Keep 15% of unlaunched Simulation panels through a Black Hole. | Please put the panels in the other universe. |
| Pocket Outposts | 3 | 4 | Tenant Fees | Pocket Dimensions’ unmodified Worker bonus also creates 5% as many Planets. | A small world has slipped out of your pocket. |
| Tenant Cooperative | 4 | 13 | Pocket Outposts, Dimensional Storage | With equal Worker and Scientist allocation, Pocket output and Simulation Housing output rise 150%. Bonuses are additive. | The tenants have formed a housing dimension. |

**After Discovery**

- **Tenant Cooperative:** With Pocket Dimensions and Scientific Planets producing, Pocket and Housing output rise 150%. Bonuses are additive.

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Tenant Fees** — `subskill.pocketDimensions.tenantFees` · entry · depth 1 · 1 SP including prerequisites.

b_Influence=min(1,.1*log10(1+rawPocketPerPlanetBonus)); absent Pocket output gives zero rather than inventing a source.

- Systems: Pocket Dimensions, Reality. Limit: +100% Influence generation.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Emergency Exit** — `subskill.pocketDimensions.emergencyExit` · entry · depth 1 · 3 SP including prerequisites.

Retain min(10, generatedDataCenters) while assigned at the reset; merge with other retention using max for the same units, not repeated grants. Never paid or price-counted.

- Systems: Data Centers, Infinity. Limit: 10 generated Data Centers retained.
- Source: existing generated Data Centers. New ledger reset: Quantum.
- Interaction: generated retention ledger.

**Rent Free** — `subskill.pocketDimensions.rentFree` · entry · depth 1 · 1 SP including prerequisites.

nativeSurroundedStars==0 enables .15 basic-facility quote discount. No expansion of the native Pocket per-Planet bonus or new purchase-index adjustment.

- Systems: Stars, Facility prices. Limit: 15% early basic Cash discount.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: price discount.

**Dimensional Storage** — `subskill.pocketDimensions.dimensionalStorage` · specialization · depth 2 · 5 SP including prerequisites.

Snapshot actual unlaunched panel stock at a rewarded Black Hole; add .15 to shared new panel-retention entitlement, total cap .30, apply once.

- Systems: Pocket infrastructure, Unlaunched panels, Black Holes. Limit: 15% panel entitlement; shared 30% cap.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Dream.
- Interaction: retention.

**Pocket Outposts** — `subskill.pocketDimensions.pocketOutposts` · specialization · depth 2 · 4 SP including prerequisites.

New independent Planet source .05*max(0,log10(nativeWorkers)), only with Pocket Dimensions owned and Workers>1. This donor is the unmodified logarithmic base, before Pocket Multiverse, Solar Bubbles, Androids, quantum modifiers or any new bonus; it is not the full dysonDerivedIntermediates Pocket value and never multiplies by owned Planets. Do not feed this new source through Shoulders accrual. The added source is at most15.413 Planets per game second for finite-double Workers.

- Systems: Pocket raw output, Planets. Limit: 5% unmodified log10(Workers); at most15.413 Planets per game second in finite double range.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: raw generator bridge.

**Tenant Cooperative** — `subskill.pocketDimensions.tenantCooperative` · capstone · depth 3 · 13 SP including prerequisites.

Before Discovery: Positive Worker/Scientist fractions must be equal. b_Pocket=1.5,b_Housing=1.5; raw Outpost donor remains unenhanced to avoid copying the same bonus twice.
After Discovery: Both raw native generators must be positive. b_Pocket=b_Housing=1.5, replaces retired equal-allocation condition; raw Outposts donor excludes new bonuses.

- Systems: Allocation, Pocket Dimensions, Housing. Limit: +150% Pocket and Housing output.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="pocketprotectors"></a>
### Pocket Protectors

Base ID: `pocketProtectors` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **4 choices · entire menu 7 SP.**

**Branch design:** A small protective tree adds balanced staffing and a finite food-to-research recovery path to the existing insurance choices.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Pocket Calculator | 1 | 1 | Fractured parent | Equal Worker and Scientist allocation adds 50% Pocket Dimensions output. Bonuses are additive. | It has more dimensions than buttons. |
| Lab Insurance | 2 | 2 | Fractured parent | Keep up to 1 minute of unspent Science income through Infinity, capped at 1 trillion. | The deductible is measured in parallel universes. |
| Protective Sleeves | 2 | 3 | Pocket Calculator | After 1 minute of equal Worker and Scientist allocation, Panel Lifetime rises 100%. Bonuses are additive. | The pen pocket now holds an entire atmosphere. |
| Peer Insurance | 2 | 4 | Lab Insurance | Feeding Influence to Avocato grants 30 seconds of Science production, once per Quantum. | Your claim was peer reviewed and approved. |

**After Discovery**

- **Pocket Calculator:** Pocket Dimensions produces 50% more Data Centers. Bonuses are additive.
- **Lab Insurance:** Keep up to 5% of naturally earned Discovery progress through Infinity.
- **Protective Sleeves:** A natural discovery adds 100% Panel Lifetime for 1 minute. Bonuses are additive.
- **Peer Insurance:** Feeding Influence to Avocato grants 3% Discovery progress, once per Quantum.

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Pocket Calculator** — `subskill.pocketProtectors.pocketCalculator` · entry · depth 1 · 1 SP including prerequisites.

b_Pocket=.5 at exactly .5 allocation; Multitasking and Discovery count as balanced; applies only to native Pocket source.

- Systems: Bot allocation, Pocket Dimensions. Limit: +50% Pocket output.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Lab Insurance** — `subskill.pocketProtectors.labInsurance` · entry · depth 1 · 2 SP including prerequisites.

Carry min(scienceBalance,60*nativeScienceRate,1e12), excluding newly generated grant income; one snapshot, no interest on retained amounts. Discovery retains up to5% of its own directly earned bar progress.

- Systems: Science reserve, Infinity. Limit: 60 native Science seconds, at most 1e12; 5% Discovery progress.
- Source: unspent Science; direct Discovery progress. New ledger reset: Quantum.
- Interaction: bounded retention.

**Protective Sleeves** — `subskill.pocketProtectors.protectiveSleeves` · specialization · depth 2 · 3 SP including prerequisites.

Before Discovery: Both positive allocation fractions equal continuously for 60 game seconds gives b_Lifetime=1. Any genuine allocation change clears earned condition; refunds cannot restart the timer favourably.
After Discovery: Qualifying natural own-bar completion refreshes one60-game-second b_Lifetime=1 window; no Scientist/equal-allocation predicate or stacking.

- Systems: Allocation, Panel Lifetime. Limit: +100% Lifetime.
- Discovery limit: +100% Lifetime for60 seconds.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Peer Insurance** — `subskill.pocketProtectors.peerInsurance` · specialization · depth 2 · 4 SP including prerequisites.

Require positive actual Influence feed debit, once per Quantum durable flag; grant 30 native Science seconds. After Discovery grant .03 raw unfinished Discovery bar, never reward/trigger a new grant.

- Systems: Avocato, Science, Discovery. Limit: 30 Science seconds; later .03 raw bar per Quantum.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Quantum.
- Interaction: finite paid-source grant.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="pocketmultiverse"></a>
### Pocket Multiverse

Base ID: `pocketMultiverse` · Ordinary base cost: 2 SP; Fractured base: 0 SP. **5 choices · entire menu 14 SP.**

**Branch design:** Two parallel donor paths lead to independent dimension pricing, specialized schooling and a shared physical-source capstone.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Exchange Students | 2 | 2 | Fractured parent | Your fastest unfinished Simulation subject shares 20% of its natural progress with the slowest. | The exchange programme has confused the geography department. |
| Parallel Tenants | 3 | 3 | Fractured parent | Pocket Dimensions also creates Servers equal to 20% of its per-Planet bonus. | The tenants have sublet the spare dimensions. |
| Many Worlds Major | 2 | 4 | Exchange Students | Each unfinished subject reduces Data Center Cash prices by 3%, up to 18%. | You can major in every possible subject. |
| Parallel Laboratories | 3 | 6 | Parallel Tenants | Pocket Dimensions produces 100% more while a Simulation subject is studying. Bonuses are additive. | We are conducting the same experiment elsewhere. |
| Multiversal Faculty | 4 | 14 | Many Worlds Major, Parallel Laboratories | Fully educated Simulations add 150% Pocket output and 50% Server output. Bonuses are additive. | The faculty meeting is happening in several universes. |

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Exchange Students** — `subskill.pocketMultiverse.exchangeStudents` · entry · depth 1 · 2 SP including prerequisites.

Copy .2 of directly time-earned progress from one donor to one different recipient; no copies of transferred progress, no completed subject donors, no self-donation.

- Systems: Education, Parallel progress. Limit: 20% of one native subject progress stream.
- Source: current state. New ledger reset: Infinity.
- Interaction: nonrecursive progress transfer.

**Parallel Tenants** — `subskill.pocketMultiverse.parallelTenants` · entry · depth 1 · 3 SP including prerequisites.

Add .2*rawPocketPerPlanetBonus as generated Servers; use the raw intermediate before owned Planets, facility modifiers or new augments; no copied augment grants or general Planet output; source remains log-bounded by Bots and native Pocket modifiers.

- Systems: Pocket Dimensions, Servers. Limit: 20% of native Pocket output.
- Source: native Pocket output. New ledger reset: Infinity.
- Interaction: downstream-only source copy.

**Many Worlds Major** — `subskill.pocketMultiverse.manyWorldsMajor` · specialization · depth 2 · 4 SP including prerequisites.

d_DC=.03*unfinishedSubjectCount; final native quote reduction, shared .50 cap. Completed subjects naturally remove this discount.

- Systems: Education, Data Center prices. Limit: 18% DC Cash discount.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: price discount.

**Parallel Laboratories** — `subskill.pocketMultiverse.parallelLaboratories` · specialization · depth 2 · 6 SP including prerequisites.

At least one native subject actively studying enables b_Pocket=1. Active study is a condition, not six independent copies or progress-triggered bonuses.

- Systems: Education, Pocket Dimensions. Limit: +100% Pocket output.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Multiversal Faculty** — `subskill.pocketMultiverse.multiversalFaculty` · capstone · depth 3 · 14 SP including prerequisites.

All six native completion flags enable b_Pocket=1.5,b_Server=.5. Parallel Tenants remains .20 raw per-Planet donor, not .20 new aggregate output.

- Systems: Education, Pocket Dimensions, Servers. Limit: +150% Pocket; +50% Server output.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="dimensionalcatcables"></a>
### Dimensional CAT cables

Base ID: `dimensionalCatCables` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **4 choices · entire menu 10 SP.**

**Branch design:** Four choices are enough for this cable modifier: a safe raw cross-source bridge, launch-input wiring, extra charge storage and a dedicated SRS circuit.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Cross Talk | 3 | 3 | Fractured parent | Scientific Planets gains 25% of Pocket Dimensions’ per-Planet bonus. | The cable is plugged into the wrong universe. |
| Cable Management | 2 | 2 | Fractured parent | Space Factories require 1 fewer Rocket, with a minimum of 1. | A cable tie has solved several laws of physics. |
| Buffered Volley | 2 | 4 | Cable Management | Railguns can store enough charge for two volleys. | The cable has acquired a second packet buffer. |
| Dedicated Circuit | 3 | 6 | Cross Talk | Owning Solar generators adds 25% SRS charging speed. Bonuses are additive. | This cable is reserved for alarming discoveries. |

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Cross Talk** — `subskill.dimensionalCatCables.crossTalk` · entry · depth 1 · 3 SP including prerequisites.

Add .25*rawPocketPerPlanetBonus to the Scientific Planets source only if Scientific Planets is owned. This is the raw dysonDerivedIntermediates value, never total Planet-to-Data-Center throughput and never multiplied by owned Planets; do not route this through Shoulders accrual or back into Pocket output.

- Systems: Pocket Dimensions, Planet generation. Limit: 25% raw per-Planet Pocket bonus as a separate Scientific Planet source; never aggregate output.
- Source: native Pocket source without new bonuses. New ledger reset: Infinity.
- Interaction: upstream conversion bounded by log source.

**Cable Management** — `subskill.dimensionalCatCables.cableManagement` · entry · depth 1 · 2 SP including prerequisites.

Native Rockets-per-Space-Factory quote reduced by1, floor1; also enforce total new Rocket-input discount<=50%. Debit actual Rockets and Factory input; does not grant or duplicate a Factory.

- Systems: Rockets, Space Factories. Limit: 1 Rocket discount, minimum cost 1.
- Source: current state. New ledger reset: Infinity.
- Interaction: conservative conversion discount.

**Buffered Volley** — `subskill.dimensionalCatCables.bufferedVolley` · specialization · depth 2 · 4 SP including prerequisites.

Increase native non-firing charge-cap capacity from one current full-volley quote to two; all Energy transfer debits remain full. Do not double payload or retained-charge entitlement; active-volley charge is committed once.

- Systems: Railgun charge storage, Energy. Limit: two fully paid current volleys of stored charge.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Dream.
- Interaction: storage capacity.

**Dedicated Circuit** — `subskill.dimensionalCatCables.dedicatedCircuit` · specialization · depth 2 · 6 SP including prerequisites.

nativeSolarStock>0 gives b_SrsCharging=.25, combined in shared new SRS speed channel capped at +100%. Instant Railgun Energy transfer remains unchanged.

- Systems: Solar infrastructure, SRS. Limit: +25% SRS speed.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="pocketandroids"></a>
### Pocket Androids

Base ID: `pocketAndroids` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **5 choices · entire menu 12 SP.**

**Branch design:** Warm-up creates meaningful early, mature and reset choices; the capstone carries more experience but never invents an unowned Pocket generator.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Warm Spare | 3 | 3 | Fractured parent | Keep half of Pocket Androids’ warm-up through Infinity, up to 30 minutes. | One android stays on to watch the kettle. |
| Remote Tutors | 2 | 2 | Fractured parent | Fully warmed Pocket Androids make Simulation education 50% faster. Bonuses are additive. | The substitute teacher is broadcasting from a pocket. |
| Early Login | 1 | 1 | Fractured parent | For the first 10 minutes of Pocket Android warm-up, AI Managers gain 100% output. Bonuses are additive. | Your account has logged in before you. |
| Android Tenants | 2 | 4 | Remote Tutors | After 30 minutes of Pocket Android warm-up, Planet Cash prices are 20% lower. | The tenants have finally installed themselves. |
| Persistent Residents | 4 | 11 | Warm Spare, Android Tenants | Warm Spare keeps 75% of Pocket Android warm-up through Infinity, up to 45 minutes. | The neighbours are difficult to reset. |

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Warm Spare** — `subskill.pocketAndroids.warmSpare` · entry · depth 1 · 3 SP including prerequisites.

Retain min(1800,.5*earnedParentWarmup); resulting timer replaces, never adds to, the fresh timer. Clearing at Quantum prevents permanent charge accumulation.

- Systems: Pocket Androids, Infinity. Limit: 1800 retained warm-up seconds.
- Source: current state. New ledger reset: Quantum.
- Interaction: nonstacking timer retention.

**Remote Tutors** — `subskill.pocketAndroids.remoteTutors` · entry · depth 1 · 2 SP including prerequisites.

b_Education=.5 while nativePocketAndroidTimer>=3600; no timer acceleration is granted.

- Systems: Pocket Androids, Education. Limit: +50% education speed.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Early Login** — `subskill.pocketAndroids.earlyLogin` · entry · depth 1 · 1 SP including prerequisites.

Owned native Pocket Android charge<600 enables b_Manager=1. Native 3600-second warm-up continues normally and never resets on refund.

- Systems: Pocket Android warm-up, AI Managers. Limit: +100% Manager output before 10 minutes.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Android Tenants** — `subskill.pocketAndroids.androidTenants` · specialization · depth 2 · 4 SP including prerequisites.

nativePocketAndroidCharge>=1800 enables .20 native Planet quote reduction; no effective paid count or price growth factor change.

- Systems: Pocket Android warm-up, Planet prices. Limit: 20% Planet Cash discount.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: price discount.

**Persistent Residents** — `subskill.pocketAndroids.persistentResidents` · capstone · depth 3 · 11 SP including prerequisites.

Replace Warm Spare fraction .50/cap1800 by .75/cap2700, not an extra retention. Qualify at ending reset and take maximum with all competing charge retentions; Quantum clears.

- Systems: Pocket Android warm-up, Infinity. Limit: 2700 retained warm-up seconds.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Quantum.
- Interaction: capstone retention.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="solarbubbles"></a>
### Solar Bubbles

Base ID: `solarBubbles` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **4 choices · entire menu 8 SP.**

**Branch design:** A compact lifetime/Solar tree adds fast SRS support or a retained Solar seed, without turning lifetime directly into an unbounded Energy grant.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Bubble Wrap | 1 | 1 | Fractured parent | Railgun volleys use 10% less Energy while Panel Lifetime is at least 10 minutes. | Fragile. Please handle with a small sun. |
| Private Suns | 2 | 2 | Fractured parent | Owning Solar and Fusion generators adds 100% Pocket Dimensions output. Bonuses are additive. | Every pocket comes with its own sunrise. |
| Bubble Surge | 2 | 3 | Bubble Wrap | Above 1 hour of Panel Lifetime, SRS charges 25% faster. Bonuses are additive. | The bubble now contains several mornings. |
| Solar Island | 3 | 5 | Private Suns | Keep one purchased Solar generator through a Black Hole. | The island survives the inconvenient end of reality. |

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Bubble Wrap** — `subskill.solarBubbles.bubbleWrap` · entry · depth 1 · 1 SP including prerequisites.

d_Charge=.10 at Lifetime>=600, applied to new charging debits only; pre-existing charge is not retroactively revalued.

- Systems: Lifetime, Railgun Energy. Limit: 10% charge-cost reduction.
- Source: current state. New ledger reset: Infinity.
- Interaction: conservative Energy discount.

**Private Suns** — `subskill.solarBubbles.privateSuns` · entry · depth 1 · 2 SP including prerequisites.

b_Pocket=1 if ownedSolar>0 and ownedFusion>0; source ownership, not current Energy balance.

- Systems: Simulation Energy, Pocket Dimensions. Limit: +100% Pocket output.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Bubble Surge** — `subskill.solarBubbles.bubbleSurge` · specialization · depth 2 · 3 SP including prerequisites.

nativeDerivedLifetime>=3600 gives b_SrsCharging=.25; shares +100% new SRS speed cap. No recursive recomputation of Lifetime inside charge calculation.

- Systems: Panel Lifetime, SRS. Limit: +25% SRS charging.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Solar Island** — `subskill.solarBubbles.solarIsland` · specialization · depth 2 · 5 SP including prerequisites.

Retain min(1,endingActualSolarStock) from a positive-reward Black Hole. It is a retained real unit, not a purchase; maximum with other same-stock retentions. Influence debit of the original purchase must exist.

- Systems: Solar, Black Holes. Limit: one retained Solar generator.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Dream.
- Interaction: retention.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="whatwillcometopass"></a>
### What Will Come to Pass

Base ID: `whatWillComeToPass` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **5 choices · entire menu 12 SP.**

**Branch design:** The forecast can support future purchasing or patient output; deeper choices prepare factory inputs and SRS before a joint Data Center specialization.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Purchase Forecast | 2 | 2 | Fractured parent | Your next paid Data Center costs 25% less after every 10 paid Planets. | The invoice arrived yesterday. |
| Future Delivery | 2 | 2 | Fractured parent | Each minute without buying a Data Center grants 10 seconds of its Server output. | Estimated delivery: shortly before you ordered it. |
| Prepared Inventory | 2 | 4 | Purchase Forecast | Every 50 paid Data Centers makes your next Space Factory consume 25% fewer Factories. | The warehouse already knew you would order this. |
| Delivery Estimate | 2 | 4 | Future Delivery | After 5 minutes without buying a Data Center, SRS charges 20% faster. Bonuses are additive. | Your delivery is still several dimensions away. |
| Self Fulfilling Forecast | 4 | 12 | Prepared Inventory, Delivery Estimate | With 100 paid Data Centers, their output rises 150% and Pocket output rises 50%. Bonuses are additive. | We predicted that the prediction would work. |

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Purchase Forecast** — `subskill.whatWillComeToPass.purchaseForecast` · entry · depth 1 · 2 SP including prerequisites.

One coupon per10 real Planet purchases; one held coupon; applies to one Data Center within the shared50% new-discount cap. Free purchases and Terra credits do not earn it.

- Systems: Planet purchases, Data Center prices. Limit: 25% off one Data Center.
- Source: real paid Planets. New ledger reset: Infinity.
- Interaction: coupon ledger.

**Future Delivery** — `subskill.whatWillComeToPass.futureDelivery` · entry · depth 1 · 2 SP including prerequisites.

A60 assigned-game-second clock resets on actual paid Data Center purchase; each completed minute grants10 native Data-Center-output seconds. No output-derived clock acceleration.

- Systems: Purchase pacing, Data Centers. Limit: +1/6 native Data Center throughput.
- Source: current state. New ledger reset: Infinity.
- Interaction: nonrecursive timed grant.

**Prepared Inventory** — `subskill.whatWillComeToPass.preparedInventory` · specialization · depth 2 · 4 SP including prerequisites.

Paid DC thresholds prepare at most one .25 Factory-input coupon; conservative Space Factory purchase consumes it. No Rockets discount, no threshold from generated DCs.

- Systems: Data Center purchases, Space Factory inputs. Limit: one 25% Factory-input coupon.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: input coupon.

**Delivery Estimate** — `subskill.whatWillComeToPass.deliveryEstimate` · specialization · depth 2 · 4 SP including prerequisites.

Absolute time since true paid DC transaction >=300 gives b_SrsCharging=.20. Shared +100% new SRS cap; refund/unassign cannot restart favourable time.

- Systems: Patient purchasing, SRS. Limit: +20% SRS charging.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Self Fulfilling Forecast** — `subskill.whatWillComeToPass.selfFulfillingForecast` · capstone · depth 3 · 12 SP including prerequisites.

actualPaidDCs>=100 enables b_DC=1.5,b_Pocket=.5. Apply after the native 1% per bought-DC layer; no extra price/count feedback.

- Systems: Data Center purchases, Data Centers, Pocket Dimensions. Limit: +150% DC output; +50% Pocket.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="parallelprocessing"></a>
### Parallel Processing

Base ID: `parallelProcessing` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **6 choices · entire menu 12 SP.**

**Branch design:** The scheduler has six choices: balancing, households, cheap early child processes, sustained Tinker affinity, research batching and a production-farm capstone.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Load Balancer | 2 | 2 | Fractured parent | If AI Managers outnumber Servers, Servers gain 100% production. Otherwise AI Managers gain 100%. Bonuses are additive. | Everyone has agreed the bottleneck is someone else. |
| Parallel Households | 1 | 1 | Fractured parent | Housing and Villages in Simulations complete their cycles 25% faster. Bonuses are additive. | The neighbourhood has discovered multithreading. |
| Child Processes | 1 | 1 | Fractured parent | Each of your first 20 paid Servers includes 2 generated AI Managers. | The process has spawned a small middle-management team. |
| Process Affinity | 2 | 4 | Load Balancer | While Tinker is running, Servers and AI Managers gain 50% output. Bonuses are additive. | The scheduler has pinned reality to one core. |
| Simultaneous Billing | 2 | 3 | Parallel Households | Buying Server research makes your next AI Manager research level 25% cheaper. | Both invoices arrived at exactly the same time. |
| Process Farm | 4 | 11 | Process Affinity, Simultaneous Billing | With 100 paid Servers, AI Managers and Simulation Space Factories gain 150% output. Bonuses are additive. | The server farm has begun growing rockets. |

**After Discovery**

- **Simultaneous Billing:** A natural discovery makes your next AI Manager 25% cheaper.

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Load Balancer** — `subskill.parallelProcessing.loadBalancer` · entry · depth 1 · 2 SP including prerequisites.

Choose one +1 native-link bonus from interval-start total counts; stable comparison; no shifting physical stock or feeding the selection with granted units mid-step.

- Systems: Servers, AI Managers. Limit: +100% to one link.
- Source: current state. New ledger reset: Infinity.
- Interaction: snapshot branch condition.

**Parallel Households** — `subskill.parallelProcessing.parallelHouseholds` · entry · depth 1 · 1 SP including prerequisites.

Add .25 to the existing native Housing and Village progress-rate channels; conversions still debit their inputs.

- Systems: Foundational era, Housing, Villages. Limit: +25% to two cycle speeds.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Child Processes** — `subskill.parallelProcessing.childProcesses` · entry · depth 1 · 1 SP including prerequisites.

First 20 actual paid Server units consume durable flags and grant two generated Managers each. Retained/virtual/generated Servers cannot qualify; bulk settles units once.

- Systems: Server purchases, AI Managers. Limit: 40 generated Managers per Infinity.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: finite paid-source grant.

**Process Affinity** — `subskill.parallelProcessing.processAffinity` · specialization · depth 2 · 4 SP including prerequisites.

Native Tinker runtime.running enables b_Server=b_Manager=.5. No increased Tinker reward denominator or cap donor; paused Tinker produces nothing.

- Systems: Tinker runtime, Servers, AI Managers. Limit: +50% two facility outputs.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Simultaneous Billing** — `subskill.parallelProcessing.simultaneousBilling` · specialization · depth 2 · 3 SP including prerequisites.

Before Discovery: A true paid Server-research level creates at most one .25 Manager-research coupon, consumed only by native quote/debit settlement. No generated/retained level trigger.
After Discovery: Native own-bar completion prepares one outstanding .25 Cash coupon for one paid Manager. Quote/debit settlement consumes it; no retired research or TP source.

- Systems: Facility research prices. Limit: one 25% Manager-research coupon.
- Discovery limit: one25% Manager coupon.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: coupon.

**Process Farm** — `subskill.parallelProcessing.processFarm` · capstone · depth 3 · 11 SP including prerequisites.

actualPaidServers>=100 gives b_Manager=b_SpaceFactory=1.5, with native Space Factory production-input conservation.

- Systems: Server purchases, AI Managers, Space Factories. Limit: +150% two outputs.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="parallelcomputation"></a>
### Parallel Computation

Base ID: `parallelComputation` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **6 choices · entire menu 15 SP.**

**Branch design:** Vector research and timing caches lead to Solar computation, a research coupon path and a combined specialized research capstone.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Vector Library | 2 | 2 | Fractured parent | Each research type with 100 paid levels adds 5% Data Center production, up to 50%. Bonuses are additive. | The library is alphabetised in several directions. |
| Shared Cache | 2 | 2 | Fractured parent | Every minute, your stronger of Servers or Data Centers grants 5 seconds of the other’s output. | Neither department admits where the spare memory came from. |
| Vectorized Drones | 2 | 4 | Vector Library | Each completed subject adds 10% Simulation Bot Rocket output, up to 60%. Bonuses are additive. | The drones have aligned their homework. |
| Speculative Quote | 2 | 4 | Shared Cache | Every 100 paid Servers makes your next Data Center research level 30% cheaper. | The calculation was ready before the invoice. |
| Compute Sun | 3 | 7 | Vectorized Drones | While Fusion Energy output exceeds Solar output, Data Centers gain 100% output. Bonuses are additive. | The calculation has found a brighter processor. |
| Synchronized Research | 4 | 15 | Compute Sun, Speculative Quote | Server and Data Center research are 150% stronger while all subjects are complete. Bonuses are additive. | Every clock has arrived at the same answer. |

**After Discovery**

- **Vector Library:** Every 10 natural Discoveries adds 5% Data Center production, up to 50%. Bonuses are additive.
- **Speculative Quote:** Every 100 paid Servers makes your next Data Center 30% cheaper.
- **Synchronized Research:** Servers and Data Centers gain 150% output while all subjects are complete. Bonuses are additive.

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Vector Library** — `subskill.parallelComputation.vectorLibrary` · entry · depth 1 · 2 SP including prerequisites.

b_DataCenters=min(.5,.05*count(paidResearchTypeLevels>=100)); Discovery replacement uses .05 per10 natural completions, same cap.

- Systems: Research breadth, Data Centers. Limit: +50% Data Centers.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Shared Cache** — `subskill.parallelComputation.sharedCache` · entry · depth 1 · 2 SP including prerequisites.

Compare output-to-stock ratios, then grant5 native output seconds to the weaker link once per60 assigned seconds. Never copy source units across links.

- Systems: Servers, Data Centers. Limit: +1/12 native throughput to one link.
- Source: current state. New ledger reset: Infinity.
- Interaction: nonrecursive timed grant.

**Vectorized Drones** — `subskill.parallelComputation.vectorizedDrones` · specialization · depth 2 · 4 SP including prerequisites.

b_Rockets=.10*completedNativeSubjects, max.60. Rockets are produced through the native represented credit; no direct launch.

- Systems: Education, Simulation Bots. Limit: +60% Rocket output.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Speculative Quote** — `subskill.parallelComputation.speculativeQuote` · specialization · depth 2 · 4 SP including prerequisites.

Before Discovery: Paid Server thresholds prepare at most one .30 DC-research coupon; quote amount shares .50 cap, actual paid research purchase consumes it.
After Discovery: True paid Server thresholds prepare one .30 DC Cash coupon under.50 cap. Applies to one actual unit, no research/TP price effect.

- Systems: Server purchases, Research prices. Limit: one 30% DC-research coupon.
- Discovery limit: one30% DC coupon.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: coupon.

**Compute Sun** — `subskill.parallelComputation.computeSun` · specialization · depth 3 · 7 SP including prerequisites.

Compare native Energy-per-game-second rates in matching units. Both generators must exist and nativeFusionRate>nativeSolarRate; b_DC=1. New granted Energy is not donor output.

- Systems: Energy balance, Data Centers. Limit: +100% DC output.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Synchronized Research** — `subskill.parallelComputation.synchronizedResearch` · capstone · depth 4 · 15 SP including prerequisites.

Before Discovery: All six native subject flags enable b_ServerResearch=b_DCResearch=1.5; do not modify other research strength or geometric research price growth.
After Discovery: All six subject flags enable b_Server=b_DC=1.5, replacing two retired facility-research-strength bonuses.

- Systems: Education, Facility research strength. Limit: +150% two research types.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="quantumcomputing"></a>
### Quantum Computing

Base ID: `quantumComputing` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **7 choices · entire menu 18 SP.**

**Branch design:** A seven-choice quantum branch offers education, shard reserves, paid-upgrade rewards, SRS Cash strength, physical Energy and a practical late computing capstone.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Entangled Tuition | 2 | 2 | Fractured parent | Buying a Quantum upgrade advances each unfinished Simulation subject by 20 seconds, up to 2 minutes per Infinity. | Your student loan exists in several states at once. |
| Superposition Budget | 1 | 1 | Fractured parent | Unspent Quantum Shards add 5% Cash and Science per tenfold increase, up to 100%. Bonuses are additive. | The money is both spent and unspent. Accounting disagrees. |
| Paired Experiments | 2 | 4 | Entangled Tuition | Purchased Quantum upgrades grant 5 generated Science Boosts, up to 20 per Quantum. | The control group exists in another timeline. |
| Unobserved Reserve | 2 | 3 | Superposition Budget | Holding 10 unspent Quantum Shards adds 100% Pocket output. Bonuses are additive. | The budget exists until somebody checks it. |
| Wave Guide | 3 | 7 | Paired Experiments | SRS’s Cash bonus is 25% stronger. Bonuses are additive. | Please keep your waveform inside the marked lines. |
| Quantum Utility | 3 | 6 | Unobserved Reserve | Holding 10 unspent Quantum Shards adds 100% Solar and Fusion output. Bonuses are additive. | The meter is reading several possibilities. |
| Practical Superposition | 5 | 18 | Wave Guide, Quantum Utility | Fully educated Simulations add 200% Pocket output and 100% Server output. Bonuses are additive. | The computer has finally selected a useful outcome. |

**After Discovery**

- **Superposition Budget:** Unspent Quantum Shards add up to 100% Cash and 25% Discovery speed. Bonuses are additive.
- **Paired Experiments:** Purchased Quantum upgrades grant 1% Discovery progress, up to 4% per Quantum.

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Entangled Tuition** — `subskill.quantumComputing.entangledTuition` · entry · depth 1 · 2 SP including prerequisites.

Every positive-cost purchase action grants20 base education-progress seconds per unfinished subject; bulk action counts once; total120 per Infinity.

- Systems: Quantum upgrades, Education. Limit: 120 seconds per subject per Infinity.
- Source: current state. New ledger reset: Infinity.
- Interaction: paid-event ledger.

**Superposition Budget** — `subskill.quantumComputing.superpositionBudget` · entry · depth 1 · 1 SP including prerequisites.

b_Cash=b_Science=min(1,.05*log10(1+spendableQS)); no cost bypass. Discovery b=min(.25,.0125*log10(1+QS)).

- Systems: Quantum reserve, Cash, Science. Limit: +100% Cash/Science; +25% Discovery speed.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Paired Experiments** — `subskill.quantumComputing.pairedExperiments` · specialization · depth 2 · 4 SP including prerequisites.

Each positive native Quantum-upgrade debit grants min(5,remaining20) generated Science Boost levels. Excluded from paid research triggers/Shoulders donor. After Discovery grant .01 raw unfinished bar, max .04 per Quantum.

- Systems: Quantum purchases, Generated research, Discovery. Limit: 20 generated levels; later .04 raw bar per Quantum.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Quantum.
- Interaction: finite paid-source grant.

**Unobserved Reserve** — `subskill.quantumComputing.unobservedReserve` · specialization · depth 2 · 3 SP including prerequisites.

nativeUnspentQuantumShards>=10 gives b_Pocket=1. Only actual unspent balance qualifies; no spent/reserved points double counted.

- Systems: Quantum Shards, Pocket Dimensions. Limit: +100% Pocket output.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Wave Guide** — `subskill.quantumComputing.waveGuide` · specialization · depth 3 · 7 SP including prerequisites.

Let S_native be the current native SRS Cash multiplier after Focused Beam. Replace this single term by1+(S_native-1)*(1+e_Cash), where e_Cash is the sum of new SRS-Cash enhancements capped at1. No new charge, Science modifier, Discovery speed or facility term is created.

- Systems: SRS, Cash. Limit: +25% SRS Cash bonus; shared+100% cap.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus-above-one enhancement.

**Quantum Utility** — `subskill.quantumComputing.quantumUtility` · specialization · depth 3 · 6 SP including prerequisites.

Actual unspent Q>=10 enables b_Solar=b_Fusion=1. Excludes Brain replication and Quantum resource creation.

- Systems: Quantum Shards, Energy. Limit: +100% Solar/Fusion.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Practical Superposition** — `subskill.quantumComputing.practicalSuperposition` · capstone · depth 4 · 18 SP including prerequisites.

All six subject completion flags enable b_Pocket=2,b_Server=1. Native Quantum Computing log2(Rudimentary) formula unchanged; extra output is outside native research-accrual donors.

- Systems: Education, Pocket Dimensions, Servers. Limit: +200% Pocket; +100% Servers.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="clusternetworking"></a>
### Cluster Networking

Base ID: `clusterNetworking` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **5 choices · entire menu 11 SP.**

**Branch design:** The cluster can specialize in paid-research consensus, real cities, a retained city seed or influence from broad facility coverage.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Consensus Protocol | 1 | 1 | Fractured parent | Each facility type with a purchased research level adds 5% Bot production. Bonuses are additive. | The cluster has unanimously voted for more bots. |
| Remote Offices | 1 | 1 | Fractured parent | Cities in Simulations produce 50% more Workers. Bonuses are additive. | The commute crosses three galaxies and one loading screen. |
| Voting Quorum | 2 | 3 | Consensus Protocol | Owning every facility type adds 100% Influence generation. Bonuses are additive. | All nodes have voted for more nodes. |
| Failover City | 3 | 4 | Remote Offices | Keep one City through a Black Hole. | The backup server is an entire municipality. |
| Federated Cluster | 4 | 11 | Voting Quorum, Failover City | Owning every facility type adds 150% Server output and 50% City output. Bonuses are additive. | The cluster has incorporated as a small federation. |

**After Discovery**

- **Consensus Protocol:** Each Discovery tier you have naturally completed adds 5% Bot production. Bonuses are additive.

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Consensus Protocol** — `subskill.clusterNetworking.consensusProtocol` · entry · depth 1 · 1 SP including prerequisites.

b_Bots=.05*count(facilityResearchPaidLevels>0), maximum8. After Discovery use .05 per unlocked natural-completed tier, maximum3; distinct state, not completion count.

- Systems: Research coverage, Bots. Limit: +40% Bots; +15% after Discovery.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Remote Offices** — `subskill.clusterNetworking.remoteOffices` · entry · depth 1 · 1 SP including prerequisites.

b_CityWorkerOutput=.5; changes native output only, not Cities count, education or generated Worker copies.

- Systems: Cities, Simulation Workers. Limit: +50% native Worker output.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Voting Quorum** — `subskill.clusterNetworking.votingQuorum` · specialization · depth 2 · 3 SP including prerequisites.

All eight real total stocks>0 enable b_Influence=1. Source labels do not make one unit count as multiple facility types.

- Systems: Facility diversity, Influence. Limit: +100% Influence.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Failover City** — `subskill.clusterNetworking.failoverCity` · specialization · depth 2 · 4 SP including prerequisites.

Retain min(1,endingActualCityStock) at positive-reward Black Hole, by max with other City retentions. Education/unlocks retain/reset natively; retained City cannot bypass unmet production prerequisites.

- Systems: Simulation Cities, Black Holes. Limit: one retained City.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Dream.
- Interaction: retention.

**Federated Cluster** — `subskill.clusterNetworking.federatedCluster` · capstone · depth 3 · 11 SP including prerequisites.

All eight actual total facility stocks>0 enable b_Server=1.5,b_City=.5. No Convergence rate boost or new facility-count reward event.

- Systems: Facility diversity, Servers, Cities. Limit: +150% Servers; +50% Cities.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="hypercubenetworks"></a>
### Hypercube Networks

Base ID: `hypercubeNetworks` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **4 choices · entire menu 9 SP.**

**Branch design:** A compact lattice branch focuses on research purchasing and the connection between settled Simulation communities and Data Center output.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Extra Address Space | 1 | 1 | Fractured parent | Each facility type with 100 paid purchases adds 10% Data Center production. Bonuses are additive. | We have run out of corners to label. |
| Mesh Society | 2 | 2 | Fractured parent | Communities and Cities in Simulations produce 25% more output while you own a Data Center. Bonuses are additive. | The social network now has a physical topology. |
| Spatial Index | 2 | 3 | Extra Address Space | Data Center and Planet research prices are 20% lower. | The address has four dimensions and no postcode. |
| Lattice Society | 4 | 9 | Mesh Society, Spatial Index | Completed Communities and Cities add 150% Data Center output while all subjects are complete. Bonuses are additive. | Civilization has discovered an extra street direction. |

**After Discovery**

- **Spatial Index:** Data Center and Planet Cash prices are 20% lower.

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Extra Address Space** — `subskill.hypercubeNetworks.extraAddressSpace` · entry · depth 1 · 1 SP including prerequisites.

b_DataCenters=.1*count(types truePaid>=100), max8; no virtual Terra/Pooled counts.

- Systems: Purchases, Data Centers. Limit: +80% Data Centers.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Mesh Society** — `subskill.hypercubeNetworks.meshSociety` · entry · depth 1 · 2 SP including prerequisites.

At DataCenters>=1 add.25 to native Community and City outputs; all native thresholds remain.

- Systems: Data Centers, Simulation settlements. Limit: +25% to two settlement outputs.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Spatial Index** — `subskill.hypercubeNetworks.spatialIndex` · specialization · depth 2 · 3 SP including prerequisites.

Before Discovery: Apply .20 amount reduction only to those two facility-research native quotes; shared .50 price cap and exact paid levels preserved.
After Discovery: Apply .20 amount reduction to two native facility Cash quotes, combined price ceiling.50. No research or TP purchase quote modified.

- Systems: Facility research prices. Limit: 20% discount to two research types.
- Discovery limit: 20% two facility Cash discounts.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: price discount.

**Lattice Society** — `subskill.hypercubeNetworks.latticeSociety` · capstone · depth 3 · 9 SP including prerequisites.

Require positive native Community and City stocks plus all six completed subjects; b_DC=1.5. Do not compare stocks with education quantities or invent new residents.

- Systems: Simulation settlement, Education, Data Centers. Limit: +150% DC output.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="agressivealgorithms"></a>
### Aggressive Algorithms

Base ID: `agressiveAlgorithms` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **5 choices · entire menu 11 SP.**

**Branch design:** Fast acquisition, live Tinker and a patient settlement branch offer distinct ways to use an aggressive parent after its Fracture penalties vanish.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Hostile Takeover | 2 | 2 | Fractured parent | Your first paid Data Center grants 1 minute of its Server output. | The acquisition includes the office kettle. |
| Priority Interrupt | 1 | 1 | Fractured parent | Tinker adds 30% Assembly Line, AI Manager and Server production for 5 seconds. Bonuses are additive. | This process has decided it is everyone’s priority. |
| Fast Track | 2 | 4 | Hostile Takeover | Your first 50 paid Servers each Infinity cost 25% less Cash. | The application has been approved by force. |
| Collateral Cleanup | 2 | 3 | Priority Interrupt | While Tinker is running, physical panel decay adds up to 100% Cash production. Bonuses are additive. | We have outsourced the collateral damage. |
| Peaceful Settlement | 4 | 11 | Fast Track, Collateral Cleanup | After 30 minutes without Infinity, Planets and megastructures gain 150% output. Bonuses are additive. | The merger was eventually described as peaceful. |

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Hostile Takeover** — `subskill.agressiveAlgorithms.hostileTakeover` · entry · depth 1 · 2 SP including prerequisites.

Once per Infinity after the first true paid Data Center, grant60*nativeDataCenterServerRate, captured after the purchase. Generated Servers never change paid counts or trigger purchases.

- Systems: Data Center purchases, Servers. Limit: 60 native Data Center seconds per Infinity.
- Source: current state. New ledger reset: Infinity.
- Interaction: one-shot downstream grants.

**Priority Interrupt** — `subskill.agressiveAlgorithms.priorityInterrupt` · entry · depth 1 · 1 SP including prerequisites.

One refreshable5 game-second window, bonus.30 to three lower native links; no stack from repeated activation, no offline trigger.

- Systems: Tinker, Lower facility chain. Limit: +30% to three links for 5 seconds.
- Source: current state. New ledger reset: Infinity.
- Interaction: finite event window.

**Fast Track** — `subskill.agressiveAlgorithms.fastTrack` · specialization · depth 2 · 4 SP including prerequisites.

Discount eligible per-unit paid quotes for first 50 true Server purchases; durable run flags, final amount reduction .25, .50 shared cap. No alteration of price exponent.

- Systems: Server prices. Limit: 50 purchases at 25% discount per Infinity.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: first-purchase discount.

**Collateral Cleanup** — `subskill.agressiveAlgorithms.collateralCleanup` · specialization · depth 2 · 3 SP including prerequisites.

Native running Tinker enables b_Cash=min(1,.05*log10(1+physicalDecayPerSecond)); credited decay and newly granted packets excluded.

- Systems: Tinker, Physical decay, Cash. Limit: +100% Cash.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Peaceful Settlement** — `subskill.agressiveAlgorithms.peacefulSettlement` · capstone · depth 3 · 11 SP including prerequisites.

Native Infinity age>=1800 enables b_Planet=b_Mega=1.5. No cost/refund bypass or fixed replication-rate change.

- Systems: Infinity age, Planets, Megastructures. Limit: +150% ordinary Planet/mega output.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="rudimentarysingularity"></a>
### Rudimentary Singularity

Base ID: `rudimentarySingularity` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **7 choices · entire menu 15 SP.**

**Branch design:** The seven-choice Singularity tree uses the existing nonlinear donor without changing its exponent: radiation, loans, reward grants, SRS facility strength and a guarded research capstone.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Event Horizon | 2 | 2 | Fractured parent | Every 20 tenfold increases in Singularity output adds 50% Server production, up to 200%. Bonuses are additive. | The event is private. The horizon is not. |
| Hawking Tuition | 2 | 2 | Fractured parent | Black Holes grant 15% more Strange Matter while Rudimentary Singularity is producing. Bonuses are additive. | The universe has paid your course fees in evaporation. |
| Radiation Pressure | 1 | 3 | Event Horizon | Singularity’s raw bonus adds up to 100% Solar output. Bonuses are additive. | The singularity has developed a sunny disposition. |
| Schwarzschild Loan | 1 | 4 | Radiation Pressure | While Singularity is producing, your first Data Center each minute costs 30% less Cash. | The loan agreement has an event horizon. |
| Information Paradox | 2 | 4 | Hawking Tuition | A rewarded Black Hole grants 30 seconds of Data Center output, once every 10 minutes. | The information was returned in an inconvenient format. |
| Horizon Extension | 2 | 6 | Schwarzschild Loan | While Singularity is producing, SRS’s facility bonus is 25% stronger. Bonuses are additive. | The horizon has been moved for your convenience. |
| Singularity Observatory | 5 | 15 | Schwarzschild Loan, Information Paradox, Horizon Extension | Fully educated Simulations add 150% Singularity strength and 100% Data Center output. Bonuses are additive. | The observatory has become its own subject of study. |

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Event Horizon** — `subskill.rudimentarySingularity.eventHorizon` · entry · depth 1 · 2 SP including prerequisites.

b_ServerOutput=min(2,.025*log10(1+rawRudimentaryPerDataCenterBonus)); never alter its exponent or feed augmented Server output into the same interval.

- Systems: Singularity, Servers. Limit: +200% native Server output.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded feedback input.

**Hawking Tuition** — `subskill.rudimentarySingularity.hawkingTuition` · entry · depth 1 · 2 SP including prerequisites.

Add .15*actual native Black Hole reward if rawRudimentaryPerDataCenterBonus>0; no reward-on-reward triggers and no instant collapse.

- Systems: Singularity, Black Hole, Strange Matter. Limit: +15% native Black Hole reward.
- Source: current state. New ledger reset: Infinity.
- Interaction: base reward only.

**Radiation Pressure** — `subskill.rudimentarySingularity.radiationPressure` · specialization · depth 2 · 3 SP including prerequisites.

b_Solar=min(1,.10*log10(1+rawNativeRudimentaryBonus)). Donor excludes new multiplier channels and total owned Data Centers.

- Systems: Raw Singularity bonus, Solar Energy. Limit: +100% Solar.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Schwarzschild Loan** — `subskill.rudimentarySingularity.schwarzschildLoan` · specialization · depth 3 · 4 SP including prerequisites.

Require native rawRudimentary>0. One initially empty purchase coupon token per 60 game seconds, discount .30 applied to one genuine unit, not buy-max batch; .50 total cap.

- Systems: Singularity readiness, Data Center prices. Limit: one 30% DC coupon per game minute.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: paced coupon.

**Information Paradox** — `subskill.rudimentarySingularity.informationParadox` · specialization · depth 2 · 4 SP including prerequisites.

Positive native Strange Matter reward and rawRudimentary>0; initially empty 600-game-second cooldown. Grant 30 native DC seconds once, never another Black Hole action.

- Systems: Black Holes, Data Centers. Limit: 30 DC seconds per 10 game minutes.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Quantum.
- Interaction: production grant.

**Horizon Extension** — `subskill.rudimentarySingularity.horizonExtension` · specialization · depth 4 · 6 SP including prerequisites.

If rawNativeRudimentary>0, add .25 to the shared new SRS facility-strength enhancement, cap1 across all new sources. For each existing native SRS facility target use1+(nativeSrsMultiplier-1)*(1+newEnhancement). Do not affect charge, the native Cash/Bot SRS terms, or Convergence.

- Systems: Singularity readiness, SRS basic facility bonus. Limit: +25% SRS facility bonus; shared+100% cap.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus-above-one enhancement.

**Singularity Observatory** — `subskill.rudimentarySingularity.singularityObservatory` · capstone · depth 5 · 15 SP including prerequisites.

All six native subject flags enable b_Rudimentary=1.5,b_DC=1. R(X) functional form and native donor X remain unchanged. New source packets do not enter research-accrual donor quotes.

- Systems: Education, Singularity, Data Centers. Limit: +150% Rudimentary strength; +100% DC output.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="unsuspiciousalgorithms"></a>
### Unsuspicious Algorithms

Base ID: `unsuspiciousAlgorithms` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **4 choices · entire menu 8 SP.**

**Branch design:** Four quiet-operation choices deepen idle Servers into SRS/Pocket support or a genuinely earned return bonus.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Quiet Hours | 1 | 1 | Fractured parent | After 5 minutes without changing Skills, Science production is 50% higher. Bonuses are additive. | Nothing unusual has happened for an unusually long time. |
| Routine Update | 2 | 2 | Fractured parent | Simulation Bots produce 50% more Rockets while Servers are producing AI Managers. Bonuses are additive. | A perfectly ordinary update. Please ignore the rockets. |
| Background Checks | 2 | 3 | Quiet Hours | After 5 minutes without Tinkering, SRS charges 15% faster and Pocket output rises 50%. Bonuses are additive. | Nothing unusual has happened in the last five minutes. |
| Unattended Operators | 3 | 5 | Routine Update | Returning after 2 hours away adds 100% Rocket output for 10 minutes. Bonuses are additive. | The maintenance crew was never officially here. |

**After Discovery**

- **Quiet Hours:** After 5 minutes without changing Skills, Discovery is 15% faster. Bonuses are additive.

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Quiet Hours** — `subskill.unsuspiciousAlgorithms.quietHours` · entry · depth 1 · 1 SP including prerequisites.

b_Science=.5 after300 stable assigned seconds; post-Discovery b_Speed=.15. Any assignment/refund/preset mutation restarts the clock, not route navigation.

- Systems: Skill stability, Science. Limit: +50% Science; +15% Discovery speed.
- Source: current state. New ledger reset: Infinity.
- Interaction: assigned-time condition.

**Routine Update** — `subskill.unsuspiciousAlgorithms.routineUpdate` · entry · depth 1 · 2 SP including prerequisites.

b_SimulationBotRocketOutput=.5 when nativeServerRate>0; affects native Rocket output only, never Swarm Bots.

- Systems: Servers, Simulation Bots, Rockets. Limit: +50% native Rocket output.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Background Checks** — `subskill.unsuspiciousAlgorithms.backgroundChecks` · specialization · depth 2 · 3 SP including prerequisites.

Time since genuine Tinker completion>=300 gives b_SrsCharging=.15 and b_Pocket=.5. Shared SRS speed cap; repeated unassignments do not clear the event timestamp.

- Systems: Waiting, SRS, Pocket Dimensions. Limit: +15% SRS speed; +50% Pocket.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Unattended Operators** — `subskill.unsuspiciousAlgorithms.unattendedOperators` · specialization · depth 2 · 5 SP including prerequisites.

Genuine real absence>=7200 prepares one 600-game-second b_SimulationRocketOutput=1 window. No production during absence in addition to Stored Time bank; return cannot stack windows.

- Systems: Stored Time, Simulation Bots, Rockets. Limit: +100% Rockets for 10 minutes.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Quantum.
- Interaction: absence window.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>


## Worlds

<a id="scientificplanets"></a>
### Scientific Planets

Base ID: `scientificPlanets` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **6 choices · entire menu 17 SP.**

**Branch design:** The generator gains field infrastructure, protected output, launch schools and source-specific research; the capstone develops settled worlds without feeding new research back into its donor.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Field Stations | 3 | 3 | Fractured parent | Scientific Planets also supplies 20% of its output as generated Data Centers. Bonuses are additive. | The field is an entire planet. |
| Protected Worlds | 2 | 2 | Fractured parent | After 5 minutes without buying Planets, Scientific Planets produces 100% more. Bonuses are additive. | Please leave the survey flags where you found them. |
| Planetary Laboratories | 2 | 5 | Field Stations | Each completed subject adds 10% Scientific Planets output. Bonuses are additive. | The experiment now has an atmosphere. |
| Observatory Permit | 2 | 4 | Protected Worlds | While Scientists hold at least half your Bots, Planet research prices are 25% lower. | The planning office has approved another telescope. |
| Launch Schools | 3 | 8 | Planetary Laboratories | Every 25 paid Planets grants 20 seconds of Shipping progress, up to 60 seconds per Simulation. | The geography lesson includes orbital insertion. |
| Living Observatory | 5 | 17 | Launch Schools, Observatory Permit | Fully educated Simulations add 200% Scientific Planets output and 100% Solar output. Bonuses are additive. | The entire planet is watching the results. |

**After Discovery**

- **Observatory Permit:** During the first half of Discovery, Planet Cash prices are 25% lower.

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Field Stations** — `subskill.scientificPlanets.fieldStations` · entry · depth 1 · 3 SP including prerequisites.

Add .20*nativeScientificPlanetRate as generated Data Centers. Do not copy Cross Talk, other grants or research accrual.

- Systems: Scientific Planets, Data Centers. Limit: 20% of native Scientific Planets output.
- Source: current state. New ledger reset: Infinity.
- Interaction: downstream-only source copy.

**Protected Worlds** — `subskill.scientificPlanets.protectedWorlds` · entry · depth 1 · 2 SP including prerequisites.

b_ScientificPlanets=1 after300 assigned game seconds without a paid Planet purchase; purchase resets clock. Extra output cannot create extra Shoulders research.

- Systems: Planet purchasing, Scientific Planets. Limit: +100% native Scientific Planets output.
- Source: current state. New ledger reset: Infinity.
- Interaction: source-specific bonus.

**Planetary Laboratories** — `subskill.scientificPlanets.planetaryLaboratories` · specialization · depth 2 · 5 SP including prerequisites.

b_Scientific=.10*completedNativeSubjects, max.60. Extra Planet output remains excluded from Shoulders’ research donor.

- Systems: Education, Scientific Planets. Limit: +60% Scientific Planets.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Observatory Permit** — `subskill.scientificPlanets.observatoryPermit` · specialization · depth 2 · 4 SP including prerequisites.

Before Discovery: scientistFraction>=.5 enables .25 native Planet research quote reduction, shares .50 cap; no new research purchase event from generated levels.
After Discovery: Native unfinished fraction<.5 enables .25 native Planet Cash quote reduction; .50 cap. Replaces retired Scientist/research predicate.

- Systems: Scientists, Planet research prices. Limit: 25% Planet-research discount.
- Discovery limit: 25% Planet Cash discount.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: price discount.

**Launch Schools** — `subskill.scientificPlanets.launchSchools` · specialization · depth 3 · 8 SP including prerequisites.

True Planet purchase thresholds grant 20 base Shipping seconds as raw native progress without new speed multiplier, lifetime60 per Dream. Shipping-completion packets cannot recursively trigger this purchase reward.

- Systems: Planet purchases, Education. Limit: 60 base Shipping seconds per Simulation.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Dream.
- Interaction: finite raw-progress grant.

**Living Observatory** — `subskill.scientificPlanets.livingObservatory` · capstone · depth 4 · 17 SP including prerequisites.

All six subject flags enable b_Scientific=2,b_Solar=1. Preserve raw native Scientific Planet donor for all research accrual; no multiplication of a copied source.

- Systems: Education, Scientific Planets, Solar. Limit: +200% Scientific Planets; +100% Solar.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="hubbletelescope"></a>
### Hubble Telescope

Base ID: `hubbleTelescope` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **4 choices · entire menu 7 SP.**

**Branch design:** Four observation choices connect exposure, active source diversity, a limited SRS observation reward and patient astronomy.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Long Exposure | 1 | 1 | Fractured parent | Adds 15% SRS charging speed while Panel Lifetime is at least 5 minutes. Bonuses are additive. | The telescope has been told not to blink. |
| Deep Field | 1 | 1 | Fractured parent | Each active Planet source adds 10% Science, up to 40%. Bonuses are additive. | The empty patch of sky was not empty. |
| Observation Grant | 2 | 3 | Long Exposure | After 30 minutes with SRS assigned, gain 30 seconds of Scientific Planets output once per Infinity. | The image has been approved for planetary funding. |
| Faint Signals | 3 | 4 | Deep Field | After 30 minutes without Infinity, Scientific Planets output and Science production rise 100%. Bonuses are additive. | Some things become clearer after a very long stare. |

**After Discovery**

- **Deep Field:** Each active Planet source adds 5% Discovery speed, up to 20%. Bonuses are additive.
- **Faint Signals:** After 30 minutes without Infinity, Scientific Planets output rises 100% and tree speed rises 25%. Bonuses are additive.

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Long Exposure** — `subskill.hubbleTelescope.longExposure` · entry · depth 1 · 1 SP including prerequisites.

Add.15 earned SRS charge seconds per game second if Lifetime>=300 and SRS owned; ordinary elapsed charge only, no multiplication of Hot Start or banked charge.

- Systems: Lifetime, SRS. Limit: +15% native SRS charging.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Deep Field** — `subskill.hubbleTelescope.deepField` · entry · depth 1 · 1 SP including prerequisites.

Count positive native Scientific Planets, Planet Assembly, Shell Worlds and Terraforming Protocols sources; .10 Science each. Discovery uses .05 speed each. No generated grants count as sources.

- Systems: Planet sources, Science. Limit: +40% Science; +20% Discovery speed.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Observation Grant** — `subskill.hubbleTelescope.observationGrant` · specialization · depth 2 · 3 SP including prerequisites.

Accumulate chronological owned-SRS game time. Its first1800-second crossing per Infinity credits30 seconds of the actual native Scientific Planet generator, excluding new grants and Shoulders research events. Hot Start, Afterglow and faster charging do not advance this clock. No output if the functional generator is inactive.

- Systems: SRS, Scientific Planets. Limit: 30 Scientific Planet seconds per Infinity.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: finite production grant.

**Faint Signals** — `subskill.hubbleTelescope.faintSignals` · specialization · depth 2 · 4 SP including prerequisites.

Native Infinity age>=1800 enables b_Scientific=b_Science=1. Discovery replaces Science with .25 shared tier-weighted speed, leaving source output unchanged.

- Systems: Infinity age, Scientific Planets, Science, Discovery. Limit: +100% source/Science; later +25% tree speed.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="jameswebbtelescope"></a>
### James Webb Telescope

Base ID: `jamesWebbTelescope` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **5 choices · entire menu 12 SP.**

**Branch design:** Infrared decay and first megastructure light lead to retained exposure or factory support, with a physical-source capstone.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Infrared Survey | 2 | 2 | Fractured parent | Each tenfold increase in physical panel decay per second adds 5% Scientific Planets output, up to 200%. Bonuses are additive. | The galaxy looks much warmer through this thing. |
| First Light | 2 | 2 | Fractured parent | Your first paid megastructure of each type adds 100% output to that type for 5 minutes. Bonuses are additive. | The first photograph exceeded the attachment limit. |
| Webb Archive | 2 | 4 | First Light | Keep one-quarter of SRS charge through Infinity, up to 2 minutes. | The image has been saved beyond the visible spectrum. |
| Thermal Map | 2 | 4 | Infrared Survey | Each 30 tenfold increases in physical panel decay adds 25% Factory output, up to 100%. Bonuses are additive. | The heat map has developed a manufacturing district. |
| Infrared Industry | 4 | 12 | Webb Archive, Thermal Map | Fully educated Simulations add 150% Scientific Planets output and 100% Space Factory output. Bonuses are additive. | The hidden light is doing visible work. |

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Infrared Survey** — `subskill.jamesWebbTelescope.infraredSurvey` · entry · depth 1 · 2 SP including prerequisites.

b_ScientificPlanets=min(2,.05*log10(1+nativePhysicalDecayRate)); excludes Supermassive credited decay and cannot increase Shoulders accrual.

- Systems: Decay, Scientific Planets. Limit: +200% native Scientific Planets output.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**First Light** — `subskill.jamesWebbTelescope.firstLight` · entry · depth 1 · 2 SP including prerequisites.

Three one-shot flags per Infinity, one per true paid Matrioshka/Birch/Galactic purchase. Each grants +1 native output for300 game seconds. Duplication excluded.

- Systems: Megastructure purchases, Production. Limit: Three 300-second +100% windows.
- Source: current state. New ledger reset: Infinity.
- Interaction: one-shot paid-event ledger.

**Webb Archive** — `subskill.jamesWebbTelescope.webbArchive` · specialization · depth 2 · 4 SP including prerequisites.

Retain min(120,.25*endingSrsCharge), maximum with other SRS carry and Hot Start restoration. Never add historical SRS charging activity or current paid boost state. Existing SRS charge is uncapped; restore by maximum against the complete native reset result, without inventing a capacity or stacking the same residual. Retained charge is not newly earned Stellar Memory charge.

- Systems: SRS, Infinity. Limit: 120 charge seconds.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Quantum.
- Interaction: retention.

**Thermal Map** — `subskill.jamesWebbTelescope.thermalMap` · specialization · depth 2 · 4 SP including prerequisites.

b_Factory=min(1,.25*floor(log10(1+nativePhysicalDysonPanelsDecayed)/30)); exclude Supermassive Panels’s extra credited decay and new reward packets.

- Systems: Physical decay, Simulation Factories. Limit: +100% Factory output.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Infrared Industry** — `subskill.jamesWebbTelescope.infraredIndustry` · capstone · depth 3 · 12 SP including prerequisites.

All six native subject flags enable b_Scientific=1.5,b_SpaceFactory=1. Native production debits and Scientific Planet research-donor isolation remain intact.

- Systems: Education, Scientific Planets, Space Factories. Limit: +150% Scientific Planets; +100% Space Factories.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="planetassembly"></a>
### Planet Assembly

Base ID: `planetAssembly` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **4 choices · entire menu 9 SP.**

**Branch design:** Assembly-built worlds have four concrete choices: housing, source-based pricing, a finite starter shipment and a worker-oriented production capstone.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Prefab Towns | 2 | 2 | Fractured parent | Every 30 tenfold increases in Assembly Lines adds 50% Simulation Housing output, up to 100%. Bonuses are additive. | Some assembly required. A great deal, actually. |
| Assembly Permit | 2 | 2 | Fractured parent | Planet Assembly production reduces Planet Cash prices by up to 20%. | The paperwork has finally achieved escape velocity. |
| Planet Kit | 1 | 1 | Fractured parent | Each of your first 10 paid Assembly Lines includes one generated Planet. | Some assembly required. Atmosphere included. |
| World Production Line | 4 | 8 | Prefab Towns, Assembly Permit | With at least 75% Workers, Planet Assembly produces 200% more and Bots gain 100% production. Bonuses are additive. | The factory has added a world-sized conveyor. |

**After Discovery**

- **World Production Line:** Planet Assembly produces 200% more and Bots gain 100% production. Bonuses are additive.

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Prefab Towns** — `subskill.planetAssembly.prefabTowns` · entry · depth 1 · 2 SP including prerequisites.

b_Housing=min(1,log10(1+Lines)/60); boosts Housing making Workers only.

- Systems: Assembly Lines, Simulation Housing. Limit: +100% Housing output.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Assembly Permit** — `subskill.planetAssembly.assemblyPermit` · entry · depth 1 · 2 SP including prerequisites.

d_Planet=min(.20,.02*log10(1+nativePlanetAssemblyRate)); add within shared50% discount cap. No alteration to Terra pricing exponents.

- Systems: Planet Assembly, Planet prices. Limit: 20% Planet price reduction.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Planet Kit** — `subskill.planetAssembly.planetKit` · entry · depth 1 · 1 SP including prerequisites.

Ten true paid-Line source flags per Infinity each credit one generated Planet only when native Planets are unlocked. Never count the grant as paid or Terra/Pooled virtual purchases.

- Systems: Assembly Line purchases, Planets. Limit: 10 generated Planets per Infinity.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: finite paid-source grant.

**World Production Line** — `subskill.planetAssembly.worldProductionLine` · capstone · depth 2 · 8 SP including prerequisites.

Before Discovery: workerFraction>=.75 enables b_PlanetAssembly=2,b_Bots=1. Raw generator log10(AssemblyLines) remains unchanged and extra source output is not a research donor.
After Discovery: All IDS Bots are Workers after Discovery. b_PlanetAssembly=2,b_Bots=1; raw generator unchanged.

- Systems: Workers, Planet Assembly, Bots. Limit: +200% Planet Assembly; +100% Bots.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="shellworlds"></a>
### Shell Worlds

Base ID: `shellWorlds` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **4 choices · entire menu 11 SP.**

**Branch design:** Nested worlds support habitation, a retained paid seed, an explicitly raw upward generator and a modest retained megastructure capstone.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Nested Habitats | 2 | 2 | Fractured parent | Each tenfold increase in Planets adds 2% Simulation City output, up to 200%. Bonuses are additive. | The basement has its own moon. |
| Reserve Shell | 3 | 3 | Fractured parent | Keep your first paid Planet through Infinity. | Please do not throw away the packaging. |
| Moon Nursery | 2 | 4 | Nested Habitats | Shell Worlds’ raw bonus also creates 2% as many Matrioshka Brains. | The small moon has begun thinking for itself. |
| Deep Shell | 4 | 11 | Reserve Shell, Moon Nursery | Keep one purchased Matrioshka Brain through Infinity. | The shell contains a smaller heat death. |

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Nested Habitats** — `subskill.shellWorlds.nestedHabitats` · entry · depth 1 · 2 SP including prerequisites.

b_City=min(2,.02*log10(1+totalPlanets)); affects native Worker and Factory yields from Cities.

- Systems: Planets, Simulation Cities. Limit: +200% native City output.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Reserve Shell** — `subskill.shellWorlds.reserveShell` · entry · depth 1 · 3 SP including prerequisites.

Retain at most one actually owned paid Planet only when native retention would keep zero. Use max(nativeRetained,1), never add1 to an existing reserve; price index remains retained paid count.

- Systems: Paid Planets, Infinity. Limit: One paid Planet retained.
- Source: current state. New ledger reset: Quantum.
- Interaction: paid retention without duplication.

**Moon Nursery** — `subskill.shellWorlds.moonNursery` · specialization · depth 2 · 4 SP including prerequisites.

New source .02*rawNativeShellWorldBonus before all new bonuses, not aggregate Planet output. Only while native Matrioshka unlock is active. Generated Brain units cannot count as purchases; no Galactic replication or Tinker-cap donor. Native Shell Worlds still requires actual Planet Assembly ownership; Fracturing Shell Worlds does not invent that functional donor.

- Systems: Raw Shell Worlds, Matrioshka Brains. Limit: 2% raw log2(Planet) source.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: raw generator bridge.

**Deep Shell** — `subskill.shellWorlds.deepShell` · capstone · depth 3 · 11 SP including prerequisites.

Retain min(1,endingActualPaidMatrioshkaCount). Preserve retained-purchase identity once under canonical reset; never emit a fresh purchase or reduce the native next-price index twice. Quantum clears.

- Systems: Megastructures, Infinity. Limit: one retained paid Matrioshka Brain.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Quantum.
- Interaction: retention.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="galacticpradigmshift"></a>
### Galactic Paradigm Shift

Base ID: `galacticPradigmShift` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **4 choices · entire menu 10 SP.**

**Branch design:** The four-choice galaxy branch stays focused on the parent’s before/after transition, then lets the player choose reserves or a broad settled-galaxy specialization.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| New Neighbours | 2 | 2 | Fractured parent | Before engulfing a Galaxy, Planets gain 100% output. Afterwards, megastructures gain 50%. Bonuses are additive. | The neighbourhood association covers more ground than expected. |
| Galactic Census | 2 | 2 | Fractured parent | The first Galaxy engulfed this Infinity advances all unfinished Simulation subjects by 2 minutes. | There are more residents than boxes on the form. |
| Local Group | 2 | 4 | Galactic Census | After engulfing a Galaxy, Space Factory Rocket prices are 20% lower. | The neighbours have formed a local launch group. |
| Universal Neighbourhood | 4 | 10 | New Neighbours, Local Group | After engulfing a Galaxy, all basic facilities gain 100% output. Bonuses are additive. | The neighbourhood association now spans a universe. |

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**New Neighbours** — `subskill.galacticPradigmShift.newNeighbours` · entry · depth 1 · 2 SP including prerequisites.

Before native physical Galaxy threshold: b_Planet=1. Afterwards b_Matrioshka=b_Birch=b_Galactic=.5. No Stellar virtual-Galaxy count and no duplication bonus.

- Systems: Galaxies, Facility chain. Limit: +100% Planets or +50% megastructures.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Galactic Census** — `subskill.galacticPradigmShift.galacticCensus` · entry · depth 1 · 2 SP including prerequisites.

One physical upward threshold crossing while assigned; grant120 raw subject-progress units, not120 multiplied seconds. No reassignment awards.

- Systems: Galaxies, Education. Limit: 120 base progress per subject per Infinity.
- Source: current state. New ledger reset: Infinity.
- Interaction: one-shot progress grant.

**Local Group** — `subskill.galacticPradigmShift.localGroup` · specialization · depth 2 · 4 SP including prerequisites.

nativeEngulfedGalaxies>=1 enables .20 Rocket-input amount discount, .50 shared ceiling. Native Factory input/debits unchanged.

- Systems: Galaxies, Space Factory inputs. Limit: 20% Rocket-input discount.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: input discount.

**Universal Neighbourhood** — `subskill.galacticPradigmShift.universalNeighbourhood` · capstone · depth 3 · 10 SP including prerequisites.

nativeGalaxyCount>=1 enables b_Basic=1; Planets are already a basic facility and receive exactly one coefficient, not a second duplicate. Fixed replication unchanged.

- Systems: Galaxies, Basic facilities. Limit: +100% all five basic outputs.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="higgsboson"></a>
### Higgs Boson

Base ID: `higgsBoson` · Ordinary base cost: 2 SP; Fractured base: 0 SP. **5 choices · entire menu 11 SP.**

**Branch design:** Mass transit and evidence branches extend into real Influence funding, lifetime support and a galaxy-conditioned research specialization.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Mass Transit | 2 | 2 | Fractured parent | For every 10 tenfold increases in Galaxies engulfed, Space Factories consume 5% fewer Factories, up to 25%. | Please mind the gap between dimensions. |
| Weight of Evidence | 1 | 1 | Fractured parent | Each tenfold increase in Galaxies engulfed adds 5% Science, up to 100%. Bonuses are additive. | The evidence is becoming difficult to lift. |
| Mass Funding | 2 | 4 | Mass Transit | Each tenfold increase in Galaxies engulfed adds 2% Influence generation, up to 100%. Bonuses are additive. | The budget has acquired a measurable mass. |
| Stable Matter | 2 | 3 | Weight of Evidence | Each tenfold increase in Galaxies engulfed adds 2% Panel Lifetime, up to 100%. Bonuses are additive. | The particles have agreed to remain employed. |
| Unified Fieldwork | 4 | 11 | Mass Funding, Stable Matter | After engulfing a Galaxy, facility research is 100% stronger and education is 50% faster. Bonuses are additive. | The field has finally met its funding body. |

**After Discovery**

- **Weight of Evidence:** Each tenfold increase in Galaxies engulfed adds 1% Discovery speed, up to 20%. Bonuses are additive.
- **Unified Fieldwork:** After engulfing a Galaxy, Discovery strength rises 30% and education is 50% faster. Bonuses are additive.

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Mass Transit** — `subskill.higgsBoson.massTransit` · entry · depth 1 · 2 SP including prerequisites.

Actually reduce Factory input per Space Factory by d=min(.25,.005*log10(1+physicalGalaxies)), with fractional carry and represented debits. Rockets still pay their full native cost.

- Systems: Galaxies, Space Factory conversion. Limit: 25% Factory-input saving.
- Source: current state. New ledger reset: Infinity.
- Interaction: conservative fractional conversion.

**Weight of Evidence** — `subskill.higgsBoson.weightofEvidence` · entry · depth 1 · 1 SP including prerequisites.

b_Science=min(1,.05*log10(1+physicalGalaxies)); b_Discovery=min(.20,.01*log10(1+physicalGalaxies)).

- Systems: Galaxies, Science, Discovery. Limit: +100% Science; +20% Discovery speed.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Mass Funding** — `subskill.higgsBoson.massFunding` · specialization · depth 2 · 4 SP including prerequisites.

b_Influence=min(1,.02*log10(1+nativeGalaxyCount)). Actual galaxy coverage source, excluding new grant packets.

- Systems: Galaxies, Influence. Limit: +100% Influence.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Stable Matter** — `subskill.higgsBoson.stableMatter` · specialization · depth 2 · 3 SP including prerequisites.

b_Lifetime=min(1,.02*log10(1+nativeGalaxyCount)); additive new Lifetime channel, no exponent changes to Council or Warranty.

- Systems: Galaxies, Panel Lifetime. Limit: +100% Lifetime.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Unified Fieldwork** — `subskill.higgsBoson.unifiedFieldwork` · capstone · depth 3 · 11 SP including prerequisites.

nativeGalaxyCount>=1 enables b_FacilityResearch=1,b_Education=.5. Discovery replaces facility-research term with final .30 tier-weighted strength enhancement; education remains .5.

- Systems: Galaxies, Research strength, Education, Discovery. Limit: +100% research; +50% education; later +30% strength.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>


## Knowledge

<a id="shouldersofgiants"></a>
### Shoulders of Giants

Base ID: `shouldersOfGiants` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **6 choices · entire menu 15 SP.**

**Branch design:** A six-choice knowledge branch separates purchased research, generated knowledge, teaching, retained research and a joint scientific-source capstone.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Giant Steps | 1 | 1 | Fractured parent | Every 100 purchased Science Boosts grants 10 seconds of Planet output, up to 20 seconds per minute. | The footprints have become zoning districts. |
| Reading Room | 2 | 2 | Fractured parent | Generated Science Boosts add 1% Simulation education speed per tenfold increase, up to 50%. Bonuses are additive. | Quiet, please. The giant is studying. |
| Footnotes | 2 | 4 | Reading Room | Generated Science Boosts add up to 20% SRS charging speed. Bonuses are additive. | The footnote now requires a separate civilization. |
| Teaching Giants | 2 | 3 | Giant Steps | Completing a subject grants 20 seconds of Science production, once per subject each Simulation. | The guest lecturer is an extinct civilization. |
| Research Inheritance | 3 | 6 | Teaching Giants | Keep up to 25 generated Science Boosts through Infinity. | The ancestors remembered to leave their notes. |
| Standing Tall | 5 | 15 | Footnotes, Research Inheritance | With two active Planet sources, Scientific Planets output and generated Science Boost strength rise 150%. Bonuses are additive. | The shoulders now need their own atmosphere. |

**After Discovery**

- **Giant Steps:** Natural Discoveries grant 10 seconds of Planet output, up to 20 seconds per minute.
- **Reading Room:** Each natural Discovery adds 0.5% Simulation education speed, up to 50%. Bonuses are additive.
- **Footnotes:** Scientific Planets’ raw output adds up to 20% SRS charging speed. Bonuses are additive.
- **Teaching Giants:** Completing a subject grants 1% Discovery progress, once per subject each Simulation.
- **Research Inheritance:** Keep up to 10% of an unfinished Discovery bar through Infinity.
- **Standing Tall:** With two active Planet sources, Scientific Planets output rises 150% and tree speed rises 40%. Bonuses are additive.

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Giant Steps** — `subskill.shouldersOfGiants.giantSteps` · entry · depth 1 · 1 SP including prerequisites.

Only paid levels fill the counter; grant native Planet-to-Data-Center production using bucket20, refill1/3 per game second. Discovery: each natural completion requests10.

- Systems: Paid research, Planets. Limit: +1/3 native Planet throughput.
- Source: current state. New ledger reset: Infinity.
- Interaction: nonrecursive grant; paid-only research trigger.

**Reading Room** — `subskill.shouldersOfGiants.readingRoom` · entry · depth 1 · 2 SP including prerequisites.

b_Education=min(.5,.01*log10(1+generatedScienceBoosts)); after Discovery use min(.5,.005*naturalDiscoveryCompletions).

- Systems: Generated research, Education. Limit: +50% education speed.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Footnotes** — `subskill.shouldersOfGiants.footnotes` · specialization · depth 2 · 4 SP including prerequisites.

Before Discovery b_SrsCharging=min(.20,.01*log10(1+nativeGeneratedScienceBoosts)); after Discovery use rawNativeScientificPlanetRate instead. Add this bounded contribution to the shared new SRS charging channel capped at+100% of the base one-second-per-game-second rate. Existing SRS augment terms and Stellar Memory remain native; new natural charge is banked once, while grants and retentions are excluded.

- Systems: Generated research, SRS, Discovery. Limit: +20% SRS charging.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded additive charging.

**Teaching Giants** — `subskill.shouldersOfGiants.teachingGiants` · specialization · depth 2 · 3 SP including prerequisites.

Six natural completion flags per Dream, each grants 20 native Science seconds. After Discovery grant .01 raw unfinished bar per subject, max .06 per Dream; no new grant trigger.

- Systems: Education, Science, Discovery. Limit: 120 Science seconds; later .06 raw bar per Simulation.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Dream.
- Interaction: finite raw-source grant.

**Research Inheritance** — `subskill.shouldersOfGiants.researchInheritance` · specialization · depth 3 · 6 SP including prerequisites.

Retain min(25,endingGeneratedScienceBoostLevels) separately from purchased-research retention. No paid events or regenerated Shoulders credit. After Discovery retain .10 raw unfinished fraction; shared max retention entitlement.

- Systems: Generated research, Infinity, Discovery. Limit: 25 generated levels; later .10 unfinished bar.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Quantum.
- Interaction: retention.

**Standing Tall** — `subskill.shouldersOfGiants.standingTall` · capstone · depth 4 · 15 SP including prerequisites.

At least two distinct native positive Planet generators enable b_Scientific=1.5 and b_GeneratedScienceResearchStrength=1.5; apply to existing generated levels once, not their accrual rate. Discovery replacement: b_Scientific=1.5 and shared tree speed .40.

- Systems: Planet-source diversity, Generated research, Discovery. Limit: +150% source/research; later +40% tree speed.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="whatcouldhavebeen"></a>
### What could’ve been

Base ID: `whatCouldHaveBeen` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **5 choices · entire menu 13 SP.**

**Branch design:** Counterfactual choices compare a ten-point reserve with a late spent-point recovery plan; at the full 42-point budget both conditions overlap only at exactly 32 spent and 10 unspent.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Second Opinion | 2 | 2 | Fractured parent | The weaker of Pocket Dimensions and Scientific Planets gains 100% output. Bonuses are additive. | Another universe has raised an objection. |
| Unwritten Thesis | 3 | 3 | Fractured parent | Keep up to 20 purchased Science Boosts through Infinity. | The draft survived. Unfortunately, so did the comments. |
| Unchosen Path | 2 | 4 | Second Opinion | With at least 10 unspent Skill Points, Pocket output rises 100%. Bonuses are additive. | The best idea was the one we didn’t purchase. |
| Alternate Syllabus | 2 | 5 | Unwritten Thesis | Each unfinished subject adds 5% Pocket output and 5% Solar output. Bonuses are additive. | In another universe, we took different electives. |
| Counterfactual Recovery | 4 | 13 | Unchosen Path, Alternate Syllabus | With 32 SP spent, your first 2 minutes after Infinity grant 100% basic facility output. Bonuses are additive. | We have decided to repeat the same different mistake. |

**After Discovery**

- **Unwritten Thesis:** Keep up to 10% of naturally earned Discovery progress through Infinity.

**After Elevation**

- **Unwritten Thesis:** Keep up to 5% of naturally earned Elevation progress through Infinity.

**After Enlightenment**

- **Unwritten Thesis:** Keep up to 5% of naturally earned Enlightenment progress through Infinity.

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Second Opinion** — `subskill.whatCouldHaveBeen.secondOpinion` · entry · depth 1 · 2 SP including prerequisites.

Compare native Pocket-generated Data Centers per second / max(1,owned Data Centers) with native Scientific Planets per second / max(1,owned Planets). Only positive sources qualify. Boost the source with the smaller fractional growth rate by1; stable ties favour Scientific Planets and selection updates every60 game seconds. Extra output is excluded from Shoulders research.

- Systems: Pocket Dimensions, Scientific Planets. Limit: +100% to one direct source.
- Source: current state. New ledger reset: Infinity.
- Interaction: snapshot selection without research feedback.

**Unwritten Thesis** — `subskill.whatCouldHaveBeen.unwrittenThesis` · entry · depth 1 · 3 SP including prerequisites.

Retain min(20,truePaidScienceBoostLevels) and set ordinary next-level price from resulting total. Generated levels do not qualify. Discovery retains up to10% directly earned Discovery bar progress instead. Tier variant retains at most5% of the highest unlocked tier own-bar directly earned progress (90 raw Elevation units or30 Enlightenment units), replacing the base Discovery retention. Merge by max with same-bar retention; carry no completions.

- Systems: Research, Infinity. Limit: 20 paid levels; 10% direct Discovery progress.
- Source: current state. New ledger reset: Quantum.
- Interaction: source-specific retention.

**Unchosen Path** — `subskill.whatCouldHaveBeen.unchosenPath` · specialization · depth 2 · 4 SP including prerequisites.

Actual native unspentSP>=10 enables b_Pocket=1. Reserved/proposed spent SP never qualify. Includes this node’s cost in the comparison with current Purity bonuses.

- Systems: Unspent SP, Pocket Dimensions. Limit: +100% Pocket output.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Alternate Syllabus** — `subskill.whatCouldHaveBeen.alternateSyllabus` · specialization · depth 2 · 5 SP including prerequisites.

b_Pocket=b_Solar=.05*unfinishedNativeSubjects, max.30; no alternative-universe completion events or copied progress.

- Systems: Education, Pocket Dimensions, Solar. Limit: +30% two outputs.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Counterfactual Recovery** — `subskill.whatCouldHaveBeen.counterfactualRecovery` · capstone · depth 3 · 13 SP including prerequisites.

Native paid ordinary skills plus new purchased augments count as spent; permanent Fractures cost0. If totalSpent>=32 and InfinityAge<120, b_Basic=1. Reassignment cannot extend window or count points twice.

- Systems: Spent SP, Infinity, Basic facilities. Limit: +100% basic output for first 2 minutes.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="shouldersoftheenlightened"></a>
### Shoulders of the Enlightened

Base ID: `shouldersOfTheEnlightened` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **5 choices · entire menu 12 SP.**

**Branch design:** Cash knowledge offers teaching, civic prices and a finite public funding reward, then a capstone that adapts cleanly to Discovery completions.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Public Library | 2 | 2 | Fractured parent | Each 50 purchased Cash Boosts adds 10% Simulation education speed, up to 100%. Bonuses are additive. | Admission is free. The building was not. |
| Practical Wisdom | 2 | 2 | Fractured parent | Generated Cash Boosts add up to 50% Planet Assembly output. Bonuses are additive. | The library has published a construction manual. |
| Sponsored Course | 2 | 4 | Public Library | Every 100 purchased Cash Boosts grants 1 minute of the slowest subject’s progress, up to 3 minutes per Simulation. | The lecture is brought to you by your own treasury. |
| Civic Knowledge | 2 | 4 | Practical Wisdom | Generated Cash Boosts reduce Hunter and Gatherer Influence prices by up to 20%. | The public has learned how to negotiate. |
| Enlightened Treasury | 4 | 12 | Sponsored Course, Civic Knowledge | With fully educated Simulations, Cash gains 200% production and Planet Assembly gains 100% output. Bonuses are additive. | The treasury has finally understood where money comes from. |

**After Discovery**

- **Public Library:** Each natural Discovery adds 5% Simulation education speed, up to 100%. Bonuses are additive.
- **Practical Wisdom:** Each natural Discovery adds 0.5% Planet Assembly output, up to 50%. Bonuses are additive.
- **Sponsored Course:** Every fifth natural Discovery completion grants 30 seconds of the slowest subject’s progress, up to 3 minutes per Simulation.
- **Civic Knowledge:** Completed discoveries reduce Hunter and Gatherer Influence prices by up to 20%.

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Public Library** — `subskill.shouldersOfTheEnlightened.publicLibrary` · entry · depth 1 · 2 SP including prerequisites.

b_Education=min(1,.1*floor(paidCashBoosts/50)); after Discovery use .05 per natural Discovery, cap1.

- Systems: Cash Boosts, Education. Limit: +100% education speed.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Practical Wisdom** — `subskill.shouldersOfTheEnlightened.practicalWisdom` · entry · depth 1 · 2 SP including prerequisites.

b_PlanetAssembly=min(.5,.01*log10(1+generatedCashBoostLevels)); after Discovery b=min(.5,.005*naturalDiscoveryCompletions). Planet Assembly must be owned.

- Systems: Generated Cash Boosts, Planet Assembly. Limit: +50% native Planet Assembly output.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Sponsored Course** — `subskill.shouldersOfTheEnlightened.sponsoredCourse` · specialization · depth 2 · 4 SP including prerequisites.

True paid Cash Boost thresholds grant raw60 target base education seconds; total180 per Dream. After Discovery each fifth natural completion grants30 base seconds, same180 limit.

- Systems: Cash research, Education, Discovery. Limit: 180 base education seconds per Simulation.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Dream.
- Interaction: finite raw-progress grant.

**Civic Knowledge** — `subskill.shouldersOfTheEnlightened.civicKnowledge` · specialization · depth 2 · 4 SP including prerequisites.

d=min(.20,.01*log10(1+nativeGeneratedCashBoosts)); after Discovery use .02*log10(1+nativeNaturalDiscoveryCompletions), same cap. Actual quote amount only.

- Systems: Generated research, Influence prices, Discovery. Limit: 20% Hunter/Gatherer discount.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: price discount.

**Enlightened Treasury** — `subskill.shouldersOfTheEnlightened.enlightenedTreasury` · capstone · depth 3 · 12 SP including prerequisites.

All six native completion flags enable b_Cash=2,b_PlanetAssembly=1. Keep native generated Cash Boost accrual and Discovery-completion Cash formula separate.

- Systems: Education, Cash, Planet Assembly. Limit: +200% Cash; +100% Planet Assembly.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="shouldersofprecursors"></a>
### Shoulders of Precursors

Base ID: `shouldersOfPrecursors` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **6 choices · entire menu 16 SP.**

**Branch design:** The broad precursor branch offers early recovery, independent study, source-priced borrowing, held reserves, ancient Energy infrastructure and a studied research capstone.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Precursor Cache | 3 | 3 | Fractured parent | The first research purchase this Infinity grants 5 Data Centers or 30 seconds of Planet output, whichever is greater. | The ancient storage device contains mostly drivers. |
| Independent Study | 1 | 1 | Fractured parent | Science production is 50% higher while no Stored Time is being spent. Bonuses are additive. | The researchers have asked for a little present tense. |
| Ancient Credit | 2 | 5 | Precursor Cache | While Science exceeds Cash, Data Center Cash prices are 25% lower. | The civilization’s credit rating survived its civilization. |
| Silent Endowment | 2 | 3 | Independent Study | Holding 5 minutes of Science income makes education 100% faster. Bonuses are additive. | The endowment has spent several eons in silence. |
| Ancient Dynamo | 3 | 6 | Silent Endowment | Fully educated Simulations add 150% Fusion output. Bonuses are additive. | The ancient instructions said to plug it in. |
| Precursor Academy | 5 | 16 | Ancient Credit, Ancient Dynamo | After 30 minutes without Infinity, facility research is 150% stronger and Cash rises 100%. Bonuses are additive. | The academy has waited patiently for a new species. |

**After Discovery**

- **Precursor Cache:** The first natural Discovery this Infinity grants 5 Data Centers or 30 seconds of Planet output, whichever is greater.
- **Independent Study:** Discovery is 15% faster while no Stored Time is being spent. Bonuses are additive.
- **Ancient Credit:** With Discovery at least half full, Data Center Cash prices are 25% lower.
- **Silent Endowment:** With Discovery at least half full, education is 100% faster. Bonuses are additive.
- **Precursor Academy:** After 30 minutes without Infinity, Discovery strength rises 40% and Cash rises 100%. Bonuses are additive.

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Precursor Cache** — `subskill.shouldersOfPrecursors.precursorCache` · entry · depth 1 · 3 SP including prerequisites.

One award on a positive paid research transaction while assigned: max(5,30*nativePlanetDataCenterRate) generated Data Centers. Generated research never triggers. Discovery uses first natural completion. Existing Planet restrictions apply.

- Systems: Research, Data Centers. Limit: Greater of5 Data Centers or30 native Planet seconds, once per Infinity.
- Source: current state. New ledger reset: Infinity.
- Interaction: one-shot generated grant.

**Independent Study** — `subskill.shouldersOfPrecursors.independentStudy` · entry · depth 1 · 1 SP including prerequisites.

b_Science=.5 on active processing only; no bonus to bank credit. Discovery variant adds.15 speed during active processing.

- Systems: Active play, Science. Limit: +50% Science; +15% Discovery speed.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Ancient Credit** — `subskill.shouldersOfPrecursors.ancientCredit` · specialization · depth 2 · 5 SP including prerequisites.

Compare actual positive Science/Cash stocks. After Discovery compare unfinished bar>=.5 instead. .25 native quote discount, shared .50 cap; does not replace or exponentiate Cash multipliers.

- Systems: Science balance, Data Center prices, Discovery. Limit: 25% DC Cash discount.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: price discount.

**Silent Endowment** — `subskill.shouldersOfPrecursors.silentEndowment` · specialization · depth 2 · 3 SP including prerequisites.

NativeScienceRate>0 and Science>=300*rate enables b_Education=1. After Discovery native unfinished fraction>=.5 enables the same bonus.

- Systems: Science reserve, Education, Discovery. Limit: +100% education.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Ancient Dynamo** — `subskill.shouldersOfPrecursors.ancientDynamo` · specialization · depth 3 · 6 SP including prerequisites.

All six native subject flags enable b_Fusion=1.5; no free Solar/Fusion generator, charge transfer or Black Hole action.

- Systems: Education, Fusion Energy. Limit: +150% Fusion output.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Precursor Academy** — `subskill.shouldersOfPrecursors.precursorAcademy` · capstone · depth 4 · 16 SP including prerequisites.

Native Infinity age>=1800 enables b_FacilityResearch=1.5,b_Cash=1. Discovery replaces research with shared .40 strength enhancement; native precursor Cash/Science replacement rule unchanged.

- Systems: Infinity age, Research strength, Cash, Discovery. Limit: +150% research; +100% Cash; later +40% strength.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="shouldersofthefallen"></a>
### Shoulders of the Fallen

Base ID: `shouldersOfTheFallen` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **5 choices · entire menu 11 SP.**

**Branch design:** The fallen branch combines physical history and Black Hole recovery, then opens a funded research memorial and an inherited-knowledge production capstone.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Memorial Foundry | 2 | 2 | Fractured parent | Every 50 tenfold increases in physical panels decayed adds 100% Planet Assembly output, up to 200%. Bonuses are additive. | The memorial doubles as a manufacturing district. |
| Inherited Tools | 1 | 1 | Fractured parent | After a Black Hole, Simulation Factory production is 100% higher for 2 minutes. Bonuses are additive. | The tools are older than the universe. Again. |
| Memorial Grant | 2 | 4 | Memorial Foundry | Every 100 purchased Science Boosts makes your next Planet 30% cheaper. | The memorial has received planning permission. |
| Ancestral Workshop | 2 | 3 | Inherited Tools | For 2 minutes after a Black Hole, Space Factory output is 100% higher. Bonuses are additive. | The inherited tools came with orbital attachments. |
| Weight of History | 4 | 11 | Memorial Grant, Ancestral Workshop | Generated Science Boosts add up to 150% Planet Assembly and Shell Worlds output. Bonuses are additive. | History is now heavy enough to assemble planets. |

**After Discovery**

- **Memorial Grant:** Every fifth natural Discovery completion makes your next Planet 30% cheaper.
- **Weight of History:** Completed discoveries add up to 150% Planet Assembly and Shell Worlds output. Bonuses are additive.

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Memorial Foundry** — `subskill.shouldersOfTheFallen.memorialFoundry` · entry · depth 1 · 2 SP including prerequisites.

b_PlanetAssembly=min(2,log10(1+physicalDecayThisInfinity)/50); requires native Planet Assembly, excludes credited decay.

- Systems: Decay, Planet Assembly. Limit: +200% native Planet Assembly output.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Inherited Tools** — `subskill.shouldersOfTheFallen.inheritedTools` · entry · depth 1 · 1 SP including prerequisites.

On a genuine positive-reward Black Hole set120 game-second +1 Factory-output window after reset. No stacking; no fresh window from refund.

- Systems: Black Hole, Simulation Factories. Limit: +100% Factories for120 game seconds.
- Source: current state. New ledger reset: Dream run.
- Interaction: finite reset window.

**Memorial Grant** — `subskill.shouldersOfTheFallen.memorialGrant` · specialization · depth 2 · 4 SP including prerequisites.

Actual paid Science Boost thresholds create one .30 paid-Planet coupon. After Discovery each fifth native natural completion can prepare one coupon, same durable grant bucket .1 coupons/game-second maximum and one outstanding.

- Systems: Research purchases, Planet prices, Discovery. Limit: one 30% Planet coupon.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: coupon.

**Ancestral Workshop** — `subskill.shouldersOfTheFallen.ancestralWorkshop` · specialization · depth 2 · 3 SP including prerequisites.

Last genuine positive-reward Black Hole age<120 enables b_SpaceFactory=1. Windows refresh only via real resets; native input debits continue.

- Systems: Black Holes, Space Factories. Limit: +100% output for 2 minutes.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Weight of History** — `subskill.shouldersOfTheFallen.weightOfHistory` · capstone · depth 3 · 11 SP including prerequisites.

b=min(1.5,.05*log10(1+nativeGeneratedScienceBoosts)). After Discovery replace donor with .10*log10(1+completedNativeDiscoveries), same cap. Separate output channels, not an additional log exponent.

- Systems: Generated research, Planet Assembly, Shell Worlds, Discovery. Limit: +150% two Planet sources.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="shouldersurgery"></a>
### Shoulder Surgery

Base ID: `shoulderSurgery` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **3 choices · entire menu 7 SP.**

**Branch design:** The small surgical modifier gets one joint specialization after its two functional roots; extra choices would duplicate the broader Shoulders branches.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Joint Replacement | 2 | 2 | Fractured parent | Pocket Dimensions output adds up to 100% Simulation Factory production. Bonuses are additive. | The replacement part was ordered from another universe. |
| Physiotherapy | 1 | 1 | Fractured parent | Tinker adds 50% Pocket Dimensions output for 10 seconds. Bonuses are additive. | Three sets of ten. Please stop moving the dimension. |
| Reconstructive Practice | 4 | 7 | Joint Replacement, Physiotherapy | Tinker grants 10 seconds of Pocket output and 5 seconds of Factory output, up to once per minute. | We have replaced the shoulder with a small workshop. |

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Joint Replacement** — `subskill.shoulderSurgery.jointReplacement` · entry · depth 1 · 2 SP including prerequisites.

b_Factory=min(1,.02*log10(1+rawPocketPerPlanetBonus)); no production grants feed back into the donor.

- Systems: Pocket Dimensions, Simulation Factories. Limit: +100% native Factory output.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Physiotherapy** — `subskill.shoulderSurgery.physiotherapy` · entry · depth 1 · 1 SP including prerequisites.

One refreshable10 game-second b_Pocket=.5 window; extra output excluded from Shoulders research. No stacking or offline Tinker.

- Systems: Tinker, Pocket Dimensions. Limit: +50% Pocket output for10 seconds.
- Source: current state. New ledger reset: Infinity.
- Interaction: finite event window.

**Reconstructive Practice** — `subskill.shoulderSurgery.reconstructivePractice` · capstone · depth 2 · 7 SP including prerequisites.

Native Tinker completion consumes one initially empty 60-game-second token. Credit native aggregate Pocket-to-DC and Factory production once; Pocket credit excluded from research-donor accrual, Factory inputs conserved.

- Systems: Tinker, Pocket Dimensions, Factories. Limit: 10 Pocket seconds and 5 Factory seconds per minute.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: production grant.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="shouldersoftherevolution"></a>
### Shoulders of the Revolution

Base ID: `shouldersOfTheRevolution` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **5 choices · entire menu 12 SP.**

**Branch design:** Research dividends grow into influence prices, workshop wages and a shared invested-knowledge capstone, with actual Discovery completion sources after Science ends.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Public Dividend | 1 | 1 | Fractured parent | Each paid Science Boost grants 2 seconds of Influence generation, up to 12 seconds per minute. | The revolution has announced a very small dividend. |
| Open Workshops | 3 | 3 | Fractured parent | Every 100 paid Science Boosts adds 10% Tinker yield, up to 100%. Bonuses are additive. | The workshop is open. The safety committee is absent. |
| Popular Mandate | 2 | 3 | Public Dividend | Each 100 purchased Science Boosts reduces Community Influence prices by 2%, up to 20%. | The revolution has successfully filed its paperwork. |
| Workshop Wages | 2 | 5 | Open Workshops | While Tinker is running, Cash and Influence production rise 50%. Bonuses are additive. | The workshop has negotiated a universal wage. |
| Knowledge in Common | 4 | 12 | Popular Mandate, Workshop Wages | With fully educated Simulations, Science Boosts are 100% stronger and Cash rises 150%. Bonuses are additive. | The knowledge is public. The dividend is substantial. |

**After Discovery**

- **Public Dividend:** Natural Discoveries grant 12 seconds of Influence generation, up to 12 seconds per minute.
- **Open Workshops:** Each natural Discovery adds 2% Tinker yield, up to 100%. Bonuses are additive.
- **Popular Mandate:** Each five natural Discovery completions reduces Community Influence prices by 2%, up to 20%.
- **Knowledge in Common:** With fully educated Simulations, tree speed rises 30% and Cash rises 150%. Bonuses are additive.

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Public Dividend** — `subskill.shouldersOfTheRevolution.publicDividend` · entry · depth 1 · 1 SP including prerequisites.

Bucket12 refills .2 per game second in the current canonical runtime. True paid Science Boost levels request2 tokens; after Discovery qualifying natural completions request12. Credit Influence once from the native per-game-second source rate, never through Worker capacity twice.

- Systems: Paid research, Reality. Limit: +20% native Influence throughput.
- Source: current state. New ledger reset: Infinity.
- Interaction: nonrecursive base-clock grant.

**Open Workshops** — `subskill.shouldersOfTheRevolution.openWorkshops` · entry · depth 1 · 3 SP including prerequisites.

b_Tinker=min(1,.1*floor(paidScienceBoosts/100)); Discovery uses.02 per natural completion, cap1. Galactic/Birch/Matrioshka global Tinker rate ceilings still apply.

- Systems: Research, Tinker. Limit: +100% within existing Tinker source ceilings.
- Source: current state. New ledger reset: Infinity.
- Interaction: existing Tinker ceilings preserved.

**Popular Mandate** — `subskill.shouldersOfTheRevolution.popularMandate` · specialization · depth 2 · 3 SP including prerequisites.

d_Community=min(.20,.02*floor(truePaidScienceBoosts/100)). After Discovery use .02*floor(nativeNaturalDiscoveryCompletions/5), same cap and .50 combined quote limit.

- Systems: Research purchases, Community prices, Discovery. Limit: 20% Community Influence discount.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: price discount.

**Workshop Wages** — `subskill.shouldersOfTheRevolution.workshopWages` · specialization · depth 2 · 5 SP including prerequisites.

Native Tinker runtime.running enables b_Cash=b_Influence=.5. No unearned Gather batches or repeated activation reward.

- Systems: Tinker, Cash, Influence. Limit: +50% Cash/Influence.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Knowledge in Common** — `subskill.shouldersOfTheRevolution.knowledgeInCommon` · capstone · depth 3 · 12 SP including prerequisites.

All six subject flags enable b_ScienceResearchStrength=1,b_Cash=1.5. After Discovery replace research term with .30 shared tree speed, keep Cash term; no new SP, Catalyst or infinite generated research history.

- Systems: Education, Research strength, Cash, Discovery. Limit: +100% research; +150% Cash; later +30% tree speed.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>


## Terra

<a id="terranullius"></a>
### Terra Nullius

Base ID: `terraNullius` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **4 choices · entire menu 8 SP.**

**Branch design:** Four frontier choices keep virtual Line counts intact while offering real generated stock, housing, bounded construction supplies and a settled-world Line specialization.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Homestead | 1 | 1 | Fractured parent | Each of your first 10 paid Planets includes 5 generated Assembly Lines. | The welcome basket contains a small factory. |
| New Settlers | 2 | 2 | Fractured parent | Owning a Planet makes Simulation Housing produce 50% more Workers. Bonuses are additive. | The removals company charges by the light-year. |
| Colonial Supplies | 2 | 3 | Homestead | Paid Planets grant 5 seconds of panel production, up to 20 seconds per minute. | Your new planet arrived with a starter atmosphere. |
| Worldbound Lines | 3 | 8 | New Settlers, Colonial Supplies | With 50 paid Planets, Assembly Lines gain 150% output and Housing gains 50%. Bonuses are additive. | The line now has firm plans to settle down. |

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Homestead** — `subskill.terraNullius.homestead` · entry · depth 1 · 1 SP including prerequisites.

Credit5 generated Lines per actual paid Planet until10 eligible Planets this Infinity. Terra virtual counts and free grants never trigger.

- Systems: Paid Planets, Assembly Lines. Limit: 50 generated Lines per Infinity.
- Source: current state. New ledger reset: Infinity.
- Interaction: one-shot downstream grants.

**New Settlers** — `subskill.terraNullius.newSettlers` · entry · depth 1 · 2 SP including prerequisites.

At totalPlanets>=1, b_HousingWorkerYield=.5. Normal Housing/Worker conversion requirements remain.

- Systems: Planets, Simulation Housing. Limit: +50% Housing Worker output.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Colonial Supplies** — `subskill.terraNullius.colonialSupplies` · specialization · depth 2 · 3 SP including prerequisites.

True paid Planet units trigger once through a 20-panel-second/min bucket. Virtual paid counts from Terra Irradient/Pooled Purchases never emit extra transactions.

- Systems: Planet purchases, Panels. Limit: 20 panel seconds per game minute.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: production grant.

**Worldbound Lines** — `subskill.terraNullius.worldboundLines` · specialization · depth 3 · 8 SP including prerequisites.

actualPaidPlanets>=50 enables b_Bots=1.5,b_Housing=.5. Does not multiply native Terra’s virtual-Line count or grant fresh purchase milestones.

- Systems: Planet purchases, Bots, Housing. Limit: +150% Bots; +50% Housing.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="terrainfirma"></a>
### Terra Infirma

Base ID: `terraInfirma` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **4 choices · entire menu 9 SP.**

**Branch design:** Ground crews and Black Hole logistics deepen into actual education shipments or carried Manager stock; the parent’s virtual-count mapping remains unchanged.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Ground Crew | 1 | 1 | Fractured parent | Paid Planet purchases grant 5 seconds of AI Manager output, up to 20 seconds per minute. | The ground crew has started managing the ground. |
| Soft Landing | 3 | 3 | Fractured parent | After a rewarded Black Hole, your next Space Factory consumes no Factory. | The planet has installed a crash mat. |
| Ground School | 2 | 3 | Ground Crew | Every 10 paid Planets grants 20 seconds of Shipping progress, up to 2 minutes per Simulation. | The ground crew has started studying the sky. |
| Deployment Plan | 3 | 9 | Soft Landing, Ground School | Keep up to 30 generated AI Managers through Infinity. | The deployment plan includes several spare managers. |

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Ground Crew** — `subskill.terraInfirma.groundCrew` · entry · depth 1 · 1 SP including prerequisites.

Native Manager-to-Line grant bucket20 refills1/3 per game second. Each true paid Planet requests5; virtual transfers do not trigger.

- Systems: Paid Planets, AI Managers. Limit: +1/3 native Manager throughput.
- Source: current state. New ledger reset: Infinity.
- Interaction: nonrecursive paid-event grant.

**Soft Landing** — `subskill.terraInfirma.softLanding` · entry · depth 1 · 3 SP including prerequisites.

One conversion per positive-reward Black Hole may consume a voucher for the single Factory input; Rockets are fully debited, output limited to1, normal unlocks required. This finite one-Factory grant is separate from recurring percentage discounts. A held voucher cannot stack, and reassignment never refills it.

- Systems: Black Hole, Space Factories. Limit: One Factory input saved per Black Hole.
- Source: current state. New ledger reset: Dream run.
- Interaction: one-shot conversion credit.

**Ground School** — `subskill.terraInfirma.groundSchool` · specialization · depth 2 · 3 SP including prerequisites.

True paid thresholds grant raw20 base Shipping seconds, total120 per Dream. Extra speed never multiplies the packet; grant-caused completion cannot earn another grant.

- Systems: Planet purchases, Education. Limit: 120 base Shipping seconds per Simulation.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Dream.
- Interaction: finite raw-progress grant.

**Deployment Plan** — `subskill.terraInfirma.deploymentPlan` · specialization · depth 3 · 9 SP including prerequisites.

Retain min(30,endingGeneratedManagers), once by maximum with other same-stock retention. Generated identity preserved; no paid count/price-index grant. Quantum clears.

- Systems: AI Managers, Infinity. Limit: 30 generated Managers.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Quantum.
- Interaction: retention.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="terraeculeo"></a>
### Terra Eculeo

Base ID: `terraEculeo` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **4 choices · entire menu 8 SP.**

**Branch design:** Server-linked planets branch between cheaper settlement infrastructure and stronger stored-time research; no new virtual purchase source is introduced.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Survey Stakes | 1 | 1 | Fractured parent | Each 25 paid Planets adds 10% Server output, up to 100%. Bonuses are additive. | The surveyor has requested a longer tape measure. |
| Supply Routes | 2 | 2 | Fractured parent | Owning Servers adds 100% Shipping speed. After Shipping completes, gain 50% Rocket output instead. Bonuses are additive. | Your parcel is currently orbiting the depot. |
| Settlement Relay | 2 | 3 | Survey Stakes | With 25 paid Planets, Server Cash prices are 20% lower. | The settlement has installed a very long network cable. |
| Packets From Home | 3 | 5 | Supply Routes | While spending Stored Time, Server research is 150% stronger. Bonuses are additive. | The message took a while to reach the colony. |

**After Discovery**

- **Packets From Home:** While spending Stored Time, Servers gain 150% output. Bonuses are additive.

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Survey Stakes** — `subskill.terraEculeo.surveyStakes` · entry · depth 1 · 1 SP including prerequisites.

b_Server=min(1,.1*floor(truePaidPlanets/25)); Terra credits not included.

- Systems: Paid Planets, Servers. Limit: +100% Servers.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Supply Routes** — `subskill.terraEculeo.supplyRoutes` · entry · depth 1 · 2 SP including prerequisites.

b_Shipping=1 at totalServers>=1; only this subject, normal completion effects once. After Shipping is complete, add.5 to native Rocket output instead.

- Systems: Servers, Shipping, Rockets. Limit: +100% Shipping speed or +50% Rocket output.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Settlement Relay** — `subskill.terraEculeo.settlementRelay` · specialization · depth 2 · 3 SP including prerequisites.

actualPaidPlanets>=25 gives .20 native Server quote reduction, shares .50 cap. Do not use the already virtual Server count as source.

- Systems: Planet purchases, Server prices. Limit: 20% Server Cash discount.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: price discount.

**Packets From Home** — `subskill.terraEculeo.packetsFromHome` · specialization · depth 2 · 5 SP including prerequisites.

Before Discovery: source=stored-time gives b_ServerResearch=1.5, applied to native existing research strength once. No added bank seconds or simultaneous offline simulation.
After Discovery: source=stored-time gives b_Server=1.5, replacing retired Server research strength; no extra offline/bank progress.

- Systems: Stored Time, Server research. Limit: +150% Server research strength.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="terrafirma"></a>
### Terra Firma

Base ID: `terraFirma` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **5 choices · entire menu 13 SP.**

**Branch design:** A five-choice foundations tree connects reset stock and balanced purchases to researched infrastructure, launch Energy and a paid-Planet Data Center capstone.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Concrete Plans | 3 | 3 | Fractured parent | Keep up to 5 generated Servers and AI Managers through Infinity. | The foundation is bolted to the laws of physics. |
| Balanced Foundations | 2 | 2 | Fractured parent | Owning 50 paid purchases of every basic facility adds 50% Data Center output. Bonuses are additive. | For once, every building has a foundation. |
| Foundation Bonds | 2 | 5 | Concrete Plans | Every 25 paid Planets makes your next Data Center 25% cheaper. | The foundation is backed by actual planets. |
| Stable Grid | 2 | 4 | Balanced Foundations | With 50 paid purchases of every basic facility, Solar output rises 100%. Bonuses are additive. | The foundation has passed its electrical inspection. |
| Continental Data | 4 | 13 | Foundation Bonds, Stable Grid | Every 25 paid Planets adds 25% Data Center output, up to 200%. Bonuses are additive. | The data center has become a continent. |

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Concrete Plans** — `subskill.terraFirma.concretePlans` · entry · depth 1 · 3 SP including prerequisites.

Retain min(5,generatedServers) and min(5,generatedManagers), max with same-source retention, never add duplicate stock; clear Quantum.

- Systems: Generated facilities, Infinity. Limit: 5 Servers and5 Managers retained.
- Source: current state. New ledger reset: Quantum.
- Interaction: nonstacking generated retention.

**Balanced Foundations** — `subskill.terraFirma.balancedFoundations` · entry · depth 1 · 2 SP including prerequisites.

b_DataCenter=.5 when each of Lines/Managers/Servers/DataCenters/Planets has50 true purchases; no Terra virtual counts.

- Systems: Purchase breadth, Data Centers. Limit: +50% Data Center output.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Foundation Bonds** — `subskill.terraFirma.foundationBonds` · specialization · depth 2 · 5 SP including prerequisites.

True paid Planet thresholds prepare one outstanding .25 Data Center Cash coupon. Shared quote cap .50; zero-debit deferred purchases cannot earn Cash-spent vouchers but do remain actual purchased units.

- Systems: Planet purchases, Data Center prices. Limit: one 25% DC coupon.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: coupon.

**Stable Grid** — `subskill.terraFirma.stableGrid` · specialization · depth 2 · 4 SP including prerequisites.

All five actual paid counts>=50 enable b_Solar=1. Terra/Pooled virtual counts are excluded from this new paid-source condition.

- Systems: Paid facility diversity, Solar. Limit: +100% Solar.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Continental Data** — `subskill.terraFirma.continentalData` · capstone · depth 3 · 13 SP including prerequisites.

b_DC=min(2,.25*floor(actualPaidPlanets/25)). Native Terra virtual DC mapping stays exactly as-is; no extra growth exponent or duplicate research trigger.

- Systems: Planet purchases, Data Centers. Limit: +200% DC output.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="terranova"></a>
### Terra Nova

Base ID: `terraNova` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **5 choices · entire menu 12 SP.**

**Branch design:** A fresh-ground tree links Planet research, Terraforming output and finite research-funded construction, then adds a lifetime capstone instead of another price exponent.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Survey Voucher | 2 | 2 | Fractured parent | Every 20 purchased Planet Boosts makes your next Planet 25% cheaper. | The coupon is valid on participating planets. |
| Fresh Ground | 2 | 2 | Fractured parent | For 1 minute after a paid Planet purchase, Terraforming Protocols produces 50% more Planets. Bonuses are additive. | Still has that new-planet smell. |
| Terraforming Grant | 2 | 4 | Survey Voucher | Purchased Planet research grants 10 seconds of Terraforming output, up to 30 seconds per minute. | The grant has made room for another world. |
| Mixed Use | 2 | 4 | Fresh Ground | With five active Fragments, Space Factories consume 15% fewer Rockets. | The zoning plan includes a launch pad. |
| Terraforming Agency | 4 | 12 | Terraforming Grant, Mixed Use | Planet research adds up to 100% Panel Lifetime and 150% Terraforming output. Bonuses are additive. | The agency has extended your atmosphere’s lease. |

**After Discovery**

- **Survey Voucher:** Each natural Discovery makes your next Planet 25% cheaper.
- **Terraforming Grant:** Natural discoveries grant 10 seconds of Terraforming output, up to 30 seconds per minute.
- **Terraforming Agency:** Discovery’s native strength adds up to 100% Panel Lifetime and 150% Terraforming output. Bonuses are additive.

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Survey Voucher** — `subskill.terraNova.surveyVoucher` · entry · depth 1 · 2 SP including prerequisites.

One held coupon; earn per20 truly paid Planet research levels; apply25% within50% shared discount cap. Discovery: one coupon per natural Discovery.

- Systems: Planet research, Planet prices. Limit: 25% off one Planet.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded coupon ledger.

**Fresh Ground** — `subskill.terraNova.freshGround` · entry · depth 1 · 2 SP including prerequisites.

One60 game-second b_Terraforming=.5 window; actual parent required; paid Planet purchases refresh only.

- Systems: Paid Planets, Terraforming Protocols. Limit: +50% native Terraforming for60 seconds.
- Source: current state. New ledger reset: Infinity.
- Interaction: finite event window.

**Terraforming Grant** — `subskill.terraNova.terraformingGrant` · specialization · depth 2 · 4 SP including prerequisites.

Before Discovery: True paid Planet-research levels grant native Terraforming Protocols output through30-production-second/min bucket. If native generator inactive output is0; generated research cannot trigger it.
After Discovery: Qualifying native own-bar completions consume10 native Terraforming-output seconds from30/60 bucket; inactive native generator credits0, no research source.

- Systems: Planet research purchases, Terraforming Protocols. Limit: 30 Terraforming seconds per game minute.
- Discovery limit: 30 Terraforming seconds per minute.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: production grant.

**Mixed Use** — `subskill.terraNova.mixedUse` · specialization · depth 2 · 4 SP including prerequisites.

Explicit native F>=5 enables .15 Rocket-input quote reduction, shares .50 cap. No new augment counts as Fragment.

- Systems: Fragments, Space Factory inputs. Limit: 15% Rocket-input discount.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: input discount.

**Terraforming Agency** — `subskill.terraNova.terraformingAgency` · capstone · depth 3 · 12 SP including prerequisites.

Before Discovery: b_Lifetime=min(1,.10*log10(1+nativePlanetResearchMultiplier)); b_Terraform=min(1.5,.15*log10(1+multiplier)); native quote before new strength channels, no repeated exponent changes.
After Discovery: Use D0=10+5*startingPower+.1*nativeCompletions, excluding new enhancement. b_Lifetime=min(1,.10*log10(1+D0)); b_Terraform=min(1.5,.15*log10(1+D0)). No old research donor or TP discount.

- Systems: Planet research strength, Panel Lifetime, Terraforming Protocols. Limit: +100% Lifetime; +150% Terraforming.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="terragloriae"></a>
### Terra Gloriae

Base ID: `terraGloriae` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **5 choices · entire menu 11 SP.**

**Branch design:** Population-based prices stay native; five development choices add housing, input credits and a bounded city capstone based on real purchases.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Prestige Address | 1 | 1 | Fractured parent | Each tenfold increase in Planets adds 2% Influence generation, up to 200%. Bonuses are additive. | The postcode contains several zeroes. |
| Urban Renewal | 2 | 2 | Fractured parent | Every 50 paid Planets advances Simulation City production by 15 seconds. | The planning permit covers the entire crust. |
| House Prices | 2 | 3 | Prestige Address | While a Planet costs less than 1 minute of Cash income, Housing output rises 100%. Bonuses are additive. | The housing market has finally become affordable. |
| Urban Credit | 2 | 4 | Urban Renewal | Every 50 paid Planets makes your next Space Factory consume 25% fewer Rockets. | The city has approved a modest orbital expansion. |
| Glorious Development | 4 | 11 | House Prices, Urban Credit | With 100 paid Planets, Housing and City output rise 150% and Planet output rises 100%. Bonuses are additive. | The ribbon-cutting ceremony requires a telescope. |

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Prestige Address** — `subskill.terraGloriae.prestigeAddress` · entry · depth 1 · 1 SP including prerequisites.

b_Influence=min(2,.02*log10(1+totalPlanets)); no Influence fed back into the same interval.

- Systems: Planets, Reality. Limit: +200% Influence generation.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Urban Renewal** — `subskill.terraGloriae.urbanRenewal` · entry · depth 1 · 2 SP including prerequisites.

One native City-output grant15 per50 actual purchases, additionally bucket15 refilling.25 per game second. No conversion/rebuy recursion.

- Systems: Paid Planets, Simulation Cities. Limit: +25% native City throughput.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded paid-event grant.

**House Prices** — `subskill.terraGloriae.housePrices` · specialization · depth 2 · 3 SP including prerequisites.

Compare positive native next-Planet Cash quote against60*nativeCashRate, excluding new discounts to avoid self-qualifying loop. b_Housing=1.

- Systems: Native affordability, Housing. Limit: +100% Housing.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Urban Credit** — `subskill.terraGloriae.urbanCredit` · specialization · depth 2 · 4 SP including prerequisites.

True paid Planet thresholds prepare one .25 Rocket-input coupon; settle native purchase consumes it; Factory input unchanged and shared .50 cap.

- Systems: Planet purchases, Space Factory inputs. Limit: one 25% Rocket-input coupon.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: input coupon.

**Glorious Development** — `subskill.terraGloriae.gloriousDevelopment` · capstone · depth 3 · 11 SP including prerequisites.

actualPaidPlanets>=100 enables b_Housing=b_City=1.5,b_Planet=1. Native Terra Gloriae price denominator unchanged; no duplicate paid/virtual counts.

- Systems: Planet purchases, Housing, Cities, Planets. Limit: +150% settlement; +100% Planet output.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="terrairradiant"></a>
### Terra Irradient

Base ID: `terraIrradiant` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **3 choices · entire menu 7 SP.**

**Branch design:** The native twelvefold paid-count transformation is already potent; a compact three-choice branch adds real Solar, price and lifetime specializations without increasing that factor.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Radiant Grid | 2 | 2 | Fractured parent | Every 50 paid Planets adds 25% Simulation Solar output, up to 200%. Bonuses are additive. | The streetlights are visible from the next galaxy. |
| Clean Title | 1 | 1 | Fractured parent | The first 12 paid Planets this Infinity cost 25% less. | The deed includes a small radiation symbol. |
| Radiant Atmosphere | 4 | 7 | Radiant Grid, Clean Title | Every 25 paid Planets adds 25% Panel Lifetime, up to 200%. Bonuses are additive. | The atmosphere has acquired a rather impressive glow. |

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Radiant Grid** — `subskill.terraIrradiant.radiantGrid` · entry · depth 1 · 2 SP including prerequisites.

b_Solar=min(2,.25*floor(truePaidPlanets/50)); do not multiply eligible purchases by12.

- Systems: Paid Planets, Simulation Solar. Limit: +200% Solar Energy output.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Clean Title** — `subskill.terraIrradiant.cleanTitle` · entry · depth 1 · 1 SP including prerequisites.

25% discount on actual paid Planet indices0..11; pricing still advances exactly once per paid unit. Shared50% discount ceiling applies.

- Systems: Early Planet purchases, Cash. Limit: 25% discount for12 Planets.
- Source: current state. New ledger reset: Infinity.
- Interaction: real paid-index gate.

**Radiant Atmosphere** — `subskill.terraIrradiant.radiantAtmosphere` · capstone · depth 2 · 7 SP including prerequisites.

b_Lifetime=min(2,.25*floor(actualPaidPlanets/25)). Use real purchases, not x12 virtual counts; leave native twelvefold mapping and milestone formulas unchanged.

- Systems: Planet purchases, Panel Lifetime. Limit: +200% Lifetime.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>


## Fragments

<a id="fragmentassembly"></a>
### Fragment Assembly

Base ID: `fragmentAssembly` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **4 choices · entire menu 10 SP.**

**Branch design:** The binary five-Fragment condition supports four focused options: bottleneck prices, Space Factories, shared research and a joint ordinary-output capstone.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Complete Picture | 2 | 2 | Fractured parent | With five active Fragments, your weakest basic facility costs 25% less. | The picture on the box was misleadingly small. |
| Spare Pieces | 2 | 2 | Fractured parent | Each active Fragment adds 5% Space Factory production, up to 45%. Bonuses are additive. | Every kit includes a few pieces you cannot identify. |
| Common Blueprint | 2 | 4 | Complete Picture | With five active Fragments, Planet research is 100% stronger and Influence generation rises 25%. Bonuses are additive. | Everyone brought a piece of the same instruction manual. |
| Universal Assembly | 4 | 10 | Common Blueprint, Spare Pieces | With five active Fragments, basic facilities and Space Factories gain 100% output. Bonuses are additive. | The missing piece was another universe. |

**After Discovery**

- **Common Blueprint:** With five active Fragments, Planets gain 100% output and Influence generation rises 25%. Bonuses are additive.

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Complete Picture** — `subskill.fragmentAssembly.completePicture` · entry · depth 1 · 2 SP including prerequisites.

Requires realF>=5. Select the basic link with smallest native output/current output stock ratio, stable60-second choice. d_selected=.25 within shared50% discount cap. A purchase does not reselect mid-transaction.

- Systems: Fragments, Facility bottlenecks, Prices. Limit: 25% discount to one basic facility.
- Source: current state. New ledger reset: Infinity.
- Interaction: snapshot quote selection.

**Spare Pieces** — `subskill.fragmentAssembly.sparePieces` · entry · depth 1 · 2 SP including prerequisites.

b_SpaceFactory=min(.45,.05*realF); this augment is not a Fragment. Native panel output only.

- Systems: Fragments, Space Factories. Limit: +45% native Space Factory output.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Common Blueprint** — `subskill.fragmentAssembly.commonBlueprint` · specialization · depth 2 · 4 SP including prerequisites.

Before Discovery: F>=5 enables b_PlanetResearch=1,b_Influence=.25. Native explicit Fragment count only; no new fragment flag.
After Discovery: F>=5 enables b_Planet=1,b_Influence=.25, replacing retired Planet research strength. Explicit Fragment tags only.

- Systems: Fragments, Planet research, Influence. Limit: +100% Planet research; +25% Influence.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Universal Assembly** — `subskill.fragmentAssembly.universalAssembly` · capstone · depth 3 · 10 SP including prerequisites.

F>=5 enables b_Basic=b_SpaceFactory=1. Galactic Brain replication is separate. Native Fragment Assembly x3 remains untouched and is not recursively reapplied.

- Systems: Fragments, Basic facilities, Space Factories. Limit: +100% two output families.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="progressiveassembly"></a>
### Progressive Assembly

Base ID: `progressiveAssembly` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **5 choices · entire menu 13 SP.**

**Branch design:** A five-choice co-operative branch develops Tinker, education and settled production while leaving the existing per-Fragment Line multiplier intact.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Neighbourhood Project | 1 | 1 | Fractured parent | AI Managers gain 10% output per active Fragment, up to 90%. Bonuses are additive. | Progress has spilled over the fence. |
| Starter Kit | 3 | 3 | Fractured parent | With three active Fragments, new Simulations begin with 5 Housing. | Some assembly is already done. |
| Assembly Drill | 2 | 3 | Neighbourhood Project | With three active Fragments, Tinker’s Assembly Line yield rises 50%, within its existing cap. Bonuses are additive. | The training exercise has assembled a small universe. |
| Stacked Lessons | 2 | 5 | Starter Kit | Each active Fragment adds 5% Simulation education speed, up to 45%. Bonuses are additive. | The lesson plans fit together surprisingly well. |
| Cooperative Megaline | 5 | 13 | Assembly Drill, Stacked Lessons | With five active Fragments and all subjects complete, Bots rise 300% and AI Managers gain 100% output. Bonuses are additive. | The committee has assembled something genuinely large. |

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Neighbourhood Project** — `subskill.progressiveAssembly.neighbourhoodProject` · entry · depth 1 · 1 SP including prerequisites.

b_Manager=min(.9,.1*realF); no virtual Fragments and no recursive copy of augmented Line output.

- Systems: Fragments, AI Managers. Limit: +90% native Manager output.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Starter Kit** — `subskill.progressiveAssembly.starterKit` · entry · depth 1 · 3 SP including prerequisites.

At genuine Dream reset restoration set Housing=max(nativeRestoredHousing,5) ifF>=3. No new grant on assignment; challenge restrictions override.

- Systems: Fragments, Dream resets. Limit: At most5 starting Housing.
- Source: current state. New ledger reset: Dream run.
- Interaction: reset floor without stacking.

**Assembly Drill** — `subskill.progressiveAssembly.assemblyDrill` · specialization · depth 2 · 3 SP including prerequisites.

F>=3 gives b_TinkerLineYield=.5 before the existing final native yield cap. Apply once; do not amplify Hand-built Galactic cap donor or treat credited output as another Tinker.

- Systems: Fragments, Tinker. Limit: +50% Line candidate yield; native cap unchanged.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: capped Tinker modifier.

**Stacked Lessons** — `subskill.progressiveAssembly.stackedLessons` · specialization · depth 2 · 5 SP including prerequisites.

b_Education=.05*min(F,9), explicit native Fragment count. Fixed raw progress grants remain unmultiplied.

- Systems: Fragments, Education. Limit: +45% education.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Cooperative Megaline** — `subskill.progressiveAssembly.cooperativeMegaline` · capstone · depth 3 · 13 SP including prerequisites.

F>=5 and all six native subject flags enables b_Bots=3,b_Manager=1. Native progressive1.5+.5*(F-1) remains one multiplier; new bonuses add in their own channel.

- Systems: Fragments, Education, Bots, AI Managers. Limit: +300% Bots; +100% Manager output.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="terraformingprotocols"></a>
### Terraforming Protocols

Base ID: `terraformingProtocols` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **5 choices · entire menu 12 SP.**

**Branch design:** World seeds and settlement prices branch into physical colony supplies, natural Shipping support and a mature Fragment-driven world capstone.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| World Seed | 3 | 3 | Fractured parent | Your first paid Matrioshka Brain grants 10 Planets or 1 minute of its output, whichever is greater. | Please water once every geological epoch. |
| Settlement Protocol | 1 | 1 | Fractured parent | Each active Fragment reduces Hunter and Gatherer Influence prices by 2%, up to 18%. | The protocol has a section for berry allocation. |
| Colony Workshops | 2 | 5 | World Seed | Terraforming Protocols also creates Data Centers equal to 25% of its raw Planet bonus. | The colony has unpacked its first server rack. |
| Settlement School | 2 | 3 | Settlement Protocol | Completing Shipping adds 100% Terraforming output for 5 minutes. Bonuses are additive. | The curriculum includes the atmosphere installation manual. |
| Stellar Settlement | 4 | 12 | Colony Workshops, Settlement School | With five active Fragments, Terraforming output rises 200% and Space Factory output rises 100%. Bonuses are additive. | The settlement charter now includes several stars. |

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**World Seed** — `subskill.terraformingProtocols.worldSeed` · entry · depth 1 · 3 SP including prerequisites.

One grant of max(10,60*nativeMatrioshkaPlanetRate) after the first true paid Matrioshka purchase each Infinity; snapshot after purchase. Generated Planets remain unpriced and excluded from purchase counts.

- Systems: Megastructure purchase, Planets. Limit: Greater of10 Planets or60 native Matrioshka seconds, once per Infinity.
- Source: current state. New ledger reset: Infinity.
- Interaction: one-shot downstream grant.

**Settlement Protocol** — `subskill.terraformingProtocols.settlementProtocol` · entry · depth 1 · 1 SP including prerequisites.

d_Hunter=d_Gatherer=min(.18,.02*realF), within shared50% discount ceiling; ordinary geometric purchase index unchanged.

- Systems: Fragments, Foundational purchases. Limit: 18% Influence price reduction.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Colony Workshops** — `subskill.terraformingProtocols.colonyWorkshops` · specialization · depth 2 · 5 SP including prerequisites.

New downward generator .25*rawNativeTerraformingBonus from native Fragment count only. Not total aggregate Planet output or any new modifier. Generated DCs do not count as purchases/research sources.

- Systems: Raw Terraforming, Data Centers. Limit: 25% raw Fragment-based Planet bonus.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: raw generator bridge.

**Settlement School** — `subskill.terraformingProtocols.settlementSchool` · specialization · depth 2 · 3 SP including prerequisites.

Native natural Shipping completion refreshes one300-game-second b_Terraform=1 window per Dream; grant-caused completion cannot trigger it. No stacking or new Fragment tag.

- Systems: Education, Terraforming Protocols. Limit: +100% Terraforming for 5 minutes.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Stellar Settlement** — `subskill.terraformingProtocols.stellarSettlement` · capstone · depth 3 · 12 SP including prerequisites.

F>=5 enables b_Terraform=2,b_SpaceFactory=1. World Seed stays a finite first-purchase gift; no duplicated Matrioshka purchase trigger or fixed Brain replication bonus.

- Systems: Fragments, Terraforming Protocols, Space Factories. Limit: +200% Terraforming; +100% Space Factory output.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>


## Stellar

<a id="stellarsacrifices"></a>
### Stellar Sacrifices

Base ID: `stellarSacrifices` · Ordinary base cost: 2 SP; Fractured base: 0 SP. **7 choices · entire menu 18 SP.**

**Branch design:** A seven-choice ritual branch offers lower-facility wakes, timed intensity, source diversity, education, food-funded strengthening and a deep retained-altar capstone.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Stellar Wake | 2 | 2 | Fractured parent | Stellar Sacrifices also creates 25% as many of the next lower facility. | The wake is larger than the boat. |
| Ritual Calendar | 1 | 1 | Fractured parent | Every 5 minutes assigned adds 200% Stellar Sacrifices output for 30 seconds. Bonuses are additive. | The stars appreciate a regular appointment. |
| Altar of Progress | 2 | 4 | Stellar Wake | Each facility type successfully created by Stellar Sacrifices adds 10% research strength, up to 80%. Bonuses are additive. | The offering has advanced several academic departments. |
| Measured Ritual | 2 | 3 | Ritual Calendar | After 5 minutes without Tinkering, Stellar Sacrifices creates 100% more facilities. Bonuses are additive. | The offering has been measured with ceremonial precision. |
| Astral Schools | 3 | 4 | Ritual Calendar | Ritual Calendar’s burst advances the slowest subject by 30 seconds, up to 2 minutes per Simulation. | The ritual has acquired an accredited syllabus. |
| Reciprocal Gift | 3 | 7 | Altar of Progress | Each different Avocato food fed this Quantum adds 25% Stellar creation. Bonuses are additive. | The stars have returned the lunch invitation. |
| Infinite Altar | 5 | 18 | Measured Ritual, Astral Schools, Reciprocal Gift | Keep one generated Galactic Brain through Infinity. | The altar has survived another end of everything. |

**After Discovery**

- **Altar of Progress:** Each facility type created by Stellar Sacrifices adds 5% Discovery strength, up to 40%. Bonuses are additive.

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Stellar Wake** — `subskill.stellarSacrifices.stellarWake` · entry · depth 1 · 2 SP including prerequisites.

From actually settled native sacrifice-created units q of highest owned facility, grant.25*q of its direct downstream facility. Fractured Stellar Sacrifices correctly has zero Bot cost and still qualifies. Exclude Brain replication, Tinker and other grants. No extra sacrifice event.

- Systems: Funded Stellar creation, Facility chain. Limit: 25% downstream copy of funded Stellar units.
- Source: current state. New ledger reset: Infinity.
- Interaction: funded-source-only downstream grant.

**Ritual Calendar** — `subskill.stellarSacrifices.ritualCalendar` · entry · depth 1 · 1 SP including prerequisites.

Each complete300 assigned-game-second period opens a30-second b_Stellar=2 window. Exact duration accounting at coarse steps; no phase reset on refund. Parent is fractured, so its lawful zero-cost native creation qualifies.

- Systems: Assigned time, Stellar creation. Limit: +200% for30 of every300 game seconds.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded periodic window.

**Altar of Progress** — `subskill.stellarSacrifices.altarOfProgress` · specialization · depth 2 · 4 SP including prerequisites.

Eight durable native-created-type flags per Infinity; zero-cost Fractured creation qualifies, failed creation and Convergence do not. b_Research=.10*count. Discovery replaces with .05*count enhancement cap.40.

- Systems: Stellar source diversity, Research strength, Discovery. Limit: +80% research; later +40% strength.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Measured Ritual** — `subskill.stellarSacrifices.measuredRitual` · specialization · depth 2 · 3 SP including prerequisites.

Native Tinker-completion age>=300 enables b_StellarCreation=1. Preserve native resource eligibility even when Fracture makes Bot cost0; new source is not Convergence.

- Systems: Waiting, Stellar Sacrifices. Limit: +100% funded Stellar creation.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Astral Schools** — `subskill.stellarSacrifices.astralSchools` · specialization · depth 2 · 4 SP including prerequisites.

Each genuine300-assigned-second calendar crossing with successful native Stellar creation consumes one flag; raw30 target base education seconds, total120 per Dream. Refunds do not reset calendar or entitlement.

- Systems: Ritual clock, Education. Limit: 120 base education seconds per Simulation.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Dream.
- Interaction: finite raw-progress grant.

**Reciprocal Gift** — `subskill.stellarSacrifices.reciprocalGift` · specialization · depth 3 · 7 SP including prerequisites.

Three genuine positive-debit feed-type flags give b_StellarCreation=.25*count, max.75. No direct feed refund, IP, Strange Matter or fixed Brain rate change.

- Systems: Avocato, Stellar Sacrifices. Limit: +75% Stellar creation.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Quantum.
- Interaction: bounded bonus.

**Infinite Altar** — `subskill.stellarSacrifices.infiniteAltar` · capstone · depth 4 · 18 SP including prerequisites.

At ending Infinity retain min(1,generatedGalacticBrains), including real Convergence copies but not inventing a Brain if none exists. Generated identity retained; Quantum/Transcendence clear. No new purchase, replication burst or Tinker-cap source.

- Systems: Galactic Brains, Infinity. Limit: one generated Galactic Brain.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Quantum.
- Interaction: retention.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="stellarimprovements"></a>
### Stellar Improvements

Base ID: `stellarImprovements` · Ordinary base cost: 3 SP; Fractured base: 0 SP. **4 choices · entire menu 9 SP.**

**Branch design:** The parent’s cost reduction becomes redundant when Stellar Sacrifices is Fractured, so four augments retain independent value through output, calm income, preparation and charge speed.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Precision Offering | 3 | 3 | Fractured parent | Stellar Sacrifices gains 50% facility creation. Bonuses are additive. | The offering has been weighed twice. |
| Quiet Altar | 1 | 1 | Fractured parent | While Stellar Sacrifices creates fewer than 1 facility per second, Cash production is 50% higher. Bonuses are additive. | The donation box is unusually quiet. |
| Better Offering | 2 | 3 | Quiet Altar | Before Stellar Sacrifices creates 1 facility per second, Planet Cash prices are 25% lower. | The stars have agreed to a smaller deposit. |
| Resourceful Ritual | 3 | 6 | Precision Offering | Successful Stellar creation adds 20% SRS charging speed for 1 minute. Bonuses are additive. | The improved offering includes a research receipt. |

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Precision Offering** — `subskill.stellarImprovements.precisionOffering` · entry · depth 1 · 3 SP including prerequisites.

b_StellarSource=.5 on settled native sacrifice output, same native cost. A fractured sacrifice source has lawful zero cost and still qualifies. Shared Stellar bonus channel and existing source-based Tinker ceilings apply; never feeds replication rate.

- Systems: Stellar funding, Facility creation. Limit: +50% native funded Stellar output.
- Source: current state. New ledger reset: Infinity.
- Interaction: funded source multiplier.

**Quiet Altar** — `subskill.stellarImprovements.quietAltar` · entry · depth 1 · 1 SP including prerequisites.

b_Cash=.5 if native actual Stellar creation rate<1, including absent production. Exclude Brain duplication and all new source grants from the comparison.

- Systems: Stellar creation, Cash. Limit: +50% Cash during a quiet Stellar source.
- Source: current state. New ledger reset: Infinity.
- Interaction: snapshot source-rate branch.

**Better Offering** — `subskill.stellarImprovements.betterOffering` · specialization · depth 2 · 3 SP including prerequisites.

nativeFundedStellarCreationRate<1 enables .25 paid-Planet quote discount, including0 when generator is absent. Never require a positive Bot cost, since Fractured cost0 is lawful.

- Systems: Early Stellar state, Planet prices. Limit: 25% Planet Cash discount.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: price discount.

**Resourceful Ritual** — `subskill.stellarImprovements.resourcefulRitual` · specialization · depth 2 · 6 SP including prerequisites.

Native funded creation>0 refreshes one60-game-second .20 SRS speed window; Convergence and new grant packets cannot refresh. Shared new SRS cap+100%.

- Systems: Stellar source, SRS. Limit: +20% SRS speed.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="stellardominance"></a>
### Stellar Dominance

Base ID: `stellarDominance` · Ordinary base cost: 3 SP; Fractured base: 0 SP. **6 choices · entire menu 16 SP.**

**Branch design:** Long lifetimes support six royal choices: tribute, Galactic output, Solar, civic education, a bounded reserve reward and a long-reign megastructure capstone.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Tribute Fleet | 2 | 2 | Fractured parent | Each minute of successful Stellar Sacrifices grants 10 seconds of Space Factory output. | The tribute is arriving in very large crates. |
| Long Reign | 2 | 2 | Fractured parent | Panel Lifetime above 1 hour adds up to 100% Galactic Brain output. Bonuses are additive. | The reign has outlasted the calendar. |
| Solar Sovereign | 2 | 4 | Long Reign | Above 1 hour of Panel Lifetime, Solar Energy output rises 150%. Bonuses are additive. | The sun has accepted its new reporting structure. |
| Royal School | 2 | 4 | Tribute Fleet | Above 30 minutes of Panel Lifetime, education and Influence generation rise 50%. Bonuses are additive. | The royal curriculum includes avoiding heat death. |
| Tribute Reserve | 3 | 7 | Royal School | The first rewarded Black Hole each Infinity grants 1 minute of Cash production. | The treasury has survived an astronomical inconvenience. |
| Long Empire | 5 | 16 | Solar Sovereign, Tribute Reserve | Above 1 day of Panel Lifetime, Birch Planets gain 150% output and Black Holes grant 100% more Strange Matter. Bonuses are additive. | The dynasty is now measured in panel warranties. |

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Tribute Fleet** — `subskill.stellarDominance.tributeFleet` · entry · depth 1 · 2 SP including prerequisites.

Accumulate at most60 game seconds of positive native creation duration, including lawful zero-cost fractured creation, pause when unfunded. On60 grant10 native Space-Factory-output seconds and subtract60. Snapshot input/output, no launch replay.

- Systems: Stellar funding, Space Factories. Limit: +1/6 native Space Factory throughput.
- Source: current state. New ledger reset: Infinity.
- Interaction: funded-duration grant.

**Long Reign** — `subskill.stellarDominance.longReign` · entry · depth 1 · 2 SP including prerequisites.

b_Galactic=min(1,max(0,log10(Lifetime/3600))/2); boosts Galactic-to-Birch output only. Does not affect self-replication or Tinker source ceilings.

- Systems: Lifetime, Galactic Brains. Limit: +100% native Galactic output.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Solar Sovereign** — `subskill.stellarDominance.solarSovereign` · specialization · depth 2 · 4 SP including prerequisites.

DerivedLifetime>=3600 gives b_Solar=1.5; no Energy transfer or volley speed change.

- Systems: Panel Lifetime, Solar. Limit: +150% Solar output.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Royal School** — `subskill.stellarDominance.royalSchool` · specialization · depth 2 · 4 SP including prerequisites.

DerivedLifetime>=1800 gives b_Education=b_Influence=.5. Lifetime percentage sources combine first; no extra education grant tick.

- Systems: Panel Lifetime, Education, Influence. Limit: +50% education/Influence.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Tribute Reserve** — `subskill.stellarDominance.tributeReserve` · specialization · depth 3 · 7 SP including prerequisites.

First positive native Black Hole Strange Matter reward per Infinity consumes durable flag and grants60 native Cash seconds once. No positive Bot-cost condition or reward recursion.

- Systems: Black Holes, Cash. Limit: 60 Cash seconds per Infinity.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: finite production grant.

**Long Empire** — `subskill.stellarDominance.longEmpire` · capstone · depth 4 · 16 SP including prerequisites.

DerivedLifetime>=86400 enables b_BirchOutput=1.5,b_StrangeMatter=1. Ordinary link output only, fixed Galactic Brain replication lambda unchanged.

- Systems: Panel Lifetime, Birch Planets, Strange Matter. Limit: +150% Birch output; +100% Strange Matter.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="stellarobliteration"></a>
### Stellar Obliteration

Base ID: `stellarObliteration` · Ordinary base cost: 2 SP; Fractured base: 0 SP. **6 choices · entire menu 15 SP.**

**Branch design:** Six aftermath choices use actual Stellar creation or physical debris; the joint capstone raises bounded production without changing the native thousandfold galaxy factor.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Afterimage | 2 | 2 | Fractured parent | A successful Stellar Sacrifice adds 50% Research strength for 30 seconds. Bonuses are additive. | The instrument is still reporting a star. |
| Empty Sky | 1 | 1 | Fractured parent | After 5 minutes without successful Stellar creation, Simulation Solar output is 100% higher. Bonuses are additive. | The view is wonderfully unobstructed. |
| Remnant Census | 2 | 4 | Afterimage | Successful Stellar creation grants 2% Discovery progress per minute; before Discovery, gain 10 seconds of Science. | The ruins have been counted and peer reviewed. |
| Funeral Industry | 2 | 3 | Empty Sky | Physical panel decay adds up to 100% Simulation Factory output. Bonuses are additive. | The debris has been assigned to a productive department. |
| Ashen Bonds | 3 | 6 | Funeral Industry | After engulfing a Galaxy, megastructure Cash prices are 20% lower. | The bond is backed by several missing constellations. |
| New Constellations | 5 | 15 | Remnant Census, Ashen Bonds | With a Galactic Brain and all subjects complete, Stellar creation rises 200% and panels rise 150%. Bonuses are additive. | The sky has found something new to lose. |

**After Discovery**

- **Afterimage:** A successful Stellar Sacrifice enhances Discovery’s production bonus by 15% for 30 seconds. Bonuses are additive.
- **Remnant Census:** Successful Stellar creation grants 2% Discovery progress, up to once per minute.

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Afterimage** — `subskill.stellarObliteration.afterimage` · entry · depth 1 · 2 SP including prerequisites.

Refresh one30 game-second window; multiply only native paid facility-research bonus above1 by1.5. After Discovery add.15 strength enhancement instead. No generated-level strengthening.

- Systems: Stellar funding, Research. Limit: +50% paid research bonus strength; +15% Discovery enhancement.
- Source: current state. New ledger reset: Infinity.
- Interaction: finite source-qualified window.

**Empty Sky** — `subskill.stellarObliteration.emptySky` · entry · depth 1 · 1 SP including prerequisites.

b_Solar=1 after300 assigned game seconds without genuine funded Stellar creation; any positive native Stellar creation resets the timer, including lawful zero-cost creation.

- Systems: Stellar pacing, Simulation Solar. Limit: +100% Solar output.
- Source: current state. New ledger reset: Infinity.
- Interaction: assigned-time condition.

**Remnant Census** — `subskill.stellarObliteration.remnantCensus` · specialization · depth 2 · 4 SP including prerequisites.

One initially empty60-game-second token only when native funded Stellar creation>0. Before Discovery grant10 Science seconds; after grant raw.02 unfinished bar. Neither completion/grant can trigger itself.

- Systems: Stellar source, Science, Discovery. Limit: 10 Science seconds or .02 raw bar per game minute.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: paced raw-source grant.

**Funeral Industry** — `subskill.stellarObliteration.funeralIndustry` · specialization · depth 2 · 3 SP including prerequisites.

b_Factory=min(1,.025*log10(1+physicalDysonPanelsDecayed)); exclude Supermassive Panels’s extra credited decay and grants.

- Systems: Physical decay, Factories. Limit: +100% Factory output.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Ashen Bonds** — `subskill.stellarObliteration.ashenBonds` · specialization · depth 3 · 6 SP including prerequisites.

nativeEngulfedGalaxies>=1 enables .20 amount reduction on three mega quotes, sharing .50 cap. No exponent/index reduction or native galaxy-factor change.

- Systems: Galaxies, Megastructure prices. Limit: 20% mega Cash discount.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: price discount.

**New Constellations** — `subskill.stellarObliteration.newConstellations` · capstone · depth 4 · 15 SP including prerequisites.

Real totalGalacticBrains>0 and all six subject flags enable b_Stellar=2,b_Panels=1.5. Preserve native successful-creation eligibility and fixed replication source attribution.

- Systems: Education, Galactic Brains, Stellar Sacrifices, Panels. Limit: +200% Stellar creation; +150% panels.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="supernova"></a>
### Supernova

Base ID: `supernova` · Ordinary base cost: 4 SP; Fractured base: 0 SP. **6 choices · entire menu 16 SP.**

**Branch design:** The Fractured parent already restores manual production, so six choices distinguish actual paid infrastructure, generated stock, protected panels and energy-rich megastructure forging.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Ejecta | 2 | 2 | Fractured parent | Each facility gains output equal to its generated share, up to 100%. Bonuses are additive. | The debris has incorporated as a construction company. |
| Stellar Remnant | 2 | 2 | Fractured parent | Each Black Hole grants 15% more Strange Matter while you own a Galactic Brain. Bonuses are additive. | Something useful survived. Accounting is delighted. |
| Restored Order | 2 | 4 | Ejecta | With 100 paid Assembly Lines, facility research is 100% stronger. Bonuses are additive. | The paperwork has survived the explosion. |
| Ejecta Shield | 2 | 4 | Stellar Remnant | Keep 20% of unlaunched panels through a Black Hole while you own a Galactic Brain. | The explosion has included a useful protective layer. |
| Nova Furnace | 3 | 7 | Ejecta Shield | The first rewarded Black Hole each Quantum adds 150% Fusion output for 5 minutes. Bonuses are additive. | The furnace comes with one complimentary apocalypse. |
| Stellar Forge | 5 | 16 | Restored Order, Nova Furnace | With a Galactic Brain and Solar generators, megastructures gain 200% output and Factories gain 100%. Bonuses are additive. | The forge has successfully ignited its own galaxy. |

**After Discovery**

- **Restored Order:** With 100 paid Assembly Lines, Discovery strength is 30% stronger. Bonuses are additive.

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Ejecta** — `subskill.supernova.ejecta` · entry · depth 1 · 2 SP including prerequisites.

For each type independently, b_i=generated_i/max(1,total_i); native source bonus only. Does not alter the parent Fracture’s removal of manual-purchase suppression, and does not boost Brain replication.

- Systems: Generated facility share, Facility chain. Limit: +100% native output per link.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Stellar Remnant** — `subskill.supernova.stellarRemnant` · entry · depth 1 · 2 SP including prerequisites.

Bonus=.15*actual native launched-panel Black Hole reward if ownedGalactic>=1; no reward-on-reward computation or generated-panel double credit.

- Systems: Galactic Brains, Black Hole. Limit: +15% native Black Hole reward.
- Source: current state. New ledger reset: Infinity.
- Interaction: base reward only.

**Restored Order** — `subskill.supernova.restoredOrder` · specialization · depth 2 · 4 SP including prerequisites.

actualPaidLines>=100 enables b_FacilityResearch=1; no restoration of an already removed Fracture penalty. Discovery replaces with .30 shared strength enhancement.

- Systems: Paid purchases, Research strength, Discovery. Limit: +100% facility research; later +30% strength.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Ejecta Shield** — `subskill.supernova.ejectaShield` · specialization · depth 2 · 4 SP including prerequisites.

Require real totalGalacticBrains>0 at rewarded Black Hole ending snapshot. Add .20 to shared new panel retention, total.30 cap, apply once. Retained panels never count as launched or physical decay.

- Systems: Galactic Brains, Unlaunched panels, Black Holes. Limit: 20% entitlement; shared30% cap.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Dream.
- Interaction: retention.

**Nova Furnace** — `subskill.supernova.novaFurnace` · specialization · depth 3 · 7 SP including prerequisites.

One native positive-reward source flag per Quantum prepares300-game-second b_Fusion=1.5 window; actual reset may remove generators, so output needs rebuilding. Refunds cannot refill flag.

- Systems: Black Holes, Fusion Energy. Limit: +150% Fusion for 5 minutes once per Quantum.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Quantum.
- Interaction: bounded bonus.

**Stellar Forge** — `subskill.supernova.stellarForge` · capstone · depth 4 · 16 SP including prerequisites.

Real totalG>0 and nativeSolarStock>0 enables b_Mega=2,b_Factory=1. Fixed Brain population-replication lambda is excluded; no new Stellar/paid-count event.

- Systems: Galactic Brains, Solar, Megastructures, Factories. Limit: +200% ordinary mega output; +100% Factories.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>


## Ethics

<a id="paragon"></a>
### Paragon

Base ID: `paragon` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **5 choices · entire menu 12 SP.**

**Branch design:** A public-good branch links research virtue to influence, fair prices, open teaching and a completed-learning capstone with a Discovery replacement.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Public Funding | 2 | 2 | Fractured parent | Hunter, Gatherer and Solar Influence prices are 20% lower while all six subjects are studying or complete. | The grant application was almost comprehensible. |
| Common Good | 1 | 1 | Fractured parent | Each completed Simulation subject adds 5% Influence generation. Bonuses are additive. | The benefits have finally reached the public. |
| Public Consultation | 2 | 4 | Public Funding | Each completed subject reduces basic facility Cash prices by 2%, up to 12%. | The public meeting has reached a productive conclusion. |
| Open Treasury | 2 | 3 | Common Good | Cash Boost strength adds up to 100% education speed. Bonuses are additive. | The accounts have been published as a textbook. |
| Common Future | 5 | 12 | Public Consultation, Open Treasury | Fully educated Simulations add 200% Science production and 100% Strange Matter. Bonuses are additive. | The future has been approved for public use. |

**After Discovery**

- **Common Future:** Fully educated Simulations add 40% Discovery strength and 100% Strange Matter. Bonuses are additive.

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Public Funding** — `subskill.paragon.publicFunding` · entry · depth 1 · 2 SP including prerequisites.

Condition: every native subject is actively progressing or completed. d=.20 for the three named purchase quotes, within50% cap; no new unlocks.

- Systems: Education, Influence purchases. Limit: 20% Influence discount.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Common Good** — `subskill.paragon.commonGood` · entry · depth 1 · 1 SP including prerequisites.

b_Influence=.05*completedNativeSubjects, max6. Completed flags remain native and reset normally.

- Systems: Education, Reality. Limit: +30% Influence generation.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Public Consultation** — `subskill.paragon.publicConsultation` · specialization · depth 2 · 4 SP including prerequisites.

d_Basic=.02*completedNativeSubjects, shares .50 native quote ceiling. No vote-count cash creation or Catalyst/SP discount.

- Systems: Education, Basic facility prices. Limit: 12% basic Cash discount.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: price discount.

**Open Treasury** — `subskill.paragon.openTreasury` · specialization · depth 2 · 3 SP including prerequisites.

b_Education=min(1,.10*log10(1+nativeCashBoostMultiplier)), quoted before new strength channels. Does not disable Cash multipliers or grant research levels.

- Systems: Cash research, Education. Limit: +100% education.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Common Future** — `subskill.paragon.commonFuture` · capstone · depth 3 · 12 SP including prerequisites.

All six native completion flags enable b_Science=2,b_StrangeMatter=1. After Discovery replace Science with .40 shared strength enhancement; Black Hole native launched-panel source still required.

- Systems: Education, Science, Black Holes, Discovery. Limit: +200% Science; +100% Strange Matter; later +40% strength.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="renegade"></a>
### Renegade

Base ID: `renegade` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **4 choices · entire menu 9 SP.**

**Branch design:** Four choices suit a direct acquisition parent: hostile prices, rewarded Cash, launch-input leverage and an expensive acquisition spree.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Hostile Bid | 1 | 1 | Fractured parent | Fusion purchases cost 25% less Influence while Cash exceeds Science. | The negotiation included a suspiciously large reactor. |
| Golden Handshake | 2 | 2 | Fractured parent | A Black Hole grants 1 minute of Cash production, up to once every 10 minutes. | Your position has been made cosmically redundant. |
| Dirty Credit | 2 | 3 | Hostile Bid | While Cash exceeds Science, Space Factories consume 20% fewer Rockets. | The credit agreement is best read very quickly. |
| Acquisition Spree | 4 | 9 | Golden Handshake, Dirty Credit | Buying a Space Factory adds 150% megastructure output for 2 minutes. Bonuses are additive. | The acquisition has acquired another acquisition. |

**After Discovery**

- **Hostile Bid:** Fusion costs 25% less Influence while you hold one minute of Cash income.
- **Dirty Credit:** While Discovery is less than half full, Space Factories consume 20% fewer Rockets.

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Hostile Bid** — `subskill.renegade.hostileBid` · entry · depth 1 · 1 SP including prerequisites.

d_Fusion=.25 while Cash>Science. After Discovery use Cash>=60*nativeCashRate with positive rate. Same quote-growth index and shared50% cap.

- Systems: Cash reserve, Fusion purchase. Limit: 25% Fusion Influence discount.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Golden Handshake** — `subskill.renegade.goldenHandshake` · entry · depth 1 · 2 SP including prerequisites.

Positive native Black Hole reward requests60 native Cash-output seconds. One award per600 assigned game seconds; clock survives Dream reset, clears Infinity. Snapshot Cash rate before the reset; grants cannot fund another award.

- Systems: Black Hole, Cash. Limit: 60 native Cash seconds per600 game seconds.
- Source: current state. New ledger reset: Infinity.
- Interaction: nonrecursive reset reward.

**Dirty Credit** — `subskill.renegade.dirtyCredit` · specialization · depth 2 · 3 SP including prerequisites.

Positive actual Cash>Science enables .20 Rocket-input discount. After Discovery unfinished fraction<.5 is the condition; shared .50 quote cap and actual input debits apply.

- Systems: Cash balance, Space Factory inputs, Discovery. Limit: 20% Rocket-input discount.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: input discount.

**Acquisition Spree** — `subskill.renegade.acquisitionSpree` · capstone · depth 3 · 9 SP including prerequisites.

A settled native Space Factory purchase refreshes one120-game-second b_Mega=1.5 window. Actual Factory/Rocket debits must be represented; does not boost population-replication lambda.

- Systems: Space Factory purchases, Megastructures. Limit: +150% ordinary mega output for 2 minutes.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="saren"></a>
### Saren

Base ID: `saren` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **5 choices · entire menu 14 SP.**

**Branch design:** The five-choice fleet branch offers stored-panel targeting, Influence, a genuinely partial launch mode, worker-built Rockets and a joint Energy specialization.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Target Lock | 3 | 3 | Fractured parent | While active panels exceed decayed panels, Railgun volleys launch 25% more stored panels. Bonuses are additive. | The targeting system has developed a personal opinion. |
| Indoctrination | 1 | 1 | Fractured parent | Tinker adds 50% Influence generation for 30 seconds. Bonuses are additive. | The motivational poster is looking directly at you. |
| Precision Strike | 3 | 6 | Target Lock | Railguns can fire partial volleys using the panels and Energy available. | The fleet has developed an alarming degree of precision. |
| Indoctrinated Fleet | 2 | 3 | Indoctrination | With at least half your Bots as Workers, Rocket output rises 150%. Bonuses are additive. | The fleet has memorized the entire recruitment speech. |
| Sovereign Fleet | 5 | 14 | Precision Strike, Indoctrinated Fleet | With Solar and Fusion generators, Energy output and Space Factory output rise 150%. Bonuses are additive. | The fleet has declared independence from the power bill. |

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Target Lock** — `subskill.saren.targetLock` · entry · depth 1 · 3 SP including prerequisites.

b_VolleyPayload=.25 when physicalActivePanels>physicalDecayThisInfinity; pay full native charge per extra panel and debit actual stored panels. The eligible per-volley mechanical ceiling becomes1.25*native ceiling; the desired charge reserve scales identically and transfers real Energy. Previously stored charge never revalues. No free payload.

- Systems: Panel balance, Railgun. Limit: +25% payload within funded capacity.
- Source: current state. New ledger reset: Infinity.
- Interaction: funded source transfer.

**Indoctrination** — `subskill.saren.indoctrination` · entry · depth 1 · 1 SP including prerequisites.

One30-game-second window, b_Influence=.5; successful native Tinker refreshes without stacking. Influence follows the current canonical caller clock. No offline Tinker or replay grant.

- Systems: Tinker, Reality. Limit: +50% Influence for30 game seconds.
- Source: current state. New ledger reset: Infinity.
- Interaction: finite base-clock window.

**Precision Strike** — `subskill.saren.precisionStrike` · specialization · depth 2 · 6 SP including prerequisites.

Optional partial mode chooses actual payload<=nativeMechanicalPayload from represented panel and charge stocks. Requote/debit Energy for that payload, never launch with zero/rounded-away debit. Keep native shot timing and outstanding-shot state; successful partial action is real, reward buckets still cap triggers.

- Systems: Railgun automation, Panels, Energy. Limit: native maximum payload/timing; no free input.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Dream.
- Interaction: resource-conserving action variant.

**Indoctrinated Fleet** — `subskill.saren.indoctrinatedFleet` · specialization · depth 2 · 3 SP including prerequisites.

workerFraction>=.5 enables b_SimulationBotRocket=1.5. Actual Simulation Bot source/unlock required; no raw IDS Bots consumed or magically launched.

- Systems: Workers, Simulation Bots, Rockets. Limit: +150% Rocket output.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Sovereign Fleet** — `subskill.saren.sovereignFleet` · capstone · depth 3 · 14 SP including prerequisites.

Both native generator stocks>0 enable b_Solar=b_Fusion=b_SpaceFactory=1.5. Native input costs remain conservative, partial mode never creates a free volley.

- Systems: Energy infrastructure, Space Factories. Limit: +150% Solar/Fusion/Space Factory output.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="shepherd"></a>
### Shepherd

Base ID: `shepherd` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **5 choices · entire menu 13 SP.**

**Branch design:** A protective five-choice tree covers real panel retention, slow learners, launch escorts, actual absence and a patient energy capstone.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Safe Harbour | 3 | 3 | Fractured parent | Keep 10% of stored, unlaunched panels through a Black Hole. | Please remain inside the universe until it has stopped moving. |
| Guiding Star | 2 | 2 | Fractured parent | Panel Lifetime above 10 minutes makes your slowest Simulation subject 100% faster. Bonuses are additive. | For navigation purposes, please keep the star alive. |
| Escort Detail | 2 | 5 | Safe Harbour | After Shipping completes, Space Factories consume 15% fewer Rockets. | The escort has requested a slightly smaller fuel budget. |
| Sleeping Watch | 2 | 4 | Guiding Star | Returning after an hour away adds 100% panel production for 5 minutes. Bonuses are additive. | The watch kept its eyes closed for efficiency. |
| Good Shepherd | 4 | 13 | Escort Detail, Sleeping Watch | Above 1 day of Panel Lifetime, the slowest subject is 200% faster and Solar output rises 100%. Bonuses are additive. | The flock now expects a very long retirement. |

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Safe Harbour** — `subskill.shepherd.safeHarbour` · entry · depth 1 · 3 SP including prerequisites.

Retain.10*unlaunchedPanels, summed with Replacement Stock but capped30% across all new retention. Reward uses launched panels only; retained panels remain excluded until actually launched later.

- Systems: Simulation panels, Black Hole. Limit: 10% unlaunched-panel retention.
- Source: current state. New ledger reset: Dream run.
- Interaction: reward and retention partition.

**Guiding Star** — `subskill.shepherd.guidingStar` · entry · depth 1 · 2 SP including prerequisites.

b_SlowestSubject=1 ifLifetime>=600; stable subject choice by greatest remaining native completion time; switches on completion.

- Systems: Lifetime, Education. Limit: +100% to one subject.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Escort Detail** — `subskill.shepherd.escortDetail` · specialization · depth 2 · 5 SP including prerequisites.

Native Shipping-complete flag enables .15 Rocket-input discount, shared .50 cap. An extra progress packet cannot invent prerequisite completion rewards.

- Systems: Education, Space Factory inputs. Limit: 15% Rocket-input discount.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: input discount.

**Sleeping Watch** — `subskill.shepherd.sleepingWatch` · specialization · depth 2 · 4 SP including prerequisites.

One genuine>=3600-real-second absence prepares a300-game-second b_Panels=1 window; overlap refreshes maximum duration once, never repeats already accepted absence IDs.

- Systems: Stored Time, Panels. Limit: +100% panels for 5 minutes.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Quantum.
- Interaction: absence window.

**Good Shepherd** — `subskill.shepherd.goodShepherd` · capstone · depth 3 · 13 SP including prerequisites.

DerivedLifetime>=86400 enables b_SlowestEducation=2,b_Solar=1. Target selected by native unfinished fraction with stable subject-ID tie-break, one target only; raw grants are not accelerated.

- Systems: Panel Lifetime, Education, Solar. Limit: +200% one subject; +100% Solar.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="citadelcouncil"></a>
### Citadel Council

Base ID: `citadelCouncil` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **6 choices · entire menu 15 SP.**

**Branch design:** A six-choice governance branch offers education-led planets, continuity, public records, researched prices, recess support and a galaxy-backed mandate.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Council Session | 1 | 1 | Fractured parent | Each completed Simulation subject adds 10% Planet output, up to 60%. Bonuses are additive. | The minutes will be available in six geological eras. |
| Continuity Plan | 3 | 3 | Fractured parent | An Infinity preserves up to 1 minute of earned Android and Pocket Android warm-up. | The council has voted to continue warming the chairs. |
| Public Record | 2 | 3 | Council Session | Each completed subject adds 5% facility research strength, up to 30%. Bonuses are additive. | The minutes have been filed in a surviving galaxy. |
| Fast Track Motion | 2 | 5 | Public Record | Above 1 hour of Panel Lifetime, your first Planet research level each minute costs 25% less. | The motion has been fast-tracked through three committees. |
| Council Recess | 2 | 5 | Continuity Plan | After 10 minutes without Tinkering, Pocket output rises 100% and Panel Lifetime rises 50%. Bonuses are additive. | The council will reconvene after a short geological recess. |
| Galactic Mandate | 5 | 15 | Fast Track Motion, Council Recess | With an engulfed Galaxy and all subjects complete, Planets gain 200% output and Influence rises 100%. Bonuses are additive. | The council’s jurisdiction now includes the sky. |

**After Discovery**

- **Public Record:** Each completed subject adds 2.5% Discovery strength, up to 15%. Bonuses are additive.
- **Fast Track Motion:** Above 1 hour of Panel Lifetime, your first paid Planet each minute costs 25% less.

**After Enlightenment**

- **Council Session:** Each completed Simulation subject adds 10% Planet output and 2% Enlightenment speed. Bonuses are additive.
- **Galactic Mandate:** With a Galaxy and all subjects complete, Planets rise 200%, Influence rises 100%, and Enlightenment is 10% faster. Bonuses are additive.

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Council Session** — `subskill.citadelCouncil.councilSession` · entry · depth 1 · 1 SP including prerequisites.

b_Planet=.10*completedSubjects, max6; Planets producing Data Centers only. Enlightenment variant keeps the Planet bonus and adds.02*completedSubjects (maximum.12) directly to Enlightenment speed; no second tree weight.

- Systems: Education, Planets. Limit: +60% native Planet output.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Continuity Plan** — `subskill.citadelCouncil.continuityPlan` · entry · depth 1 · 3 SP including prerequisites.

For each parent timer retain min(60,nativeEarnedTimer); combine with Warm Spare by max, never addition. Required parent must remain owned; Quantum clears.

- Systems: Warm-up skills, Infinity. Limit: 60 seconds retained per parent.
- Source: current state. New ledger reset: Quantum.
- Interaction: nonstacking timer retention.

**Public Record** — `subskill.citadelCouncil.publicRecord` · specialization · depth 2 · 3 SP including prerequisites.

b_FacilityResearch=.05*completedNativeSubjects. After Discovery replace with .025*count shared strength enhancement, max.15; no retained completed reward.

- Systems: Education, Research strength, Discovery. Limit: +30% research; later +15% strength.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Fast Track Motion** — `subskill.citadelCouncil.fastTrackMotion` · specialization · depth 3 · 5 SP including prerequisites.

Before Discovery: DerivedLifetime>=3600 enables one initially empty native Planet-research coupon token per60 game seconds, .25 reduction to one true level quote; .50 cap.
After Discovery: Lifetime>=3600 enables one initially empty coupon token per60 game seconds; .25 reduction to one native Planet Cash quote, shared.50 cap. No retired research purchase.

- Systems: Panel Lifetime, Planet research prices. Limit: one 25% coupon per minute.
- Discovery limit: one25% Planet coupon per minute.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: paced coupon.

**Council Recess** — `subskill.citadelCouncil.councilRecess` · specialization · depth 2 · 5 SP including prerequisites.

Native Tinker-completion age>=600 enables b_Pocket=1,b_Lifetime=.5. Absence itself does not also advance production; clocks use processed game time.

- Systems: Waiting, Pocket Dimensions, Panel Lifetime. Limit: +100% Pocket; +50% Lifetime.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Galactic Mandate** — `subskill.citadelCouncil.galacticMandate` · capstone · depth 4 · 15 SP including prerequisites.

NativeGalaxyCount>=1 and all six subject flags enable b_Planet=2,b_Influence=1. After Enlightenment unlock, additionally final+.10 Enlightenment speed; tier-specific, no further quarter weighting, shared later-tier speed channel.

- Systems: Galaxies, Education, Planets, Influence, Enlightenment. Limit: +200% Planet; +100% Influence; later +10% Enlightenment.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="reapers"></a>
### Reapers

Base ID: `reapers` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **5 choices · entire menu 14 SP.**

**Branch design:** A five-choice harvest branch uses actual decay, first Quantum rewards, earned purchase credits, thermal salvage and preserved machines rather than credited-decay multiplication.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Harvest Schedule | 2 | 2 | Fractured parent | Every 30 tenfold increases in physical panels decayed adds 100% Simulation Rocket output, up to 200%. Bonuses are additive. | The harvest forecast includes a meteor shower. |
| Final Collection | 3 | 3 | Fractured parent | The first Black Hole each Quantum grants 25% more Strange Matter. Bonuses are additive. | One last collection before the universe closes. |
| Harvest Return | 2 | 5 | Final Collection | A rewarded Black Hole discounts your next two Solar purchases by 25%. | The harvest included two useful receipts. |
| Thorough Harvest | 2 | 4 | Harvest Schedule | Physical panel decay adds up to 150% Solar and Fusion output. Bonuses are additive. | The collectors have found some heat between the ruins. |
| Machine Afterlife | 5 | 14 | Harvest Return, Thorough Harvest | Keep one Fusion generator and one Simulation Bot through a Black Hole. | The machines have submitted a plan for the afterlife. |

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Harvest Schedule** — `subskill.reapers.harvestSchedule` · entry · depth 1 · 2 SP including prerequisites.

b_Rockets=min(2,log10(1+physicalDecayThisInfinity)/30); native Simulation Bots-to-Rockets only.

- Systems: Decay, Simulation Rockets. Limit: +200% native Rocket output.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Final Collection** — `subskill.reapers.finalCollection` · entry · depth 1 · 3 SP including prerequisites.

One per-Quantum entitlement; positive actual native Black Hole reward required; bonus.25*native reward. Assignment after an earlier Black Hole does not restore entitlement.

- Systems: Black Hole, Quantum. Limit: +25% on one native Black Hole reward.
- Source: current state. New ledger reset: Quantum.
- Interaction: one-shot reward ledger.

**Harvest Return** — `subskill.reapers.harvestReturn` · specialization · depth 2 · 5 SP including prerequisites.

Each actual positive native Black Hole reward prepares max two Solar Influence coupons, no accumulation above2; .25 reduction shares .50 cap. Coupons require and consume real native purchases.

- Systems: Black Holes, Solar prices. Limit: two 25% coupons outstanding.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Quantum.
- Interaction: finite-source coupon.

**Thorough Harvest** — `subskill.reapers.thoroughHarvest` · specialization · depth 2 · 4 SP including prerequisites.

b_Solar=b_Fusion=min(1.5,.05*log10(1+physicalDysonPanelsDecayed)); Supermassive Panels’s extra credited decay excluded from thermal source.

- Systems: Physical decay, Energy. Limit: +150% Solar/Fusion.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Machine Afterlife** — `subskill.reapers.machineAfterlife` · capstone · depth 3 · 14 SP including prerequisites.

At actual positive-reward Black Hole retain min(1,endingFusionStock), min(1,endingSimulationBotStock), each by max against competing stock retention. Original purchases/production must be real; no new unlock or trigger.

- Systems: Black Holes, Fusion, Simulation Bots. Limit: one retained Fusion and one retained Simulation Bot.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Dream.
- Interaction: retention.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>


## Purity

<a id="purityofbody"></a>
### Purity of Body

Base ID: `purityOfBody` · Ordinary base cost: 2 SP; Fractured base: 0 SP. **4 choices · entire menu 8 SP.**

**Branch design:** Four body choices force a real spent-versus-unspent tradeoff: rested factories, occasional Tinker, careful launch Energy and patient production.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Resting Hands | 1 | 1 | Fractured parent | Each unspent Skill Point adds 2% Simulation Factory output, up to 80%. Bonuses are additive. | Rest is an essential part of the assembly process. |
| Minimal Motion | 2 | 2 | Fractured parent | With at least 10 unspent Skill Points, Tinker grants 10 seconds of Assembly Line output, once per minute. | One movement. A surprising amount of paperwork. |
| Gentle Routine | 2 | 3 | Resting Hands | With at least 20 unspent Skill Points, Railgun Energy prices are 25% lower. | The exercise routine contains very few explosions. |
| Unhurried Labour | 3 | 8 | Minimal Motion, Gentle Routine | With at least 20 unspent Skill Points and 5 minutes without Tinkering, Factories produce 150% more. Bonuses are additive. | The factory has learned the value of doing less. |

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Resting Hands** — `subskill.purityOfBody.restingHands` · entry · depth 1 · 1 SP including prerequisites.

b_Factory=min(.8,.02*unspentSP); no virtual points, no effect on Swarm Bot count.

- Systems: Unspent points, Simulation Factories. Limit: +80% Factory output.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Minimal Motion** — `subskill.purityOfBody.minimalMotion` · entry · depth 1 · 2 SP including prerequisites.

Actual Tinker and SP>=10; 60 assigned-game-second cooldown. Grant10 native Line-to-Bot seconds, not usual Tinker yield times another factor.

- Systems: Unspent points, Tinker, Bots. Limit: +1/6 native Line throughput.
- Source: current state. New ledger reset: Infinity.
- Interaction: nonrecursive grant.

**Gentle Routine** — `subskill.purityOfBody.gentleRoutine` · specialization · depth 2 · 3 SP including prerequisites.

Actual unspentSP>=20 gives .25 final Railgun Energy quote discount, .50 shared cap; proposed reserved/spent SP excluded.

- Systems: Unspent SP, Railgun Energy. Limit: 25% Energy discount.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: price discount.

**Unhurried Labour** — `subskill.purityOfBody.unhurriedLabour` · specialization · depth 3 · 8 SP including prerequisites.

Actual S>=20 and native lastTinkerAge>=300 give b_Factory=1.5. No SP refund effect, no extra absence credit, native Factory production inputs/timing remain.

- Systems: Unspent SP, Waiting, Factories. Limit: +150% Factory output.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="purityofmind"></a>
### Purity of Mind

Base ID: `purityOfMind` · Ordinary base cost: 2 SP; Fractured base: 0 SP. **4 choices · entire menu 8 SP.**

**Branch design:** The mind branch keeps only four choices because every extra purchase weakens its parent: slow education, quiet research, patient prices and open Simulation access.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Empty Timetable | 1 | 1 | Fractured parent | Each unspent Skill Point adds 2% speed to the slowest Simulation subject, up to 80%. Bonuses are additive. | No lectures. Somehow, excellent attendance. |
| Quiet Scholarship | 2 | 2 | Fractured parent | With at least 20 unspent Skill Points, percentage research costs 25% less. | The scholarship requires remarkably little participation. |
| Quiet Calendar | 2 | 4 | Quiet Scholarship | With 20 unspent Skill Points and 5 minutes without research purchases, facility Cash prices are 15% lower. | The calendar has declined most of its invitations. |
| Open Mind | 3 | 8 | Empty Timetable, Quiet Calendar | With at least 20 unspent Skill Points, Hunter, Gatherer and Community Influence prices are 25% lower. | There is plenty of room for another idea. |

**After Discovery**

- **Quiet Scholarship:** With at least 20 unspent Skill Points, Discovery is 25% faster. Bonuses are additive.
- **Quiet Calendar:** With 20 unspent SP and 5 minutes without Tinkering, facility Cash prices are 15% lower.

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Empty Timetable** — `subskill.purityOfMind.emptyTimetable` · entry · depth 1 · 1 SP including prerequisites.

b_Slowest=min(.8,.02*unspentSP); donor-free natural speed only; stable slowest-subject selection.

- Systems: Unspent points, Education. Limit: +80% to one subject.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Quiet Scholarship** — `subskill.purityOfMind.quietScholarship` · entry · depth 1 · 2 SP including prerequisites.

d_Research=.25 ifunspentSP>=20, within50%newdiscountcap. Discovery variant adds.25 speed under samecondition. No extra points retained or loaned.

- Systems: Unspent points, Research prices. Limit: 25% research discount; +25% Discovery speed.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Quiet Calendar** — `subskill.purityOfMind.quietCalendar` · specialization · depth 2 · 4 SP including prerequisites.

Before Discovery: Actual S>=20 and age since true paid research>=300 gives .15 facility Cash discount.
After Discovery: Actual unspentSP>=20 and age since native Tinker completion>=300 gives.15 facility Cash discount. No retired research inactivity or TP purchase requirement.

- Systems: Unspent SP, Waiting, Facility prices. Limit: 15% facility Cash discount.
- Discovery limit: 15% facility Cash discount.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: price discount.

**Open Mind** — `subskill.purityOfMind.openMind` · specialization · depth 3 · 8 SP including prerequisites.

Actual S>=20 gives .25 amount reduction to three native Influence quotes, shares .50 cap. Native subject/unlock guards must still pass.

- Systems: Unspent SP, Influence prices. Limit: 25% three Simulation discounts.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: price discount.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="purityofsessence"></a>
### Purity of Essence

Base ID: `purityOfSEssence` · Ordinary base cost: 3 SP; Fractured base: 0 SP. **5 choices · entire menu 11 SP.**

**Branch design:** Five essence choices prioritize useful off-chain effects while charging their real cost against the steep native Purity curve; no spent point is counted twice.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Still Water | 2 | 2 | Fractured parent | Each unspent Skill Point adds 1% Strange Matter from Black Holes, up to 40%. Bonuses are additive. | Nothing stirred. The universe still collapsed. |
| Clear Conscience | 1 | 1 | Fractured parent | With at least 20 unspent Skill Points, Solar and Fusion Influence prices are 25% lower. | The energy policy has very few moving parts. |
| Unclouded Research | 2 | 4 | Still Water | Each unspent Skill Point adds 1% facility research strength, up to 40%. Bonuses are additive. | The research contains remarkably little baggage. |
| Clear Horizon | 2 | 3 | Clear Conscience | With at least 24 unspent Skill Points, megastructures gain 100% output. Bonuses are additive. | The horizon is easier to see without a shopping list. |
| Inner Universe | 4 | 11 | Unclouded Research, Clear Horizon | With at least 24 unspent Skill Points, education and Factory output rise 150%. Bonuses are additive. | There is a very productive universe in all this silence. |

**After Discovery**

- **Unclouded Research:** Each unspent Skill Point adds 0.5% Discovery strength, up to 20%. Bonuses are additive.

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Still Water** — `subskill.purityOfSEssence.stillWater` · entry · depth 1 · 2 SP including prerequisites.

bonus=min(.4,.01*unspentSP)*nativeBlackHoleReward; additive reward channel only, no effect on Essence basecurve.

- Systems: Unspent points, Strange Matter. Limit: +40% native Black Hole reward.
- Source: current state. New ledger reset: Infinity.
- Interaction: base reward only.

**Clear Conscience** — `subskill.purityOfSEssence.clearConscience` · entry · depth 1 · 1 SP including prerequisites.

d_Solar=d_Fusion=.25 atSP>=20; ordinary costs and purchase counts; no virtual SP and shared50%discount ceiling.

- Systems: Unspent points, Simulation Energy investment. Limit: 25% Influence purchase discount.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Unclouded Research** — `subskill.purityOfSEssence.uncloudedResearch` · specialization · depth 2 · 4 SP including prerequisites.

b_FacilityResearch=min(.40,.01*actualUnspentSP). After Discovery use .005*S strength enhancement, cap.20. Show native Purity loss separately when comparing purchase.

- Systems: Unspent SP, Research strength, Discovery. Limit: +40% research; later +20% strength.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Clear Horizon** — `subskill.purityOfSEssence.clearHorizon` · specialization · depth 2 · 3 SP including prerequisites.

Actual S>=24 gives b_Mega=1; fixed Galactic replication lambda is excluded. New retained points or a reservation never qualify as unspent.

- Systems: Unspent SP, Megastructures. Limit: +100% ordinary mega output.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Inner Universe** — `subskill.purityOfSEssence.innerUniverse` · capstone · depth 3 · 11 SP including prerequisites.

Actual S>=24 gives b_Education=b_Factory=1.5. Include full prerequisite closure cost in S, and compare against native Essence(42-spent); no automatic dominance claim.

- Systems: Unspent SP, Education, Factories. Limit: +150% education/Factory output.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>


## Reserves

<a id="banking"></a>
### Banking

Base ID: `banking` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **3 choices · entire menu 9 SP.**

**Branch design:** Three reserve choices are sufficient for a one-point banking parent: short Cash carry, first-purchase pricing and a deeper Quantum deposit; none creates new SP.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Opening Balance | 3 | 3 | Fractured parent | Retain up to 20 seconds of unspent Cash income through Infinity, capped at 1 trillion. | New universe. Existing customer. |
| Standing Order | 2 | 2 | Fractured parent | After each Infinity, your first paid facility purchase of each type costs 20% less. | Eight regular payments. One very irregular universe. |
| Long Term Deposit | 4 | 9 | Opening Balance, Standing Order | Keep up to 1 minute of Cash income through Quantum, capped at 1 billion. | The account has survived a change of universe. |

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Opening Balance** — `subskill.banking.openingBalance` · entry · depth 1 · 3 SP including prerequisites.

Carry min(Cash,20*nativeCashRate,1e12). Merge any future Cash retention by maximum entitlement against the same snapshot, not addition.

- Systems: Cash, Infinity. Limit: 20 Cash seconds, at most1e12.
- Source: current state. New ledger reset: Quantum.
- Interaction: nonstacking resource retention.

**Standing Order** — `subskill.banking.standingOrder` · entry · depth 1 · 2 SP including prerequisites.

Eight separate first-paid flags per Infinity;20% discount within50%cap; retained stock/grants do not use or retrigger a flag.

- Systems: Infinity, Facility purchases. Limit: 20% on first purchase of each type.
- Source: current state. New ledger reset: Infinity.
- Interaction: one-shot quote discount.

**Long Term Deposit** — `subskill.banking.longTermDeposit` · capstone · depth 2 · 9 SP including prerequisites.

At ending Quantum retain min(endingCash,60*nativeCashRate,1e9), by maximum against other Quantum Cash retentions. Requires ending ownership, consume once. Does not add banked SP or carry any purchased facility identity.

- Systems: Cash, Quantum. Limit: 1e9 Cash or60 native Cash seconds.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Transcendence.
- Interaction: retention.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="investmentportfolio"></a>
### Investment

Base ID: `investmentPortfolio` · Ordinary base cost: 1 SP; Fractured base: 0 SP. **4 choices · entire menu 9 SP.**

**Branch design:** A four-choice portfolio contrasts broad ownership, a long run, paid mega gains and research diversification rather than inventing more skill-point banking.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Diversification | 2 | 2 | Fractured parent | Each facility type with 100 paid purchases adds 5% Cash, Science and Bot production. Bonuses are additive. | The portfolio contains several physical planets. |
| Fixed Term | 1 | 1 | Fractured parent | After 10 minutes without an Infinity, Cash production is 100% higher. Bonuses are additive. | Early withdrawal may destroy the universe. |
| Capital Gains | 2 | 3 | Fixed Term | Each paid megastructure type adds 50% Cash and Science production, up to 150%. Bonuses are additive. | The portfolio has acquired a taste for large structures. |
| Indexed Research | 4 | 9 | Diversification, Capital Gains | Owning 100 paid purchases of every facility makes facility research 100% stronger and 20% cheaper. Bonuses are additive. | The index now includes the entire observable economy. |

**After Discovery**

- **Diversification:** Each facility type with 100 paid purchases adds 5% Cash and Bots, and 2% Discovery speed. Bonuses are additive.
- **Capital Gains:** Each paid megastructure type adds 50% Cash production and 10% tree speed, up to 150% and 30%. Bonuses are additive.
- **Indexed Research:** With 100 paid purchases of every facility, Discovery strength rises 30% and education is 50% faster. Bonuses are additive.

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Diversification** — `subskill.investmentPortfolio.diversification` · entry · depth 1 · 2 SP including prerequisites.

b_Cash=b_Science=b_Bots=.05*count(truePaid>=100), max.4; Discovery uses.02 speed pertype max.16 instead of Science.

- Systems: Purchase breadth, Resources. Limit: +40% Cash/Science/Bots; +16% Discovery speed.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Fixed Term** — `subskill.investmentPortfolio.fixedTerm` · entry · depth 1 · 1 SP including prerequisites.

b_Cash=1 after600 assigned game seconds thisInfinity; Infinity clears, refund pauses; no bonus to the IP reward or banked Skill Points.

- Systems: Long runs, Cash. Limit: +100% Cash.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded time gate.

**Capital Gains** — `subskill.investmentPortfolio.capitalGains` · specialization · depth 2 · 3 SP including prerequisites.

Count native actualPaid>0 across three mega types. b_Cash=b_Science=.50*count. After Discovery Science becomes shared .10*count tree speed, cap.30.

- Systems: Paid megastructure diversity, Cash, Science, Discovery. Limit: +150% Cash/Science; later +30% tree speed.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Indexed Research** — `subskill.investmentPortfolio.indexedResearch` · capstone · depth 3 · 9 SP including prerequisites.

Before Discovery: All eight actual paid counts>=100 enables b_FacilityResearch=1 and .20 research quote discount, shares .50 cap.
After Discovery: All eight actual paid counts>=100 enables .30 shared native strength enhancement and b_Education=.5. Neither startingPower nor any TP price changes.

- Systems: Paid facility diversity, Research, Discovery. Limit: +100% research;20% price reduction; later +30% strength.
- Discovery limit: +30% strength; +50% education.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="idleelectricsheep"></a>
### Idle Electric Sheep

Base ID: `idleElectricSheep` · Ordinary base cost: 2 SP; Fractured base: 0 SP. **6 choices · entire menu 15 SP.**

**Branch design:** Six absence choices separate real away-time entitlements, education recovery, bank-spending charge, capacity overflow, worked-through stored hours and dream machinery.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Counting Sheep | 2 | 2 | Fractured parent | Each real hour away prepares 1 minute of 100% extra facility output, up to 10 minutes. Bonuses are additive. | The flock has counted you instead. |
| Dream Journal | 2 | 2 | Fractured parent | Returning after an hour away advances each unfinished Simulation subject by 2 minutes. | You wrote it down before the universe forgot. |
| Dream Logic | 2 | 4 | Counting Sheep | SRS charges 25% faster while spending Stored Time. Bonuses are additive. | The sheep have solved a difficult physics problem. |
| Lost Sleep | 2 | 4 | Dream Journal | Time beyond your Stored Time capacity grants unfinished subjects up to 2 minutes of progress on return. | The overflow has been recorded as a dream. |
| Counting Stars | 3 | 7 | Dream Logic | Each processed hour of Stored Time adds 25% megastructure output, up to 100%, while spending Stored Time. Bonuses are additive. | The sheep have started counting larger objects. |
| Dreaming of Machines | 4 | 15 | Lost Sleep, Counting Stars | While spending Stored Time, Factory output and Simulation Rocket output rise 150%. Bonuses are additive. | The dream has filled in a purchase requisition. |

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Counting Sheep** — `subskill.idleElectricSheep.countingSheep` · entry · depth 1 · 2 SP including prerequisites.

Earn60 game seconds of +1 native facility output per3600 genuine away seconds, cap600. Consume only during active processing; no award from Stored Time, replay or idleSheep doubled credit. Brain duplication excluded.

- Systems: Real absence, Return burst. Limit: 600 game seconds of +100% native output.
- Source: current state. New ledger reset: Infinity.
- Interaction: away-earned single-use bank.

**Dream Journal** — `subskill.idleElectricSheep.dreamJournal` · entry · depth 1 · 2 SP including prerequisites.

One120 raw-progress grant per genuine absence>=3600 real seconds; no scaling by away length, education speed or bank multiplier; existing progress is not reset.

- Systems: Real absence, Education. Limit: 120 base progress per subject per qualifying return.
- Source: current state. New ledger reset: Infinity.
- Interaction: nonrecursive away event.

**Dream Logic** — `subskill.idleElectricSheep.dreamLogic` · specialization · depth 2 · 4 SP including prerequisites.

source=stored-time gives b_SrsCharging=.25, shared new speed cap+100%. No bank-credit multiplier or extra real-time simulation.

- Systems: Stored Time, SRS. Limit: +25% SRS charging.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Lost Sleep** — `subskill.idleElectricSheep.lostSleep` · specialization · depth 2 · 4 SP including prerequisites.

From the same accepted absence ledger, each real hour genuinely rejected for full bank earns30 raw base education seconds per unfinished subject, total120 each per return. Count real discarded interval, not doubled credited-bank units. External interval IDs remain deduplicated across refunds/resets.

- Systems: Real absence overflow, Education. Limit: 120 base seconds per unfinished subject per accepted return.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Transcendence.
- Interaction: bounded external-source grant.

**Counting Stars** — `subskill.idleElectricSheep.countingStars` · specialization · depth 3 · 7 SP including prerequisites.

Accumulate actual processed base seconds with source=stored-time; b_Mega=min(1,.25*floor(processedStored/3600)) only during spending. Quantum clears counter, Convergence lambda remains fixed.

- Systems: Processed Stored Time, Megastructures. Limit: +100% ordinary mega output.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Quantum.
- Interaction: bounded bonus.

**Dreaming of Machines** — `subskill.idleElectricSheep.dreamingOfMachines` · capstone · depth 4 · 15 SP including prerequisites.

source=stored-time gives b_Factory=b_SimulationRockets=1.5. Native production inputs/unlocks stay enforced; true absence is credited once through the bank.

- Systems: Stored Time, Factories, Simulation Bots. Limit: +150% Factory/Rocket output.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>

<a id="avocados"></a>
### Avocados

Base ID: `avocados` · Ordinary base cost: 2 SP; Fractured base: 0 SP. **5 choices · entire menu 11 SP.**

**Branch design:** The five-choice fruit branch connects the native sixty-nine milestone to paid research coupons, a genuine balanced diet and a late ripeness capstone.

| Augment | SP | Entry SP | Requires | Technical description | Flavour |
| --- | ---: | ---: | --- | --- | --- |
| Ripe at Last | 1 | 1 | Fractured parent | At 69 paid purchases, each facility gains 69% output. Bonuses are additive. | Please squeeze the galaxy gently. |
| Balanced Diet | 2 | 2 | Fractured parent | After feeding all three foods to Avocato this Quantum, Influence generation is 100% higher. Bonuses are additive. | A balanced meal contains three kinds of impossibility. |
| Seed Funding | 2 | 3 | Ripe at Last | At 69 paid purchases, each facility discounts its next five research levels by 50%. | The seed round was unusually delicious. |
| Slow Ripening | 2 | 4 | Balanced Diet | After a balanced Avocato diet and 30 minutes without Quantum, Influence rises 100% and Black Hole rewards rise 50%. Bonuses are additive. | The fruit has decided to take its time. |
| Perfect Ripeness | 4 | 11 | Seed Funding, Slow Ripening | Each facility with 69 paid purchases adds 5% education speed; those facilities gain 100% output. Bonuses are additive. | The timing is perfect. The universe is questionable. |

**After Discovery**

- **Seed Funding:** At 69 paid purchases, each facility discounts its next five purchases by 25%.

<details>
<summary>Formulas, sources, boundaries and reset state</summary>

**Ripe at Last** — `subskill.avocados.ripeatLast` · entry · depth 1 · 1 SP including prerequisites.

Per type b_i=.69 attruePaid_i>=69; no virtual Terra counts, no effect on duplication. This is in the shared newbonus channel, not another multiplicative purchase layer.

- Systems: Paid purchases, Facility chain. Limit: +69% native output per qualifying type.
- Source: current state. New ledger reset: Infinity.
- Interaction: bounded bonus.

**Balanced Diet** — `subskill.avocados.balancedDiet` · entry · depth 1 · 2 SP including prerequisites.

Require positive actual debits of IP,Influence,StrangeMatter since Quantum while assigned. Flagset3 givesb_Influence=1; no food refund, feed multiplier or free SP.

- Systems: Avocato, Reality. Limit: +100% Influence generation.
- Source: current state. New ledger reset: Quantum.
- Interaction: positive debit feed ledger.

**Seed Funding** — `subskill.avocados.seedFunding` · specialization · depth 2 · 3 SP including prerequisites.

Before Discovery: Each facility’s first crossing of69 actual paid purchases prepares5 matching facility-research unit coupons once per Infinity. Each discounts one settled level by.50, shared research-price cap.50. Generated/virtual/retained units never earn the crossing again.
After Discovery: One actual69-purchase crossing flag per type/Infinity grants five matching facility Cash coupons at.25 reduction under.50 cap. One quote/unit each, no research or TP pricing.

- Systems: Paid milestones, Facility research prices. Limit: five50% research coupons per facility per Infinity.
- Discovery limit: five25% Cash coupons per facility per Infinity.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: finite paid-source coupon.

**Slow Ripening** — `subskill.avocados.slowRipening` · specialization · depth 2 · 4 SP including prerequisites.

Require all three positive-debit food flags in current Quantum and nativeQuantumAge>=1800; b_Influence=1,b_StrangeMatter=.5. No extra feed multiplier or native exponent change.

- Systems: Avocato food diversity, Quantum age, Influence, Black Holes. Limit: +100% Influence; +50% Strange Matter.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Quantum.
- Interaction: bounded bonus.

**Perfect Ripeness** — `subskill.avocados.perfectRipeness` · capstone · depth 3 · 11 SP including prerequisites.

For each of8types actualPaid>=69 enable its own b_Output=1, and b_Education=.05*count, max.40. Apply one output coefficient per type; fixed Galactic Brain population rate stays unchanged.

- Systems: Paid milestones, Facilities, Education. Limit: +100% qualifying ordinary outputs; +40% education.
- Source: native source snapshot; new grant packets excluded. New ledger reset: Infinity.
- Interaction: bounded bonus.

All native resources keep their native reset rules. New counters and entitlements survive refunds; absolute cooldowns keep running. Only assignment-gated charging pauses. All transient augment state clears at Transcendence, while external absence IDs remain deduplicated by the native accepted-absence ledger. No packet manufactures a paid transaction.

</details>


## Existing augmented parents

Their current 31 choices compete for the same 42 SP. They are reference patterns, not newly authored menu quotas.

| Parent | Current choices, with SP |
| --- | --- |
| Manual Labour | Hand-built AI Managers (1), Hand-built Servers (1), Hand-built Data Centers (1), Hand-built Planets (1), Hand-built Matrioshka Brains (1), Hand-built Birch Planets (1), Hand-built Galactic Brains (1), Hand Assembly (1), Practice Makes Perfect (1), Working Smarter (1), Patient Hands (1) |
| Mega Swarm | Pooled Purchases (3), Economy of Scale (1) |
| Production Scaling | Compound Fragments (3), Reductive Scaling (3) |
| Cash & Science | Extended Warranty (1), Supermassive Panels (1), Double Standards (1) |
| Super-Radiant Scattering | Hot Start (3), Afterglow (1), Deep Exposure (3), Focused Beam (1), Research Conversion (1), Research Activity (2), Stellar Memory (5) |
| Super Swarm | Head Start (1), Botnet (3), Deferred Billing (3) |
| Ultimate Swarm | Steady Supply (3), Self-Replicating Workers (5), Stellar Swarm (4) |

## Coverage

Exact-ID join: 104 base skills − 7 currently augmented = 97 covered parents. The 485 new IDs and names are unique and do not collide with the existing 31. All nodes have cost, full prerequisite closure, short technical/flavour text, valid phase copy, formulas, limits, source and reset notes. Every node is reachable within 42 SP; the largest individual prerequisite closure costs 19 SP.

Menu sizes: 4 parents with 3 choices, 27 parents with 4 choices, 37 parents with 5 choices, 23 parents with 6 choices, 6 parents with 7 choices. Average: exactly five. This is a complete proposal catalogue, not evidence that every mechanic has been implemented or integration-tested.
