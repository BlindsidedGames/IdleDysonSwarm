import { expect, test } from 'vitest'
import { createDeterministicMatureDysonFixture as fixture, DETERMINISTIC_DYSON_TUNING as tuning, DETERMINISTIC_DYSON_SNAPSHOT as initial } from '../../scripts/support/deterministicMatureDysonFixture'
import { deriveBasicDysonState } from './canonicalDysonDerivation'
import { withCanonicalBotAllocation } from './canonicalBotAllocation'

function derive(s: ReturnType<typeof fixture>, snapshot = initial) {
  const result = deriveBasicDysonState(s, tuning, { permanentDoubleIp: false }, snapshot)
  if (!result.ok) throw Error(JSON.stringify(result.issues))
  return result.value
}

test('Dominance keeps its lifetime and Cash eligibility stable when its own bonus changes the published snapshot', () => {
  let s = fixture({ownedSkillIds:['stellarSacrifices','stellarDominance','androids','panelWarranty']})
  s.discovery = {...s.discovery!,unlocked:false}
  s.research = {levelsById:{},progressById:{}}
  s.skills.fragments = 10n
  s.dyson.bots = 1e30
  s.skills.byId.androids.timerSeconds = 300
  s = withCanonicalBotAllocation(s)
  let snapshot = {...initial,panelLifetimeSeconds:2670}
  const passes = []
  for(let i=0;i<8;i++) {const d=derive(s,snapshot);passes.push(d);snapshot=d.nextEvaluationSnapshot}
  expect(passes.map(d=>d.globals.panelLifetimeSeconds)).toEqual(Array(8).fill(26700))
  expect(new Set(passes.map(d=>d.globals.moneyMultiplier)).size).toBe(1)
})

test.each([
  ['stellarImprovements',['stellarSacrifices','stellarObliteration'],2,0.001],
  ['stellarDominance',['stellarSacrifices','stellarImprovements','stellarObliteration'],1000,100],
  ['stellarObliteration',['stellarSacrifices','stellarImprovements'],1000,1000],
  ['supernova',['stellarSacrifices','stellarImprovements','stellarObliteration'],1000,1000],
] as const)('ordinary %s gains useful creation benefit while its original cost consequence remains', (added,parents,minimumGain,costRatio) => {
  let s=fixture({ownedSkillIds:[...parents]});s.discovery={...s.discovery!,unlocked:false};s.research={levelsById:{},progressById:{}};s.dyson.bots=1e40;s=withCanonicalBotAllocation(s)
  const next={...s,skills:{...s.skills,byId:{...s.skills.byId,[added]:{...s.skills.byId[added],owned:true}}}}
  const snap={...initial,panelsPerSecond:1e25}
  const before=derive(s,snap),after=derive(next,snap)
  expect(after.auxiliary.stellarSacrifice.facilitiesPerSecond / before.auxiliary.stellarSacrifice.facilitiesPerSecond).toBeGreaterThanOrEqual(minimumGain)
  expect(after.auxiliary.stellarSacrifice.botsPerSecond / before.auxiliary.stellarSacrifice.botsPerSecond).toBeCloseTo(costRatio)
})

test.each([
  [['stellarObliteration'],1000],
  [['supernova'],1000],
  [['stellarObliteration','supernova'],1e6],
] as const)('fracturing %s removes its own Bot-cost downside while ordinary sibling costs remain', (fractured,efficiency) => {
  const s=fixture({ownedSkillIds:['stellarSacrifices','stellarImprovements','stellarObliteration','supernova']})
  const after={...s,challenges:{...s.challenges!,galvanizedSkillIds:[...fractured]}}
  const snap={...initial,panelsPerSecond:1e25}
  expect(derive(s,snap).auxiliary.stellarSacrifice.botsPerSecond / derive(after,snap).auxiliary.stellarSacrifice.botsPerSecond).toBeCloseTo(efficiency)
})
