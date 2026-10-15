// @vitest-environment jsdom
import { expect, test, vi } from 'vitest'
import { createModePresentationStorage } from './modePresentationStorage'
import { installPresentationStorage } from '../ui/presentationStorage'
import { readPresentationPreference, writePresentationPreference } from '../ui/presentationPreferences'
import { readDisclosurePreference, writeDisclosurePreference } from '../ui/components/disclosurePreference'
import { NumberNotationPreferenceService } from '../ui/number-notation'
import { NumberNotationPreferenceService as ClassicNotation } from '../../classic/src/ui/number-notation'
import { LocalePreferenceService } from '../ui/i18n/localePreference'
import { ResearchVisibilityPreferenceService } from '../ui/research-visibility'
import { BottomNavigationTextPreferenceService } from '../ui/bottom-navigation-text'
import { developmentModesAllowed } from './development/gate'

test('all preference owners use fenced mode namespaces, survive return, and never touch public storage', () => {
  const files = new Map<string, string>([['public-preference', 'preserved']])
  const storage = { getItem: (key: string) => files.get(key) ?? null, setItem: (key: string, value: string) => { files.set(key, value) }, removeItem: (key: string) => { files.delete(key) } }
  vi.stubGlobal('localStorage', { getItem: () => { throw Error('Public storage read prohibited') }, setItem: () => { throw Error('Public storage write prohibited') } })
  let classicLive = true, modernLive = true
  const classic = createModePresentationStorage('classic', storage, () => classicLive)
  const modern = createModePresentationStorage('modern', storage, () => modernLive)
  let release = installPresentationStorage(classic)
  const old = new ClassicNotation(); old.setMode('scientific')
  writePresentationPreference('skill-labels', 'classic-labels'); writeDisclosurePreference('facility-details', false)
  new LocalePreferenceService().setPreference('de')
  new ResearchVisibilityPreferenceService().setHideCompleted(true)
  new BottomNavigationTextPreferenceService().setIncludeText(true)
  classicLive = false; release()
  release = installPresentationStorage(modern)
  const current = new NumberNotationPreferenceService()
  expect(current.getSnapshot()).toBe('mixed')
  expect(readPresentationPreference('skill-labels')).toBeNull()
  expect(readDisclosurePreference('facility-details', true)).toBe(true)
  expect(new LocalePreferenceService({ preferredLocales: ['en'] }).getSnapshot().locale).toBe('en')
  expect(new ResearchVisibilityPreferenceService().getSnapshot()).toBe(false)
  current.setMode('engineering'); old.setMode('standard')
  writePresentationPreference('skill-labels', 'modern-labels')
  modernLive = false; release()
  classicLive = true; release = installPresentationStorage(createModePresentationStorage('classic', storage, () => classicLive))
  expect(new ClassicNotation().getSnapshot()).toBe('scientific')
  expect(readPresentationPreference('skill-labels')).toBe('classic-labels')
  expect(readDisclosurePreference('facility-details', true)).toBe(false)
  expect(new LocalePreferenceService().getSnapshot().locale).toBe('de')
  release(); vi.unstubAllGlobals()
  expect(files.get('public-preference')).toBe('preserved')
  expect([...files.keys()].filter(key => key !== 'public-preference').every(key => key.startsWith('ids-modes-ui-v1:'))).toBe(true)
})

test('development integration is unavailable in production, on native hosts or outside loopback', () => {
  expect(developmentModesAllowed(true, '1', '127.0.0.1', false)).toBe(true)
  for (const args of [[false, '1', '127.0.0.1', false], [true, undefined, 'localhost', false], [true, '1', 'example.com', false], [true, '1', 'localhost', true]] as const) expect(developmentModesAllowed(...args)).toBe(false)
})
