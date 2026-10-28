// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { useSkillPresetSelection } from './useSkillPresetSelection'

afterEach(cleanup)
const conflict = { retainedSkillIds: ['hotStart'], blockedByRetainedSkillIds: ['afterglow'] }

test('rapid activations cannot race a pending preview', async () => {
  let resolve!: (value: typeof conflict) => void
  const previewSelection = vi.fn(() => new Promise<typeof conflict>(done => { resolve = done }))
  const select = vi.fn().mockResolvedValue(true)
  const onFailure = vi.fn()
  const { result } = renderHook(() => useSkillPresetSelection({ presetActions: { previewSelection }, select, onFailure }))
  let first!: Promise<void>
  act(() => { first = result.current.request(2); void result.current.request(3) })
  expect(previewSelection).toHaveBeenCalledTimes(1)
  expect(result.current.pending).toBe(true)
  await act(async () => { resolve(conflict); await first })
  expect(select).not.toHaveBeenCalled()
  expect(result.current.preview?.slot).toBe(2)
  await act(async () => { await result.current.confirm() })
  expect(select).toHaveBeenCalledWith({ kind: 'skill.select-preset', slot: 2,
    retainedConflictPolicy: { kind: 'confirmed', retainedSkillIds: ['hotStart'], blockedSkillIds: ['afterglow'] } })
  expect(result.current.preview).toBeNull()
})

test('cancel leaves the preset unchanged and a declined command keeps the conflict open', async () => {
  const select = vi.fn().mockResolvedValue(false)
  const { result } = renderHook(() => useSkillPresetSelection({
    presetActions: { previewSelection: async () => conflict }, select, onFailure: vi.fn() }))
  await act(async () => { await result.current.request(4) })
  act(() => result.current.dismiss())
  expect(select).not.toHaveBeenCalled()
  await act(async () => { await result.current.request(5) })
  await act(async () => { await result.current.confirm() })
  expect(result.current.preview?.slot).toBe(5)
})

test('a failed preview reports failure without dispatching and allows a retry', async () => {
  const select = vi.fn().mockResolvedValue(true), onFailure = vi.fn()
  const previewSelection = vi.fn().mockRejectedValueOnce(new Error('unavailable')).mockResolvedValueOnce({retainedSkillIds: [], blockedByRetainedSkillIds: []})
  const { result } = renderHook(() => useSkillPresetSelection({presetActions: {previewSelection}, select, onFailure}))
  await act(async () => { await result.current.request(1) })
  expect(select).not.toHaveBeenCalled(); expect(onFailure).toHaveBeenCalledOnce()
  await act(async () => { await result.current.request(1) })
  expect(select).toHaveBeenCalledWith({kind:'skill.select-preset',slot:1})
})
