import type { ComponentProps } from 'react'
import App from './App'
import { useLocalePreference } from './ui/i18n'

export default function LocalizedApp(
  props: Omit<ComponentProps<typeof App>, 'locale'>,
) {
  const { locale } = useLocalePreference()
  return <App {...props} locale={locale} />
}
