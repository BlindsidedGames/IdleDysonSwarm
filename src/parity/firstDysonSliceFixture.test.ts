import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { generateFirstDysonSliceFixture } from '../../scripts/firstDysonSliceCanonical'
import { loadFrozenFirstDysonSliceFixture } from './firstDysonSliceFixture'

describe('frozen first-Dyson canonical fixture', () => {
  test('is generated deterministically by the canonical facade and lifecycle coordinator', async () => {
    expect(await generateFirstDysonSliceFixture()).toEqual(
      loadFrozenFirstDysonSliceFixture(),
    )
  })

  test('records exact command revision outcomes and checkpoint reconstruction facts', () => {
    const fixture = loadFrozenFirstDysonSliceFixture()

    expect(fixture.commands.tinker.expectedStateRevision).toBe(0)
    expect(fixture.outcomes.tinkerAccepted).toEqual({
      kind: 'transition',
      transition: { accepted: true, changed: true, revision: 1 },
    })
    expect(fixture.outcomes.tinkerProgress).toEqual({
      transition: { accepted: true, changed: true, revision: 2 },
      requestedMilliseconds: 100,
      consumedMilliseconds: 100,
      remainingMilliseconds: 0,
      checkpoints: [],
    })
    expect(fixture.outcomes.tinkerCompletion).toEqual({
      transition: { accepted: true, changed: true, revision: 3 },
      requestedMilliseconds: 200,
      consumedMilliseconds: 200,
      remainingMilliseconds: 0,
      checkpoints: [],
    })
    expect(fixture.tinker.inProgress.tinker.value.runtime.running).toBe(true)
    expect(fixture.tinker.completed.bots).toBe(1)
    expect(fixture.initial.visibility).toEqual({
      showTinker: true,
      visibleBasicFacilityIds: [],
      visibleMegaStructureIds: [],
      showNextTierTeaser: true,
    })
    expect(fixture.initial.basicFacilityPreviews[0]).toMatchObject({
      facilityId: 'assembly_lines',
      eligible: true,
    })
    expect(fixture.outcomes.basicFacilityAccepted).toEqual({
      kind: 'transition',
      transition: { accepted: true, changed: true, revision: 4 },
    })
    expect(fixture.outcomes.staleFacility).toEqual({
      kind: 'transition',
      transition: {
        accepted: false,
        code: 'SIM-STALE-REVISION',
        reason: 'Expected revision 3 does not match current revision 4.',
        revision: 4,
      },
    })
    expect(fixture.outcomes.rejectedFacility).toEqual({
      kind: 'transition',
      transition: {
        accepted: false,
        code: 'dyson-basic:locked',
        reason: 'locked',
        revision: 4,
      },
    })
    expect(fixture.checkpointedReconstruction.facilities.assembly_lines)
      .toEqual([0, 38])
    expect(fixture.checkpointedReconstruction.visibility).toEqual({
      showTinker: true,
      visibleBasicFacilityIds: [
        'assembly_lines',
        'ai_managers',
      ],
      visibleMegaStructureIds: [],
      showNextTierTeaser: true,
    })
    expect(fixture.checkpointedReconstruction.tinker.value.runtime.running)
      .toBe(false)
  })

  test('returns detached recursively frozen artifacts for UI-only consumers', () => {
    const first = loadFrozenFirstDysonSliceFixture()
    const second = loadFrozenFirstDysonSliceFixture()

    expect(first).not.toBe(second)
    expectDeepFrozen(first)
  })

  test('the checked-in frozen artifact matches the generator output', async () => {
    const checkedIn = readFileSync(
      new URL('./first-dyson-slice.fixture.json', import.meta.url),
      'utf8',
    )
    const generated = await generateFirstDysonSliceFixture()

    expect(JSON.parse(checkedIn)).toEqual(generated)
  })
})

function expectDeepFrozen(value: unknown): void {
  if (value === null || typeof value !== 'object') return
  expect(Object.isFrozen(value)).toBe(true)
  for (const entry of Object.values(value)) expectDeepFrozen(entry)
}
