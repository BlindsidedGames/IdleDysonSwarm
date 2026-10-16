import { defineConfig } from 'vitest/config'

// Deliberately explicit: this is the sole automated-suite exception in AGENTS.md.
export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'src/save/serialization.test.ts',
      'src/save/repository.test.ts',
      'src/modes/modeSaveStore.test.ts',
      'src/modes/modeController.test.ts',
      'src/modes/modeCloud.test.ts',
      'src/application/offlineCheckpointRecovery.test.ts',
    ],
  },
})
