import type { MessageFormatElement } from 'react-intl'
import type { SharedMessageId } from '../messages'

export type CompiledMessage = string | readonly MessageFormatElement[]

export type SharedMessageCatalog = Readonly<
  Record<SharedMessageId, CompiledMessage>
>
