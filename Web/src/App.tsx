import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import './App.css'
import aiManagersIcon from './assets/game-icons/ai-managers.png'
import appIcon from './assets/game-icons/app-icon.png'
import assemblyLinesIcon from './assets/game-icons/assembly-lines.png'
import cashIcon from './assets/game-icons/cash.png'
import dataCentersIcon from './assets/game-icons/data-centers.png'
import navBotsIcon from './assets/game-icons/nav-bots.png'
import navInfinityIcon from './assets/game-icons/nav-infinity.png'
import navOfflineIcon from './assets/game-icons/nav-offline.png'
import navQuantumIcon from './assets/game-icons/nav-quantum.png'
import navRealityIcon from './assets/game-icons/nav-reality.png'
import navResearchIcon from './assets/game-icons/nav-research.png'
import navSettingsIcon from './assets/game-icons/nav-settings.png'
import navSimulationsIcon from './assets/game-icons/nav-simulations.png'
import navSkillsIcon from './assets/game-icons/nav-skills.png'
import navStoryIcon from './assets/game-icons/nav-story.png'
import navWikiIcon from './assets/game-icons/nav-wiki.png'
import planetsIcon from './assets/game-icons/planets.png'
import scienceIcon from './assets/game-icons/science.png'
import serversIcon from './assets/game-icons/servers.png'
import { getGameAsset } from './game-data/catalog'
import {
  advanceBotTabGame,
  createBotTabGameState,
  purchaseBotFacility,
  setBotBuyMode,
  setBotDistribution,
  setRoundedBulkBuy,
  startTinkering,
  type BotTabGameState,
} from './game/botTabGame'
import { decodeIdb1Save, getSavePath } from './save/decodeIdb1'
import {
  BASIC_DYSON_FACILITY_IDS,
  type BasicDysonState,
  type BasicDysonFacilityId,
} from './simulation/dysonModel'
import {
  buyModeAmount,
  buyXCost,
  maxAffordable,
  type BuyMode,
} from './simulation/transactions'
import { formatGameNumber } from './ui/formatNumber'
import { SmoothNumber } from './ui/SmoothNumber'

type AppView = 'bots' | 'research' | 'skills' | 'infinity' | 'compatibility'

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

const BUY_MODES: readonly { label: string; value: BuyMode }[] = [
  { label: '1', value: 'buy-1' },
  { label: '10', value: 'buy-10' },
  { label: '50', value: 'buy-50' },
  { label: '100', value: 'buy-100' },
  { label: 'Max', value: 'buy-max' },
]

const NAV_ITEMS: readonly {
  view: AppView
  label: string
  icon: string
  available: boolean
}[] = [
  { view: 'bots', label: 'Bots', icon: navBotsIcon, available: true },
  {
    view: 'research',
    label: 'Research',
    icon: navResearchIcon,
    available: false,
  },
  { view: 'skills', label: 'Skills', icon: navSkillsIcon, available: false },
  {
    view: 'infinity',
    label: 'Infinity',
    icon: navInfinityIcon,
    available: false,
  },
  {
    view: 'compatibility',
    label: 'Save Lab',
    icon: appIcon,
    available: true,
  },
]

const SIDE_MENU_ITEMS: readonly {
  label: string
  icon: string
  view?: AppView
  available: boolean
}[] = [
  { label: 'Bots', icon: navBotsIcon, view: 'bots', available: true },
  {
    label: 'Research',
    icon: navResearchIcon,
    view: 'research',
    available: false,
  },
  { label: 'Skills', icon: navSkillsIcon, view: 'skills', available: false },
  {
    label: 'Infinity',
    icon: navInfinityIcon,
    view: 'infinity',
    available: false,
  },
  { label: 'Offline Time', icon: navOfflineIcon, available: false },
  { label: 'Simulations', icon: navSimulationsIcon, available: false },
  { label: 'Reality', icon: navRealityIcon, available: false },
  { label: 'Quantum', icon: navQuantumIcon, available: false },
  { label: 'Story', icon: navStoryIcon, available: false },
  { label: 'Wiki', icon: navWikiIcon, available: false },
  { label: 'Settings', icon: navSettingsIcon, available: false },
  {
    label: 'Save Compatibility',
    icon: appIcon,
    view: 'compatibility',
    available: true,
  },
]

const FACILITY_ICONS: Record<BasicDysonFacilityId, string> = {
  assembly_lines: assemblyLinesIcon,
  ai_managers: aiManagersIcon,
  servers: serversIcon,
  data_centers: dataCentersIcon,
  planets: planetsIcon,
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
]

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

declare global {
  interface Window {
    render_game_to_text: () => string
    advanceTime: (milliseconds: number) => void
  }
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
  const [activeView, setActiveView] = useState<AppView>('bots')
  const [menuOpen, setMenuOpen] = useState(false)
  const [game, setGame] = useState<BotTabGameState>(() =>
    createBotTabGameState(),
  )
  const [decoder, setDecoder] = useState<DecoderSummary>(INITIAL_DECODER)
  const [toast, setToast] = useState<string | null>(null)
  const gameRef = useRef(game)
  const viewRef = useRef(activeView)
  const decoderRef = useRef(decoder)
  gameRef.current = game
  viewRef.current = activeView
  decoderRef.current = decoder

  const commitGame = useCallback((next: BotTabGameState) => {
    gameRef.current = next
    setGame(next)
  }, [])

  const advance = useCallback(
    (seconds: number) => {
      if (!Number.isFinite(seconds) || seconds <= 0) return
      commitGame(advanceBotTabGame(gameRef.current, seconds))
    },
    [commitGame],
  )

  useEffect(() => {
    const timer = window.setInterval(() => advance(0.1), 100)
    return () => window.clearInterval(timer)
  }, [advance])

  useEffect(() => {
    window.render_game_to_text = () => {
      const current = gameRef.current
      const state = current.dyson
      return JSON.stringify({
        screen: viewRef.current,
        simulatedSeconds: current.simulatedSeconds,
        resources: {
          money: state.money,
          science: state.science,
          bots: state.bots,
          panels: state.panels,
          infinityPoints: state.infinity.points.toString(),
        },
        allocation: {
          workerPercent: current.botMultitasking
            ? 100
            : Math.round((1 - current.botDistribution) * 100),
          researcherPercent: current.botMultitasking
            ? 100
            : Math.round(current.botDistribution * 100),
          workers: state.workers,
          researchers: state.researchers,
        },
        rates: state.rates,
        tinker: {
          cooldownSeconds: current.tinkerCooldownSeconds,
          remainingSeconds: current.tinkerRemainingSeconds,
        },
        buyMode: state.automation.buyMode,
        roundedBulkBuy: state.automation.roundedBulkBuy,
        presentation: {
          canonicalTickSeconds: 0.1,
          interpolationOnly: true,
          canonicalStateMutationsPerSecond: 10,
        },
        facilities: Object.fromEntries(
          BASIC_DYSON_FACILITY_IDS.map((id) => [
            id,
            {
              automatic: state.facilities[id][0],
              manual: state.facilities[id][1],
              productionPerSecond: facilityOutputRate(state, id),
            },
          ]),
        ),
        decoder:
          viewRef.current === 'compatibility'
            ? decoderRef.current
            : undefined,
      })
    }
    window.advanceTime = (milliseconds: number) => {
      advance(Math.max(0, milliseconds) / 1_000)
    }

    const handleKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'f') return
      if (document.fullscreenElement) void document.exitFullscreen()
      else void document.documentElement.requestFullscreen()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [advance])

  useEffect(() => {
    if (toast === null) return
    const timer = window.setTimeout(() => setToast(null), 2_200)
    return () => window.clearTimeout(timer)
  }, [toast])

  const chooseView = (item: (typeof NAV_ITEMS)[number]) => {
    if (!item.available) {
      setToast(`${item.label} is part of the next porting plan.`)
      return
    }
    viewRef.current = item.view
    setActiveView(item.view)
    setMenuOpen(false)
  }

  return (
    <main
      className={`app-shell view-${activeView}${menuOpen ? ' menu-open' : ''}`}
    >
      <aside className="side-panel" id="game-menu">
        <h1>Menu</h1>
        <div className="side-menu">
          {SIDE_MENU_ITEMS.map((item) => (
            <button
              type="button"
              key={item.label}
              className={activeView === item.view ? 'active' : ''}
              onClick={() => {
                if (item.view) {
                  chooseView({
                    view: item.view,
                    label: item.label,
                    icon: item.icon,
                    available: item.available,
                  })
                } else {
                  setToast(`${item.label} is not part of the Bot-tab slice yet.`)
                }
              }}
            >
              <img src={item.icon} alt="" aria-hidden="true" />
              <span>{item.label}</span>
              <i aria-hidden="true">{item.available ? '●' : '○'}</i>
            </button>
          ))}
        </div>
      </aside>
      <button
        type="button"
        className="menu-scrim"
        aria-label="Close menu"
        onClick={() => setMenuOpen(false)}
      />

      <div className="game-column">
        <header className="resource-bar">
          <Resource
            icon={cashIcon}
            value={
              <SmoothNumber
                value={game.dyson.money}
                rate={game.dyson.rates.money}
                prefix="$"
              />
            }
            rate={`$${formatGameNumber(game.dyson.rates.money)} /s`}
          />
          <div className="total-bots">
            Total Bots:{' '}
            <strong>
              <SmoothNumber
                value={game.dyson.bots}
                rate={game.dyson.rates.bots}
              />
            </strong>
          </div>
          <Resource
            icon={scienceIcon}
            value={
              <SmoothNumber
                value={game.dyson.science}
                rate={game.dyson.rates.science}
              />
            }
            rate={`${formatGameNumber(game.dyson.rates.science)} /s`}
            align="right"
          />
        </header>

        <section className="game-stage">
          {activeView === 'bots' ? (
            <BotTab
              game={game}
              onChangeDistribution={(value) =>
                commitGame(setBotDistribution(gameRef.current, value))
              }
              onStartTinker={() =>
                commitGame(startTinkering(gameRef.current))
              }
              onChangeBuyMode={(mode) =>
                commitGame(setBotBuyMode(gameRef.current, mode))
              }
              onChangeRounded={(rounded) =>
                commitGame(setRoundedBulkBuy(gameRef.current, rounded))
              }
              onPurchase={(facilityId) => {
                const purchase = purchaseBotFacility(
                  gameRef.current,
                  facilityId,
                )
                commitGame(purchase.state)
                setToast(
                  purchase.result.purchased
                    ? `Built ${purchase.result.quantity.toLocaleString('en-AU')} ${facilityName(facilityId)}.`
                    : purchase.result.status === 'insufficient-funds'
                      ? 'Not enough money yet.'
                      : `Purchase stopped: ${purchase.result.status}.`,
                )
              }}
            />
          ) : (
            <CompatibilityLab
              summary={decoder}
              onSummary={setDecoder}
            />
          )}
        </section>

        <nav className="bottom-nav" aria-label="Game sections">
          <button
            type="button"
            className="menu-opener"
            title="Menu"
            aria-label="Menu"
            aria-controls="game-menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            ☰
          </button>
          {NAV_ITEMS.slice(0, 4).map((item) => (
            <button
              type="button"
              key={item.view}
              className={activeView === item.view ? 'active' : ''}
              aria-label={item.label}
              title={item.label}
              onClick={() => chooseView(item)}
            >
              <img src={item.icon} alt="" aria-hidden="true" />
            </button>
          ))}
        </nav>
      </div>
      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  )
}

function Resource({
  icon,
  value,
  rate,
  align,
}: {
  icon: string
  value: ReactNode
  rate: string
  align?: 'right'
}) {
  return (
    <div className={`resource ${align ?? ''}`}>
      <img className="resource-icon" src={icon} alt="" aria-hidden="true" />
      <span className="resource-values">
        <strong>{value}</strong>
        <small>{rate}</small>
      </span>
    </div>
  )
}

function BotTab({
  game,
  onChangeDistribution,
  onStartTinker,
  onChangeBuyMode,
  onChangeRounded,
  onPurchase,
}: {
  game: BotTabGameState
  onChangeDistribution: (value: number) => void
  onStartTinker: () => void
  onChangeBuyMode: (mode: BuyMode) => void
  onChangeRounded: (rounded: boolean) => void
  onPurchase: (facilityId: BasicDysonFacilityId) => void
}) {
  const state = game.dyson
  const workerPercent = game.botMultitasking
    ? 100
    : Math.round((1 - game.botDistribution) * 100)
  const researcherPercent = game.botMultitasking
    ? 100
    : Math.round(game.botDistribution * 100)
  const tinkerProgress =
    game.tinkerRemainingSeconds === null
      ? 0
      : 1 -
        game.tinkerRemainingSeconds /
          game.tinkerCooldownSeconds
  const activePanels = state.rates.panels * state.panelLifetime
  const visibleFacilities = BASIC_DYSON_FACILITY_IDS.filter((facilityId) =>
    isFacilityVisible(state, facilityId),
  )
  const showTinker =
    state.facilities.assembly_lines[0] +
      state.facilities.assembly_lines[1] <
      10 ||
    state.facilities.ai_managers[1] < 1
  const panelScale = formatPanelScale(activePanels)

  return (
    <div className={`bot-tab ${showTinker ? '' : 'without-tinker'}`}>
      <section className="facility-scroll" aria-label="Bot facilities">
        <div className="facility-list">
          {visibleFacilities.map((facilityId) => (
            <FacilityCard
              key={facilityId}
              facilityId={facilityId}
              state={state}
              onPurchase={() => onPurchase(facilityId)}
            />
          ))}
          {!isFacilityVisible(state, 'planets') && (
            <article className="question-card">
              <strong>????</strong>
            </article>
          )}
        </div>
      </section>

      {showTinker && (
        <TinkerCard
          cooldown={game.tinkerCooldownSeconds}
          remaining={game.tinkerRemainingSeconds}
          progress={tinkerProgress}
          onStart={onStartTinker}
        />
      )}

      <section className="bot-information">
        <div className="distribution-panel">
          <div className="distribution-labels">
            <span>Worker Bots</span>
            <strong>Bot Distribution</strong>
            <span>Science Bots</span>
          </div>
          <div className="distribution-controls">
            <strong>{workerPercent}%</strong>
            <label className="distribution-slider">
              <span className="sr-only">Researcher allocation</span>
              <input
                aria-label="Researcher allocation"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={game.botDistribution}
                disabled={game.botMultitasking}
                onChange={(event) =>
                  onChangeDistribution(Number(event.target.value))
                }
              />
            </label>
            <strong>{researcherPercent}%</strong>
          </div>
        </div>

        <div className="solar-info">
          <div className="info-heading">
            <strong>Info</strong>
            <details className="tab-settings">
              <summary>
                <img src={navSettingsIcon} alt="" aria-hidden="true" />
                Tab Settings
              </summary>
              <div className="settings-popover">
                <strong>Purchase amount</strong>
                <div className="buy-controls" aria-label="Purchase amount">
                  {BUY_MODES.map((mode) => (
                    <button
                      type="button"
                      key={mode.value}
                      className={
                        state.automation.buyMode === mode.value ? 'active' : ''
                      }
                      aria-pressed={state.automation.buyMode === mode.value}
                      onClick={() => onChangeBuyMode(mode.value)}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
                <label className="round-toggle">
                  <input
                    type="checkbox"
                    checked={state.automation.roundedBulkBuy}
                    onChange={(event) => onChangeRounded(event.target.checked)}
                  />
                  <span>Round bulk purchases</span>
                </label>
              </div>
            </details>
          </div>
          <div className="info-values">
            <span>
              {panelScale.label}: <strong>{panelScale.value}</strong>
            </span>
            <span>
              Total panels decayed:{' '}
              <strong>
                <SmoothNumber
                  value={state.panels}
                  rate={state.rates.panels}
                />
              </strong>
            </span>
            <span>
              Panel lifetime: <strong>{formatGameNumber(state.panelLifetime)}</strong> seconds
            </span>
            <span className="goal">{currentGoal(state, activePanels)}</span>
          </div>
        </div>
      </section>

      <div className="assigned-bots">
        <strong>{formatGameNumber(state.workers)}</strong> Worker Bots producing{' '}
        <strong>{formatGameNumber(state.rates.panels)}</strong> Panels /s
      </div>
    </div>
  )
}

function TinkerCard({
  cooldown,
  remaining,
  progress,
  onStart,
}: {
  cooldown: number
  remaining: number | null
  progress: number
  onStart: () => void
}) {
  return (
    <button
      type="button"
      className="tinker-card"
      disabled={remaining !== null}
      onClick={onStart}
    >
      <strong>Tinker in your garage</strong>
      <span>Manually put together a new bot from parts in your shed.</span>
      <span className="tinker-progress" aria-hidden="true">
        <i style={{ width: `${Math.min(100, progress * 100)}%` }} />
        <small>Hold anywhere to repeat...</small>
      </span>
      <em>
        {remaining === null
          ? `${formatGameNumber(cooldown)}s`
          : (
              <SmoothNumber
                value={remaining}
                rate={-1}
                suffix="s"
              />
            )}
      </em>
    </button>
  )
}

function FacilityCard({
  facilityId,
  state,
  onPurchase,
}: {
  facilityId: BasicDysonFacilityId
  state: BotTabGameState['dyson']
  onPurchase: () => void
}) {
  const definition = getGameAsset('GameData.FacilityDefinition', facilityId)
  const displayName =
    typeof definition?.data.displayName === 'string'
      ? definition.data.displayName
      : facilityName(facilityId)
  const description =
    typeof definition?.data.description === 'string'
      ? definition.data.description
      : ''
  const product =
    typeof definition?.data.productionWordUsed === 'string'
      ? definition.data.productionWordUsed
      : 'facility'
  const purchasePrompt =
    typeof definition?.data.purchasePrompt === 'string'
      ? definition.data.purchasePrompt
      : `Purchase ${displayName}`
  const baseCost =
    typeof definition?.data.baseCost === 'number'
      ? definition.data.baseCost
      : Number.MAX_VALUE
  const exponent =
    typeof definition?.data.costExponent === 'number'
      ? definition.data.costExponent
      : Number.MAX_VALUE
  const pair = state.facilities[facilityId]
  const productionRate = facilityOutputRate(state, facilityId)
  const total = pair[0] + pair[1]
  const affordable = maxAffordable(
    state.money,
    baseCost,
    exponent,
    pair[1],
  )
  const quantity = buyModeAmount(
    state.automation.buyMode,
    state.automation.roundedBulkBuy,
    BigInt(Math.floor(pair[1])),
    affordable,
  )
  const cost = buyXCost(quantity, baseCost, exponent, pair[1])
  const canPurchase =
    affordable > 0n &&
    quantity <= affordable &&
    cost > 0 &&
    cost < Number.MAX_VALUE &&
    cost <= state.money

  const progress =
    productionRate > 0 ? pair[0] - Math.floor(pair[0]) : 0

  return (
    <article className="facility-card">
      <div className="facility-copy">
        <div className="facility-title">
          <img src={FACILITY_ICONS[facilityId]} alt="" aria-hidden="true" />
          <h3>
            {displayName}{' '}
            <strong>
              <SmoothNumber
                value={total}
                rate={state.rates[facilityId]}
              />
            </strong>
            <small>({formatGameNumber(pair[1])})</small>
          </h3>
        </div>
        <p>{description}</p>
        <strong className="facility-production">
          {productionRate > 0
            ? formatFacilityProduction(productionRate, product)
            : purchasePrompt}
        </strong>
        <span className="facility-progress" aria-hidden="true">
          <i style={{ width: `${progress * 100}%` }} />
        </span>
      </div>
      <div className="facility-actions">
        <button
          type="button"
          className="purchase-button"
          disabled={!canPurchase}
          onClick={onPurchase}
          aria-label={`Buy ${quantity.toLocaleString('en-AU')} ${displayName} for ${formatGameNumber(cost)}`}
        >
          <small>+{quantity.toLocaleString('en-AU')}</small>
          <strong>${formatGameNumber(cost)}</strong>
        </button>
        <button type="button" className="details-button" title={description}>
          Details
        </button>
      </div>
    </article>
  )
}

function CompatibilityLab({
  summary,
  onSummary,
}: {
  summary: DecoderSummary
  onSummary: (summary: DecoderSummary) => void
}) {
  const decodeText = useCallback(
    (text: string, source: string) => {
      try {
        const decoded = decodeIdb1Save(text)
        const root = decoded.root
        onSummary({
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
        onSummary({
          ...INITIAL_DECODER,
          status: 'failed',
          source,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    },
    [onSummary],
  )

  const loadFixture = async (file: string, label: string) => {
    onSummary({ ...summary, status: 'loading', source: label, error: null })
    try {
      const response = await fetch(`/fixtures/${file}`)
      if (!response.ok) {
        throw new Error(`Fixture request failed: ${response.status}`)
      }
      decodeText(await response.text(), label)
    } catch (error) {
      onSummary({
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
    <section className="compatibility-lab">
      <header className="section-heading">
        <div>
          <p className="eyebrow">Migration tooling</p>
          <h1>Save compatibility lab</h1>
          <p>
            Verify existing Unity <code>IDB1:</code> saves directly in the
            browser.
          </p>
        </div>
      </header>
      <div className={`compatibility-banner ${summary.status}`}>
        <span className="status-light" />
        <div>
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
      <div className="fixture-panel">
        <div>
          <h2>Compatibility fixtures</h2>
          <p>Decode saves already preserved by the Unity test suite.</p>
        </div>
        <div className="fixture-buttons">
          {FIXTURES.map((fixture) => (
            <button
              type="button"
              key={fixture.file}
              onClick={() => void loadFixture(fixture.file, fixture.label)}
            >
              {fixture.label}
            </button>
          ))}
        </div>
      </div>
      <label className="drop-zone">
        <span>Test another existing save</span>
        <small>The file stays inside this local app.</small>
        <input
          type="file"
          accept=".txt,text/plain"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void file.text().then((text) => decodeText(text, file.name))
          }}
        />
      </label>
    </section>
  )
}

function facilityName(id: BasicDysonFacilityId): string {
  return id
    .split('_')
    .map((word) => word[0]!.toUpperCase() + word.slice(1))
    .join(' ')
}

function facilityOutputRate(
  state: BasicDysonState,
  id: BasicDysonFacilityId,
): number {
  switch (id) {
    case 'assembly_lines':
      return state.rates.bots
    case 'ai_managers':
      return state.rates.assembly_lines
    case 'servers':
      return state.rates.ai_managers
    case 'data_centers':
      return state.rates.servers
    case 'planets':
      return state.rates.data_centers
  }
}

function isFacilityVisible(
  state: BasicDysonState,
  id: BasicDysonFacilityId,
): boolean {
  const total = (facilityId: BasicDysonFacilityId) =>
    state.facilities[facilityId][0] + state.facilities[facilityId][1]
  switch (id) {
    case 'assembly_lines':
      return state.bots >= 10 || total('assembly_lines') > 0
    case 'ai_managers':
      return (
        state.facilities.assembly_lines[1] >= 5 ||
        total('ai_managers') > 0
      )
    case 'servers':
      return state.facilities.ai_managers[1] >= 1 || total('servers') > 0
    case 'data_centers':
      return total('servers') >= 1 || total('data_centers') > 0
    case 'planets':
      return total('data_centers') >= 1 || total('planets') > 0
  }
}

function formatPanelScale(activePanels: number): {
  label: string
  value: string
} {
  if (activePanels < 20_000) {
    return {
      label: 'Active panels',
      value: formatGameNumber(activePanels),
    }
  }
  const stars = activePanels / 20_000
  if (stars < 100_000_000_000) {
    return {
      label: 'Stars Surrounded',
      value: formatGameNumber(stars),
    }
  }
  return {
    label: 'Galaxies Engulfed',
    value: formatGameNumber(stars / 100_000_000_000),
  }
}

function currentGoal(
  state: BasicDysonState,
  activePanels: number,
): string {
  if (state.bots < 10) return 'Goal: Create 10 Bots'
  if (state.facilities.assembly_lines[1] < 5) {
    return 'Goal: Build 5 Assembly Lines'
  }
  if (activePanels < 20_000) return 'Goal: Have 20K active Panels'
  const planets =
    state.facilities.planets[0] + state.facilities.planets[1]
  if (planets < 20) return 'Goal: Own 20 Planets'
  if (state.panels < 1_000_000_000_000) {
    return 'Goal: 1T total panels decayed'
  }
  const stars = activePanels / 20_000
  if (stars < 1_000_000_000) return 'Goal: Surround 1B Stars'
  if (stars < 10_000_000_000) return 'Goal: Surround 10B Stars'
  const galaxies = stars / 100_000_000_000
  if (galaxies <= 1) return 'Goal: Engulf a Galaxy'
  if (galaxies <= 10) return 'Goal: Engulf 10 Galaxies'
  if (galaxies <= 100) return 'Goal: Engulf 100 Galaxies'
  return 'Reach 42Qi Bots.'
}

function formatFacilityProduction(rate: number, product: string): string {
  if (rate >= 1) {
    return `${formatGameNumber(rate)} ${product}${rate === 1 ? '' : 's'} /s`
  }
  if (rate > 0) {
    const seconds = 1 / rate
    if (seconds < 60) {
      return `1 ${product} / ${formatGameNumber(seconds)}s`
    }
    return `1 ${product} / ${formatGameNumber(seconds / 60)} Min`
  }
  return ''
}

export default App
