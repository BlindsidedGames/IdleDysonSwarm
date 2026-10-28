import { defineConfig } from 'vitest/config'

// Classic has no paired-mode store; retain the applicable approved save-safety cases.
export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'src/save/serialization.test.ts',
      'src/save/repository.test.ts',
      'src/application/offlineCheckpointRecovery.test.ts',
    ],
  },
})
