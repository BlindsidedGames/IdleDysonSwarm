import type { SaveRepositoryPaths } from '../save/repository'

/** Approved beta progress is local-only and never probes public progress. */
export const REWORK_BETA_DATABASE_NAME = 'idle-dyson-swarm-rework-beta-v1'
export const REWORK_BETA_PROFILE_ID = 'rework-beta-default-profile'
export const REWORK_BETA_WRITER_TOKEN_KEY = 'idle-dyson-swarm:rework-beta-v1:writer-tab-token'
export const REWORK_BETA_OWNERSHIP_CHANNEL = 'idle-dyson-swarm:rework-beta-v1:writer-ownership'
const prefix = `/rework-beta/${REWORK_BETA_PROFILE_ID}`
export const REWORK_BETA_SAVE_PATHS = Object.freeze({
  current: `${prefix}/current.idsw`,
  temporary: `${prefix}/current.idsw.tmp`,
  legacyRecovery: `${prefix}/recovery/original-idb1.txt`,
  backups: Object.freeze([`${prefix}/current.idsw.backup.1`, `${prefix}/current.idsw.backup.2`, `${prefix}/current.idsw.backup.3`] as const),
} satisfies SaveRepositoryPaths)
