import { addDiscrete, clampContinuous } from './numeric'
import {
  BASIC_DYSON_FACILITY_IDS,
  type BasicDysonFacilityId,
  type OwnedPair,
} from './dysonFacilities'

const INT_MAXIMUM = 2_147_483_647

export interface InfinityStatistics {
  ordinaryCount: bigint
  ordinaryPoints: bigint
  breakCount: bigint
  breakPoints: bigint
  botCapRewards: bigint
}

export interface InfinityResetState {
  points: bigint
  permanentSkillPoints: bigint
  retainedFacilities: Record<BasicDysonFacilityId, boolean>
  offlineTimeUsedThisInfinity: number
  offlineTimeUsedPreviousInfinity: number
  firstInfinityDone: boolean
  tutorial: boolean
  infinityInProgress: boolean
  botCapTransitionPending: boolean
  botCapRewardsGranted: boolean
  lastInfinityPointsGained: number
  bots: number
  facilities: Record<BasicDysonFacilityId, OwnedPair>
  skillPoints: bigint
  fragments: bigint
  statistics: InfinityStatistics
}

export interface InfinityResetRequest {
  readonly breakInfinity: boolean
  readonly requestedReward: bigint
  readonly bankedSkillPoints: bigint
  readonly artifactSkillPoints: bigint
  readonly botCapTransition: boolean
}

export interface InfinityResetOutcome {
  readonly applied: boolean
  readonly rewardGranted: bigint
}

function emptyFacilities(): Record<BasicDysonFacilityId, OwnedPair> {
  return {
    assembly_lines: [0, 0],
    ai_managers: [0, 0],
    servers: [0, 0],
    data_centers: [0, 0],
    planets: [0, 0],
  }
}

function validRequest(request: InfinityResetRequest): boolean {
  return (
    request.requestedReward >= 0n &&
    request.bankedSkillPoints >= 0n &&
    request.artifactSkillPoints >= 0n
  )
}

export function applyInfinityResetTransition(
  state: InfinityResetState,
  request: InfinityResetRequest,
): InfinityResetOutcome {
  if (
    !validRequest(request) ||
    state.points < 0n ||
    state.permanentSkillPoints < 0n
  ) {
    return { applied: false, rewardGranted: 0n }
  }

  const previousPoints = state.points
  const nextPoints = addDiscrete(previousPoints, request.requestedReward)
  const rewardGranted = nextPoints - previousPoints

  state.offlineTimeUsedPreviousInfinity = clampContinuous(
    state.offlineTimeUsedThisInfinity,
  )
  state.offlineTimeUsedThisInfinity = 0
  state.firstInfinityDone = true
  state.tutorial = true
  state.lastInfinityPointsGained = Number(
    rewardGranted > BigInt(INT_MAXIMUM)
      ? BigInt(INT_MAXIMUM)
      : rewardGranted,
  )
  state.points = nextPoints

  const facilities = emptyFacilities()
  for (const id of BASIC_DYSON_FACILITY_IDS) {
    if (state.retainedFacilities[id]) facilities[id][1] = 10
  }
  state.facilities = facilities
  state.bots = state.retainedFacilities.assembly_lines ? 10 : 1
  state.skillPoints = addDiscrete(
    addDiscrete(
      state.permanentSkillPoints,
      request.bankedSkillPoints,
    ),
    request.artifactSkillPoints,
  )
  state.fragments = 0n
  state.infinityInProgress = false
  state.botCapTransitionPending = false
  state.botCapRewardsGranted = false

  if (request.breakInfinity) {
    state.statistics.breakCount = addDiscrete(
      state.statistics.breakCount,
      1n,
    )
    state.statistics.breakPoints = addDiscrete(
      state.statistics.breakPoints,
      rewardGranted,
    )
  } else {
    state.statistics.ordinaryCount = addDiscrete(
      state.statistics.ordinaryCount,
      1n,
    )
    state.statistics.ordinaryPoints = addDiscrete(
      state.statistics.ordinaryPoints,
      rewardGranted,
    )
  }
  if (request.botCapTransition) {
    state.statistics.botCapRewards = addDiscrete(
      state.statistics.botCapRewards,
      1n,
    )
  }

  return { applied: true, rewardGranted }
}
