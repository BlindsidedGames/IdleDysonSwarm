import type { MessageFormatElement } from 'react-intl'
import type { SharedMessageId } from '../messages'

export type CompiledMessage = string | readonly MessageFormatElement[]

export type SharedMessageCatalog = Readonly<
  Record<SharedMessageId, CompiledMessage>
>

export type DestinationId =
  | 'dyson'
  | 'research'
  | 'skills'
  | 'infinity'
  | 'dream'
  | 'reality'
  | 'quantum'
  | 'avocado'
  | 'story'
  | 'settings'
  | 'recovery'

export type DestinationMessageCatalog = Readonly<
  Record<string, CompiledMessage>
>

export type DestinationCatalogLoader = () => Promise<
  DestinationMessageCatalog
>
