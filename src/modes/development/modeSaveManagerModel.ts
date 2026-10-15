import type { EnabledLocale } from '../../ui/i18n/localeRegistry'
import type { ModeSaveAction } from '../../ui/gameplay/settings/modeSaveActions'
import type { GameMode } from '../modeSaveStore'

export type Choice = { previous: Request | null; kind: 'choice'; locale: EnabledLocale; id: number; mode: GameMode; candidates: readonly { id: string; text: string }[]; resolve(id: string): void; cancel(): void }
export type Request = { kind: 'transfer'; action: ModeSaveAction; locale: EnabledLocale; id: number } | Choice
export interface ModeSaveManagerModel { subscribe(listener: () => void): () => void; get(): Request | null; close(): void }
