import type { SaveRepositoryPaths } from '../save/repository'

/**
 * Stable Web storage identity.
 *
 * Early Web releases unintentionally reached the runtime's development
 * defaults. Those values are therefore already a deployed player-data
 * location and must be treated as a compatibility contract. Keeping the
 * location explicit preserves existing saves without a destructive or
 * failure-prone cross-database migration.
 */
export const PRODUCTION_BROWSER_DATABASE_NAME =
  'idle-dyson-swarm-web-development-v1'
export const PRODUCTION_BROWSER_PROFILE_ID =
  'development-only-default-profile'
const PRODUCTION_BROWSER_SAVE_PREFIX =
  `/development-only/${PRODUCTION_BROWSER_PROFILE_ID}`
export const PRODUCTION_BROWSER_SAVE_PATHS = Object.freeze({
  current: `${PRODUCTION_BROWSER_SAVE_PREFIX}/current.idsw`,
  temporary: `${PRODUCTION_BROWSER_SAVE_PREFIX}/current.idsw.tmp`,
  legacyRecovery:
    `${PRODUCTION_BROWSER_SAVE_PREFIX}/recovery/original-idb1.txt`,
  backups: Object.freeze([
    `${PRODUCTION_BROWSER_SAVE_PREFIX}/current.idsw.backup.1`,
    `${PRODUCTION_BROWSER_SAVE_PREFIX}/current.idsw.backup.2`,
    `${PRODUCTION_BROWSER_SAVE_PREFIX}/current.idsw.backup.3`,
  ]),
} satisfies SaveRepositoryPaths)
