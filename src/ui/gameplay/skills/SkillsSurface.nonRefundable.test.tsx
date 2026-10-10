// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react'
import { StrictMode, useState } from 'react'
import { IntlProvider } from 'react-intl'
import { afterEach, expect, test, vi } from 'vitest'
import { routeCanonicalGameCommand, type CanonicalGameRuntimeCarriers } from '../../../application/canonicalGameCommands'
import type { CanonicalPlayerCommand } from '../../../application/canonicalPlayerCommands'
import { hydrateGameState } from '../../../game-state/mapping'
import type { CanonicalGameStateV1 } from '../../../game-state/types'
import { prepareIdb1Save } from '../../../save/prepare'
import { parseCanonicalSkillPreset, previewAddSkillToPreset, previewRemoveSkillFromPreset } from '../../../simulation/canonicalSkillPresetTransactions'
import { applyCanonicalSkillPresetLayout, previewCanonicalNonRefundableSkillAssignment, previewCanonicalSkillCatalog, purchaseCanonicalSkill } from '../../../simulation/canonicalSkillTransactions'
import { SkillsSurface, type SkillPresetActions, type SkillsSurfaceProps } from './SkillsSurface'
import { NON_REFUNDABLE_SKILL_ACKNOWLEDGEMENT_KEY, useNonRefundableSkillConfirmation } from './useNonRefundableSkillConfirmation'
import { NonRefundableSkillConfirmationProvider } from './NonRefundableSkillConfirmation'
import { useConfirmedTabPresetDispatch } from './useConfirmedTabPresetDispatch'
import { DysonInfo, type DysonInfoProps } from '../dyson/DysonControls'
import fixture from '../../../../test/fixtures/schema-08-canonical-idb1-main-save.txt?raw'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  window.localStorage.removeItem(NON_REFUNDABLE_SKILL_ACKNOWLEDGEMENT_KEY)
  window.localStorage.removeItem('idle-dyson-swarm:skill-double-click-assignment')
  window.localStorage.removeItem('idle-dyson-swarm:show-skill-production-comparisons')
})

function setup({ autoAssign = false, prerequisitesOwned = false, nonRefundableOwned = false,
  lockedPresetSkillIds = ['shouldersOfGiants'], staleOwnedPreview = false, savedTabAutomation = false } = {}) {
  window.localStorage.setItem('idle-dyson-swarm:show-skill-production-comparisons', 'false')
  const session = hydrateGameState(prepareIdb1Save(fixture).prepared)
  let current: CanonicalGameStateV1 = {
    ...session.state,
    meta: { ...session.state.meta, firstInfinityComplete: true },
    skills: { ...session.state.skills, points: 100n, byId: {}, activeAutoAssignment: [],
      tabPresetAutomation: { ...session.state.skills.tabPresetAutomation, bots: savedTabAutomation ? 2 : 0 },
      autoAssignNonRefundable: autoAssign,
      presets: session.state.skills.presets.map((preset, index) => ({ ...preset,
        name: index === 0 ? 'Empty' : index === 1 ? 'Locked' : `Preset ${index + 1}`,
        skillIds: index === 1 ? lockedPresetSkillIds : [],
      })) as unknown as CanonicalGameStateV1['skills']['presets'],
    },
  }
  if (prerequisitesOwned) {
    const purchase = purchaseCanonicalSkill(current, 'scientificPlanets')
    if (!purchase.accepted) throw new Error(purchase.reason)
    current = purchase.state
  }
  if (nonRefundableOwned) {
    const purchase = purchaseCanonicalSkill(current, 'shouldersOfGiants')
    if (!purchase.accepted) throw new Error(purchase.reason)
    current = purchase.state
  }
  const stalePurchase = staleOwnedPreview ? purchaseCanonicalSkill(current, 'shouldersOfGiants') : null
  const staleCatalog = previewCanonicalSkillCatalog(stalePurchase?.accepted ? stalePurchase.state : current)
  let carriers: Readonly<CanonicalGameRuntimeCarriers> = {
    compatibilityTuning: session.compatibilityTuning,
    skillEffectEvaluationSnapshot: session.skillEffectEvaluationSnapshot,
    storedTimeCheater: false,
    selectedSkillPresetSlot: 1,
  }
  let publish = (_state: CanonicalGameStateV1) => {}
  const isSkillCommand = (command: CanonicalPlayerCommand): command is Parameters<SkillsSurfaceProps['dispatchPlayer']>[0] =>
    command.kind.startsWith('skill.')
  const execute = async (command: CanonicalPlayerCommand): ReturnType<SkillsSurfaceProps['dispatchPlayer']> => {
    if (!isSkillCommand(command)) throw new Error(`Unexpected command: ${command.kind}`)
    const result = routeCanonicalGameCommand(current, command, {
      runtimeCarriers: carriers,
      runtimeEvaluation: { evaluate: (_state, previous) => ({ accepted: true, snapshot: previous! }) },
    })
    if (!result.accepted) throw new Error(result.code)
    current = result.state
    carriers = result.runtimeCarriers
    publish(current)
    return { status: 'accepted', kind: 'transition', changed: result.changed,
      stateRevision: 1, activationRevision: { session: 1, state: 1 } }
  }
  const dispatch = vi.fn(execute)
  const queueChange = vi.fn<SkillPresetActions['applyQueueChange']>(async request =>
    (await execute({ kind: request.included ? 'skill.add-to-current-preset' : 'skill.remove-from-current-preset',
      skillId: request.skillId })).status === 'accepted')
  const importPreset = vi.fn<SkillPresetActions['importPreset']>(async (slot, serialized) =>
    (await execute({ kind: 'skill.import-preset', slot, serialized })).status === 'accepted')
  const actions: SkillPresetActions = {
    previewNonRefundableAssignment: skillIds => previewCanonicalNonRefundableSkillAssignment(current, skillIds),
    previewSelection: async slot => {
      const result = applyCanonicalSkillPresetLayout(current, current.skills.presets[slot - 1].skillIds)
      if (!result.accepted) throw new Error(result.reason)
      return result
    },
    previewQueueChange: async request => {
      const preview = (request.included ? previewAddSkillToPreset : previewRemoveSkillFromPreset)(current, request.slot, request.skillId)
      if (!preview.accepted) throw new Error(preview.reason)
      return { affectedSkillIds: preview.affectedSkillIds,
        confirmationRequired: preview.affectedSkillIds.some(id => id !== request.skillId) }
    },
    applyQueueChange: queueChange,
    exportPreset: async () => '',
    previewImportPreset: async (_slot, text) => {
      const result = parseCanonicalSkillPreset(text, current)
      if (!result.accepted) throw new Error(result.reason)
      return { name: result.payload.presetName, queuedSkillCount: result.payload.skillIds.length,
        queuedSkillIds: result.payload.skillIds, workerPercent: 100, colorId: 'cyan' }
    },
    importPreset,
  }
  function TabControls({ state }: { readonly state: CanonicalGameStateV1 }) {
    const confirmedDispatch = useConfirmedTabPresetDispatch({ dispatchPlayer: dispatch,
      autoAssignNonRefundable: state.skills.autoAssignNonRefundable, presets: state.skills.presets,
      catalog: staleCatalog, previewNonRefundableAssignment: actions.previewNonRefundableAssignment })
    return <>
      <DysonInfo summary={<span>Production summary</span>} buyMode="buy-1" roundedBulkBuy={false}
        presets={state.skills.presets} presetAutomationSlot={state.skills.tabPresetAutomation.bots}
        automationUnlocked={false} automationFacilityIds={[]}
        automationEnabledFacilities={{} as DysonInfoProps['automationEnabledFacilities']}
        buyModeRouteAvailable roundedBulkRouteAvailable presetAutomationRouteAvailable automationRouteAvailable
        dispatchPlayer={confirmedDispatch} />
      <button onClick={() => void confirmedDispatch({ kind: 'skill.select-preset', slot: 2 })}>Bots quick preset</button>
      <button onClick={() => void confirmedDispatch({ kind: 'skill.set-tab-preset-automation', tab: 'bots', slot: 2 })}>Configure tab preset</button>
      <button onClick={() => void confirmedDispatch({ kind: 'skill.set-tab-preset-automation', tab: 'bots', slot: 0 })}>Disable tab preset</button>
      <button onClick={() => void confirmedDispatch({ kind: 'skill.apply-tab-preset-automation', tab: 'bots' })}>Apply saved tab preset</button>
      <button onClick={() => void confirmedDispatch({ kind: 'skill.set-auto-assignment', skillIds: ['shouldersOfGiants'] })}>Update spending priority</button>
    </>
  }
  function Harness() {
    const [state, setState] = useState(current)
    publish = setState
    return <IntlProvider locale="en" messages={{}}>
      <NonRefundableSkillConfirmationProvider>
      <TabControls state={state} />
      <SkillsSurface locale="en" points={state.skills.points} fragments={state.skills.fragments}
        catalog={previewCanonicalSkillCatalog(state)} presets={state.skills.presets}
        selectedPresetSlot={carriers.selectedSkillPresetSlot!} botDistribution={0}
        autoAssignNonRefundable={state.skills.autoAssignNonRefundable}
        commandAvailability={{ purchase: true, refund: true, selectPreset: true,
          setPresetColor: true, setAutoAssignNonRefundable: true, reset: true }}
        showPresetApplicationNotifications={true}
        onShowPresetApplicationNotificationsChange={() => {}}
        presetActions={actions} dispatchPlayer={dispatch} />
      </NonRefundableSkillConfirmationProvider>
    </IntlProvider>
  }
  return { ...render(<StrictMode><Harness /></StrictMode>), dispatch, queueChange, importPreset, state: () => current }
}

function openLockedSkill() {
  fireEvent.click(screen.getByRole('button', { name: /^Shoulders of Giants\. Cost:/ }))
  fireEvent.click(screen.getByRole('button', { name: /^Assign Skill\. Will cost/ }))
  const dependencyConfirmation = screen.queryByRole('group', { name: 'Confirm skill change' })
  if (dependencyConfirmation) fireEvent.click(within(dependencyConfirmation).getByRole('button', { name: 'Confirm' }))
}

const warning = () => screen.getByRole('dialog', { name: 'Non-refundable skills' })
const confirmWarning = () => fireEvent.click(within(warning()).getByRole('button', { name: 'Confirm' }))
function openSettings() { fireEvent.click(screen.getByRole('button', { name: 'Skill presets and reset' })) }
function openPresets() {
  openSettings()
  fireEvent.click(screen.getByRole('button', { name: 'Presets' }))
}

test('manual assignment warns before spending and cancellation preserves points and prerequisite refunds', async () => {
  const view = setup()
  openLockedSkill()
  expect(warning().textContent).toContain('prerequisite paths cannot be refunded until an Infinity reset')
  expect(view.dispatch).not.toHaveBeenCalled()
  expect(view.state().skills.points).toBe(100n)
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(screen.queryByRole('dialog', { name: 'Non-refundable skills' })).toBeNull()
  expect(view.dispatch).not.toHaveBeenCalled()
  expect(window.localStorage.getItem(NON_REFUNDABLE_SKILL_ACKNOWLEDGEMENT_KEY)).toBeNull()
  fireEvent.click(within(screen.getByRole('group', { name: 'Confirm skill change' })).getByRole('button', { name: 'Confirm' }))
  confirmWarning()
  await waitFor(() => expect(view.state().skills.byId.shouldersOfGiants?.owned).toBe(true))
  expect(view.dispatch).toHaveBeenCalledExactlyOnceWith({ kind: 'skill.purchase', skillId: 'shouldersOfGiants' })
  expect(view.state().skills.points).toBe(90n)
  const catalog = previewCanonicalSkillCatalog(view.state())
  expect(catalog.skills.find(skill => skill.skillId === 'scientificPlanets')?.refund.eligible).toBe(false)
  expect(catalog.reset.retainedSkillIds).toContain('startHereTree')
  expect(window.localStorage.getItem(NON_REFUNDABLE_SKILL_ACKNOWLEDGEMENT_KEY)).toBe('true')
})

test('double-click assignment cannot bypass the first warning; acknowledgement survives remount', async () => {
  window.localStorage.setItem('idle-dyson-swarm:skill-double-click-assignment', 'true')
  const view = setup({ prerequisitesOwned: true })
  fireEvent.click(screen.getByRole('button', { name: /^Shoulders of Giants\. Cost:/ }), { detail: 2 })
  expect(view.dispatch).not.toHaveBeenCalled()
  confirmWarning()
  await waitFor(() => expect(view.state().skills.byId.shouldersOfGiants?.owned).toBe(true))
  view.unmount()
  const remounted = setup({ prerequisitesOwned: true })
  fireEvent.click(screen.getByRole('button', { name: /^Shoulders of Giants\. Cost:/ }), { detail: 2 })
  await waitFor(() => expect(remounted.state().skills.byId.shouldersOfGiants?.owned).toBe(true))
  expect(screen.queryByRole('dialog', { name: 'Non-refundable skills' })).toBeNull()
})

test('enabling non-refundable auto-assignment requires confirmation and shares the manual acknowledgement', async () => {
  const view = setup({ prerequisitesOwned: true })
  openSettings()
  const toggle = screen.getByRole('checkbox', { name: 'Allow automatic assignment of non-refundable skills' })
  fireEvent.click(toggle)
  expect(view.dispatch).not.toHaveBeenCalled()
  fireEvent.click(within(warning()).getAllByRole('button', { name: 'Cancel' }).at(-1)!)
  expect(view.state().skills.autoAssignNonRefundable).toBe(false)
  fireEvent.click(toggle)
  confirmWarning()
  await waitFor(() => expect(view.state().skills.autoAssignNonRefundable).toBe(true))
  openLockedSkill()
  await waitFor(() => expect(view.state().skills.byId.shouldersOfGiants?.owned).toBe(true))
  expect(screen.queryByRole('dialog', { name: 'Non-refundable skills' })).toBeNull()
})

test.each([true, false])('selecting a preset warns only when non-refundable auto-assignment is enabled (%s)', async autoAssign => {
  const view = setup({ autoAssign })
  openPresets()
  fireEvent.click(screen.getByRole('button', { name: /^Load Locked/ }))
  if (autoAssign) {
    await waitFor(() => expect(warning()).toBeTruthy())
    expect(view.dispatch).not.toHaveBeenCalled()
    confirmWarning()
  }
  await waitFor(() => expect(view.dispatch).toHaveBeenCalledWith({ kind: 'skill.select-preset', slot: 2 }))
  expect(view.state().skills.byId.shouldersOfGiants?.owned === true).toBe(autoAssign)
  if (!autoAssign) expect(window.localStorage.getItem(NON_REFUNDABLE_SKILL_ACKNOWLEDGEMENT_KEY)).toBeNull()
})

test.each(['refundable', 'already-owned'] as const)('preset selection does not warn for %s skills', async kind => {
  const view = setup({ autoAssign: true, nonRefundableOwned: kind === 'already-owned',
    lockedPresetSkillIds: kind === 'refundable' ? ['startHereTree'] : ['shouldersOfGiants'] })
  openPresets()
  fireEvent.click(screen.getByRole('button', { name: /^Load Locked/ }))
  await waitFor(() => expect(view.dispatch).toHaveBeenCalledExactlyOnceWith({ kind: 'skill.select-preset', slot: 2 }))
  expect(screen.queryByRole('dialog', { name: 'Non-refundable skills' })).toBeNull()
  expect(window.localStorage.getItem(NON_REFUNDABLE_SKILL_ACKNOWLEDGEMENT_KEY)).toBeNull()
  if (kind === 'refundable') expect(view.state().skills.byId.startHereTree?.owned).toBe(true)
  else expect(view.state().skills.byId.shouldersOfGiants?.owned).toBe(true)
})

test('adding a non-refundable path to the active queue warns before publishing it', async () => {
  const view = setup({ autoAssign: true })
  fireEvent.click(screen.getByRole('button', { name: /^Shoulders of Giants\. Cost:/ }))
  fireEvent.click(screen.getByRole('checkbox', { name: 'Included in Empty' }))
  const queueConfirmation = await screen.findByRole('group', { name: 'Confirm preset change' })
  fireEvent.click(within(queueConfirmation).getByRole('button', { name: 'Confirm' }))
  await waitFor(() => expect(warning()).toBeTruthy())
  expect(view.queueChange).not.toHaveBeenCalled()
  expect(view.state().skills.activeAutoAssignment).toEqual([])
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(screen.queryByRole('alert')).toBeNull()
  fireEvent.click(within(queueConfirmation).getByRole('button', { name: 'Confirm' }))
  confirmWarning()
  await waitFor(() => expect(view.queueChange).toHaveBeenCalledOnce())
  expect(view.state().skills.activeAutoAssignment).toContain('shouldersOfGiants')
})

test.each([1, 2] as const)('preset import guards only the active slot (%s) using validated queued IDs', async slot => {
  const view = setup({ autoAssign: true })
  openPresets()
  fireEvent.click(screen.getByRole('button', { name: `Manage ${slot === 1 ? 'Empty' : 'Locked'}` }))
  fireEvent.change(screen.getByRole('textbox', { name: 'Preset import string' }), { target: { value: JSON.stringify({
    version: 1, presetName: 'Imported', botDistribution: 0, skillIds: ['shouldersOfGiants'],
  }) } })
  fireEvent.click(screen.getByRole('button', { name: 'Preview import' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Replace preset' }))
  if (slot === 1) {
    await waitFor(() => expect(warning()).toBeTruthy())
    expect(view.importPreset).not.toHaveBeenCalled()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(view.state().skills.points).toBe(100n)
    expect(view.state().skills.presets[0].name).toBe('Empty')
    expect(screen.queryByRole('alert')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Replace preset' }))
    await waitFor(() => expect(warning()).toBeTruthy())
    confirmWarning()
  }
  await waitFor(() => expect(view.importPreset).toHaveBeenCalledOnce())
  expect(view.state().skills.byId.shouldersOfGiants?.owned === true).toBe(slot === 1)
  if (slot === 2) expect(window.localStorage.getItem(NON_REFUNDABLE_SKILL_ACKNOWLEDGEMENT_KEY)).toBeNull()
})

test('a refundable purchase stays immediate and does not consume the acknowledgement', async () => {
  const view = setup()
  fireEvent.click(screen.getByRole('button', { name: /^Cash & Science\. Cost:/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Assign Skill. Will cost 1 Skill Points' }))
  await waitFor(() => expect(view.state().skills.byId.startHereTree?.owned).toBe(true))
  expect(screen.queryByRole('dialog', { name: 'Non-refundable skills' })).toBeNull()
  expect(window.localStorage.getItem(NON_REFUNDABLE_SKILL_ACKNOWLEDGEMENT_KEY)).toBeNull()
})

test('unmount cancels a waiting warning without a purchase or acknowledgement', async () => {
  const view = setup({ prerequisitesOwned: true })
  openLockedSkill()
  expect(warning()).toBeTruthy()
  view.unmount()
  await Promise.resolve()
  expect(view.dispatch).not.toHaveBeenCalled()
  expect(window.localStorage.getItem(NON_REFUNDABLE_SKILL_ACKNOWLEDGEMENT_KEY)).toBeNull()
})

test('unavailable preference storage keeps the warning and in-session acknowledgement usable', async () => {
  const view = setup({ prerequisitesOwned: true })
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage unavailable') })
  openLockedSkill()
  confirmWarning()
  await waitFor(() => expect(view.state().skills.byId.shouldersOfGiants?.owned).toBe(true))
  openSettings()
  fireEvent.click(screen.getByRole('checkbox', { name: 'Allow automatic assignment of non-refundable skills' }))
  await waitFor(() => expect(view.state().skills.autoAssignNonRefundable).toBe(true))
  expect(screen.queryByRole('dialog', { name: 'Non-refundable skills' })).toBeNull()
})

test('StrictMode confirmation rejects duplicate and late requests, and resolves cancellation on unmount', async () => {
  const view = renderHook(useNonRefundableSkillConfirmation, { wrapper: StrictMode })
  let pending!: Promise<boolean>
  act(() => { pending = view.result.current.requestConfirmation() })
  expect(view.result.current.pending).toBe(true)
  await expect(view.result.current.requestConfirmation()).resolves.toBe(false)
  const requestAfterUnmount = view.result.current.requestConfirmation
  view.unmount()
  await expect(pending).resolves.toBe(false)
  await expect(requestAfterUnmount()).resolves.toBe(false)
  expect(window.localStorage.getItem(NON_REFUNDABLE_SKILL_ACKNOWLEDGEMENT_KEY)).toBeNull()
})

test('explicit tab configuration uses fresh ownership, cancels safely, and shares its acknowledgement with Skills', async () => {
  // The inactive Skills preview still says the target was owned before a reset.
  const view = setup({ autoAssign: true, staleOwnedPreview: true })
  fireEvent.click(screen.getByRole('button', { name: 'Configure tab preset' }))
  expect(screen.getAllByRole('dialog', { name: 'Non-refundable skills' })).toHaveLength(1)
  expect(view.dispatch).not.toHaveBeenCalled()
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(view.state().skills.tabPresetAutomation.bots).toBe(0)
  expect(view.state().skills.points).toBe(100n)
  expect(window.localStorage.getItem(NON_REFUNDABLE_SKILL_ACKNOWLEDGEMENT_KEY)).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Configure tab preset' }))
  confirmWarning()
  await waitFor(() => expect(view.state().skills.byId.shouldersOfGiants?.owned).toBe(true))
  expect(view.dispatch).toHaveBeenCalledExactlyOnceWith({ kind: 'skill.set-tab-preset-automation', tab: 'bots', slot: 2 })
  expect(view.state().skills.tabPresetAutomation.bots).toBe(2)
  fireEvent.click(screen.getByRole('button', { name: /^Shoulders of Precursors\. Cost:/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Assign Skill. Will cost 1 Skill Points' }))
  await waitFor(() => expect(view.state().skills.byId.shouldersOfPrecursors?.owned).toBe(true))
  expect(screen.queryByRole('dialog', { name: 'Non-refundable skills' })).toBeNull()
})

test.each(['refundable', 'disabled', 'retained'] as const)('tab configuration stays immediate for %s assignments', async kind => {
  const view = setup({ autoAssign: kind !== 'disabled', nonRefundableOwned: kind === 'retained',
    lockedPresetSkillIds: kind === 'refundable' ? ['startHereTree'] : ['shouldersOfGiants'] })
  fireEvent.click(screen.getByRole('button', { name: 'Configure tab preset' }))
  await waitFor(() => expect(view.state().skills.tabPresetAutomation.bots).toBe(2))
  expect(screen.queryByRole('dialog', { name: 'Non-refundable skills' })).toBeNull()
  expect(window.localStorage.getItem(NON_REFUNDABLE_SKILL_ACKNOWLEDGEMENT_KEY)).toBeNull()
  if (kind === 'disabled') expect(view.state().skills.byId.shouldersOfGiants?.owned).not.toBe(true)
})

test('saved passive tab automation and queue priority updates preserve the prior opt-in', async () => {
  const view = setup({ autoAssign: true, savedTabAutomation: true })
  fireEvent.click(screen.getByRole('button', { name: 'Update spending priority' }))
  await waitFor(() => expect(view.dispatch).toHaveBeenCalledWith({ kind: 'skill.set-auto-assignment', skillIds: ['shouldersOfGiants'] }))
  expect(view.state().skills.points).toBe(100n)
  expect(view.state().skills.byId.shouldersOfGiants?.owned).not.toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Apply saved tab preset' }))
  await waitFor(() => expect(view.state().skills.byId.shouldersOfGiants?.owned).toBe(true))
  expect(screen.queryByRole('dialog', { name: 'Non-refundable skills' })).toBeNull()
  expect(window.localStorage.getItem(NON_REFUNDABLE_SKILL_ACKNOWLEDGEMENT_KEY)).toBeNull()
})

test('disabling a tab preset needs no acknowledgement', async () => {
  const view = setup({ autoAssign: true, savedTabAutomation: true })
  fireEvent.click(screen.getByRole('button', { name: 'Disable tab preset' }))
  await waitFor(() => expect(view.state().skills.tabPresetAutomation.bots).toBe(0))
  expect(view.dispatch).toHaveBeenCalledExactlyOnceWith({ kind: 'skill.set-tab-preset-automation', tab: 'bots', slot: 0 })
  expect(window.localStorage.getItem(NON_REFUNDABLE_SKILL_ACKNOWLEDGEMENT_KEY)).toBeNull()
})

test('cancelling the real Bots preset setting shows no error and restores the enabled select focus', async () => {
  const view = setup({ autoAssign: true })
  fireEvent.click(screen.getByRole('button', { name: 'Purchase settings' }))
  const select = screen.getByRole('combobox', { name: 'Skill preset on opening Bots' }) as HTMLSelectElement
  select.focus()
  fireEvent.change(select, { target: { value: '2' } })
  expect(warning()).toBeTruthy()
  expect(select.disabled).toBe(true)
  expect(view.dispatch).not.toHaveBeenCalled()
  fireEvent.keyDown(document, { key: 'Escape' })
  await waitFor(() => {
    expect(select.disabled).toBe(false)
    expect(document.activeElement).toBe(select)
  })
  expect(select.value).toBe('0')
  expect(screen.queryByRole('alert')).toBeNull()
  expect(view.state().skills.points).toBe(100n)
})


test('Bots quick preset requires the shared non-refundable acknowledgement', async () => {
  const view = setup({ autoAssign: true })
  fireEvent.click(screen.getByRole('button', { name: 'Bots quick preset' }))
  await waitFor(() => expect(warning()).toBeTruthy())
  expect(view.state().skills.byId.shouldersOfGiants?.owned).not.toBe(true)
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(view.state().skills.byId.shouldersOfGiants?.owned).not.toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Bots quick preset' }))
  await waitFor(() => expect(warning()).toBeTruthy())
  confirmWarning()
  await waitFor(() => expect(view.state().skills.byId.shouldersOfGiants?.owned).toBe(true))
})
