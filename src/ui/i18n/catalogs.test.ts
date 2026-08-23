import { createIntl, createIntlCache } from 'react-intl'
import { describe, expect, it } from 'vitest'
import arXbCatalog from './catalogs/compiled/ar-XB.json'
import enCatalog from './catalogs/compiled/en.json'
import enXaCatalog from './catalogs/compiled/en-XA.json'
import frCatalog from './catalogs/compiled/fr.json'
import deCatalog from './catalogs/compiled/de.json'
import es419Catalog from './catalogs/compiled/es-419.json'
import jaCatalog from './catalogs/compiled/ja.json'
import ptBrCatalog from './catalogs/compiled/pt-BR.json'
import ruCatalog from './catalogs/compiled/ru.json'
import zhCnCatalog from './catalogs/compiled/zh-CN.json'
import sourceCatalog from './catalogs/source/en.json'
import {
  ENABLED_LOCALES,
  LOCALE_REGISTRY,
  loadDestinationCatalog,
} from './localeRegistry'
import { sharedMessages } from './messages'
import {
  readyDysonMessages,
} from '../gameplay/dyson/messages'
import {
  debugSurfaceMessages,
} from '../gameplay/debug/messages'
import {
  basicFacilityMessages,
} from '../gameplay/facilities/messages'
import {
  tinkerMessages,
} from '../gameplay/tinker/messages'
import {
  settingsSurfaceMessages,
} from '../gameplay/settings/messages'
import {
  researchMessages,
} from '../gameplay/research/messages'
import {
  infinityMessages,
} from '../gameplay/infinity/messages'
import {
  realityMessages,
  realityUpgradeMessages,
  simulationUpgradeMessages,
} from '../gameplay/reality/messages'
import {
  simulationsMessages,
} from '../gameplay/simulations/messages'
import {
  avocatoMessages,
  quantumMessages,
  quantumUpgradeMessages,
} from '../gameplay/quantum/messages'
import {
  offlineTimeMessages,
} from '../gameplay/offline-time/messages'
import {
  statisticsMessages,
} from '../gameplay/statistics/messages'
import {
  storyMessages,
} from '../gameplay/story/messages'
import { storeMessages } from '../gameplay/store/messages'
import {
  wikiMessages,
} from '../gameplay/wiki/messages'
import {
  WIKI_LORE_SECTIONS,
  WIKI_PATCH_NOTES,
  wikiLoreChapterBodyMessage,
  wikiLoreChapterTitleMessage,
  wikiLoreSectionTitleMessage,
  wikiPatchNoteMessage,
} from '../gameplay/wiki/content'
import {
  skillMessages,
} from '../gameplay/skills/messages'
import { startupShellMessages } from '../shell/messages'
import { pwaUpdateMessages } from '../../pwa/messages'
import skillTreePresentation from '../../game-data/generated/skill-tree-presentation.json'

const WEB_CORRECTED_SKILL_TECHNICAL_IDS = new Set([
  'skills.node.androids.technical',
  'skills.node.fragmentAssembly.technical',
  'skills.node.monetaryPolicy.technical',
  'skills.node.panelWarranty.technical',
  'skills.node.productionScaling.technical',
  'skills.node.progressiveAssembly.technical',
  'skills.node.regulatedAcademia.technical',
  'skills.node.supernova.technical',
  'skills.node.terraformingProtocols.technical',
])

describe('compiled locale catalogs', () => {
  it('keeps every enabled catalog complete and free of orphaned keys', () => {
    const expected = [
      ...Object.values(sharedMessages),
      ...Object.values(startupShellMessages),
      ...Object.values(pwaUpdateMessages),
      ...Object.values(readyDysonMessages),
      ...Object.values(debugSurfaceMessages),
      ...Object.values(basicFacilityMessages),
      ...Object.values(tinkerMessages),
      ...Object.values(settingsSurfaceMessages),
      ...Object.values(researchMessages),
      ...Object.values(infinityMessages),
      ...Object.values(realityMessages),
      ...Object.values(realityUpgradeMessages),
      ...Object.values(simulationUpgradeMessages),
      ...Object.values(simulationsMessages),
      ...Object.values(quantumMessages),
      ...Object.values(quantumUpgradeMessages),
      ...Object.values(avocatoMessages),
      ...Object.values(offlineTimeMessages),
      ...Object.values(statisticsMessages),
      ...Object.values(storeMessages),
      ...Object.values(storyMessages),
      ...Object.values(wikiMessages),
      ...WIKI_PATCH_NOTES.map(wikiPatchNoteMessage),
      ...WIKI_LORE_SECTIONS.flatMap((section) => [
        wikiLoreSectionTitleMessage(section),
        ...section.chapters.flatMap((chapter, index) => [
          wikiLoreChapterTitleMessage(section, chapter, index),
          wikiLoreChapterBodyMessage(section, chapter, index),
        ]),
      ]),
      ...Object.values(skillMessages),
      ...skillTreePresentation.nodes.flatMap((node) =>
        Object.values(node.messageIds).map((id) => ({ id })),
      ),
    ]
      .map((descriptor) => descriptor.id)
      .sort()
    expect(Object.keys(sourceCatalog).sort()).toEqual(expected)
    expect(Object.keys(enCatalog).sort()).toEqual(expected)
    expect(Object.keys(frCatalog).sort()).toEqual(expected)
    expect(Object.keys(deCatalog).sort()).toEqual(expected)
    expect(Object.keys(es419Catalog).sort()).toEqual(expected)
    expect(Object.keys(ptBrCatalog).sort()).toEqual(expected)
    expect(Object.keys(zhCnCatalog).sort()).toEqual(expected)
    expect(Object.keys(ruCatalog).sort()).toEqual(expected)
    expect(Object.keys(jaCatalog).sort()).toEqual(expected)
    expect(Object.keys(enXaCatalog).sort()).toEqual(expected)
    expect(Object.keys(arXbCatalog).sort()).toEqual(expected)

    for (const descriptor of Object.values(sourceCatalog)) {
      expect(descriptor.defaultMessage.length).toBeGreaterThan(0)
      expect(descriptor.description.length).toBeGreaterThan(0)
    }
    const loading =
      sourceCatalog['shared.status.loading'].defaultMessage
    expect(loading.codePointAt(loading.length - 1)).toBe(0x2026)
  })

  it('keeps generated Skill copy and stable message IDs in the source catalog', () => {
    expect(skillTreePresentation.nodes).toHaveLength(104)
    const generatedSourceCatalog = sourceCatalog as Readonly<
      Record<
        string,
        { readonly defaultMessage: string; readonly description: string }
      >
    >

    for (const node of skillTreePresentation.nodes) {
      expect(generatedSourceCatalog[node.messageIds.displayName]).toMatchObject({
        defaultMessage: node.displayName,
      })
      expect(generatedSourceCatalog[node.messageIds.description]).toMatchObject({
        defaultMessage: node.description,
      })
      const technicalMessage =
        generatedSourceCatalog[node.messageIds.technicalDescription]
      if (
        WEB_CORRECTED_SKILL_TECHNICAL_IDS.has(
          node.messageIds.technicalDescription,
        )
      ) {
        expect(technicalMessage.defaultMessage).not.toBe(
          node.technicalDescription,
        )
        expect(technicalMessage.defaultMessage).toMatch(
          /assigned|Unassigning/,
        )
      } else {
        expect(technicalMessage).toMatchObject({
          defaultMessage: node.technicalDescription,
        })
      }
    }
    expect(WEB_CORRECTED_SKILL_TECHNICAL_IDS.size).toBe(9)
  })

  it('expands and accents the LTR pseudo-locale without changing ICU arguments', () => {
    const source = literalText(enCatalog['shared.locale.changed'])
    const pseudo = literalText(enXaCatalog['shared.locale.changed'])
    expect(pseudo.length).toBeGreaterThan(source.length * 1.25)
    expect(pseudo).not.toContain('Language changed')
    expect(
      argumentNames(enXaCatalog['shared.locale.changed']),
    ).toEqual(['languageName'])
  })

  it('mirrors the RTL pseudo-locale while preserving ICU plural structure', () => {
    const mirrored = literalText(arXbCatalog['shared.action.dismiss'])
    expect(mirrored.codePointAt(0)).toBe(0x202e)
    expect(mirrored.codePointAt(mirrored.length - 1)).toBe(0x202c)
    expect(mirrored).not.toContain('Dismiss')

    const owned = arXbCatalog['shared.facility.owned-count']
    expect(findElement(owned, 6)).toMatchObject({
      value: 'count',
      pluralType: 'cardinal',
    })
  })

  it('formats compiled ICU catalogs without runtime message parsing errors', () => {
    const intl = createIntl(
      {
        locale: 'en',
        messages: enCatalog,
      },
      createIntlCache(),
    )
    expect(
      intl.formatMessage(sharedMessages.ownedCount, { count: 2 }),
    ).toBe('2 owned')
  })
})

describe('typed locale registry', () => {
  it('enables every production language and the two required pseudo-locales', () => {
    expect(ENABLED_LOCALES).toEqual([
      'en',
      'fr',
      'de',
      'es-419',
      'pt-BR',
      'zh-CN',
      'ru',
      'ja',
      'en-XA',
      'ar-XB',
    ])
    expect(Object.keys(LOCALE_REGISTRY)).toEqual(ENABLED_LOCALES)
    expect(LOCALE_REGISTRY.en.productionSelectable).toBe(true)
    expect(LOCALE_REGISTRY.fr.productionSelectable).toBe(true)
    expect(LOCALE_REGISTRY.de.productionSelectable).toBe(true)
    expect(LOCALE_REGISTRY['es-419'].productionSelectable).toBe(true)
    expect(LOCALE_REGISTRY['pt-BR'].productionSelectable).toBe(true)
    expect(LOCALE_REGISTRY['zh-CN']).toMatchObject({
      languageTag: 'zh-Hans',
      fontFamily: 'cjk',
      productionSelectable: true,
    })
    expect(LOCALE_REGISTRY.ru.productionSelectable).toBe(true)
    expect(LOCALE_REGISTRY.ja).toMatchObject({
      fontFamily: 'cjk',
      productionSelectable: true,
    })
    expect(LOCALE_REGISTRY['en-XA'].productionSelectable).toBe(false)
    expect(LOCALE_REGISTRY['ar-XB']).toMatchObject({
      languageTag: 'ar-XB',
      direction: 'rtl',
      fontFamily: 'latin',
      productionSelectable: false,
    })
  })

  it('loads shared catalogs lazily and leaves unavailable destinations absent', async () => {
    await expect(
      LOCALE_REGISTRY['en-XA'].loadSharedCatalog(),
    ).resolves.toHaveProperty('shared.status.ready')
    await expect(
      loadDestinationCatalog('en', 'dyson'),
    ).resolves.toBeNull()
  })
})

interface AstElement {
  readonly type?: number
  readonly value?: string
  readonly options?: Readonly<
    Record<string, { readonly value?: readonly AstElement[] }>
  >
  readonly children?: readonly AstElement[]
}

function literalText(ast: readonly AstElement[]): string {
  return ast
    .flatMap((element) => [
      element.type === 0 ? element.value ?? '' : '',
      ...Object.values(element.options ?? {}).map((option) =>
        literalText(option.value ?? []),
      ),
      literalText(element.children ?? []),
    ])
    .join('')
}

function argumentNames(ast: readonly AstElement[]): string[] {
  return ast
    .flatMap((element) => [
      element.type === 1 ? element.value ?? '' : '',
      ...Object.values(element.options ?? {}).flatMap((option) =>
        argumentNames(option.value ?? []),
      ),
      ...argumentNames(element.children ?? []),
    ])
    .filter(Boolean)
}

function findElement(
  ast: readonly AstElement[],
  type: number,
): AstElement | undefined {
  for (const element of ast) {
    if (element.type === type) return element
    for (const option of Object.values(element.options ?? {})) {
      const found = findElement(option.value ?? [], type)
      if (found) return found
    }
    const child = findElement(element.children ?? [], type)
    if (child) return child
  }
  return undefined
}
