import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { IntlProvider, useIntl } from 'react-intl'
import { Button } from '../../ui/components'
import { loadStartupCatalog } from '../../ui/i18n/startupCatalog'
import { LOCALE_REGISTRY, type EnabledLocale } from '../../ui/i18n/localeRegistry'
import { modeSaveMessages as messages } from '../../ui/gameplay/settings/modeSaveMessages'
import { settingsSurfaceMessages as settingsMessages } from '../../ui/gameplay/settings/messages'
import type { ModeSaveAction } from '../../ui/gameplay/settings/modeSaveActions'
import type { GameModeController } from '../modeController'
import type { GameMode, ModeImportPreview, ModeRecoveryPreview, ModeSaveStore } from '../modeSaveStore'
import type { ModeSaveManagerModel, Request } from './modeSaveManagerModel'
import '../../ui/gameplay/settings/settingsSurface.css'
import '../../ui/gameplay/settings/modeSaveSettings.css'
import './modeSaveManager.css'
import type { ModeSaveTransferPort } from '../hostSaveTransferBindings'
import { SAVE_EXPORT_TIMESTAMP_KEY } from '../../platform/saveFileExport'
import type { PresentationStorage } from '../../ui/presentationStorage'
import { createModePresentationStorage } from '../modePresentationStorage'
import { BrowserSaveImportReader } from '../../platform/browserSaveTransfer'
import { formatGameNumber, formatWholeGameNumber } from '../../ui/i18n/formatters'
import { NumberNotationPreferenceService } from '../../ui/number-notation'

export function ModeSaveManager({ model, controller, store, transfers, preferences }: { model: ModeSaveManagerModel; controller: GameModeController; store: ModeSaveStore; transfers: ModeSaveTransferPort; preferences: PresentationStorage }) {
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
    {layers.map(layer => <div key={layer.id} lang={LOCALE_REGISTRY[catalog.locale].languageTag} dir={LOCALE_REGISTRY[catalog.locale].direction} hidden={layer !== value} inert={layer !== value}>{layer.kind === 'choice' ? <ChoiceDialog request={layer} /> : <Dialog active={layer === value} action={layer.action} controller={controller} store={store} transfers={transfers} preferences={preferences} close={close} />}</div>)}
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

function Dialog({ active, action, controller, store, transfers, preferences, close }: {
  active: boolean; action: ModeSaveAction; controller: GameModeController; store: ModeSaveStore; transfers: ModeSaveTransferPort; preferences: PresentationStorage; close(): void
}) {
  const intl = useIntl(), dialog = useRef<HTMLElement>(null)
  const [busy, setBusy] = useState(false), [failed, setFailed] = useState(false)
  const [done, setDone] = useState<'copied' | 'downloaded' | 'restored' | null>(null)
  const [exportBasis, setExportBasis] = useState<'current' | 'pre-stored-time'>('current')
  const [fileName, setFileName] = useState('')
  const transferText = useRef<HTMLTextAreaElement>(null)
  const [text, setText] = useState(''), [preview, setPreview] = useState<ModeImportPreview | null>(null)
  const [recovery, setRecovery] = useState<ModeRecoveryPreview | null>(null), [archive, setArchive] = useState(false)
  const [partial, setPartial] = useState(false)
  const [resetMode] = useState(() => controller.getSnapshot().manifest?.active ?? null)
  const modePreferences = resetMode ? createModePresentationStorage(resetMode, preferences, () => controller.getSnapshot().manifest?.active === resetMode) : null
  const [notation] = useState(() => new NumberNotationPreferenceService({ storage: modePreferences }).getSnapshot())
  const [timestampExports, setTimestampExports] = useState(() => {
    try { return modePreferences?.getItem(SAVE_EXPORT_TIMESTAMP_KEY) === 'true' } catch { return false }
  })
  const busyRef = useRef(false)
  const activeRef = useRef(active); activeRef.current = active
  const run = useCallback(async (work: () => Promise<void>) => {
    if (busyRef.current) return
    busyRef.current = true; setBusy(true); setFailed(false); setDone(null)
    try { await work() } catch { setFailed(true) }
    finally { busyRef.current = false; setBusy(false) }
  }, [])
  const exit = useCallback(async () => {
    if (action === 'export') { close(); return }
    if (busyRef.current) return
    await run(async () => { await controller.start(); close() })
  }, [action, controller, close, run])
  useEffect(() => {
    ;(transferText.current ?? dialog.current?.querySelector('button'))?.focus()
    const keydown = (event: KeyboardEvent) => {
      if (!activeRef.current) return
      if (event.key === 'Escape' && (!busyRef.current || action === 'export')) { event.preventDefault(); void exit() }
      if (event.key !== 'Tab') return
      const nodes = [...(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), textarea:not(:disabled), input:not(:disabled):not([type=file])') ?? [])].filter(node => !node.hidden)
      const first = nodes[0], last = nodes[nodes.length - 1]
      if (!first) return
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', keydown)
    return () => { document.removeEventListener('keydown', keydown) }
  }, [action, exit])
  useEffect(() => {
    if (action === 'export') void run(async () => {
      const exported = await controller.exportSave()
      setText(exported.text); setExportBasis(exported.basis)
    })
  }, [action, controller, run])
  useEffect(() => {
    if (action === 'export' && document.activeElement === transferText.current) transferText.current?.select()
  }, [action, text])
  const mode = (value: GameMode) => intl.formatMessage({ id: `modes.${value}`, defaultMessage: value === 'classic' ? 'Classic' : 'Modern' })
  const summary = preview ?? recovery
  return <div className="settings-surface__dialog-backdrop mode-save-manager" data-game-mode={resetMode ?? undefined}>
    <section ref={dialog} className="settings-surface__dialog" role="dialog" aria-modal="true" aria-labelledby="mode-save-title" aria-describedby="mode-save-description" aria-busy={busy}>
      <h2 id="mode-save-title">{intl.formatMessage(action === 'reset' ? settingsMessages.resetDialogTitle : messages[action])}</h2>
      <p id="mode-save-description">{action === 'reset'
        ? intl.formatMessage(messages.resetConfirmation, { mode: resetMode ? mode(resetMode) : '' })
        : intl.formatMessage(action === 'recovery' ? messages.recoveryDescription : action === 'import' ? messages.importDescription : settingsMessages.exportDescription)}</p>
      {action === 'export' && exportBasis === 'pre-stored-time' && <p role="status">{intl.formatMessage(settingsMessages.exportPreStoredTime)}</p>}
      {action === 'import' && !preview && <div className="settings-surface__file-option"><label>{intl.formatMessage(messages.file)}<input type="file" accept=".idsw,.json,.txt,text/plain" disabled={busy} onChange={event => {
        const file = event.currentTarget.files?.[0]
        if (file) {
          setPreview(null); setText(''); setFileName('')
          void run(async () => { const supplied = await new BrowserSaveImportReader().readFile(file); setText(supplied.text); setFileName(file.name) })
        }
      }} /></label>{fileName && <span>{fileName}</span>}</div>}
      {action !== 'reset' && !preview && (action !== 'recovery' || text) && <div className="settings-surface__transfer">
        <label htmlFor="mode-save-text">{intl.formatMessage(action === 'import' ? settingsMessages.importStringLabel : settingsMessages.exportStringLabel)}</label>
        <textarea ref={transferText} id="mode-save-text" value={text} disabled={action === 'import' && busy} readOnly={action !== 'import'} spellCheck={false} wrap="off"
          placeholder={action === 'import' ? intl.formatMessage(settingsMessages.importStringPlaceholder) : undefined}
          onFocus={event => { if (action !== 'import') event.currentTarget.select() }}
          onChange={event => { setText(event.currentTarget.value); setPreview(null); setFileName(''); setFailed(false) }} />
      </div>}
      {action === 'export' && transfers.downloadAvailable !== false && <label className="settings-surface__toggle">
        <input type="checkbox" checked={timestampExports} disabled={busy} onChange={event => {
          const enabled = event.currentTarget.checked
          setTimestampExports(enabled)
          try { modePreferences?.setItem(SAVE_EXPORT_TIMESTAMP_KEY, String(enabled)) } catch { /* Presentation persistence must not block export. */ }
        }} />
        <span>{intl.formatMessage(settingsMessages.timestampExports)}</span>
      </label>}
      {summary && <p>{preview
        ? intl.formatMessage(messages.importTarget, { mode: mode(preview.active) })
        : intl.formatMessage(messages.summary, { modes: summary.modes.map(mode).join(', '), mode: mode(summary.active) })}</p>}
      {preview?.progress && <div className="settings-surface__import-preview" role="status">
        <h4>{intl.formatMessage(settingsMessages.importPreviewTitle)}</h4>
        <dl>
          <div><dt>{intl.formatMessage(settingsMessages.infinityPoints)}</dt><dd>{formatGameNumber(intl.locale as EnabledLocale, preview.progress.infinityPoints, { notation })}</dd></div>
          <div><dt>{intl.formatMessage(settingsMessages.quantumPoints)}</dt><dd>{formatGameNumber(intl.locale as EnabledLocale, preview.progress.quantumPoints, { notation })}</dd></div>
          <div><dt>{intl.formatMessage(settingsMessages.skillPoints)}</dt><dd>{formatWholeGameNumber(intl.locale as EnabledLocale, preview.progress.skillPoints, notation)}</dd></div>
        </dl>
      </div>}
      {preview && <p>{intl.formatMessage(messages.warning)}</p>}
      {recovery && <p>{intl.formatMessage(messages.recoveryWarning)}</p>}
      {partial && <p role="alert">{intl.formatMessage(messages.recoveryPartial)}</p>}
      {failed && <p role="alert">{intl.formatMessage(action === 'export' ? settingsMessages.exportFailed : action === 'import' ? settingsMessages.importPreviewFailed : messages.failed)}</p>}
      {(busy || done) && <p role="status">{intl.formatMessage(busy ? (action === 'export' ? settingsMessages.exportLoading : messages.pending) : done === 'copied' ? settingsMessages.exportCopied : done === 'downloaded' ? settingsMessages.exportSucceeded : messages.done)}</p>}
      <div className="settings-surface__dialog-actions">
        <Button disabled={busy && action !== 'export'} onClick={() => void exit()}>{intl.formatMessage(action === 'import' || action === 'reset' ? settingsMessages.cancel : messages.close)}</Button>
        {action === 'reset' && <Button className="settings-surface__reset" variant="danger" disabled={busy || resetMode === null} onClick={() => void run(async () => {
          if (resetMode === null) throw Error('No active save.')
          await controller.resetSave(resetMode); close()
        })}>{intl.formatMessage(busy ? settingsMessages.resetPending : settingsMessages.reset)}</Button>}
        {action === 'import' && <Button disabled={busy || !text.trim()} onClick={() => void run(async () => {
          if (!preview) setPreview(await controller.prepareImport(text))
          else { await controller.importSave(text, preview.generation ?? undefined); close() }
        })}>{intl.formatMessage(preview ? messages.replace : messages.review)}</Button>}
        {action === 'recovery' && <>
          <Button disabled={busy} onClick={() => void run(async () => {
            if (!recovery) { await controller.prepareRecovery(); setRecovery(await store.previewRecovery()) }
            else { await controller.restoreRecovery(recovery.identity); setRecovery(null); setDone('restored') }
          })}>{intl.formatMessage(recovery ? messages.restoreRecovery : messages.reviewRecovery)}</Button>
          <Button disabled={busy} onClick={() => void run(async () => { await controller.prepareRecovery().catch(() => undefined); const text = await store.exportRecoveryArchive(); setText(text); setPartial(JSON.parse(text).errors.length > 0); setArchive(true) })}>{intl.formatMessage(messages.recoveryExport)}</Button>
        </>}
        {(action === 'export' || archive) && <>
          <Button disabled={busy || !text} data-clipboard-copy onClick={() => void run(async () => { await transfers.copy(text); setDone('copied') })}>{intl.formatMessage(settingsMessages.copyString)}</Button>
          {transfers.downloadAvailable !== false && <Button disabled={busy || !text} onClick={() => void run(async () => { if (await transfers.download(text, archive, timestampExports) === 'saved') setDone('downloaded') })}>{intl.formatMessage(settingsMessages.downloadFile)}</Button>}
        </>}
      </div>
    </section>
  </div>
}
