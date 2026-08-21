import { describe, expect, test } from 'vitest'
import type {
  UiRuntimeFoundationStatus,
} from '../runtime'
import {
  selectStartupShellViewModel,
} from './runtimeStartupAdapter'

describe('runtime startup shell adapter', () => {
  test.each([
    [{ phase: 'idle' }, 'idle'],
    [{ phase: 'starting' }, 'starting'],
    [{ phase: 'ready', warnings: [] }, 'ready-placeholder'],
    [
      {
        phase: 'blocked',
        code: 'writer-owned',
        reason: 'private owner token',
      },
      'writer-blocked',
    ],
    [
      {
        phase: 'blocked',
        code: 'application-blocked',
        applicationOutcome: 'unsupported-future-version',
        reason: 'private save detail',
      },
      'recovery',
    ],
    [
      {
        phase: 'blocked',
        code: 'application-blocked',
        applicationOutcome: 'all-candidates-invalid',
        reason: 'private save detail',
      },
      'recovery',
    ],
    [
      {
        phase: 'blocked',
        code: 'application-blocked',
        applicationOutcome: 'storage-failed',
        reason: 'C:\\private\\save',
      },
      'application-blocked',
    ],
    [
      {
        phase: 'blocked',
        code: 'startup-failed',
        reason: 'token=secret',
      },
      'error',
    ],
    [
      {
        phase: 'ownership-lost',
        reason: 'owner=private',
      },
      'ownership-lost',
    ],
    [{ phase: 'stopping' }, 'stopping'],
    [{ phase: 'stopped' }, 'stopping'],
  ] as const)(
    'maps runtime status %# to %s without exposing raw reasons',
    (status, expectedPhase) => {
      const viewModel = selectStartupShellViewModel(
        status as UiRuntimeFoundationStatus,
        {
          locale: 'en',
          saveSchemaVersion: 12,
          buildId: 'web-wave-2',
        },
      )
      expect(viewModel.phase).toBe(expectedPhase)
      const serialized = JSON.stringify(viewModel)
      expect(serialized).not.toMatch(
        /private|secret|C:\\|owner=/,
      )
    },
  )
})
