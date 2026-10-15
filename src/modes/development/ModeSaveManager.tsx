import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { IntlProvider, useIntl } from 'react-intl'
import { Button } from '../../ui/components'
import { loadStartupCatalog } from '../../ui/i18n/startupCatalog'
import { LOCALE_REGISTRY, type EnabledLocale } from '../../ui/i18n/localeRegistry'
import { modeSaveMessages as messages } from '../../ui/gameplay/settings/modeSaveMessages'
import type { ModeSaveAction } from '../../ui/gameplay/settings/modeSaveActions'
import type { GameModeController } from '../modeController'
import type { GameMode, ModeImportPreview, ModeRecoveryPreview, ModeSaveStore } from '../modeSaveStore'
import type { ModeSaveManagerModel, Request } from './modeSaveManagerModel'
import '../../ui/gameplay/settings/settingsSurface.css'
import './modeSaveManager.css'
import type { ModeSaveTransferPort } from '../hostSaveTransferBindings'

export function ModeSaveManager({ model, controller, store, transfers }: { model: ModeSaveManagerModel; controller: GameModeController; store: ModeSaveStore; transfers: ModeSaveTransferPort }) {
  const close = model.close
  const value = useSyncExternalStore(model.subscribe, model.get)
  const [catalog, setCatalog] = useState<{ requested: EnabledLocale; locale: EnabledLocale; messages: Record<string, unknown> } | null>(null)
  useEffect(() => {
    let current = true
    if (value) void loadStartupCatalog(value.locale).then(result => { if (current) setCatalog({ requested: value.locale, ...result }) }).catch(() => { if (current) setCatalog({ requested: value.locale, locale: 'en', messages: {} }) })
    return () => { current = false }
  }, [value])
  if (!value || !catalog || value.locale !== catalog.requested) return null
  const layers: Request[] = []
  for (let layer: Request | null = value; layer; layer = layer.kind === 'choice' ? layer.previous : null) layers.unshift(layer)
  return <IntlProvider locale={LOCALE_REGISTRY[catalog.locale].languageTag} messages={catalog.messages as never} defaultLocale="en">
    {layers.map(layer => <div key={layer.id} lang={LOCALE_REGISTRY[catalog.locale].languageTag} dir={LOCALE_REGISTRY[catalog.locale].direction} hidden={layer !== value} inert={layer !== value}>{layer.kind === 'choice' ? <ChoiceDialog request={layer} /> : <Dialog active={layer === value} action={layer.action} controller={controller} store={store} transfers={transfers} close={close} />}</div>)}
  </IntlProvider>
}

function ChoiceDialog({ request }: { request: { mode: GameMode; candidates: readonly { id: string; text: string }[]; resolve(id: string): void; cancel(): void } }) {
  const intl = useIntl(), dialog = useRef<HTMLElement>(null)
  useEffect(() => { dialog.current?.querySelector('button')?.focus() }, [])
  return <div className="settings-surface__dialog-backdrop mode-save-manager"><section ref={dialog} className="settings-surface__dialog" role="alertdialog" aria-modal="true" aria-labelledby="mode-choice-title" aria-describedby="mode-choice-description" onKeyDown={event => {
    if (event.key === 'Escape') { event.preventDefault(); request.cancel() }
    if (event.key === 'Tab') {
      const nodes = [...(dialog.current?.querySelectorAll<HTMLElement>('button, summary, textarea') ?? [])].filter(node => !node.closest('details:not([open])') || node.tagName === 'SUMMARY')
      const first = nodes[0], last = nodes[nodes.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
  }}>
    <h2 id="mode-choice-title">{intl.formatMessage(messages.choose, { mode: intl.formatMessage({ id: `modes.${request.mode}`, defaultMessage: request.mode === 'classic' ? 'Classic' : 'Modern' }) })}</h2>
    <p id="mode-choice-description">{intl.formatMessage(messages.chooseDescription)}</p>
    {request.candidates.map((candidate, index) => <div key={candidate.id} className="settings-surface__transfer">
      <Button onClick={() => request.resolve(candidate.id)}>{intl.formatMessage(candidate.id === 'local' ? messages.local : candidate.id === 'cloud' ? messages.cloud : messages.copyNumber, { number: index + 1 })}</Button>
      <details><summary>{intl.formatMessage(messages.text)}</summary><textarea aria-label={intl.formatMessage(messages.copyNumber, { number: index + 1 })} value={candidate.text} readOnly /></details>
    </div>)}
    <Button onClick={() => request.cancel()}>{intl.formatMessage(messages.close)}</Button>
  </section></div>
}

function Dialog({ active, action, controller, store, transfers, close }: {
  active: boolean; action: ModeSaveAction; controller: GameModeController; store: ModeSaveStore; transfers: ModeSaveTransferPort; close(): void
}) {
  const intl = useIntl(), dialog = useRef<HTMLElement>(null)
  const [busy, setBusy] = useState(false), [failed, setFailed] = useState(false), [done, setDone] = useState(false)
  const [text, setText] = useState(''), [preview, setPreview] = useState<ModeImportPreview | null>(null)
  const [recovery, setRecovery] = useState<ModeRecoveryPreview | null>(null), [archive, setArchive] = useState(false)
  const [partial, setPartial] = useState(false)
  const busyRef = useRef(false)
  const activeRef = useRef(active); activeRef.current = active
  const run = useCallback(async (work: () => Promise<void>) => {
    if (busyRef.current) return
    busyRef.current = true; setBusy(true); setFailed(false); setDone(false)
    try { await work() } catch { setFailed(true) }
    finally { busyRef.current = false; setBusy(false) }
  }, [])
  const exit = useCallback(async () => {
    if (busyRef.current) return
    await run(async () => { await controller.start().catch(() => undefined); close() })
  }, [controller, close, run])
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    dialog.current?.querySelector('button')?.focus()
    const keydown = (event: KeyboardEvent) => {
      if (!activeRef.current) return
      if (event.key === 'Escape' && !busyRef.current) { event.preventDefault(); void exit() }
      if (event.key !== 'Tab') return
      const nodes = [...(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), textarea, input') ?? [])].filter(node => !node.hidden)
      const first = nodes[0], last = nodes[nodes.length - 1]
      if (!first) return
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', keydown)
    return () => { document.removeEventListener('keydown', keydown); if (previous?.isConnected) previous.focus() }
  }, [exit])
  useEffect(() => {
    if (action === 'export') void run(async () => { setText(await controller.exportSaves()) })
  }, [action, controller, run])
  const mode = (value: GameMode) => intl.formatMessage({ id: `modes.${value}`, defaultMessage: value === 'classic' ? 'Classic' : 'Modern' })
  const summary = preview ?? recovery
  return <div className="settings-surface__dialog-backdrop mode-save-manager">
    <section ref={dialog} className="settings-surface__dialog" role="dialog" aria-modal="true" aria-labelledby="mode-save-title" aria-describedby="mode-save-description" aria-busy={busy}>
      <h2 id="mode-save-title">{intl.formatMessage(messages[action])}</h2>
      <p id="mode-save-description">{intl.formatMessage(action === 'recovery' ? messages.recoveryDescription : messages.description)}</p>
      {action === 'import' && <label>{intl.formatMessage(messages.file)}<input type="file" accept=".idsw,.json,.txt" disabled={busy} onChange={event => {
        const file = event.currentTarget.files?.[0]
        if (file) void run(async () => { if (file.size > 32 * 1024 * 1024) throw Error('Import too large'); setText(await file.text()); setPreview(null) })
      }} /></label>}
      {(action !== 'recovery' || text) && <div className="settings-surface__transfer">
        <label htmlFor="mode-save-text">{intl.formatMessage(messages.text)}</label>
        <textarea id="mode-save-text" value={text} readOnly={action !== 'import' || busy} spellCheck={false} wrap="off" onChange={event => { setText(event.currentTarget.value); setPreview(null) }} />
      </div>}
      {summary && <p>{intl.formatMessage(messages.summary, { modes: summary.modes.map(mode).join(', '), mode: mode(summary.active) })}</p>}
      {preview && <p>{intl.formatMessage(messages.warning)}</p>}
      {recovery && <p>{intl.formatMessage(messages.recoveryWarning)}</p>}
      {partial && <p role="alert">{intl.formatMessage(messages.recoveryPartial)}</p>}
      {failed && <p role="alert">{intl.formatMessage(messages.failed)}</p>}
      {(busy || done) && <p role="status">{intl.formatMessage(busy ? messages.pending : messages.done)}</p>}
      <div className="settings-surface__dialog-actions">
        <Button disabled={busy} onClick={() => void exit()}>{intl.formatMessage(messages.close)}</Button>
        {action === 'import' && <Button disabled={busy || !text.trim()} onClick={() => void run(async () => {
          if (!preview) setPreview(await controller.prepareImport(text))
          else { await controller.importSaves(text, preview.generation ?? undefined); setPreview(null); setDone(true) }
        })}>{intl.formatMessage(preview ? messages.replace : messages.review)}</Button>}
        {action === 'recovery' && <>
          <Button disabled={busy} onClick={() => void run(async () => {
            if (!recovery) { await controller.prepareRecovery(); setRecovery(await store.previewRecovery()) }
            else { await controller.restoreRecovery(recovery.identity); setRecovery(null); setDone(true) }
          })}>{intl.formatMessage(recovery ? messages.restoreRecovery : messages.reviewRecovery)}</Button>
          <Button disabled={busy} onClick={() => void run(async () => { await controller.prepareRecovery().catch(() => undefined); const text = await store.exportRecoveryArchive(); setText(text); setPartial(JSON.parse(text).errors.length > 0); setArchive(true) })}>{intl.formatMessage(messages.recoveryExport)}</Button>
        </>}
        {(action === 'export' || archive) && <>
          <Button disabled={busy || !text} data-clipboard-copy onClick={() => void run(async () => { await transfers.copy(text); setDone(true) })}>{intl.formatMessage(messages.copy)}</Button>
          <Button disabled={busy || !text} onClick={() => void run(async () => { if (await transfers.download(text, archive) === 'saved') setDone(true) })}>{intl.formatMessage(messages.download)}</Button>
        </>}
      </div>
    </section>
  </div>
}
