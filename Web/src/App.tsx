import { useCallback, useMemo, useState } from 'react'
import './App.css'
import { decodeIdb1Save, getSavePath } from './save/decodeIdb1'

interface DecoderSummary {
  status: 'idle' | 'loading' | 'compatible' | 'failed'
  source: string
  schema: number | null
  rootType: string | null
  dateStarted: string | null
  dateQuit: string | null
  money: string | null
  infinityPoints: string | null
  compressedBytes: number | null
  binaryBytes: number | null
  error: string | null
}

const FIXTURES = [
  {
    label: 'Canonical schema 8',
    file: 'schema-08-canonical-idb1-main-save.txt',
  },
  {
    label: 'Support schema 11',
    file: 'support-case-01-attached-idb1.txt',
  },
  {
    label: 'Historical schema 0',
    file: 'support-case-02-inline-idb1.txt',
  },
  {
    label: 'Support schema 10',
    file: 'support-case-03-inline-idb1.txt',
  },
] as const

const INITIAL_DECODER: DecoderSummary = {
  status: 'idle',
  source: 'No save selected',
  schema: null,
  rootType: null,
  dateStarted: null,
  dateQuit: null,
  money: null,
  infinityPoints: null,
  compressedBytes: null,
  binaryBytes: null,
  error: null,
}

function displayValue(value: unknown): string | null {
  if (value === undefined || value === null) return null
  if (typeof value === 'bigint') return value.toString()
  if (typeof value === 'number') {
    return value.toLocaleString('en-AU', { maximumSignificantDigits: 16 })
  }
  return String(value)
}

function App() {
  const [summary, setSummary] =
    useState<DecoderSummary>(INITIAL_DECODER)

  const decodeText = useCallback((text: string, source: string) => {
    try {
      const decoded = decodeIdb1Save(text)
      const root = decoded.root
      setSummary({
        status: 'compatible',
        source,
        schema: Number(getSavePath(root, 'saveVersion') ?? 0),
        rootType: decoded.rootType,
        dateStarted: displayValue(getSavePath(root, 'dateStarted')),
        dateQuit: displayValue(getSavePath(root, 'dateQuitString')),
        money: displayValue(
          getSavePath(
            root,
            'dysonVerseSaveData.dysonVerseInfinityData.money',
          ),
        ),
        infinityPoints: displayValue(
          getSavePath(
            root,
            'dysonVerseSaveData.dysonVersePrestigeData.infinityPoints',
          ),
        ),
        compressedBytes: decoded.compressedBytes,
        binaryBytes: decoded.binaryBytes,
        error: null,
      })
    } catch (error) {
      setSummary({
        ...INITIAL_DECODER,
        status: 'failed',
        source,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }, [])

  const loadFixture = async (file: string, label: string) => {
    setSummary({
      ...INITIAL_DECODER,
      status: 'loading',
      source: label,
    })
    try {
      const response = await fetch(`/fixtures/${file}`)
      if (!response.ok) {
        throw new Error(`Fixture request failed: ${response.status}`)
      }
      decodeText(await response.text(), label)
    } catch (error) {
      setSummary({
        ...INITIAL_DECODER,
        status: 'failed',
        source: label,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const results = useMemo(
    () => [
      ['Schema', summary.schema],
      ['Money', summary.money],
      ['Infinity points', summary.infinityPoints],
      ['Started', summary.dateStarted],
      ['Last quit', summary.dateQuit],
      [
        'Payload',
        summary.compressedBytes === null || summary.binaryBytes === null
          ? null
          : `${summary.compressedBytes.toLocaleString()} B → ${summary.binaryBytes.toLocaleString()} B`,
      ],
    ],
    [summary],
  )

  return (
    <main className="diagnostic-shell">
      <header className="page-heading">
        <h1>Idle Dyson Swarm web foundation</h1>
        <p>
          Developer diagnostics for the headless TypeScript port. This page is
          not a product frontend or a design baseline.
        </p>
      </header>

      <section className="compatibility-lab">
        <header>
          <h2>Save compatibility lab</h2>
          <p>
            Verify existing Unity <code>IDB1:</code> saves directly in the
            browser.
          </p>
        </header>

        <div
          className={`compatibility-status ${summary.status}`}
          role="status"
        >
          <strong>
            {summary.status === 'compatible'
              ? 'Save decoded successfully'
              : summary.status === 'failed'
                ? 'Save could not be decoded'
                : summary.status === 'loading'
                  ? 'Reading save…'
                  : 'Decoder ready'}
          </strong>
          <span>{summary.source}</span>
        </div>

        <div className="results-grid">
          {results.map(([label, value]) => (
            <div className="result" key={String(label)}>
              <span>{label}</span>
              <strong>{value ?? '—'}</strong>
            </div>
          ))}
        </div>

        {summary.error && <p className="error-message">{summary.error}</p>}

        <section className="fixture-panel">
          <header>
            <h3>Compatibility fixtures</h3>
            <p>Decode saves preserved by the Unity test suite.</p>
          </header>
          <div className="fixture-buttons">
            {FIXTURES.map((fixture) => (
              <button
                type="button"
                key={fixture.file}
                onClick={() =>
                  void loadFixture(fixture.file, fixture.label)
                }
              >
                {fixture.label}
              </button>
            ))}
          </div>
        </section>

        <label className="file-input">
          <span>Test another existing save</span>
          <small>The file stays inside this local diagnostic app.</small>
          <input
            type="file"
            accept=".txt,text/plain"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) {
                void file.text().then((text) => decodeText(text, file.name))
              }
            }}
          />
        </label>
      </section>
    </main>
  )
}

export default App
