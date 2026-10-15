/**
 * Renders a dependency-free fallback when composition or localization fails
 * before React can mount its top-level error boundary.
 */
export function renderStaticBootstrapFailure(
  root: HTMLElement,
): void {
  const copy = staticBootstrapFailureCopy(resolveStaticBootstrapLocale())
  const main = document.createElement('main')
  main.className = 'startup-shell'
  const frame = document.createElement('div')
  frame.className = 'startup-shell__frame'
  const heading = document.createElement('h1')
  heading.textContent = copy.title
  heading.tabIndex = -1
  const alert = document.createElement('p')
  alert.setAttribute('role', 'alert')
  alert.textContent = copy.body
  frame.append(heading, alert)
  main.append(frame)
  root.replaceChildren(main)
  heading.focus()
}

type StaticBootstrapLocale =
  | 'en'
  | 'fr'
  | 'de'
  | 'es-419'
  | 'pt-BR'
  | 'zh-CN'
  | 'ru'
  | 'ja'

const STATIC_BOOTSTRAP_COPY: Readonly<Record<
  StaticBootstrapLocale,
  { readonly title: string; readonly body: string }
>> = Object.freeze({
  en: {
    title: 'Idle Dyson Swarm could not start',
    body: 'Startup stopped without changing your saved progress. Reload this page when you are ready.',
  },
  fr: {
    title: 'Idle Dyson Swarm n’a pas pu démarrer',
    body: 'Le démarrage s’est interrompu sans modifier votre progression sauvegardée. Rechargez cette page lorsque vous êtes prêt.',
  },
  de: {
    title: 'Idle Dyson Swarm konnte nicht gestartet werden',
    body: 'Der Start wurde beendet, ohne deinen gespeicherten Fortschritt zu verändern. Lade diese Seite neu, wenn du bereit bist.',
  },
  'es-419': {
    title: 'Idle Dyson Swarm no pudo iniciarse',
    body: 'El inicio se detuvo sin cambiar tu progreso guardado. Recarga esta página cuando quieras intentarlo de nuevo.',
  },
  'pt-BR': {
    title: 'Idle Dyson Swarm não pôde iniciar',
    body: 'A inicialização foi interrompida sem alterar seu progresso salvo. Recarregue esta página quando estiver pronto.',
  },
  'zh-CN': {
    title: 'Idle Dyson Swarm 无法启动',
    body: '启动已停止，已保存的进度未被更改。准备好后，请重新加载此页面。',
  },
  ru: {
    title: 'Не удалось запустить Idle Dyson Swarm',
    body: 'Запуск остановлен, сохранённый прогресс не изменён. Когда будете готовы, перезагрузите страницу.',
  },
  ja: {
    title: 'Idle Dyson Swarm を起動できませんでした',
    body: '保存済みの進行状況を変更せずに起動を停止しました。準備ができたら、このページを再読み込みしてください。',
  },
})

export function staticBootstrapFailureCopy(locale: StaticBootstrapLocale) {
  return STATIC_BOOTSTRAP_COPY[locale]
}

export function resolveStaticBootstrapLocale(): StaticBootstrapLocale {
  let requested: readonly string[] = []
  try {
    const stored = localStorage.getItem('idle-dyson-swarm.presentation-locale')
    if (stored && stored !== 'system') requested = [stored]
  } catch {
    // A blocked storage API falls back to the device language list.
  }
  if (requested.length === 0) requested = navigator.languages
  for (const value of requested) {
    const locale = value.toLowerCase()
    if (locale === 'fr' || locale.startsWith('fr-')) return 'fr'
    if (locale === 'de' || locale.startsWith('de-')) return 'de'
    if (locale === 'es' || locale.startsWith('es-')) return 'es-419'
    if (locale === 'pt' || locale.startsWith('pt-')) return 'pt-BR'
    if (locale === 'zh-cn' || locale === 'zh-sg' || locale.includes('hans')) return 'zh-CN'
    if (locale === 'ru' || locale.startsWith('ru-')) return 'ru'
    if (locale === 'ja' || locale.startsWith('ja-')) return 'ja'
    if (locale === 'en' || locale.startsWith('en-')) return 'en'
  }
  return 'en'
}
