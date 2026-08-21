import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { prepareIdb1Save } from '../src/save/prepare'

const input = process.argv[2]
if (!input) {
  console.error('Usage: npm run prepare-save -- /path/to/idle_dyson_swarm_save.txt')
  process.exitCode = 1
} else {
  const prepared = prepareIdb1Save(readFileSync(resolve(input), 'utf8'))
  console.log(
    JSON.stringify(
      {
        sourceSchema: prepared.migration.sourceSchema,
        targetSchema: prepared.migration.targetSchema,
        decodedBytes: prepared.decodedBytes,
        appliedSteps: prepared.migration.appliedSteps,
        numericRepairs: prepared.migration.numericRepair.repairCount,
        repairEntries: prepared.migration.numericRepair.entries.slice(0, 10),
        valid: prepared.migration.validation.valid,
      },
      null,
      2,
    ),
  )
}
