import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { achievementIds } from '../src/achievements/ids'

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const map = JSON.parse(read('hosts/capacitor/achievement-map.json')) as Record<string, {android: string; ios: string}>

test('both native hosts map all 27 neutral achievements to unique configured records', () => {
  const steam = JSON.parse(read('hosts/electron/steam/achievement-map.json'))
  expect(Object.keys(map).sort()).toEqual([...achievementIds].sort())
  expect(Object.keys(map).sort()).toEqual(Object.keys(steam).sort())
  expect(Object.keys(map)).toHaveLength(27)
  const android = read('hosts/capacitor/android/app/src/main/java/com/blindsidedgames/idledysonswarm/IdleDysonNativePlugin.kt')
  const ios = read('hosts/capacitor/ios/App/App/IdleDysonNativePlugin.swift')
  for (const [id, providers] of Object.entries(map)) {
    expect(android).toContain(`"${id}" to "${providers.android}"`)
    expect(ios).toContain(`"${id}": "${providers.ios}"`)
  }
  expect(new Set(Object.values(map).map(row => row.android)).size).toBe(27)
  expect(new Set(Object.values(map).map(row => row.ios)).size).toBe(27)
})

test('retains the seven published Google records and excludes deleted draft replacements', () => {
  const retained = { first_bot:'Ag', first_assembly_line:'Aw', first_ai_manager:'BA', first_planet:'BQ', first_server:'Bg', first_data_center:'Bw', first_influence:'CA' }
  for (const [id, suffix] of Object.entries(retained)) expect(map[`achievement.${id}`].android).toBe(`CgkIkpjJyrENEAIQ${suffix}`)
  for (const suffix of ['JQ','IQ','Dw','Cw','IA','HQ','Eg']) expect(Object.values(map).map(row => row.android)).not.toContain(`CgkIkpjJyrENEAIQ${suffix}`)
})
