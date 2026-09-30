# Current skill and system reference

Source review for the [complete augment proposal](complete-skill-augments.md), dated 30 September 2026. This reference records the current game, separately from the proposed mechanics. The inventory contains all **104 base skills and 31 existing augments**, matched by ID to the working runtime catalogue.

Current English copy is preserved below, including wording that needs correction. The analysis follows the code where text and implementation disagree. In particular, Rudimentary Singularity uses `(log2(X))^(1 + log10(X)/10)`, not the exponent stated in its current description. The new catalogue supplies fresh technical and flavour text for the 485 proposals. SRS’s existing broad “all facility” copy covers only five basic facility targets in the authored effects; the three megastructures are separate. The Reality helper’s base-time comment disagrees with the game-time caller; the proposal follows the measured caller. These source/text discrepancies are recorded for a later implementation decision, without changing gameplay here.

## System map and interaction owners

| System | Current rule relevant to augments | Canonical source |
| --- | --- | --- |
| Facility chain | Eight facility types; automatic/generated and manual/purchased quantities remain distinct. Facility output, ownership and price count are different quantities. | [dysonFacilityCatalog](../../src/simulation/dysonFacilityCatalog.ts), [dysonFacilities](../../src/simulation/dysonFacilities.ts), [megaStructureRates](../../src/simulation/megaStructureRates.ts) |
| Prices and purchase milestones | Geometric prices, 50/100 milestones, Avocados, Swarm layers, Terra virtual purchases and Pooled Purchases interact. Current prices override frozen Unity definitions. | [facilityBalance](../../src/game-data/facilityBalance.ts), [effectivePurchaseCounts](../../src/simulation/effectivePurchaseCounts.ts), [swarmAugments](../../src/simulation/swarmAugments.ts) |
| Bot allocation | Workers supply the Cash/panel side; Researchers supply Science. Multitasking and Discovery change allocation semantics. Never double-count a 100% allocation. | [botDistribution](../../src/simulation/botDistribution.ts), [canonicalBotAllocation](../../src/simulation/canonicalBotAllocation.ts) |
| Panels, Lifetime and decay | Physical panel production/Lifetime establish active panels and star/galaxy progress; credited decay can differ from the ordinary panel-flow counter: Supermassive Panels multiplies the credited rate by ten. SRS has no direct decay reward or Scatter action. Stellar quotes Panels × Lifetime, a different quantity. | [panelDynamicEffects](../../src/simulation/panelDynamicEffects.ts), [stellarArithmetic](../../src/simulation/stellarArithmetic.ts), [canonicalGoalProgression](../../src/simulation/canonicalGoalProgression.ts) |
| Research | Percentage facility/Cash/Science research and one-off Durability research differ. Purchased and Shoulders-generated levels currently meet in aggregate state; provenance is needed for the new proposals. | [dysonResearchEffects](../../src/simulation/dysonResearchEffects.ts), [researchAutomation](../../src/simulation/researchAutomation.ts), [shouldersTinkerDynamicEffects](../../src/simulation/shouldersTinkerDynamicEffects.ts) |
| Dynamic generators | Pocket Dimensions is a per-Planet Data Center bonus. Rudimentary is a per-Data-Center Server bonus. Scientific Planets and other direct Planet generators are separate sources. | [dysonDerivedIntermediates](../../src/simulation/dysonDerivedIntermediates.ts), [dynamicFacilitySkillEffects](../../src/simulation/dynamicFacilitySkillEffects.ts), [planetGenerationDynamicEffects](../../src/simulation/planetGenerationDynamicEffects.ts) |
| Tinker | Active-only input, charged/held timing, ordinary manual yields and capped upper-chain grants. Built by Hand and Hands Off replace or prohibit parts of it. | [canonicalTinker](../../src/simulation/canonicalTinker.ts), [manualLabourAugments](../../src/simulation/manualLabourAugments.ts), [manualFacilityAugments](../../src/simulation/manualFacilityAugments.ts) |
| SRS | Passive assigned charge has no gameplay maximum or Scatter action. Native SRS targets Cash/Science and the five basic facilities; it does not directly target the three megastructures. Hot Start, Afterglow and Stellar Memory have distinct provenance. | [srsAugments](../../src/simulation/srsAugments.ts), [canonicalSkillIntervalEffects](../../src/simulation/canonicalSkillIntervalEffects.ts) |
| Skills and presets | Ordinary purchases obey prerequisites, exclusivity, cost and refund rules. Presets and automation settle through canonical transactions. | [canonicalSkillTransactions](../../src/simulation/canonicalSkillTransactions.ts), [canonicalSkillPresetTransactions](../../src/simulation/canonicalSkillPresetTransactions.ts) |
| Catalysts and Fractures | Nine challenges supply sixteen Catalysts. A Fractured base is permanently owned, removes its authored costs/dependencies/downside, and enables its augments. Functional source requirements still apply. | [galvanization](../../src/simulation/galvanization.ts), [galvanizedSkillEffects](../../src/simulation/galvanizedSkillEffects.ts), [infinityChallenges](../../src/simulation/infinityChallenges.ts) |
| Infinity and IP | IP rewards use geometric threshold counting, not a fractional power of Bots. IP improves the facility chain. A reset rebuilds skill points, with optional Banking/Investment and source-qualified retention. | [infinityCycle](../../src/simulation/infinityCycle.ts), [dysonPrestigeEffects](../../src/simulation/dysonPrestigeEffects.ts), [canonicalInfinityReset](../../src/simulation/canonicalInfinityReset.ts) |
| Quantum | Quantum Shards, Divisions, Cash/Science levels, permanent unlocks and the three megastructure unlocks are separate investments. Divisions cap at 19; Secrets cap at 27. | [quantumUpgrades](../../src/simulation/quantumUpgrades.ts), [quantumTransitions](../../src/simulation/quantumTransitions.ts), [secretBuffs](../../src/simulation/secretBuffs.ts) |
| Reality | The current canonical caller advances Reality with game time, including Double Time. Worker batches produce Influence; manual Gather has a capacity and batching rule, while Auto Gather follows another path. Universe designation and Reality purchases are separate. | [realityWorkers](../../src/simulation/realityWorkers.ts), [realityUpgrades](../../src/simulation/realityUpgrades.ts) |
| Simulation settlements and production | Foundational/Information-era Workers, Housing, Villages, Communities, Cities, Factories and boosts have native progress, yield and input rules. Output bonuses must not invent extra conversion inputs. | [dreamFoundationalInformation](../../src/simulation/dreamFoundationalInformation.ts), [canonicalDreamDerivedFacts](../../src/simulation/canonicalDreamDerivedFacts.ts) |
| Education | Six subjects, their upgrades, natural progress and one-time completion effects form a separate subsystem. Native progress retention must not be proposed again as a new benefit. | [dreamEducationUpgrades](../../src/simulation/dreamEducationUpgrades.ts) |
| Energy, Rockets and Railguns | Solar/Fusion, Bots/Rockets, Space Factories, panels, charging and launch volleys are distinct production or funded conversion stages. Charging is an immediate Energy transfer; faster charging would be meaningless without changing that rule. | [dreamSpaceAge](../../src/simulation/dreamSpaceAge.ts) |
| Black Holes | Reward is derived from launched panels. Dream reset clears the appropriate production state; unlaunched panels and unspent charge must not also be rewarded. | [canonicalDreamReset](../../src/simulation/canonicalDreamReset.ts) |
| Avocato and Avotation | Feeding actual IP, Influence and Strange Matter changes the multiplier; meditation/Secret progression supplies its own persistent effects. A feed is a real debit, not merely a click. | [avocadoDomain](../../src/simulation/avocadoDomain.ts), [avocadoMeditation](../../src/simulation/avocadoMeditation.ts) |
| Transcendence | The cap is `4e242` Bots. The voluntary reset clears intervening production/prestige/Simulation progress while retaining the defined Fracture, challenge, Secret and Discovery ownership state. | [overflowBoundary](../../src/simulation/overflowBoundary.ts), [canonicalOverflowReset](../../src/simulation/canonicalOverflowReset.ts) |
| Discovery tiers | Discovery unlock costs 1 TP; Elevation 3; Enlightenment 5. Own bars require 3600, 1800 and 600 progress. First-tier strength/Cash-Bots/Lifetime start at 10×/7×/20 seconds; higher tiers change their own rewards. | [discovery](../../src/simulation/discovery.ts), [discoveryEffects](../../src/simulation/discoveryEffects.ts) |
| Discovery transfers | Natural higher-tier completions grant fixed time to the preceding bar at its current speed. Highest-first settlement permits the existing downward cascade. New raw-progress packets must not create an augment award loop. | [discovery](../../src/simulation/discovery.ts), [phase-specific skill copy](../../src/ui/gameplay/discovery/skillMessages.ts) |
| Time and automation | Double Time multiplies gameplay once, including the current Reality caller. The helper comment saying base time disagrees with that caller; the source probe produced four Workers without Double Time and eight with it in one base second. Genuine absence credits Stored Time, whose later spending runs production. Active and Stored Time automation have explicit per-update ordering. | [gameStep](../../src/simulation/gameStep.ts), [timeResources](../../src/simulation/timeResources.ts), [storedTimePolicy](../../src/simulation/storedTimePolicy.ts), [lifecycleAwayTime](../../src/simulation/lifecycleAwayTime.ts) |
| Persistence and platform shell | Grants need canonical ownership and save/export/reload semantics. UI, achievements, statistics, commerce and host integrations must consume settled state, not issue duplicate gameplay rewards. Paid entitlements are excluded from the baseline. | [canonicalRuntimeSession](../../src/application/canonicalRuntimeSession.ts), [game-state types](../../src/game-state/types.ts), [save import](../../src/save/import.ts) |

## Reset boundaries used by the proposal

| Boundary | Consequence for design |
| --- | --- |
| Refund/reassign | Base native resource state remains authoritative; no new entitlement or bucket refill. Augments require their Fractured parent and current assignment. |
| Awarded Infinity | Current-run goals and ordinary skills rebuild; banking and eligible retention resolve from the ending state once. |
| Challenge restart/abandon | Restart-only transitions are not rewarded Infinity or Dream completions. |
| Quantum | Ordinary Infinity progress clears according to the existing transition; new temporary records clear unless the catalogue explicitly says otherwise. |
| Dream/Black Hole | Reset Simulation production state and award only the eligible native launched-panel reward. Persist cross-Dream cooldowns at their stated outer boundary. |
| Transcendence | Clear all new transient resources and ledgers. Persistent challenge flags and Fractures can unlock Convergence again after rebuilding. |

## Current base-skill index

Normal relationships below are the authored ordinary-tree relationships. They are not a claim that Fractured parents retain those purchase requirements. Current phase-specific and Fractured descriptions are included where they differ.

| Skill | ID | Ordinary SP | Existing augments |
| --- | --- | ---: | ---: |
| [20s Lifetime](#panellifetime20tree) | `panelLifetime20Tree` | 1 | 0 |
| [Addiction to Power](#addictiontopower) | `addictionToPower` | 1 | 0 |
| [Aggressive Algorithms](#agressivealgorithms) | `agressiveAlgorithms` | 1 | 0 |
| [AI Managers](#aimanagertree) | `aiManagerTree` | 1 | 0 |
| [Androids](#androids) | `androids` | 2 | 0 |
| [Artificially Enhanced Panels](#artificiallyenhancedpanels) | `artificiallyEnhancedPanels` | 1 | 0 |
| [Assembly Lines](#assemblylinetree) | `assemblyLineTree` | 1 | 0 |
| [Assembly Megalines](#assemblymegalines) | `assemblyMegaLines` | 1 | 0 |
| [Avocados](#avocados) | `avocados` | 2 | 0 |
| [Banking](#banking) | `banking` | 1 | 0 |
| [Burnout](#burnout) | `burnOut` | 1 | 0 |
| [Cash & Science](#startheretree) | `startHereTree` | 1 | 3 |
| [Citadel Council](#citadelcouncil) | `citadelCouncil` | 1 | 0 |
| [Cluster Networking](#clusternetworking) | `clusterNetworking` | 1 | 0 |
| [Cold Fusion](#coldfusion) | `coldFusion` | 1 | 0 |
| [Data Centers](#datacentertree) | `dataCenterTree` | 1 | 0 |
| [Dimensional CAT cables](#dimensionalcatcables) | `dimensionalCatCables` | 1 | 0 |
| [Dyson Subsidies](#dysonsubsidies) | `dysonSubsidies` | 1 | 0 |
| [Economic Dominance](#economicdominance) | `economicDominance` | 1 | 0 |
| [Economic Revolution](#economicrevolution) | `economicRevolution` | 1 | 0 |
| [End of the Line](#endoftheline) | `endOfTheLine` | 1 | 0 |
| [Fragment Assembly](#fragmentassembly) | `fragmentAssembly` | 1 | 0 |
| [Fusion Reactors](#fusionreactors) | `fusionReactors` | 1 | 0 |
| [Galactic Paradigm Shift](#galacticpradigmshift) | `galacticPradigmShift` | 1 | 0 |
| [Higgs Boson](#higgsboson) | `higgsBoson` | 2 | 0 |
| [Hubble Telescope](#hubbletelescope) | `hubbleTelescope` | 1 | 0 |
| [Hypercube Networks](#hypercubenetworks) | `hypercubeNetworks` | 1 | 0 |
| [Idle Electric Sheep](#idleelectricsheep) | `idleElectricSheep` | 2 | 0 |
| [Idle Spaceflight](#idlespaceflight) | `idleSpaceFlight` | 3 | 0 |
| [Indulging in Power](#indulginginpower) | `indulgingInPower` | 1 | 0 |
| [Investment](#investmentportfolio) | `investmentPortfolio` | 1 | 0 |
| [James Webb Telescope](#jameswebbtelescope) | `jamesWebbTelescope` | 1 | 0 |
| [Manual Labour](#manuallabour) | `manualLabour` | 1 | 11 |
| [Mega Swarm](#megaswarm) | `megaSwarm` | 2 | 2 |
| [Monetary Policy](#monetarypolicy) | `monetaryPolicy` | 1 | 0 |
| [One Minute Plan](#oneminuteplan) | `oneMinutePlan` | 1 | 0 |
| [Panel Maintenance](#panelmaintenance) | `panelMaintenance` | 3 | 0 |
| [Panel Warranty](#panelwarranty) | `panelWarranty` | 1 | 0 |
| [Paragon](#paragon) | `paragon` | 1 | 0 |
| [Parallel Computation](#parallelcomputation) | `parallelComputation` | 1 | 0 |
| [Parallel Processing](#parallelprocessing) | `parallelProcessing` | 1 | 0 |
| [Planet Assembly](#planetassembly) | `planetAssembly` | 1 | 0 |
| [Planets](#planetstree) | `planetsTree` | 1 | 0 |
| [Pocket Androids](#pocketandroids) | `pocketAndroids` | 1 | 0 |
| [Pocket Dimensions](#pocketdimensions) | `pocketDimensions` | 1 | 0 |
| [Pocket Multiverse](#pocketmultiverse) | `pocketMultiverse` | 2 | 0 |
| [Pocket Protectors](#pocketprotectors) | `pocketProtectors` | 1 | 0 |
| [Power Overwhelming](#poweroverwhelming) | `powerOverwhelming` | 1 | 0 |
| [Power Underwhelming](#powerunderwhelming) | `powerUnderwhelming` | 1 | 0 |
| [Production Scaling](#productionscaling) | `productionScaling` | 1 | 2 |
| [Progressive Assembly](#progressiveassembly) | `progressiveAssembly` | 1 | 0 |
| [Purity of Body](#purityofbody) | `purityOfBody` | 2 | 0 |
| [Purity of Essence](#purityofsessence) | `purityOfSEssence` | 3 | 0 |
| [Purity of Mind](#purityofmind) | `purityOfMind` | 2 | 0 |
| [Quantum Computing](#quantumcomputing) | `quantumComputing` | 1 | 0 |
| [Reapers](#reapers) | `reapers` | 1 | 0 |
| [Regulated Academia](#regulatedacademia) | `regulatedAcademia` | 1 | 0 |
| [Renegade](#renegade) | `renegade` | 1 | 0 |
| [Renewable Energy](#renewableenergy) | `renewableEnergy` | 1 | 0 |
| [Repeatable Research](#repeatableresearch) | `repeatableResearch` | 1 | 0 |
| [Rocket Mania](#rocketmania) | `rocketMania` | 3 | 0 |
| [Rudimentary Singularity](#rudimentarysingularity) | `rudimentarySingularity` | 1 | 0 |
| [Saren](#saren) | `saren` | 1 | 0 |
| [Science *2](#doublesciencetree) | `doubleScienceTree` | 1 | 0 |
| [Science Boost](#producedassciencetree) | `producedAsScienceTree` | 1 | 0 |
| [Scientific Dominance](#scientificdominance) | `scientificDominance` | 1 | 0 |
| [Scientific Planets](#scientificplanets) | `scientificPlanets` | 1 | 0 |
| [Scientific Revolution](#scientificrevolution) | `scientificRevolution` | 1 | 0 |
| [Servers](#servertree) | `serverTree` | 1 | 0 |
| [Shell Worlds](#shellworlds) | `shellWorlds` | 1 | 0 |
| [Shepherd](#shepherd) | `shepherd` | 1 | 0 |
| [Shoulder Surgery](#shouldersurgery) | `shoulderSurgery` | 1 | 0 |
| [Shoulders of Giants](#shouldersofgiants) | `shouldersOfGiants` | 1 | 0 |
| [Shoulders of Precursors](#shouldersofprecursors) | `shouldersOfPrecursors` | 1 | 0 |
| [Shoulders of the Enlightened](#shouldersoftheenlightened) | `shouldersOfTheEnlightened` | 1 | 0 |
| [Shoulders of the Fallen](#shouldersofthefallen) | `shouldersOfTheFallen` | 1 | 0 |
| [Shoulders of the Revolution](#shouldersoftherevolution) | `shouldersOfTheRevolution` | 1 | 0 |
| [Solar Bubbles](#solarbubbles) | `solarBubbles` | 1 | 0 |
| [Staying Power](#stayingpower) | `stayingPower` | 2 | 0 |
| [Stellar Dominance](#stellardominance) | `stellarDominance` | 3 | 0 |
| [Stellar Improvements](#stellarimprovements) | `stellarImprovements` | 3 | 0 |
| [Stellar Obliteration](#stellarobliteration) | `stellarObliteration` | 2 | 0 |
| [Stellar Sacrifices](#stellarsacrifices) | `stellarSacrifices` | 2 | 0 |
| [Super Swarm](#superswarm) | `superSwarm` | 2 | 3 |
| [Super-Radiant Scattering](#superradiantscattering) | `superRadiantScattering` | 3 | 7 |
| [Supercharged Power](#superchargedpower) | `superchargedPower` | 1 | 0 |
| [Supernova](#supernova) | `supernova` | 4 | 0 |
| [Taste of Power](#tasteofpower) | `tasteOfPower` | 1 | 0 |
| [Terra Eculeo](#terraeculeo) | `terraEculeo` | 1 | 0 |
| [Terra Firma](#terrafirma) | `terraFirma` | 1 | 0 |
| [Terra Gloriae](#terragloriae) | `terraGloriae` | 1 | 0 |
| [Terra Infirma](#terrainfirma) | `terraInfirma` | 1 | 0 |
| [Terra Irradient](#terrairradiant) | `terraIrradiant` | 1 | 0 |
| [Terra Nova](#terranova) | `terraNova` | 1 | 0 |
| [Terra Nullius](#terranullius) | `terraNullius` | 1 | 0 |
| [Terraforming Protocols](#terraformingprotocols) | `terraformingProtocols` | 1 | 0 |
| [Ultimate Swarm](#ultimateswarm) | `ultimateSwarm` | 3 | 3 |
| [Unsuspicious Algorithms](#unsuspiciousalgorithms) | `unsuspiciousAlgorithms` | 1 | 0 |
| [Versatile Production Tactics](#versatileproductiontactics) | `versatileProductionTactics` | 1 | 0 |
| [What could’ve been](#whatcouldhavebeen) | `whatCouldHaveBeen` | 1 | 0 |
| [What Will Come to Pass](#whatwillcometopass) | `whatWillComeToPass` | 1 | 0 |
| [Worker Boost](#workerboost) | `workerBoost` | 1 | 0 |
| [Worker Efficiency](#workerefficiencytree) | `workerEfficiencyTree` | 1 | 0 |
| [Worthy Sacrifice](#worthysacrifice) | `worthySacrifice` | 1 | 0 |

## All 104 current base skills

<a id="panellifetime20tree"></a>
### 20s Lifetime

`panelLifetime20Tree` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** Increases the duration of Panels by 20 seconds.

**Current flavour:** One of your ships discovers a new material orbiting a black hole, you manage to find a way to drastically increase panel lifetime.

**Requires:** Cash & Science (`startHereTree`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#panellifetime20tree).

<a id="addictiontopower"></a>
### Addiction to Power

`addictionToPower` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** 200% stronger Assembly Lines, AI Managers, Servers, Data Centers, and Planets. 10% less Cash and Science.<br><br>Buff stacks Multiplicatively. Debuff stacks Additively for a total of 50% less.

**Current flavour:** Unable to help yourself you claim all of the unknown power.

**Requires:** Indulging in Power (`indulgingInPower`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

**When Fractured:** Assembly Lines, AI Managers, Servers, Data Centers and Planets are 200% stronger.

**After Discovery — Addiction to Power:** 200% stronger Assembly Lines, AI Managers, Servers, Data Centers and Planets. 10% less Cash unless Fractured. Cash penalties are additive.

**Fractured after Discovery:** 200% stronger Assembly Lines, AI Managers, Servers, Data Centers and Planets.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#addictiontopower).

<a id="agressivealgorithms"></a>
### Aggressive Algorithms

`agressiveAlgorithms` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** Servers, AI Managers, and Assembly Lines are 3x stronger. Planets and Data Centers are 3x weaker.

**Current flavour:** Go faster, innovate harder, and take some prisoners.

**Requires:** Unsuspicious Algorithms (`unsuspiciousAlgorithms`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

**When Fractured:** Servers, AI Managers and Assembly Lines are 3× stronger.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#agressivealgorithms).

<a id="aimanagertree"></a>
### AI Managers

`aiManagerTree` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** Multiplies AI Managers Assembly Line production by 2.

**Current flavour:** This breakthrough technology halves the resources required for your AI Managers to run, giving them twice the yield.

**Requires:** Cash & Science (`startHereTree`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: Shoulders of Giants (`shouldersOfGiants`).

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#aimanagertree).

<a id="androids"></a>
### Androids

`androids` · 2 ordinary SP · Not a Fragment skill.

**Current technical:** While the Androids Skill is assigned, its bonus scales from 0 to 200 seconds of Panel Lifetime over a 10 minute span.<br>This resets on Infinity/Quantum Leap.

**Current flavour:** Androids actively repair panels while in orbit, greatly improving panel lifetime.

**Requires:** Worker Efficiency (`workerEfficiencyTree`), 20s Lifetime (`panelLifetime20Tree`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#androids).

<a id="artificiallyenhancedpanels"></a>
### Artificially Enhanced Panels

`artificiallyEnhancedPanels` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** Increase Panel Lifetime by 5 * log10(AI Managers).

**Current flavour:** Utilizing wasted resources you boost your panels lifetime using your AI Managers to process better designs.

**Requires:** 20s Lifetime (`panelLifetime20Tree`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#artificiallyenhancedpanels).

<a id="assemblylinetree"></a>
### Assembly Lines

`assemblyLineTree` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** Multiplies Assembly Lines Bot production by 2.

**Current flavour:** Overclocking capabilities allow your Assembly Lines to produce twice as many Bots.

**Requires:** Cash & Science (`startHereTree`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: Shoulders of Giants (`shouldersOfGiants`).

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#assemblylinetree).

<a id="assemblymegalines"></a>
### Assembly Megalines

`assemblyMegaLines` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** The Cost of Assembly Lines is divided by the current amount of Planets.

**Current flavour:** More Planets allow for larger Assembly Lines. Mega-Assembly Lines that is. Probably a good idea to let the bots handle this.

**Requires:** Assembly Lines (`assemblyLineTree`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#assemblymegalines).

<a id="avocados"></a>
### Avocados

`avocados` · 2 ordinary SP · Not a Fragment skill.

**Current technical:** Building production is multiplied by 2 at 69 purchases.

**Current flavour:** Avocados are cool, and so are you. If you found this well done.

**Requires:** None.
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#avocados).

<a id="banking"></a>
### Banking

`banking` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** Set one Skill Point aside for your next infinity.

**Current flavour:** After much thought, you decide the multiverse is real and focus on sending some of your knowledge to the next universe.

**Requires:** None.
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** False; conditional nonrefund dependencies: None.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#banking).

<a id="burnout"></a>
### Burnout

`burnOut` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** Shorten Panel Lifetime by 5s, and triple panel production.

**Current flavour:** You experiment with lower orbits. The heat of the sun degrades your panels faster but the energy output is greatly improved!

**Requires:** Manual Labour (`manualLabour`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

**When Fractured:** Triple panel production.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#burnout).

<a id="startheretree"></a>
### Cash & Science

`startHereTree` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** Increase Cash and Science by 20%

**Current flavour:** Through improvements to core algorithms you improve the efficiency of your bots.

**Requires:** None.
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: Shoulders of Giants (`shouldersOfGiants`).

**After Discovery — Cash & Discovery:** +20% Cash and +20% Discovery speed. Bonuses are additive.

Existing augment branch: 3 options, listed below.

<a id="citadelcouncil"></a>
### Citadel Council

`citadelCouncil` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** Panel Lifetime is multiplied by log1.2(Panels Decayed).

**Current flavour:** All spacefaring civilizations eventually come to realize that cooperation is the only way forward. Thus, the best of the best represent each species in the citadel council, responsible for guiding the universe towards a safe future.

**Requires:** Shepherd (`shepherd`).
**Shadow requirements:** None.
**Ordinary exclusions:** Renegade (`renegade`).
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#citadelcouncil).

<a id="clusternetworking"></a>
### Cluster Networking

`clusterNetworking` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** For every log10(Servers), Servers are 5% better, and Server Production from Rudimentary Singularity is 5% stronger.

**Current flavour:** Create dedicated server 'clusters' for your own benefit.

**Requires:** Rudimentary Singularity (`rudimentarySingularity`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#clusternetworking).

<a id="coldfusion"></a>
### Cold Fusion

`coldFusion` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** Reduces Cash income by 50%, increases Science by 10x

**Current flavour:** Theoretical made fact. Your army of scientists manage to solve cold fusion. What more lays in front of you? The future is a bright one.

**Requires:** Fusion Reactors (`fusionReactors`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

**When Fractured:** 10× Science production.

**After Discovery — Cold Fusion:** +75% Discovery speed; halves Cash unless Fractured. Bonuses are additive.

**Discovery flavour:** Theoretical made fact. Cold fusion, solved. What else did the universe forget to hide?

**Fractured after Discovery:** +75% Discovery speed. Bonuses are additive.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#coldfusion).

<a id="datacentertree"></a>
### Data Centers

`dataCenterTree` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** Multiplies Data Center Server production by 2.

**Current flavour:** Advanced Data Center infrastructure allows for more complex Server designs

**Requires:** Cash & Science (`startHereTree`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: Shoulders of Giants (`shouldersOfGiants`).

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#datacentertree).

<a id="dimensionalcatcables"></a>
### Dimensional CAT cables

`dimensionalCatCables` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** 5x as many Data Centers from Pocket Dimensions. 25% less Data Center production from Planets.

**Current flavour:** Meow. Linking up your fancy dimensional Data Centers with your regular old boring Data Centers makes them far more capable. The resources needed do make your Planets slightly worse, however.

**Requires:** Pocket Dimensions (`pocketDimensions`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

**When Fractured:** 5× as many Data Centers from Pocket Dimensions.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#dimensionalcatcables).

<a id="dysonsubsidies"></a>
### Dyson Subsidies

`dysonSubsidies` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** Before you surround a star you gain 3x Cash, after a star is surrounded this becomes 2x Bot production.

**Current flavour:** Unlock the full potential of your space empire with Dyson Subsidies. Get a big boost in Cash flow before you surround a star and enjoy increased Bot production after. Take your game to the next level and conquer the galaxy with Dyson Subsidies.

**Requires:** Manual Labour (`manualLabour`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#dysonsubsidies).

<a id="economicdominance"></a>
### Economic Dominance

`economicDominance` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** 20x Cash, 0.25x Science

**Current flavour:** Shift your goals to economic growth with singular focus.

**Requires:** Economic Revolution (`economicRevolution`).
**Shadow requirements:** None.
**Ordinary exclusions:** Scientific Dominance (`scientificDominance`).
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

**When Fractured:** 20× Cash production.

**After Discovery — Economic Dominance:** Multiplies Cash by 20.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#economicdominance).

<a id="economicrevolution"></a>
### Economic Revolution

`economicRevolution` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** Multiplies Cash by 5 while you have at least 50% of bots assigned to Panel Production.

**Current flavour:** Self improving bots create a surge in economic progress.

**Requires:** Worker Efficiency (`workerEfficiencyTree`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

**After Discovery — Economic Revolution:** Multiplies Cash by 5.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#economicrevolution).

<a id="endoftheline"></a>
### End of the Line

`endOfTheLine` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** 5x Bot production. Planets are 50% weaker.

**Current flavour:** Imagine a future where Assembly Lines stretch far into the horizon, bustling with the hum of robots tirelessly working. While this may sound like a productivity paradise, it also comes with a hefty price tag. Longer Assembly Lines mean an increased number of Bots, but as a result, they gobble up valuable real estate, chipping away at the already dwindling power of our planets.

**Requires:** Worthy Sacrifice (`worthySacrifice`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

**When Fractured:** 5× Bot production from Assembly Lines.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#endoftheline).

<a id="fragmentassembly"></a>
### Fragment Assembly

`fragmentAssembly` · 1 ordinary SP · Fragment skill.

**Current technical:** If you have at least 4 other Fragment Skills assigned, triple the production of all Buildings.

**Current flavour:** As you begin to piece the fragments together, you manage to decipher ways to improve all of your buildings.

**Requires:** None.
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#fragmentassembly).

<a id="fusionreactors"></a>
### Fusion Reactors

`fusionReactors` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** Boost Panel Production by 5x, reduce Cash income by 25%

**Current flavour:** Fission just won't cut it, Fusion is the way forward. Fusion lets you create miniature suns.

**Requires:** Burnout (`burnOut`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

**When Fractured:** 5× Panel production.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#fusionreactors).

<a id="galacticpradigmshift"></a>
### Galactic Paradigm Shift

`galacticPradigmShift` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** Planets produce 1.5x as much before you Engulf a Galaxy. They produce 3x as much afterwards.

**Current flavour:** The Galactic Paradigm Shift is a significant increase in Planet production within a galaxy. The effects of this change impact intergalactic civilizations and the galaxy as a whole, presenting both opportunities and challenges. The cause of the shift is still unknown.

**Requires:** Dyson Subsidies (`dysonSubsidies`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#galacticpradigmshift).

<a id="higgsboson"></a>
### Higgs Boson

`higgsBoson` · 2 ordinary SP · Not a Fragment skill.

**Current technical:** Boosts Cash gain by 10% for every Galaxy engulfed.

**Current flavour:** Surrounding black holes is unheard of, but you manage it after years of research!

**Requires:** Cash & Science (`startHereTree`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#higgsboson).

<a id="hubbletelescope"></a>
### Hubble Telescope

`hubbleTelescope` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** Double the effect of Scientific Planets.

**Current flavour:** A space telescope that was launched into low Earth orbit in 1990 and remains in operation to this day.

**Requires:** Scientific Planets (`scientificPlanets`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#hubbletelescope).

<a id="hypercubenetworks"></a>
### Hypercube Networks

`hypercubeNetworks` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** Data Centers gain a 10% production for every log10(Servers).

**Current flavour:** Fancy name for a fancy boost. You always excelled in geometry, time to apply the knowledge to your dyson swarm empire.

**Requires:** What Will Come to Pass (`whatWillComeToPass`).
**Shadow requirements:** None.
**Ordinary exclusions:** What could’ve been (`whatCouldHaveBeen`).
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#hypercubenetworks).

<a id="idleelectricsheep"></a>
### Idle Electric Sheep

`idleElectricSheep` · 2 ordinary SP · Not a Fragment skill.

**Current technical:** Doubles the effect running offline time has.

**Current flavour:** Counting sheep is such a breeze, Helps me fall asleep with ease, One by one they jump the fence, Takes me to dreamland in suspense.<br>White and fluffy, soft and neat, Lead me to slumber so sweet, Close my eyes, take a deep breath, Counting sheep, I meet my rest.<br>Over the hills and far away, Sheep are counting every day, A bedtime ritual, tried and true, Helping me and maybe you.

**Requires:** None.
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#idleelectricsheep).

<a id="idlespaceflight"></a>
### Idle Spaceflight

`idleSpaceFlight` · 3 ordinary SP · Not a Fragment skill.

**Current technical:** Increase Science production by 1% for every 100 million active Panels additively.

**Current flavour:** Collect matter, build buildings and fly your shuttle between the stars.

**Requires:** Science Boost (`producedAsScienceTree`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

**After Discovery — Idle Spaceflight:** +10 × log10(1 + active panels / 100,000,000)% Discovery speed, up to +200%. Bonuses are additive.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#idlespaceflight).

<a id="indulginginpower"></a>
### Indulging in Power

`indulgingInPower` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** 100% stronger Assembly Lines, AI Managers, Servers, Data Centers, and Planets. 15% less Cash and Science.<br><br>Buff stacks Multiplicatively. Debuff stacks Additively for a total of 40% less.

**Current flavour:** Where is all this power coming from? You decide to take it anyway.

**Requires:** Taste of Power (`tasteOfPower`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

**When Fractured:** Assembly Lines, AI Managers, Servers, Data Centers and Planets are 100% stronger.

**After Discovery — Indulging in Power:** 100% stronger Assembly Lines, AI Managers, Servers, Data Centers and Planets. 15% less Cash unless Fractured. Cash penalties are additive.

**Fractured after Discovery:** 100% stronger Assembly Lines, AI Managers, Servers, Data Centers and Planets.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#indulginginpower).

<a id="investmentportfolio"></a>
### Investment

`investmentPortfolio` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** Set one Skill Point aside for your next infinity.

**Current flavour:** Having successfully recieved data from another universe you decide to pay it forward.

**Requires:** Banking (`banking`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** False; conditional nonrefund dependencies: None.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#investmentportfolio).

<a id="jameswebbtelescope"></a>
### James Webb Telescope

`jamesWebbTelescope` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** Quadruple the effect of Scientific Planets.

**Current flavour:** Equipped with high-resolution and high-sensitivity instruments, allowing it to view objects too old, distant, or faint for the Hubble Space Telescope. Launched on 25 December 2021.

**Requires:** Hubble Telescope (`hubbleTelescope`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#jameswebbtelescope).

<a id="manuallabour"></a>
### Manual Labour

`manualLabour` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** Bring back the Manual bot building button and make it produce Assembly Lines. 2% of total Assembly Lines per completion capping at 20x your AI Manager production] Also reduces the manual creation time to 0.2s

**Current flavour:** You like to get your hands dirty, so you set to work setting up Assembly Lines yourself.

**Requires:** None.
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

Existing augment branch: 11 options, listed below.

<a id="megaswarm"></a>
### Mega Swarm

`megaSwarm` · 2 ordinary SP · Not a Fragment skill.

**Current technical:** Increase the production multiplier from 2% to 3%

**Current flavour:** Lets push that a little further, it seemed to work well.

**Requires:** Super Swarm (`superSwarm`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

Existing augment branch: 2 options, listed below.

<a id="monetarypolicy"></a>
### Monetary Policy

`monetaryPolicy` · 1 ordinary SP · Fragment skill.

**Current technical:** Increase Cash gain by 1.75x. Increase this bonus by 0.75x for every other assigned Fragment Skill.

**Current flavour:** You find a fragment of another universe. You use this knowledge to improve your Cash gain, I wonder what other parts of this universe you can find?

**Requires:** Worker Efficiency (`workerEfficiencyTree`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#monetarypolicy).

<a id="oneminuteplan"></a>
### One Minute Plan

`oneMinutePlan` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** If Panel Lifetime is below a minute, 1.5x Assembly Line production. Otherwise, 5x Assembly Line Production

**Current flavour:** Harness the ancient power of the One Minute Plan for boosted production. This timeless strategy offers increased efficiency and solidifies your place as a master of the universe.

**Requires:** Worthy Sacrifice (`worthySacrifice`), Dyson Subsidies (`dysonSubsidies`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#oneminuteplan).

<a id="panelmaintenance"></a>
### Panel Maintenance

`panelMaintenance` · 3 ordinary SP · Not a Fragment skill.

**Current technical:** Add 1 second of Panel Lifetime for every % of Workers.

**Current flavour:** Panel Maintenance increases the lifespan of panels by dedicating robotic resources to its upkeep. The more maintenance efforts, the longer the panels will last and function effectively. This process extends the life of panels and ensures optimal performance, reducing the risk of failures and improving system reliability.

**Requires:** Manual Labour (`manualLabour`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

**After Discovery — Panel Maintenance:** Adds 100 seconds to Panel Lifetime.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#panelmaintenance).

<a id="panelwarranty"></a>
### Panel Warranty

`panelWarranty` · 1 ordinary SP · Fragment skill.

**Current technical:** +5s of Panel Lifetime. Double this bonus for every other assigned Fragment Skill. (5s for 1, 20s for 3)

**Current flavour:** You find a fragment of another universe. You use this knowledge to improve your Solar Panels, I wonder what other parts of this universe you can find?

**Requires:** 20s Lifetime (`panelLifetime20Tree`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#panelwarranty).

<a id="paragon"></a>
### Paragon

`paragon` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** Boost Science production by 5000%.

**Current flavour:** What is more soothing than the blue color of the sky? But of course solar panels emitting blue light. All your population now works with far less stress, increasing the scientific production.

**Requires:** Panel Maintenance (`panelMaintenance`).
**Shadow requirements:** None.
**Ordinary exclusions:** Renegade (`renegade`).
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

**After Discovery — Paragon:** +150% Discovery speed. Bonuses are additive.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#paragon).

<a id="parallelcomputation"></a>
### Parallel Computation

`parallelComputation` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** Data Centers gain a 10% production for every log2(Servers).

**Current flavour:** Why spend multiple threads computing multiple things, when you can instead use all threads to compute all things, in a parallel fashion. Your Servers become much more efficient this way, boosting your Data Centers.

**Requires:** Hypercube Networks (`hypercubeNetworks`), Cluster Networking (`clusterNetworking`).
**Shadow requirements:** None.
**Ordinary exclusions:** What could’ve been (`whatCouldHaveBeen`).
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#parallelcomputation).

<a id="parallelprocessing"></a>
### Parallel Processing

`parallelProcessing` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** Increase Server effectiveness by 5% for every log2(Servers).

**Current flavour:** One fine day in the middle of the night, 2 dead men got up to fight, back to back they faced each other, drew their swords and shot each other. Oh wait this is about processing.

**Requires:** Servers (`serverTree`), AI Managers (`aiManagerTree`), Assembly Lines (`assemblyLineTree`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: Shoulders of Giants (`shouldersOfGiants`).

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#parallelprocessing).

<a id="planetassembly"></a>
### Planet Assembly

`planetAssembly` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** Gain Planets equal to log10(Assembly Lines).

**Current flavour:** So, planets are made out of matter, right? Well, so are Assembly Lines! Getting enough assembly lines together should create more planets. Don't ask why robots don't do the same.

**Requires:** Galactic Paradigm Shift (`galacticPradigmShift`), Versatile Production Tactics (`versatileProductionTactics`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#planetassembly).

<a id="planetstree"></a>
### Planets

`planetsTree` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** Multiplies Planet Data Center production by 2.

**Current flavour:** Through more efficient use of space and construction equipment, Data Center build time is halved.

**Requires:** Cash & Science (`startHereTree`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: Shoulders of Giants (`shouldersOfGiants`).

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#planetstree).

<a id="pocketandroids"></a>
### Pocket Androids

`pocketAndroids` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** Over the course of an hour, Pocket Dimensions gain a production boost with the cap of 100x.

**Current flavour:** It was only a matter of time before your most trusted workers entered your pocket dimensions. The results are quite astonishing, be it they take time to be noticeable.

**Requires:** Solar Bubbles (`solarBubbles`).
**Shadow requirements:** None.
**Ordinary exclusions:** What could’ve been (`whatCouldHaveBeen`).
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#pocketandroids).

<a id="pocketdimensions"></a>
### Pocket Dimensions

`pocketDimensions` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** Produces Data Centers based on Log10(Worker Bots)<br><br>Starting at 10 Worker Bots, you gain 1 Data Center per second, this increases by 1 each time you multiply your Workers by 10.

**Current flavour:** Discovery of pocket dimensions allow multiple Data Centers to be placed in layers. Ya know, like Onions. Or is it more like a TARDIS?

**Requires:** Parallel Processing (`parallelProcessing`), Data Centers (`dataCenterTree`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: Shoulders of Giants (`shouldersOfGiants`).

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#pocketdimensions).

<a id="pocketmultiverse"></a>
### Pocket Multiverse

`pocketMultiverse` · 2 ordinary SP · Not a Fragment skill.

**Current technical:** Pocket Protectors instead multiplies your Data Center production by log10(Scientists).

**Current flavour:** Breakthroughs in Pocket technology allow ludicrous improvements.

**Requires:** Pocket Protectors (`pocketProtectors`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

**After Discovery — Pocket Multiverse:** Pocket Protectors instead multiplies Pocket Dimensions production by log10(total Bots).

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#pocketmultiverse).

<a id="pocketprotectors"></a>
### Pocket Protectors

`pocketProtectors` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** Increase Data Center production by log10(Scientists).

**Current flavour:** Your scientists want in on this as well.

**Requires:** Dimensional CAT cables (`dimensionalCatCables`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

**After Discovery — Pocket Protectors:** Adds log10(total Bots) to Pocket Dimensions production.

**Discovery flavour:** Everyone wants in on this. Pocket protection is now mandatory.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#pocketprotectors).

<a id="poweroverwhelming"></a>
### Power Overwhelming

`powerOverwhelming` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** Cash production ^1.03.

**Current flavour:** Use Cash to boost Cash, is economic manipulation still frowned upon?

**Requires:** Power Underwhelming (`powerUnderwhelming`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#poweroverwhelming).

<a id="powerunderwhelming"></a>
### Power Underwhelming

`powerUnderwhelming` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** Science production ^1.05.

**Current flavour:** Use Science to boost Science, how? We will never know.

**Requires:** Cold Fusion (`coldFusion`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

**After Discovery — Power Underwhelming:** +25% Discovery speed. Bonuses are additive.

**Discovery flavour:** Use Discovery to discover Discovery. How? We will never know.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#powerunderwhelming).

<a id="productionscaling"></a>
### Production Scaling

`productionScaling` · 1 ordinary SP · Fragment skill.

**Current technical:** Start the 1% bonus with the first purchased building after 90. Reduce that threshold by another 5 for every other assigned Fragment Skill.

**Current flavour:** You find a fragment of another universe. You use this knowledge to improve your entire production line, I wonder what other parts of this universe you can find?

**Requires:** Super Swarm (`superSwarm`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

Existing augment branch: 2 options, listed below.

<a id="progressiveassembly"></a>
### Progressive Assembly

`progressiveAssembly` · 1 ordinary SP · Fragment skill.

**Current technical:** Assembly Lines produce 1.5x as much. Increase this bonus by 0.5x for every other assigned Fragment Skill.

**Current flavour:** You find a fragment of another universe. You use this knowledge to improve your Assembly Lines, I wonder what other parts of this universe you can find?

**Requires:** Assembly Lines (`assemblyLineTree`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#progressiveassembly).

<a id="purityofbody"></a>
### Purity of Body

`purityOfBody` · 2 ordinary SP · Not a Fragment skill.

**Current technical:** Increase Bot production by 25% per unspent Skill Point. Bonuses are additive.

**Current flavour:** You become one with your Bots, perfection on this scale never before seen.

**Requires:** Purity of Mind (`purityOfMind`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#purityofbody).

<a id="purityofsessence"></a>
### Purity of Essence

`purityOfSEssence` · 3 ordinary SP · Not a Fragment skill.

**Current technical:** Increase Cash, Science, Bot, and all facility production based on unspent Skill Points. Starts at 1.42× with 1 point, with increasing gains per point, reaching 256× at 42 points.

**Current flavour:** You transcend beyond reality, consuming everything in your path you become one with the Universe.

**Requires:** Purity of Body (`purityOfBody`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

**After Discovery — Purity of Essence:** Cash, Bots and facility production ×(1 + 0.42p + 0.13784p(p − 1)), where p is unspent SP. +2% Discovery speed per unspent SP, up to +100%. Bonuses are additive.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#purityofsessence).

<a id="purityofmind"></a>
### Purity of Mind

`purityOfMind` · 2 ordinary SP · Not a Fragment skill.

**Current technical:** Increase Cash and Science production by 50% per unspent Skill Point. Bonuses are additive.

**Current flavour:** WIth singular focus you clear your mind of all thoughts that don't include Cash or Science.

**Requires:** Manual Labour (`manualLabour`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

**After Discovery — Purity of Mind:** +50% Cash and +5% Discovery speed per unspent SP. Discovery speed is capped at +200%. Bonuses are additive.

**Discovery flavour:** With singular focus you clear your mind of all thoughts that do not include Cash or Discovery.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#purityofmind).

<a id="quantumcomputing"></a>
### Quantum Computing

`quantumComputing` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** Production of Data Centers from Pocket Dimensions is boosted by Log2(Rudimentry Singularity Production).

**Current flavour:** Using the same old server line-up seriously dampers with your progress. By utilizing quantum mechanics, you can now have servers that are simultaneously on, off, and both, boosting their efficiency in ways you don't quite understand.

**Requires:** Parallel Computation (`parallelComputation`).
**Shadow requirements:** None.
**Ordinary exclusions:** What could’ve been (`whatCouldHaveBeen`).
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#quantumcomputing).

<a id="reapers"></a>
### Reapers

`reapers` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** Panel production multiplied by log2(Panels Decayed) / 10.

**Current flavour:** Turn the filthy xeno scum into useful "voluntary" colonization and enslaving units.

**Requires:** Saren (`saren`).
**Shadow requirements:** None.
**Ordinary exclusions:** Paragon (`paragon`).
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#reapers).

<a id="regulatedacademia"></a>
### Regulated Academia

`regulatedAcademia` · 1 ordinary SP · Fragment skill.

**Current technical:** Science and Cash Boost base is increased by 20%. Increase the base by 10% for every other assigned Fragment Skill.

**Current flavour:** You find a fragment of another universe. Its knowledge improves your Cash and Science research. What other discoveries might this universe hold?

**Requires:** Cold Fusion (`coldFusion`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

**After Discovery — Regulated Academia:** Enhances Discovery’s production bonus by 20%, plus 10% per Fragment after the first. Bonuses are additive.

**Discovery flavour:** You find a fragment of another universe. Its knowledge strengthens your discoveries. What else might this universe hold?

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#regulatedacademia).

<a id="renegade"></a>
### Renegade

`renegade` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** Multiply Cash production by 5000%.

**Current flavour:** Fear is but a tool for the strong to make the weak be more productive. Red solar panels spread fear across your galaxies, forcing your population to pay more subsidies to you.

**Requires:** Panel Maintenance (`panelMaintenance`).
**Shadow requirements:** None.
**Ordinary exclusions:** Paragon (`paragon`).
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#renegade).

<a id="renewableenergy"></a>
### Renewable Energy

`renewableEnergy` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** Starting at 10 million worker bots, panel lifetime increases by 10%. This increases by 10% each time you multiply your workers by 10.<br><br>lifetime *= 1 + 0.1 * log10(Workers / 1e6)

**Current flavour:** Renewables surge in popularity leading you to focus on panel lifetime improvements.

**Requires:** Artificially Enhanced Panels (`artificiallyEnhancedPanels`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#renewableenergy).

<a id="repeatableresearch"></a>
### Repeatable Research

`repeatableResearch` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** Percentage-based research becomes cheaper as you upgrade it. Its cost is divided by its current total production multiplier. For example, a +300% bonus means 4× production, so that research costs one quarter as much. Does not affect Durability.

**Current flavour:** Repeat, repeat, repeat, repeat, repeat, repeat, repeat, repeat, repeat, repeat, repeat, repeat, repeat, repeat, repeat, repeat.

**Requires:** Science *2 (`doubleScienceTree`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

**After Discovery — Repeatable Research:** +50% Discovery speed. Bonuses are additive.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#repeatableresearch).

<a id="rocketmania"></a>
### Rocket Mania

`rocketMania` · 3 ordinary SP · Not a Fragment skill.

**Current technical:** Panels per second is multiplied by Log20(Panels Per Second)

**Current flavour:** Fly your Rocket from pad to pad and try not to crash!

**Requires:** End of the Line (`endOfTheLine`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#rocketmania).

<a id="rudimentarysingularity"></a>
### Rudimentary Singularity

`rudimentarySingularity` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** Data Centers produce Servers based on Log2(Assembly Line Production) ^ Log10(Assembly Line Production).<br><br>Requires at least 1 production from AI Managers.

**Current flavour:** Folding particles back in on themselves allow you to form the universes first singularities. Perhaps this technology could benefit your Data Centers somehow?

**Requires:** Parallel Processing (`parallelProcessing`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#rudimentarysingularity).

<a id="saren"></a>
### Saren

`saren` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** 40x Panel production.

**Current flavour:** Utilize your overwhelming firepower (Daka daka) to enslave other spacefaring races. Humanity first!

**Requires:** Renegade (`renegade`).
**Shadow requirements:** None.
**Ordinary exclusions:** Paragon (`paragon`).
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#saren).

<a id="doublesciencetree"></a>
### Science *2

`doubleScienceTree` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** Multiplies Science production by 2.

**Current flavour:** Breakthroughs in CPU manufacturing allow your science bots to calculate twice as much data.

**Requires:** Cash & Science (`startHereTree`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

**After Discovery — Discovery Speed:** +25% Discovery speed. Bonuses are additive.

**Discovery flavour:** Breakthroughs in CPU manufacturing. Now with fewer unexplained smoke clouds.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#doublesciencetree).

<a id="producedassciencetree"></a>
### Science Boost

`producedAsScienceTree` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** For every 1% of bots invested in science gain, +100% science production. Multiplicative with other upgrades, but not with itself.

**Current flavour:** Improved networking protocols increase your Scientists ability to work closely together, improving science yield greatly.

**Requires:** Science *2 (`doubleScienceTree`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

**After Discovery — Discovery Boost:** +100% Discovery speed. Bonuses are additive.

**Discovery flavour:** Improved networking protocols. The breakthroughs now arrive before the meeting invitations.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#producedassciencetree).

<a id="scientificdominance"></a>
### Scientific Dominance

`scientificDominance` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** 20x Science, 0.25x Cash

**Current flavour:** Shift your goals into the research sector with singular focus.

**Requires:** Scientific Revolution (`scientificRevolution`).
**Shadow requirements:** None.
**Ordinary exclusions:** Economic Dominance (`economicDominance`).
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

**When Fractured:** 20× Science production.

**After Discovery — Scientific Dominance:** +100% Discovery speed; quarters Cash unless Fractured. Bonuses are additive.

**Fractured after Discovery:** +100% Discovery speed. Bonuses are additive.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#scientificdominance).

<a id="scientificplanets"></a>
### Scientific Planets

`scientificPlanets` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** Produces Planets based on Log10(Science Bots)<br><br>Starting at 10 Science Bots, you gain 1 Planet per second, this increases by 1 each time you multiply your Scientists by 10.

**Current flavour:** Teach some of your Scientists to discover planets for you.

**Requires:** Planets (`planetsTree`), Pocket Dimensions (`pocketDimensions`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: Shoulders of Giants (`shouldersOfGiants`).

**After Discovery — Scientific Planets:** Produces log10(total Bots) Planets per second.

**Discovery flavour:** Teach your Bots to discover planets. Ask them nicely not to misplace any.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#scientificplanets).

<a id="scientificrevolution"></a>
### Scientific Revolution

`scientificRevolution` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** Multiplies Science by 5 while you have at least 50% of bots assigned to Science.

**Current flavour:** Self improving bots create a surge in scientific progress.

**Requires:** Science *2 (`doubleScienceTree`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

**After Discovery — Scientific Revolution:** +50% Discovery speed. Bonuses are additive.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#scientificrevolution).

<a id="servertree"></a>
### Servers

`serverTree` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** Multiplies Servers AI Manager production by 2.

**Current flavour:** Learn to build taller server racks and better cooling. Servers can run twice as many managers.

**Requires:** Cash & Science (`startHereTree`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: Shoulders of Giants (`shouldersOfGiants`).

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#servertree).

<a id="shellworlds"></a>
### Shell Worlds

`shellWorlds` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** Gain Planets based on log2(Planets).

**Current flavour:** Have you heard of matrioshka worlds? Basically worlds layered into worlds layered into worlds. This technique, other than extremely space efficient, allows planets to give birth to more planets based on how many planets exist.

**Requires:** Planet Assembly (`planetAssembly`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#shellworlds).

<a id="shepherd"></a>
### Shepherd

`shepherd` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** +600 seconds of Panel Lifetime.

**Current flavour:** You are not alone, in the endless expanse of space. Others share the same goal as you, and together you will act as a protector and guidance to all not yet spacefaring forms of life.

**Requires:** Paragon (`paragon`).
**Shadow requirements:** None.
**Ordinary exclusions:** Renegade (`renegade`).
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#shepherd).

<a id="shouldersurgery"></a>
### Shoulder Surgery

`shoulderSurgery` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** Shoulders of the Fallen now also affect Pocket Dimensions.

**Current flavour:** Transplanting these weird looking shoulders should be fine, right?

**Requires:** What could’ve been (`whatCouldHaveBeen`).
**Shadow requirements:** None.
**Ordinary exclusions:** What Will Come to Pass (`whatWillComeToPass`).
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#shouldersurgery).

<a id="shouldersofgiants"></a>
### Shoulders of Giants

`shouldersOfGiants` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** Scientific Planets also produce Science Boosts.

**Current flavour:** You find an extinct civilization and learn from their mistakes.

**Requires:** Scientific Planets (`scientificPlanets`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** False; conditional nonrefund dependencies: None.

**After Discovery — Shoulders of Giants:** +10 × log10(1 + Scientific Planets production)% Discovery speed, up to +200%. Includes Shoulders of the Fallen. Bonuses are additive.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#shouldersofgiants).

<a id="shouldersofprecursors"></a>
### Shoulders of Precursors

`shouldersOfPrecursors` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** Disable Cash Multipliers, Science Multipliers additionally affect Cash.<br><br>Mutually exclusive with Shoulders of the Enlightened.

**Current flavour:** The Shoulders of Precursors is a powerful artifact with the ability to multiply wealth and knowledge. It negates the effects of other wealth multipliers and also affects cash. This mysterious relic from a lost civilization is highly valuable and sought after. Its true potential remains unknown.

**Requires:** Shoulders of Giants (`shouldersOfGiants`).
**Shadow requirements:** None.
**Ordinary exclusions:** Shoulders of the Enlightened (`shouldersOfTheEnlightened`).
**Ordinary refund flag:** False; conditional nonrefund dependencies: None.

**When Fractured:** Science multipliers also multiply Cash production, alongside existing Cash multipliers.

**After Discovery — Shoulders of Precursors:** Replaces Cash multipliers with total Discovery speed. When Fractured, multiplies alongside them.

**Fractured after Discovery:** Multiplies Cash by total Discovery speed alongside other Cash multipliers.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#shouldersofprecursors).

<a id="shouldersoftheenlightened"></a>
### Shoulders of the Enlightened

`shouldersOfTheEnlightened` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** Scientific Planets also produces Cash Boosts. Mutually Exclusive with Shoulders of the Precursors.

**Current flavour:** The "Shoulders of the Enlightened" are a pair of mysterious and powerful artifacts that grant immense knowledge and understanding to their bearer, along with the ability to generate great wealth.

**Requires:** Shoulders of Giants (`shouldersOfGiants`).
**Shadow requirements:** None.
**Ordinary exclusions:** Shoulders of Precursors (`shouldersOfPrecursors`).
**Ordinary refund flag:** False; conditional nonrefund dependencies: None.

**When Fractured:** Scientific Planets also produce Cash Boosts.

**After Discovery — Shoulders of the Enlightened:** +10% Cash per completed Discovery while Scientific Planets is assigned. Bonuses are additive.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#shouldersoftheenlightened).

<a id="shouldersofthefallen"></a>
### Shoulders of the Fallen

`shouldersOfTheFallen` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** Scientific Planets create additional Planets based on Log2(Science Boosts)

**Current flavour:** The Shoulders of the Fallen are a revered artifact said to have belonged to great leaders of a lost civilization. They possess the power to enhance Planet production, the extent of which is determined by the number of science boosts acquired. This makes the Shoulders a valuable addition to any empire seeking to increase its production and growth. The true nature and history of this powerful relic remains a mystery, but those who possess it are rumored to have an edge in their quest for expansion and prosperity.

**Requires:** Shoulders of Precursors (`shouldersOfPrecursors`).
**Shadow requirements:** None.
**Ordinary exclusions:** Shoulders of the Enlightened (`shouldersOfTheEnlightened`).
**Ordinary refund flag:** False; conditional nonrefund dependencies: None.

**After Discovery — Shoulders of the Fallen:** Adds log2(1 + completed discoveries) Planets per second while Scientific Planets is assigned.

**Discovery flavour:** A relic of a lost civilization. Excellent shoulders. Terrible instruction manual.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#shouldersofthefallen).

<a id="shouldersoftherevolution"></a>
### Shoulders of the Revolution

`shouldersOfTheRevolution` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** Gain 1% additional Cash per Science Boost.

**Current flavour:** The "Shoulders of the Revolution" is a phrase that refers to a powerful financial system that harnesses the latest advancements in science to dramatically increase wealth. It is said to be built upon the innovations and insights of previous generations of thinkers, and it represents a new era of prosperity and progress for those who use it.

**Requires:** Shoulders of the Enlightened (`shouldersOfTheEnlightened`).
**Shadow requirements:** None.
**Ordinary exclusions:** Shoulders of Precursors (`shouldersOfPrecursors`).
**Ordinary refund flag:** False; conditional nonrefund dependencies: None.

**After Discovery — Shoulders of the Revolution:** +1% Cash per completed Discovery. Bonuses are additive.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#shouldersoftherevolution).

<a id="solarbubbles"></a>
### Solar Bubbles

`solarBubbles` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** Pocket Dimensions gain 1% production boost for every second of Panel Lifetime.

**Current flavour:** You noticed a significant efficiency potential. By introducing tiny condensed spheres (nicknamed bubbles) of solar energy, your panels in the pocket dimensions have something to do, resulting in a significant boost to production.

**Requires:** What Will Come to Pass (`whatWillComeToPass`).
**Shadow requirements:** None.
**Ordinary exclusions:** What could’ve been (`whatCouldHaveBeen`).
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#solarbubbles).

<a id="stayingpower"></a>
### Staying Power

`stayingPower` · 2 ordinary SP · Not a Fragment skill.

**Current technical:** Increase Assembly Line Bot production by 1% per second of Panel Lifetime

**Current flavour:** Spending some extra time in a system lets you improve the efficiency of things.

**Requires:** Artificially Enhanced Panels (`artificiallyEnhancedPanels`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#stayingpower).

<a id="stellardominance"></a>
### Stellar Dominance

`stellarDominance` · 3 ordinary SP · Not a Fragment skill.

**Current technical:** All Panel Lifetime x10. Cash / 100. Bots Sacrificed x100. May the stars have mercy.

**Current flavour:** A price must be paid for greater profits.

**Requires:** Stellar Sacrifices (`stellarSacrifices`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

**When Fractured:** 10× Panel Lifetime while the normal Bot requirement is met, without the extra sacrifice cost or Cash penalty.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#stellardominance).

<a id="stellarimprovements"></a>
### Stellar Improvements

`stellarImprovements` · 3 ordinary SP · Not a Fragment skill.

**Current technical:** Divide Bots required for Stellar Sacrifices by 1000.

**Current flavour:** You use AI to improve construction processes. New molecular structures allow you to use less materials in the process.

**Requires:** Stellar Sacrifices (`stellarSacrifices`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#stellarimprovements).

<a id="stellarobliteration"></a>
### Stellar Obliteration

`stellarObliteration` · 2 ordinary SP · Not a Fragment skill.

**Current technical:** Stellar Sacrifices Galaxies are 1000x better, however you divide your Cash, and Science by Stellar Galaxies.

**Current flavour:** Obliterating even more Bots greatly improves the rate at which you generate facilities, however this is costly.

**Requires:** Stellar Sacrifices (`stellarSacrifices`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

**When Fractured:** Stellar Sacrifices Galaxies are 1000× better.

**After Discovery — Stellar Obliteration:** Stellar Sacrifices Galaxies are 1,000× better. Divides Cash by Stellar Galaxies unless Fractured.

**Fractured after Discovery:** Stellar Sacrifices Galaxies are 1,000× better.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#stellarobliteration).

<a id="stellarsacrifices"></a>
### Stellar Sacrifices

`stellarSacrifices` · 2 ordinary SP · Not a Fragment skill.

**Current technical:** Each second, sacrifice Bots equal to Stars Surrounded to create your highest owned facility, including megastructures. Amount: log10(Stellar Galaxies Engulfed)².

**Current flavour:** You decide to use the materials in your own Bots to build more facilities for your empire.

**Requires:** None.
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

**When Fractured:** Create your highest owned facility each second, including megastructures. Amount: log10(Stellar Galaxies Engulfed)². No Bots required or consumed.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#stellarsacrifices).

<a id="superswarm"></a>
### Super Swarm

`superSwarm` · 2 ordinary SP · Not a Fragment skill.

**Current technical:** Increase the 1% production gain after 100 purchases to 2%

**Current flavour:** Why not double the amount of panels per swarm?

**Requires:** Manual Labour (`manualLabour`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

Existing augment branch: 3 options, listed below.

<a id="superradiantscattering"></a>
### Super-Radiant Scattering

`superRadiantScattering` · 3 ordinary SP · Not a Fragment skill.

**Current technical:** Increase Cash, Science, Bot, and all facility production by 1% per second while assigned. Bonuses are additive. Charges during Stored Time simulation and resets on Infinity or Quantum Leap.

**Current flavour:** Scattering... Something... Causes a perpetually increasing value to affect everything you touch.

**Requires:** Scientific Planets (`scientificPlanets`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

**After Discovery — Super-Radiant Scattering:** Increases Cash, Bots and all facility production as SRS charges. +10 × log10(1 + charge seconds / 100)% Discovery speed, up to +200% before Focused Beam. Bonuses are additive.

Existing augment branch: 7 options, listed below.

<a id="superchargedpower"></a>
### Supercharged Power

`superchargedPower` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** Boosts all Buildings, Cash, and Science by 50%

**Current flavour:** Supercharge your power grid, drastically improving the performance of your empire!

**Requires:** Worker Efficiency (`workerEfficiencyTree`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

**After Discovery — Supercharged Power:** +50% Cash and facility production; +25% Discovery speed. Bonuses are additive.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#superchargedpower).

<a id="supernova"></a>
### Supernova

`supernova` · 4 ordinary SP · Not a Fragment skill.

**Current technical:** Stellar Sacrifices Galaxies are 1000x better. While Supernova is assigned, manually purchased buildings lose every production bonus including Avocados, the 50/100 milestones, Production Scaling, and all Swarm rates. Unassigning Supernova restores the complete manual-purchase layer.

**Current flavour:** You discover a way to utilize supernovas to melt bots faster.

**Requires:** Stellar Obliteration (`stellarObliteration`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

**When Fractured:** Stellar Sacrifices Galaxies are 1000× better. All manual-purchase production bonuses remain active.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#supernova).

<a id="tasteofpower"></a>
### Taste of Power

`tasteOfPower` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** 50% stronger Assembly Lines, AI Managers, Servers, Data Centers, and Planets. 25% less Cash and Science.

**Current flavour:** After getting your first taste of real power you crave more. Seek it out.

**Requires:** Supercharged Power (`superchargedPower`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

**When Fractured:** Assembly Lines, AI Managers, Servers, Data Centers and Planets are 50% stronger.

**After Discovery — Taste of Power:** 50% stronger Assembly Lines, AI Managers, Servers, Data Centers and Planets. 25% less Cash unless Fractured.

**Fractured after Discovery:** 50% stronger Assembly Lines, AI Managers, Servers, Data Centers and Planets.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#tasteofpower).

<a id="terraeculeo"></a>
### Terra Eculeo

`terraEculeo` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** Bought Planets also count towards bought Servers.

**Current flavour:** Your planets are the biggest wheel of progress. They spin around and make more servers, they sure look like a spring in Denver.

**Requires:** Terra Firma (`terraFirma`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#terraeculeo).

<a id="terrafirma"></a>
### Terra Firma

`terraFirma` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** Bought Planets also count towards Bought Data Centers.

**Current flavour:** Focusing on more earthlike planets allows humanity to thrive, increasing the rate of progression.

**Requires:** Galactic Paradigm Shift (`galacticPradigmShift`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#terrafirma).

<a id="terragloriae"></a>
### Terra Gloriae

`terraGloriae` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** Total Planets reduce the cost of bought Planets.

**Current flavour:** "Glory to your planets". The new galactic mega corporation motto, that surprisingly reduces the cost of getting more planets. Maybe you should come out with more of them.

**Requires:** Terra Nova (`terraNova`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#terragloriae).

<a id="terrainfirma"></a>
### Terra Infirma

`terraInfirma` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** Bought Planets also count towards bought AI Managers.

**Current flavour:** Okay, the description is a bit misleading. Your planets aren't weak nor crippled, they are just sanctuaries for the smaller and weaker members of your empire (your AI Managers, in this case).

**Requires:** Terra Eculeo (`terraEculeo`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#terrainfirma).

<a id="terrairradiant"></a>
### Terra Irradient

`terraIrradiant` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** Bought Planets now count Twelve Times.

**Current flavour:** You aren't quite sure why, but every planet you manually spend resources to get shines bright like a diamond. It might have to do with bombing the planet afterwards with metric tons of diamonds.

**Requires:** Terra Nullius (`terraNullius`), Terra Gloriae (`terraGloriae`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#terrairradiant).

<a id="terranova"></a>
### Terra Nova

`terraNova` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** Planet Boost effect also reduces the Cost of new Planets.

**Current flavour:** Earth is threatened with extinction in the year 2149. The Shannon family transport themselves back a million years, where colonies of humans have a second chance to build a civilisation.

**Requires:** Terra Firma (`terraFirma`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#terranova).

<a id="terranullius"></a>
### Terra Nullius

`terraNullius` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** Bought Planets also count towards bought Assembly Lines.

**Current flavour:** There aren't any planets like yours. And that's because you are amazing! Also because each planet is filled to the brim with Assembly Lines, Managers, Servers and Data Centers.

**Requires:** Terra Infirma (`terraInfirma`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#terranullius).

<a id="terraformingprotocols"></a>
### Terraforming Protocols

`terraformingProtocols` · 1 ordinary SP · Fragment skill.

**Current technical:** Assemble an additional Planet per second. Get an additional Planet for every other assigned Fragment Skill.

**Current flavour:** You find a fragment of another universe. You use this knowledge to discover new Planets, I wonder what other parts of this universe you can find?

**Requires:** Scientific Planets (`scientificPlanets`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#terraformingprotocols).

<a id="ultimateswarm"></a>
### Ultimate Swarm

`ultimateSwarm` · 3 ordinary SP · Not a Fragment skill.

**Current technical:** Increase the production multiplier from 3% to 5%

**Current flavour:** Pushing the limits is what you do best.

**Requires:** Mega Swarm (`megaSwarm`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

Existing augment branch: 3 options, listed below.

<a id="unsuspiciousalgorithms"></a>
### Unsuspicious Algorithms

`unsuspiciousAlgorithms` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** Get 10x as many Servers from Rudimentary Singularity.

**Current flavour:** Lowering Suspicion allows... wait, wrong game.

**Requires:** Rudimentary Singularity (`rudimentarySingularity`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#unsuspiciousalgorithms).

<a id="versatileproductiontactics"></a>
### Versatile Production Tactics

`versatileProductionTactics` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** You now produce 50% more AI Managers. Additionally, after 100 Planets, Planets production boosted by 50%

**Current flavour:** Stuff happens, and your production layout is prepared for everything and anything. This allows for a flexible production boost, boosting the highest and the lowest layer of the dyson swarm.

**Requires:** One Minute Plan (`oneMinutePlan`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#versatileproductiontactics).

<a id="whatcouldhavebeen"></a>
### What could’ve been

`whatCouldHaveBeen` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** Shoulders of Giants now additionally work off Pocket Dimensions.

**Current flavour:** Sick of imagining what could have been you decide to put your imagination into action.

**Requires:** Dimensional CAT cables (`dimensionalCatCables`), Shoulders of Giants (`shouldersOfGiants`).
**Shadow requirements:** None.
**Ordinary exclusions:** What Will Come to Pass (`whatWillComeToPass`).
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

**After Discovery — What could’ve been:** +10 × log10(1 + Pocket Dimensions production)% Discovery speed, up to +200%. Shoulder Surgery includes Shoulders of the Fallen. Bonuses are additive.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#whatcouldhavebeen).

<a id="whatwillcometopass"></a>
### What Will Come to Pass

`whatWillComeToPass` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** Every bought Data Center gives a 1% boost to production of Data Centers.

**Current flavour:** Death, life, death, life. An eternal loop of what will come to pass. Being prepared not only helps your psychology, but also your pocket dimensions.

**Requires:** Dimensional CAT cables (`dimensionalCatCables`).
**Shadow requirements:** None.
**Ordinary exclusions:** What could’ve been (`whatCouldHaveBeen`).
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#whatwillcometopass).

<a id="workerboost"></a>
### Worker Boost

`workerBoost` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** For every 1% invested in Workers, +100% Cash production.

**Current flavour:** Additional worker bots can now be used as home assistants... At a cost of course!

**Requires:** Worker Efficiency (`workerEfficiencyTree`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

**After Discovery — Worker Boost:** +10,000% Cash production.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#workerboost).

<a id="workerefficiencytree"></a>
### Worker Efficiency

`workerEfficiencyTree` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** Multiplies Panel production by 2.

**Current flavour:** CPU upgrades allow your workers to operate additional arms, making them twice as effective.

**Requires:** Cash & Science (`startHereTree`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#workerefficiencytree).

<a id="worthysacrifice"></a>
### Worthy Sacrifice

`worthySacrifice` · 1 ordinary SP · Not a Fragment skill.

**Current technical:** Panel Lifetime will be reduced by 50%, but Assembly Lines will be 5x as effective.

**Current flavour:** Worthy Sacrifice is a legendary trade-off, balancing panel longevity for efficient assembly. It requires bold leadership and a deep understanding of organizational values. A symbol of determination and strategic thinking, it is remembered as a tale of calculated risk-taking.

**Requires:** Burnout (`burnOut`).
**Shadow requirements:** None.
**Ordinary exclusions:** None.
**Ordinary refund flag:** True; conditional nonrefund dependencies: None.

**When Fractured:** Assembly Lines are 5× as effective.

New proposals: [3–7 choices in the catalogue](complete-skill-augment-catalog.md#worthysacrifice).

## All 31 existing augments

These are preserved by the proposal. Current cost, effect and prerequisites are copied from the existing definitions; normal augment assignment still requires a Fractured parent. A missing flavour string is recorded explicitly.

### Manual Labour

| Augment | SP | Current technical | Current flavour |
| --- | ---: | --- | --- |
| Hand-built AI Managers | 1 | Tinker also creates 2% of your AI Managers, capped at 20 seconds of their passive creation. Versatile Production Tactics applies. | No separate flavour string. |
| Hand-built Servers | 1 | Tinker also creates 2% of your Servers, capped at 20 seconds of their passive creation. Versatile Production Tactics applies. | No separate flavour string. |
| Hand-built Data Centers | 1 | Tinker also creates 2% of your Data Centers, capped at 20 seconds of their passive creation. Versatile Production Tactics applies. | No separate flavour string. |
| Hand-built Planets | 1 | Tinker also creates 2% of your Planets, capped at 20 seconds of their passive creation. Versatile Production Tactics applies. | No separate flavour string. |
| Hand-built Matrioshka Brains | 1 | Tinker also creates 2% of your Matrioshka Brains, capped at 20 seconds of their passive creation. Versatile Production Tactics applies. | No separate flavour string. |
| Hand-built Birch Planets | 1 | Tinker also creates 2% of your Birch Planets, capped at 20 seconds of their passive creation. Versatile Production Tactics applies. | No separate flavour string. |
| Hand-built Galactic Brains | 1 | Tinker also creates 2% of your Galactic Brains, capped at 20 seconds of their passive creation, or 1 Brain if higher. Versatile Production Tactics applies before the cap. | No separate flavour string. |
| Hand Assembly | 1 | Build Bots every 0.2 seconds without an AI Manager. Base yield is (completed Hand Assemblies + 1)^5, capped at 100 quadrillion Bots per activation. Keeps Assembly Line tinkering. Work resets on Infinity. | Factory optional. Fingers essential. |
| Practice Makes Perfect | 1 | Increase Hand Assembly yield by up to 200% with practice: 200% × completions / (completions + 500). Practice resets on Infinity; refunds preserve it. Bonuses are additive. | The first thousand were prototypes. |
| Working Smarter | 1 | Increase Hand Assembly yield by 25% × log10(1 + Assembly Line research levels), capped at +200%. After unlocking Discovery, use completed Discoveries instead. Bonuses are additive. | You finally read the instructions. |
| Patient Hands | 1 | While idle, store up to 42 seconds of Hand Assembly. Your next activation completes the stored work with 25% more Bots. Stored work also builds practice. Consumed on activation. | Measure twice. Have a cup of tea. Cut once. |

| ID | Authored prerequisites |
| --- | --- |
| `subskill.manualLabour.managers` | Manual Labour (`manualLabour`) |
| `subskill.manualLabour.servers` | subskill.manualLabour.managers (`subskill.manualLabour.managers`) |
| `subskill.manualLabour.dataCenters` | subskill.manualLabour.servers (`subskill.manualLabour.servers`) |
| `subskill.manualLabour.planets` | subskill.manualLabour.dataCenters (`subskill.manualLabour.dataCenters`) |
| `subskill.manualLabour.matrioshka` | subskill.manualLabour.planets (`subskill.manualLabour.planets`) |
| `subskill.manualLabour.birch` | subskill.manualLabour.matrioshka (`subskill.manualLabour.matrioshka`) |
| `subskill.manualLabour.galactic` | subskill.manualLabour.birch (`subskill.manualLabour.birch`) |
| `subskill.manualLabour.handAssembly` | Manual Labour (`manualLabour`) |
| `subskill.manualLabour.practice` | subskill.manualLabour.handAssembly (`subskill.manualLabour.handAssembly`) |
| `subskill.manualLabour.workingSmarter` | subskill.manualLabour.handAssembly (`subskill.manualLabour.handAssembly`) |
| `subskill.manualLabour.patientHands` | subskill.manualLabour.handAssembly (`subskill.manualLabour.handAssembly`) |

### Mega Swarm

| Augment | SP | Current technical | Current flavour |
| --- | ---: | --- | --- |
| Pooled Purchases | 3 | Each facility uses the total purchased count of all facilities for purchase bonuses. Terra applies afterwards. Prices are unchanged. | One receipt. Everybody takes credit. |
| Economy of Scale | 1 | Multiplies Cash, Science and Bot production by log5(total facilities), with a minimum of 1×. | Buying in bulk has become a personality trait. |

**Existing Discovery variants**

- **Economy of Scale:** Multiplies Cash and Bots by M = max(1, log5(total facilities)). Adds min(200%, 10% × log10(M)) Discovery speed. Bonuses are additive.

| ID | Authored prerequisites |
| --- | --- |
| `subskill.swarm.pooledPurchases` | Mega Swarm (`megaSwarm`) |
| `subskill.swarm.economyOfScale` | Mega Swarm (`megaSwarm`) |

### Production Scaling

| Augment | SP | Current technical | Current flavour |
| --- | ---: | --- | --- |
| Compound Fragments | 3 | Multiplies normal purchase scaling by (1 + Swarm rate)^floor((effective purchases / Fragment threshold)^0.825). The threshold has a minimum of 1. | Somehow the pieces came with interest. |
| Reductive Scaling | 3 | Reduces facility price growth by 0.5 percentage points per active Fragment Skill, to a minimum of 0.1%. | The price tags are getting nervous. |

| ID | Authored prerequisites |
| --- | --- |
| `subskill.swarm.compoundFragments` | Production Scaling (`productionScaling`) |
| `subskill.swarm.reductiveScaling` | Production Scaling (`productionScaling`) |

### Cash & Science

| Augment | SP | Current technical | Current flavour |
| --- | ---: | --- | --- |
| Extended Warranty | 1 | +5 seconds Panel Lifetime | You ask your engineers to make the panels last longer. They offer you another five seconds and assure you that the warranty definitely covers solar exposure. |
| Supermassive Panels | 1 | Each decayed panel counts as 10 | You ask yourself, “What if I just made the panels bigger?” Now your panels are so big that they count towards decayed panels tenfold! |
| Double Standards | 1 | 2× Cash and Science production | You raise your standards and tell your bots to produce twice as much. Apparently, all you had to do was ask! |

**Existing Discovery variants**

- **Double Standards:** Doubles Cash production and adds +25% Discovery speed. Bonuses are additive.

| ID | Authored prerequisites |
| --- | --- |
| `subskill.cashScience.lifetime` | Cash & Science (`startHereTree`) |
| `subskill.cashScience.decay` | Cash & Science (`startHereTree`) |
| `subskill.cashScience.production` | Cash & Science (`startHereTree`) |

### Super-Radiant Scattering

| Augment | SP | Current technical | Current flavour |
| --- | ---: | --- | --- |
| Hot Start | 3 | Gain 30 minutes of SRS charge on first assignment each Infinity, multiplied by Stellar Memory. Assigning Stellar Memory later adds any missing charge once. Non-refundable. | Your scientists preheated the equipment. They used the pizza setting, but it seems to have worked. |
| Afterglow | 1 | Retain 10% of SRS charge through Infinity, multiplied by Stellar Memory up to 50% retention. Adds to Hot Start. Quantum Leap clears retained charge. | The last universe is gone, but some of its particles haven’t taken the hint. |
| Deep Exposure | 3 | Increase SRS charging speed by 10% per minute this augment is assigned, up to 200% after 20 minutes. Stellar Memory multiplies these bonuses. Resets on Infinity or Quantum Leap. Bonuses are additive. | Your scientists recommend prolonged exposure. From behind a very thick window. |
| Focused Beam | 1 | Increase the SRS bonus above 1× by 50% for Cash or Science, whichever has more Bots assigned. Stellar Memory multiplies this increase. Halve the bonus for the other resource. Equal allocation leaves both unchanged. | You ask the particles to form an orderly queue. Nobody expected that to work. |
| Research Conversion | 1 | Reduce Science production by 50%. Increase SRS charging speed by 100%, multiplied by Stellar Memory. Bonuses are additive. | You plug the research department into the reactor. Peer review is now a fire hazard. |
| Research Activity | 2 | Gaining a research level increases SRS charging speed by 150%, multiplied by Stellar Memory, for 30 seconds. Generated levels count. Further gains refresh the duration. Bonuses are additive. | Every breakthrough gets a celebratory button press. Nobody remembers what the button was originally for. |
| Stellar Memory | 5 | On Infinity or Quantum reset, bank newly generated SRS charge, excluding Hot Start and Afterglow. While assigned, boosts SRS augment benefits by 1 + 0.25 × log10(max(1, banked seconds)). | Your scientists keep their notes between universes. Most of them say “try not to do that again.” |

**Existing Discovery variants**

- **Focused Beam:** Enhances SRS’s Cash bonus and Discovery-speed bonus by 50%, scaled by Stellar Memory.
- **Research Conversion:** +100% SRS charging speed, enhanced by Stellar Memory. Bonuses are additive.
- **Research Activity:** +150% SRS charging speed while assigned, enhanced by Stellar Memory. Bonuses are additive.

| ID | Authored prerequisites |
| --- | --- |
| `subskill.srs.hotStart` | Super-Radiant Scattering (`superRadiantScattering`) |
| `subskill.srs.afterglow` | subskill.srs.hotStart (`subskill.srs.hotStart`) |
| `subskill.srs.deepExposure` | Super-Radiant Scattering (`superRadiantScattering`) |
| `subskill.srs.focusedBeam` | Super-Radiant Scattering (`superRadiantScattering`) |
| `subskill.srs.researchConversion` | subskill.srs.focusedBeam (`subskill.srs.focusedBeam`) |
| `subskill.srs.researchActivity` | subskill.srs.deepExposure (`subskill.srs.deepExposure`), subskill.srs.focusedBeam (`subskill.srs.focusedBeam`) |
| `subskill.srs.stellarMemory` | subskill.srs.researchActivity (`subskill.srs.researchActivity`), subskill.srs.researchConversion (`subskill.srs.researchConversion`) |

### Super Swarm

| Augment | SP | Current technical | Current flavour |
| --- | ---: | --- | --- |
| Head Start | 1 | Gain 30 purchased units of each available facility once per Infinity, without increasing prices. Includes unlocked megastructures. | Some assembly already completed. |
| Botnet | 3 | Multiplies all facility production by 1 + log20(Bots). | They finally accepted the group invitation. |
| Deferred Billing | 3 | Facility purchases require their full Cash price, but do not spend it. | The invoice is somebody else’s problem. |

| ID | Authored prerequisites |
| --- | --- |
| `subskill.swarm.headStart` | Super Swarm (`superSwarm`) |
| `subskill.swarm.botnet` | Super Swarm (`superSwarm`) |
| `subskill.swarm.deferredBilling` | Super Swarm (`superSwarm`) |

### Ultimate Swarm

| Augment | SP | Current technical | Current flavour |
| --- | ---: | --- | --- |
| Steady Supply | 3 | Keep paid facility purchases through Infinity. Assign before resetting; purchases return automatically. Free starter units do not accumulate. Quantum clears the supply. | Please leave the factories where you found them. |
| Self-Replicating Workers | 5 | Hunters and Gatherers gain (1 + Swarm rate × their count / 10)^0.75 production speed. Launched-panel Energy gains (1 + Swarm rate × launched panels / 100)^0.5. | The recruitment department has become redundant. |
| Stellar Swarm | 4 | Multiplies Stellar Sacrifices output by 1 + log12.5(Bots) × log12.5(P), where P is the purchase-scaling multiplier of your highest owned facility. Bot costs are unchanged. | Sacrifices are now available in bulk. |

| ID | Authored prerequisites |
| --- | --- |
| `subskill.swarm.steadySupply` | Ultimate Swarm (`ultimateSwarm`) |
| `subskill.swarm.selfReplicatingWorkers` | Ultimate Swarm (`ultimateSwarm`) |
| `subskill.swarm.stellarSwarm` | Ultimate Swarm (`ultimateSwarm`) |

## Inventory provenance

The live runtime catalogue, skill definitions, English presentation resolver, Discovery overrides, Fractured-effect text and the existing augment definitions were joined by exact ID. The accompanying `reference-catalog.json` retains definitions and static effects as well as text. Dynamic source owners are linked above. The analysis bundle records the working-tree revision and SHA-256 hashes, because the checkout includes earlier audit changes.

New copy follows [the UI style guide](../ui-style-guide.md): concise effect/condition/essential cap, separate short flavour, and formulas in Details. No UI surface or artwork was changed during this proposal.
