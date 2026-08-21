import {
  readdirSync,
  readFileSync,
} from 'node:fs'
import { resolve } from 'node:path'
import {
  FIRST_SLICE_COMMIT_PROBE_MARKER,
} from '../../src/ui/performance/firstSliceCommitProbe'

/**
 * Verifies a normal production build tree-shook the performance-mode React
 * commit recorder. Run only after a normal `vite build`.
 */
const webRoot = resolve(import.meta.dirname, '..', '..')
const assetsRoot = resolve(webRoot, 'dist', 'assets')
const javascriptFiles = readdirSync(assetsRoot)
  .filter((file) => file.endsWith('.js'))
  .map((file) => resolve(assetsRoot, file))
const leakingFile = javascriptFiles.find((file) =>
  readFileSync(file, 'utf8').includes(
    FIRST_SLICE_COMMIT_PROBE_MARKER,
  ),
)
if (leakingFile !== undefined) {
  throw new Error(
    `Normal production output retained the React commit probe: ${leakingFile}`,
  )
}
console.log(
  'PASS normal production output excludes the React commit probe.',
)
