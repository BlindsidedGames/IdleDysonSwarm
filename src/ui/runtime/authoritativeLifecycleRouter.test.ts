import { describe, expect, test } from 'vitest'
import type { LifecycleAdapter } from '../../platform/contracts'
import {
  WriterAuthorityLostError,
  type WriterOperationAuthority,
} from '../../platform/writerAuthority'
import {
  AuthoritativeLifecycleRouter,
  type AuthoritativeWriterLeasePort,
} from './authoritativeLifecycleRouter'

describe('authoritative lifecycle router active admission lane', () => {
  test('does not reject an admitted update after it has mutated memory', async () => {
    let authoritative = true
    let mutations = 0
    const router = createRouter(() => authoritative)

    await expect(router.runLocallyFenced(() => {
      mutations += 1
      authoritative = false
      return 'consumed'
    })).resolves.toBe('consumed')
    expect(mutations).toBe(1)
    await router.shutdown()
  })

  test('rejects before mutation when local authority is already unavailable', async () => {
    let mutations = 0
    const router = createRouter(() => false)

    await expect(router.runLocallyFenced(() => {
      mutations += 1
    })).rejects.toBeInstanceOf(WriterAuthorityLostError)
    expect(mutations).toBe(0)
    await router.shutdown()
  })
})

function createRouter(
  isAuthoritative: () => boolean,
): AuthoritativeLifecycleRouter {
  const lifecycle: LifecycleAdapter = {
    currentPhase: () => 'active',
    subscribe: () => () => undefined,
  }
  const lease: AuthoritativeWriterLeasePort = {
    isAuthoritative,
    assertWritable: async () => undefined,
    runAuthoritativeOperation: async <T>(
      operation: (
        authority: WriterOperationAuthority,
      ) => T | Promise<T>,
    ) => operation({
      sessionId: 'test',
      generation: 1,
      deadlineUtcMilliseconds: null,
      isAuthoritative,
      cancellationRequested: () => !isAuthoritative(),
    }),
  }
  return new AuthoritativeLifecycleRouter({
    lifecycle,
    lease,
    coordinator: {
      handlePlatformPhase: async () => {
        throw new Error('Lifecycle handling is outside this focused test.')
      },
    },
  })
}
