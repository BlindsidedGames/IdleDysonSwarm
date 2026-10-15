import type { EnabledLocale } from '../i18n/localeRegistry'
import { InlineResourceAmount } from './InlineResourceAmount'
import { formatInfinityPointAmount } from './infinityPointFormatting'
import { InfinityPointSymbol } from './ResourceSymbols'

export { InfinityPointSymbol } from './ResourceSymbols'

export function InfinityPointAmount({
  locale,
  value,
  className,
}: {
  readonly locale: EnabledLocale
  readonly value: number | bigint
  readonly className?: string
}) {
  return (
    <InlineResourceAmount
      className={className}
      leadingSymbol={<InfinityPointSymbol />}
      value={formatInfinityPointAmount(locale, value)}
    />
  )
}
