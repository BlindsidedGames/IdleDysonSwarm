export type GameAction =
  | { type: "TICK"; dt: number }
  | { type: "SET_BUY_MODE"; buyMode: "Buy1" | "Buy10" | "Buy50" | "Buy100" | "BuyMax" }
  | { type: "SET_RESEARCH_BUY_MODE"; buyMode: "Buy1" | "Buy10" | "Buy50" | "Buy100" | "BuyMax" }
  | { type: "TOGGLE_ROUNDED_BULK_BUY" }
  | { type: "TOGGLE_RESEARCH_ROUNDED_BULK_BUY" }
  | {
      type: "SET_AUTO_RESEARCH_TOGGLE";
      researchId: "aiManager" | "assemblyLine" | "money" | "planet" | "server" | "dataCenter" | "science";
      value: boolean;
    }
  | {
      type: "SET_AUTO_BUILDING_TOGGLE";
      buildingId: "assemblyLines" | "managers" | "servers" | "dataCenters" | "planets";
      value: boolean;
    }
  | { type: "SET_INFINITY_BREAK_THRESHOLD"; value: number }
  | { type: "SET_NUMBER_FORMATTING"; value: "standard" | "engineering" | "scientific" }
  | { type: "SET_BOT_DISTRIBUTION"; botDistribution: number }
  | { type: "DEBUG_ADD_MONEY"; amount: number }
  | { type: "DEBUG_ADD_SCIENCE"; amount: number }
  | { type: "SET_DEBUG_FLAG"; flag: "debugOptions" | "doubleIp"; value: boolean }
  | { type: "OFFLINE_SPEND"; seconds: number }
  | { type: "OFFLINE_DOUBLE_MAX" }
  | { type: "MANUAL_BOT_CREATION_START" }
  | { type: "BUY_BUILDING"; buildingId: "assemblyLines" | "managers" | "servers" | "dataCenters" | "planets" }
  | { type: "BUY_RESEARCH"; researchId: "science" | "cash" | "assemblyLine" | "aiManager" | "server" | "dataCenter" | "planet" }
  | { type: "BUY_PANEL_LIFETIME"; upgradeId: 1 | 2 | 3 | 4 }
  | { type: "SKILL_TREE_TOGGLE"; skillId: number }
  | { type: "SKILL_TREE_AUTO_ASSIGN_TOGGLE"; skillId: number }
  | { type: "SKILL_TREE_RESET" }
  | { type: "SKILL_TREE_SAVE_PRESET"; preset: 1 | 2 | 3 | 4 | 5 }
  | { type: "SKILL_TREE_LOAD_PRESET"; preset: 1 | 2 | 3 | 4 | 5 }
  | { type: "DYSON_PRESTIGE" }
  | {
      type: "INFINITY_BUY";
      item:
        | "secret"
        | "skillPoint"
        | "starterAssemblyLines"
        | "starterAiManagers"
        | "starterServers"
        | "starterDataCenters"
        | "starterPlanets"
        | "autoResearch"
        | "autoBots";
    }
  | { type: "PRESTIGE_PLUS_ENACT" }
  | {
      type: "PRESTIGE_PLUS_BUY";
      item:
        | "botMultitasking"
        | "doubleIP"
        | "automation"
        | "secrets"
        | "division"
        | "breakTheLoop"
        | "quantumEntanglement"
        | "avocato"
        | "fragments"
        | "purity"
        | "terra"
        | "power"
        | "paragade"
        | "stellar"
        | "influence"
        | "cash"
        | "science";
    }
  | { type: "AVOCATO_FEED_IP" }
  | { type: "AVOCATO_FEED_INFLUENCE" }
  | { type: "AVOCATO_FEED_STRANGE_MATTER" }
  | { type: "AVOCATO_MEDITATE" }
  | { type: "REALITY_SEND_WORKERS" }
  | {
      type: "DREAM1_BUY";
      item:
        | "hunters"
        | "gatherers"
        | "communityBoost"
        | "engineering"
        | "shipping"
        | "worldTrade"
        | "worldPeace"
        | "mathematics"
        | "advancedPhysics"
        | "factoriesBoost"
        | "solar"
        | "fusion";
    }
  | {
      type: "STRANGE_MATTER_BUY";
      item:
        | "counterMeteor"
        | "counterAi"
        | "counterGw"
        | "engineering1"
        | "engineering2"
        | "engineering3"
        | "shipping1"
        | "shipping2"
        | "worldTrade1"
        | "worldTrade2"
        | "worldTrade3"
        | "worldPeace1"
        | "worldPeace2"
        | "worldPeace3"
        | "worldPeace4"
        | "mathematics1"
        | "mathematics2"
        | "mathematics3"
        | "advancedPhysics1"
        | "advancedPhysics2"
        | "advancedPhysics3"
        | "advancedPhysics4"
        | "hunter1"
        | "hunter2"
        | "hunter3"
        | "hunter4"
        | "gatherer1"
        | "gatherer2"
        | "gatherer3"
        | "gatherer4"
        | "workerBoost"
        | "citiesBoost"
        | "factoriesBoost"
        | "bots1"
        | "bots2"
        | "rockets1"
        | "rockets2"
        | "rockets3"
        | "sfacs1"
        | "sfacs2"
        | "sfacs3"
        | "railguns1"
        | "railguns2"
        | "translation1"
        | "translation2"
        | "translation3"
        | "translation4"
        | "translation5"
        | "translation6"
        | "translation7"
        | "translation8"
        | "speed1"
        | "speed2"
        | "speed3"
        | "speed4"
        | "speed5"
        | "speed6"
        | "speed7"
        | "speed8"
        | "doubleTime"
        | "automateInfluence";
    }
  | { type: "SET_DOUBLE_TIME_RATE"; rate: number }
  | { type: "SIMULATION_BLACK_HOLE" };
