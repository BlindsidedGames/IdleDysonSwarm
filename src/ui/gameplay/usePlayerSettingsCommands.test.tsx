// @vitest-environment jsdom

import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { PLAYER_SETTINGS_CONFIRMATION_CANCELLED_CODE, usePlayerSettingsCommands } from './usePlayerSettingsCommands'

afterEach(cleanup)

test('settings ignore new submissions while pending and recover after rejected or failed dispatch', async () => {
  let resolve!: (result: { status: string }) => void
  const dispatch = vi.fn<(command: string) => Promise<{ status: string }>>()
    .mockImplementationOnce(() => new Promise((done) => { resolve = done }))
    .mockRejectedValueOnce(new Error('unavailable'))
    .mockResolvedValueOnce({ status: 'accepted' })
  const view = renderHook(() => usePlayerSettingsCommands(dispatch))

  let pending!: Promise<void>
  act(() => { pending = view.result.current.applySetting('buy-mode') })
  expect(view.result.current.settingPending).toBe(true)
  await act(async () => view.result.current.applySetting('ignored'))
  expect(dispatch).toHaveBeenCalledTimes(1)
  await act(async () => {
    resolve({ status: 'rejected' })
    await pending
  })
  expect(view.result.current.settingPending).toBe(false)
  expect(view.result.current.settingFailed).toBe(true)

  await act(async () => view.result.current.applySetting('rounded-buy'))
  expect(view.result.current.settingPending).toBe(false)
  expect(view.result.current.settingFailed).toBe(true)
  await act(async () => view.result.current.applySetting('preset'))
  expect(view.result.current.settingPending).toBe(false)
  expect(view.result.current.settingFailed).toBe(false)
})

test('only explicit confirmation cancellation suppresses setting failure feedback', async () => {
  const dispatch = vi.fn().mockResolvedValueOnce({ status: 'failed', code: PLAYER_SETTINGS_CONFIRMATION_CANCELLED_CODE })
    .mockResolvedValueOnce({ status: 'failed', code: 'UI-SKILL-CONFIRMATION-PREVIEW-FAILED' })
    .mockResolvedValueOnce({ status: 'rejected', code: 'command-failed' })
  const view = renderHook(() => usePlayerSettingsCommands(dispatch))
  await act(async () => view.result.current.applySetting('cancelled'))
  expect(view.result.current.settingFailed).toBe(false)
  await act(async () => view.result.current.applySetting('preview-failed'))
  expect(view.result.current.settingFailed).toBe(true)
  await act(async () => view.result.current.applySetting('rejected'))
  expect(view.result.current.settingFailed).toBe(true)
})
