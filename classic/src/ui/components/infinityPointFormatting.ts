import { formatGameNumber } from '../i18n/formatters'
import type { EnabledLocale } from '../i18n/localeRegistry'

export function formatInfinityPointAmount(
  locale: EnabledLocale,
  value: number | bigint,
): string {
  return formatGameNumber(
    locale,
    value,
    { wholeBelowHundred: true },
  )
}
