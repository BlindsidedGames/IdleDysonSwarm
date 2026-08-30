# Multi-language localization experiment

## Scope

This experiment enables complete French (`fr`), German (`de`), Latin American
Spanish (`es-419`), Brazilian Portuguese (`pt-BR`), Simplified Chinese
(`zh-CN`), Russian (`ru`), and Japanese (`ja`) presentation catalogs alongside
English. Expanded English (`en-XA`) and mirrored RTL (`ar-XB`) remain
non-production QA locales.

Language is a device-local presentation preference. It is deliberately absent
from game saves, save import/export, canonical snapshots, and simulation
commands. Existing saves require no schema migration and importing a save must
not change the receiving device's language.

## Player behaviour

Settings exposes nine choices:

- Use device language (default when no prior choice is stored)
- English
- Français
- Deutsch
- Español (Latinoamérica)
- Português (Brasil)
- 简体中文
- Русский
- 日本語

Device mode chooses the first supported entry in the device's ordered language
preferences and falls back to English. It is refreshed when the web runtime
receives `languagechange` and whenever the document becomes visible after a
background/resume cycle. An explicit language remains active until the player
returns to device mode.

Changing language loads the compiled catalog without restarting or mutating the
game. The document `lang`, `dir`, locale data attribute, and cached `Intl`
formatters follow the active catalog. The change is announced politely without
moving focus.

If the selected non-English catalog cannot load during startup, the application
records a closed catalog-unavailable diagnostic and renders with the bundled
English catalog for that launch. It does not rewrite the device-local language
preference, so the selected catalog is attempted again on the next launch.
The provider locale, `Intl` formatting, document `lang`/`dir` and font identity
all follow effective English during that launch, including after an RTL catalog
failure; the unloaded selection is not exposed as the active locale.
English is the essential fallback; if it is also unavailable, startup follows
the existing fail-safe path instead of presenting a false ready state.

Android and iOS packages declare every production language as a supported
application localization so the operating systems can expose their per-app
language controls. Physical-device validation must confirm that WebView ordered
preferences reflect those controls on every supported OS version.

## Catalog contract

The English source catalog is generated from FormatJS descriptors and then
augmented deterministically with the 312 generated Skill messages (name,
flavour description, and technical description for each of 104 Skills) and 43
messages covering the complete authored Wiki lore and archived patch notes.
The reviewed inventory contains 1,617 player-facing messages per language,
including the localized Version 3.1.2 language announcement.

Every production translation must:

- contain exactly the English source IDs and no orphaned IDs;
- preserve ICU arguments, plural/select structure, and rich-text tags;
- compile to FormatJS AST without skipped errors;
- keep canonical IDs, save keys, command names, and player-authored text out of
  translation parsing;
- use the per-language glossary consistently; and
- receive fluent human review before a production release.

`npm run i18n:check` regenerates the English inventory, checks every production
translation for completeness and ICU integrity, and compiles all production and
QA pseudo-locales.

## Release gates

The experiment is review-ready only after:

1. TypeScript, lint, full tests, production web build, and native builds pass.
2. Every production language renders through representative early-, mid-, and
   late-game states at desktop, mobile portrait, and compact landscape widths,
   including Store, Story, Wiki, Skills, Infinity, Reality,
   Simulations, Quantum, Stored Time, recovery, and Settings.
3. Device-following, explicit override, reload, background/resume, and
   save-import isolation are exercised.
4. Expanded LTR and mirrored RTL pseudo-locales remain clean at compact mobile
   widths and increased text size.
5. A fluent reviewer for every production language approves terminology,
   humour, wordplay, and gameplay explanations.
6. Physical Android and iOS checks confirm font rendering, operating-system
   per-app language behaviour, native cold launch, and resumed presentation.

Localized store listings, screenshots, and marketing copy are separate release
artifacts and are not inferred from completion of the in-game catalogs.
