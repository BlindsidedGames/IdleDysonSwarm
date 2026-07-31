import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react'
import { useIntl } from 'react-intl'
import type { CanonicalSkillPresetSlot } from '../../../application/canonicalGameCommands'
import type { CanonicalPlayerCommand } from '../../../application/canonicalPlayerCommands'
import type { SkillPresetState } from '../../../game-state/types'
import {
  defaultSkillPresetColorId,
  SKILL_PRESET_COLOR_IDS,
  type SkillPresetColorId,
} from '../../../game-state/skillPresetColors'
import skillTreePresentationJson from '../../../game-data/generated/skill-tree-presentation.json'
import { localizeSkillPresentation } from '../../../game-data/skillPresentationLocalization'
import type {
  CanonicalSkillAvailabilityPreview,
  CanonicalSkillCatalogPreview,
} from '../../../simulation/canonicalSkillTransactions'
import { Button, StatusFeedback } from '../../components'
import { formatGameNumber } from '../../i18n/formatters'
import type { EnabledLocale } from '../../i18n/localeRegistry'
import type { UiRuntimePlayerCommandResult } from '../../runtime'
import {
  SkillDetailsDialog,
  type SkillDetailsPalette,
} from './SkillDetailsDialog'
import { skillMessages as messages } from './messages'
import {
  skillPresetColorStyle,
} from './presetColors'
import { buildTaperedSkillConnectorPath } from './skillConnectorGeometry'
import { rankSkillSearchResults } from './skillSearch'
import './skills.css'

type SkillCommand = Extract<
  CanonicalPlayerCommand,
  { readonly kind: `skill.${string}` }
>

interface PendingExpectation {
  readonly beforeSignature: string
  readonly skillId?: string
  readonly expectedOwned?: boolean
  readonly closeDetails?: boolean
  readonly expectedPresetSlot?: CanonicalSkillPresetSlot
}

interface SkillPresentationNode {
  readonly skillId: string
  readonly legacySkillKey: number
  readonly x: number
  readonly y: number
  readonly displayName: string
  readonly description: string
  readonly technicalDescription: string
  readonly cost: number
  readonly messageIds: {
    readonly displayName: string
    readonly description: string
    readonly technicalDescription: string
  }
  readonly icon: {
    readonly fileName: string
  }
}

interface SkillTreePresentation {
  readonly formatVersion: number
  readonly nodeCount: number
  readonly nodes: readonly SkillPresentationNode[]
}

export interface SkillCommandAvailability {
  readonly purchase: boolean
  readonly refund: boolean
  readonly selectPreset: boolean
  readonly setPresetColor: boolean
  readonly setAutoAssignNonRefundable: boolean
  readonly reset: boolean
}

export interface SkillPresetQueueChangeRequest {
  readonly slot: CanonicalSkillPresetSlot
  readonly skillId: string
  readonly included: boolean
}

export interface SkillPresetQueueChangePreview {
  readonly affectedSkillIds: readonly string[]
  readonly confirmationRequired: boolean
}

export interface SkillPresetImportPreview {
  readonly name: string
  readonly queuedSkillCount: number
  readonly workerPercent: number
  readonly colorId: SkillPresetColorId
}

/**
 * Canonical preset operations consumed by the Skills UI. Implementations own
 * dependency closure, cascading removals, transfer validation and atomic
 * replacement; this surface only presents published previews and outcomes.
 */
export interface SkillPresetActions {
  readonly previewQueueChange: (
    request: SkillPresetQueueChangeRequest,
  ) => Promise<SkillPresetQueueChangePreview>
  readonly applyQueueChange: (
    request: SkillPresetQueueChangeRequest,
  ) => Promise<boolean>
  readonly exportPreset: (
    slot: CanonicalSkillPresetSlot,
  ) => Promise<string>
  readonly previewImportPreset: (
    slot: CanonicalSkillPresetSlot,
    text: string,
  ) => Promise<SkillPresetImportPreview>
  readonly importPreset: (
    slot: CanonicalSkillPresetSlot,
    text: string,
  ) => Promise<boolean>
}

export interface SkillsSurfaceProps {
  readonly locale: EnabledLocale
  readonly points: bigint
  readonly fragments: bigint
  readonly catalog: CanonicalSkillCatalogPreview
  readonly presets: readonly SkillPresetState[]
  readonly selectedPresetSlot: CanonicalSkillPresetSlot
  readonly botDistribution: number
  readonly autoAssignNonRefundable: boolean
  readonly commandAvailability: SkillCommandAvailability
  readonly presetActions?: SkillPresetActions
  readonly dispatchPlayer: (
    command: SkillCommand,
  ) => Promise<UiRuntimePlayerCommandResult>
}

const presentation =
  skillTreePresentationJson as SkillTreePresentation
const iconModules = import.meta.glob('../../assets/skill-icons/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>
const iconByFileName = new Map(
  Object.entries(iconModules).map(([path, url]) => [
    path.slice(path.lastIndexOf('/') + 1),
    url,
  ]),
)

const PRESET_COLOR_MESSAGES = {
  cyan: messages.presetColorCyan,
  orange: messages.presetColorOrange,
  gold: messages.presetColorGold,
  rose: messages.presetColorRose,
  pink: messages.presetColorPink,
} as const
const NODE_SIZE = 76
const GRAPH_PADDING = 180
const MIN_SCALE = 0.4
const MAX_SCALE = 1.5
const DEFAULT_SCALE = 0.8

const minX =
  Math.min(...presentation.nodes.map((node) => node.x)) -
  GRAPH_PADDING
const maxX =
  Math.max(...presentation.nodes.map((node) => node.x)) +
  GRAPH_PADDING
const minY =
  Math.min(...presentation.nodes.map((node) => node.y)) -
  GRAPH_PADDING
const maxY =
  Math.max(...presentation.nodes.map((node) => node.y)) +
  GRAPH_PADDING
const graphWidth = maxX - minX
const graphHeight = maxY - minY

function graphPosition(node: SkillPresentationNode) {
  return {
    x: node.x - minX,
    y: maxY - node.y,
  }
}

/**
 * Presents the authored Unity skill graph and dispatches only canonical Skill
 * commands. Layout, copy and icons are presentation exports; rule state comes
 * exclusively from the supplied canonical catalog.
 */
export function SkillsSurface({
  locale,
  points,
  fragments,
  catalog,
  presets,
  selectedPresetSlot,
  botDistribution,
  autoAssignNonRefundable,
  commandAvailability,
  presetActions,
  dispatchPlayer,
}: SkillsSurfaceProps) {
  const intl = useIntl()
  const searchId = useId()
  const searchStatusId = useId()
  const settingsId = useId()
  const [query, setQuery] = useState('')
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(
    null,
  )
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [pendingKind, setPendingKind] = useState<string | null>(null)
  const [pendingExpectation, setPendingExpectation] =
    useState<PendingExpectation | null>(null)
  const [failed, setFailed] = useState(false)
  const pendingRef = useRef(false)
  const focusNodeRef = useRef<(skillId: string) => void>(() => undefined)
  const previewById = useMemo(
    () => new Map(catalog.skills.map((skill) => [skill.skillId, skill])),
    [catalog.skills],
  )
  const localizedNodes = useMemo(
    () =>
      presentation.nodes.map((node) =>
        localizeSkillPresentation(intl, node),
      ),
    [intl],
  )
  const nodeById = useMemo(
    () => new Map(localizedNodes.map((node) => [node.skillId, node])),
    [localizedNodes],
  )
  const visibleNodes = useMemo(
    () =>
      localizedNodes.filter(
        (node) => previewById.get(node.skillId)?.visible === true,
      ),
    [localizedNodes, previewById],
  )
  const normalizedQuery = query.trim().toLocaleLowerCase(locale)
  const rankedMatchingIds = useMemo(
    () =>
      rankSkillSearchResults(visibleNodes, query, locale).map(
        (node) => node.skillId,
      ),
    [locale, query, visibleNodes],
  )
  const matchingIds = useMemo(() => {
    return new Set(rankedMatchingIds)
  }, [rankedMatchingIds])
  const selectedNode =
    selectedSkillId === null ? undefined : nodeById.get(selectedSkillId)
  const selectedPreview =
    selectedSkillId === null ? undefined : previewById.get(selectedSkillId)
  const skillSignature = [
    String(points),
    String(fragments),
    String(botDistribution),
    String(autoAssignNonRefundable),
    String(selectedPresetSlot),
    catalog.skills
      .map(
        (skill) =>
          `${skill.skillId}:${Number(skill.owned)}:${Number(skill.queued)}`,
      )
      .join('|'),
    presets
      .map(
        (preset) =>
          `${preset.name}:${preset.colorId}:${preset.botDistribution}:${preset.skillIds.join(',')}`,
      )
      .join('|'),
  ].join('::')

  const releasePendingLock = useCallback(() => {
    pendingRef.current = false
    setPendingKind(null)
  }, [])

  const clearPending = useCallback(() => {
    releasePendingLock()
    setPendingExpectation(null)
  }, [releasePendingLock])

  const dispatch = useCallback(
    async (
      command: SkillCommand,
      expectation: Omit<PendingExpectation, 'beforeSignature'> = {},
    ): Promise<boolean> => {
      if (pendingRef.current) return false
      pendingRef.current = true
      setPendingKind(command.kind)
      setPendingExpectation({
        beforeSignature: skillSignature,
        ...expectation,
      })
      setFailed(false)
      try {
        const result = await dispatchPlayer(command)
        const accepted =
          result.status === 'accepted' &&
          result.kind === 'transition'
        setFailed(!accepted)
        if (!accepted || !result.changed) {
          clearPending()
        } else {
          releasePendingLock()
          if (!expectation.closeDetails) {
            setPendingExpectation(null)
          }
        }
        return accepted
      } catch {
        setFailed(true)
        clearPending()
        return false
      }
    },
    [
      clearPending,
      dispatchPlayer,
      releasePendingLock,
      skillSignature,
    ],
  )

  useEffect(() => {
    if (pendingExpectation === null) return
    if (
      pendingExpectation.skillId !== undefined &&
      pendingExpectation.expectedOwned !== undefined
    ) {
      const skill = previewById.get(pendingExpectation.skillId)
      if (skill?.owned !== pendingExpectation.expectedOwned) return
      if (pendingExpectation.closeDetails) setSelectedSkillId(null)
      clearPending()
      return
    }
    if (pendingExpectation.expectedPresetSlot !== undefined) {
      if (
        selectedPresetSlot !==
        pendingExpectation.expectedPresetSlot
      ) {
        return
      }
      clearPending()
      return
    }
    if (skillSignature !== pendingExpectation.beforeSignature) {
      clearPending()
    }
  }, [
    clearPending,
    pendingExpectation,
    previewById,
    selectedPresetSlot,
    skillSignature,
  ])

  if (!catalog.complete) {
    return (
      <StatusFeedback tone="error">
        {catalog.definitionGap ?? intl.formatMessage(messages.unavailable)}
      </StatusFeedback>
    )
  }

  return (
    <section
      className="skills-surface"
      aria-label={intl.formatMessage(messages.region)}
    >
      <header className="skills-surface__toolbar">
        <div className="skills-surface__resources">
          <strong>
            {intl.formatMessage(messages.points, {
              value: formatGameNumber(locale, points),
            })}
          </strong>
        </div>
        <div className="skills-surface__search">
          <label
            htmlFor={searchId}
            className="skills-surface__visually-hidden"
          >
            {intl.formatMessage(messages.search)}
          </label>
          <input
            id={searchId}
            type="search"
            value={query}
            placeholder={intl.formatMessage(messages.searchPlaceholder)}
            aria-describedby={
              normalizedQuery.length > 0 ? searchStatusId : undefined
            }
            onChange={(event) => setQuery(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return
              const first = rankedMatchingIds[0]
              if (typeof first === 'string') {
                focusNodeRef.current(first)
                setSelectedSkillId(first)
              }
            }}
          />
          {normalizedQuery.length > 0 && (
            <span id={searchStatusId} aria-live="polite">
              {intl.formatMessage(messages.matches, {
                count: matchingIds.size,
              })}
            </span>
          )}
        </div>
        <button
          type="button"
          className="skills-surface__settings"
          aria-label={intl.formatMessage(messages.settings)}
          aria-expanded={settingsOpen}
          aria-controls={settingsId}
          onClick={() => setSettingsOpen((open) => !open)}
        >
          <span aria-hidden="true">⚙</span>
        </button>
      </header>

      {failed && (
        <StatusFeedback
          tone="error"
          className="skills-surface__feedback"
        >
          {intl.formatMessage(messages.actionFailed)}
        </StatusFeedback>
      )}

      {settingsOpen ? (
        <SkillSettings
          id={settingsId}
          presets={presets}
          selectedPresetSlot={selectedPresetSlot}
          autoAssignNonRefundable={autoAssignNonRefundable}
          commandAvailability={commandAvailability}
          presetActions={presetActions}
          pendingKind={pendingKind}
          dispatch={dispatch}
        />
      ) : (
        <SkillTreeViewport
          nodes={visibleNodes}
          previews={previewById}
          nodeById={nodeById}
          selectedSkillId={selectedSkillId}
          matchingIds={matchingIds}
          searchActive={normalizedQuery.length > 0}
          presetColorId={
            presets[selectedPresetSlot - 1]?.colorId ??
            defaultSkillPresetColorId(selectedPresetSlot)
          }
          onSelect={setSelectedSkillId}
          registerFocus={(focus) => {
            focusNodeRef.current = focus
          }}
        />
      )}

      {selectedNode && selectedPreview && (
        <SkillDetails
          locale={locale}
          fragments={fragments}
          node={selectedNode}
          preview={selectedPreview}
          previews={previewById}
          nodeById={nodeById}
          commandAvailability={commandAvailability}
          selectedPresetSlot={selectedPresetSlot}
          selectedPresetName={
            presets[selectedPresetSlot - 1]?.name ??
            `Preset ${selectedPresetSlot}`
          }
          presetActions={presetActions}
          pendingKind={pendingKind}
          onClose={() => setSelectedSkillId(null)}
          dispatch={dispatch}
        />
      )}
    </section>
  )
}

interface SkillTreeViewportProps {
  readonly nodes: readonly SkillPresentationNode[]
  readonly previews: ReadonlyMap<string, CanonicalSkillAvailabilityPreview>
  readonly nodeById: ReadonlyMap<string, SkillPresentationNode>
  readonly selectedSkillId: string | null
  readonly matchingIds: ReadonlySet<string>
  readonly searchActive: boolean
  readonly presetColorId: SkillPresetColorId
  readonly onSelect: (skillId: string) => void
  readonly registerFocus: (focus: (skillId: string) => void) => void
}

function SkillTreeViewport({
  nodes,
  previews,
  nodeById,
  selectedSkillId,
  matchingIds,
  searchActive,
  presetColorId,
  onSelect,
  registerFocus,
}: SkillTreeViewportProps) {
  const intl = useIntl()
  const instructionsId = useId()
  const viewportRef = useRef<HTMLDivElement>(null)
  const nodeRefs = useRef(new Map<string, HTMLButtonElement>())
  const pointers = useRef(
    new Map<
      number,
      { x: number; y: number; startX: number; startY: number }
    >(),
  )
  const gesture = useRef({
    startDistance: 0,
    startScale: DEFAULT_SCALE,
  })
  const [transform, setTransform] = useState({
    x: 0,
    y: 0,
    scale: DEFAULT_SCALE,
  })
  const initialized = useRef(false)
  const viewportSize = useRef({ width: 0, height: 0 })
  const startNode =
    nodeById.get('startHereTree') ?? presentation.nodes[0]

  const centreOn = useCallback(
    (skillId: string, focus = true) => {
      const viewport = viewportRef.current
      const node = nodeById.get(skillId)
      if (!viewport || !node) return
      const position = graphPosition(node)
      const bounds = viewport.getBoundingClientRect()
      setTransform((current) => ({
        ...current,
        x: bounds.width / 2 - position.x * current.scale,
        y: bounds.height / 2 - position.y * current.scale,
      }))
      if (focus) {
        requestAnimationFrame(() =>
          nodeRefs.current.get(skillId)?.focus({ preventScroll: true }),
        )
      }
    },
    [nodeById],
  )

  useLayoutEffect(() => {
    if (initialized.current || !startNode) return
    initialized.current = true
    centreOn(startNode.skillId, false)
  }, [centreOn, startNode])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport || typeof ResizeObserver === 'undefined') return
    const initial = viewport.getBoundingClientRect()
    viewportSize.current = {
      width: initial.width,
      height: initial.height,
    }
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      const previous = viewportSize.current
      const next = {
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      }
      viewportSize.current = next
      if (previous.width === 0 || previous.height === 0) return
      setTransform((current) => ({
        ...current,
        x: current.x + (next.width - previous.width) / 2,
        y: current.y + (next.height - previous.height) / 2,
      }))
    })
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    registerFocus((skillId) => centreOn(skillId))
  }, [centreOn, registerFocus])

  const zoomAt = useCallback(
    (nextScale: number, clientX?: number, clientY?: number) => {
      const viewport = viewportRef.current
      if (!viewport) return
      const bounds = viewport.getBoundingClientRect()
      const anchorX =
        clientX === undefined ? bounds.width / 2 : clientX - bounds.left
      const anchorY =
        clientY === undefined ? bounds.height / 2 : clientY - bounds.top
      setTransform((current) => {
        const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, nextScale))
        const graphX = (anchorX - current.x) / current.scale
        const graphY = (anchorY - current.y) / current.scale
        return {
          scale,
          x: anchorX - graphX * scale,
          y: anchorY - graphY * scale,
        }
      })
    },
    [],
  )

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (
      event.target instanceof Element &&
      event.target.closest(
        'button, input, select, textarea, a, [role="button"]',
      )
    ) {
      return
    }
    event.currentTarget.setPointerCapture?.(event.pointerId)
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
      startX: event.clientX,
      startY: event.clientY,
    })
    if (pointers.current.size === 2) {
      const [first, second] = [...pointers.current.values()]
      gesture.current.startDistance = Math.hypot(
        second.x - first.x,
        second.y - first.y,
      )
      gesture.current.startScale = transform.scale
    }
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const previous = pointers.current.get(event.pointerId)
    if (!previous) return
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
      startX: previous.startX,
      startY: previous.startY,
    })
    if (pointers.current.size === 1) {
      setTransform((current) => ({
        ...current,
        x: current.x + event.clientX - previous.x,
        y: current.y + event.clientY - previous.y,
      }))
      return
    }
    const [first, second] = [...pointers.current.values()]
    const distance = Math.hypot(
      second.x - first.x,
      second.y - first.y,
    )
    if (gesture.current.startDistance > 0) {
      zoomAt(
        gesture.current.startScale *
          (distance / gesture.current.startDistance),
        (first.x + second.x) / 2,
        (first.y + second.y) / 2,
      )
    }
  }

  const releasePointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId)
    if (pointers.current.size < 2) gesture.current.startDistance = 0
  }

  const connectors = nodes.flatMap((node) => {
    const preview = previews.get(node.skillId)
    if (!preview) return []
    return preview.requiredSkillIds.flatMap((requiredId) => {
      const required = nodeById.get(requiredId)
      const requiredPreview = previews.get(requiredId)
      if (!required || requiredPreview?.visible !== true) return []
      return [{ from: required, to: node }]
    })
  })
  const selectedPreview =
    selectedSkillId === null ? undefined : previews.get(selectedSkillId)
  const selectedRequiredIds = new Set(
    selectedPreview?.requiredSkillIds ?? [],
  )
  const hasSelection = selectedPreview !== undefined

  return (
    <div
      ref={viewportRef}
      className="skill-tree-viewport"
      role="region"
      aria-label={intl.formatMessage(messages.tree)}
      aria-describedby={instructionsId}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={releasePointer}
      onPointerCancel={releasePointer}
      onLostPointerCapture={releasePointer}
      onWheel={(event: ReactWheelEvent<HTMLDivElement>) => {
        event.preventDefault()
        zoomAt(
          transform.scale * (event.deltaY < 0 ? 1.1 : 0.9),
          event.clientX,
          event.clientY,
        )
      }}
    >
      <p
        id={instructionsId}
        className="skills-surface__visually-hidden"
      >
        {intl.formatMessage(messages.treeInstructions)}
      </p>
      <div
        className="skill-tree-viewport__canvas"
        style={{
          width: graphWidth,
          height: graphHeight,
          transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`,
          ...skillPresetColorStyle(presetColorId),
        }}
      >
        <svg
          className="skill-tree-viewport__connections"
          width={graphWidth}
          height={graphHeight}
          aria-hidden="true"
        >
          {connectors.map(({ from, to }) => {
            const start = graphPosition(from)
            const end = graphPosition(to)
            const deltaX = end.x - start.x
            const deltaY = end.y - start.y
            const distance = Math.hypot(deltaX, deltaY) || 1
            const nodeEdge = NODE_SIZE / 2 + 3
            const startX = start.x + (deltaX / distance) * nodeEdge
            const startY = start.y + (deltaY / distance) * nodeEdge
            const endX = end.x - (deltaX / distance) * nodeEdge
            const endY = end.y - (deltaY / distance) * nodeEdge
            const sourcePreview = previews.get(from.skillId)
            const targetPreview = previews.get(to.skillId)
            const selectedPath = to.skillId === selectedSkillId
            const sourceOwned = sourcePreview?.owned === true
            const targetOwned = targetPreview?.owned === true
            const sharedAttributes = {
              'data-owned': sourceOwned && targetOwned,
              'data-source-owned': sourceOwned || undefined,
              'data-state': targetPreview?.visualState,
              'data-queued':
                (targetPreview?.queued && !targetOwned) || undefined,
              'data-available':
                targetPreview?.purchase.eligible || undefined,
              'data-selected-path': selectedPath || undefined,
              'data-selection-dimmed':
                hasSelection && !selectedPath ? true : undefined,
            } as const
            if (!sourceOwned) {
              return (
                <path
                  key={`${from.skillId}-${to.skillId}`}
                  className="skill-tree-connection skill-tree-connection--unmet"
                  d={buildTaperedSkillConnectorPath(
                    { x: startX, y: startY },
                    { x: endX, y: endY },
                    { width: selectedPath ? 7 : 6 },
                  )}
                  {...sharedAttributes}
                />
              )
            }
            return (
              <line
                key={`${from.skillId}-${to.skillId}`}
                className="skill-tree-connection skill-tree-connection--met"
                x1={startX}
                y1={startY}
                x2={endX}
                y2={endY}
                {...sharedAttributes}
              />
            )
          })}
        </svg>
        {nodes.map((node) => {
          const preview = previews.get(node.skillId)
          if (!preview) return null
          const position = graphPosition(node)
          const matched = matchingIds.has(node.skillId)
          const requiredCount = preview.requiredSkillIds.length
          const completedRequirementCount =
            preview.requiredSkillIds.filter(
              (requiredId) => previews.get(requiredId)?.owned,
            ).length
          const selected = node.skillId === selectedSkillId
          const selectionRelated =
            selected || selectedRequiredIds.has(node.skillId)
          return (
            <button
              key={node.skillId}
              ref={(element) => {
                if (element) nodeRefs.current.set(node.skillId, element)
                else nodeRefs.current.delete(node.skillId)
              }}
              type="button"
              className="skill-tree-node"
              data-state={preview.visualState}
              data-affordable={preview.purchase.eligible || undefined}
              data-owned={preview.owned || undefined}
              data-queued={preview.queued || undefined}
              data-match={matched || undefined}
              data-dimmed={searchActive && !matched ? true : undefined}
              data-selected={selected || undefined}
              data-selection-related={selectionRelated || undefined}
              data-selection-dimmed={
                hasSelection && !selectionRelated ? true : undefined
              }
              aria-label={[
                node.displayName,
                preview.owned
                  ? intl.formatMessage(messages.owned)
                  : intl.formatMessage(messages.cost, {
                      value: node.cost,
                    }),
                preview.queued
                  ? intl.formatMessage(messages.queued)
                  : null,
                !preview.owned && !preview.purchase.eligible
                  ? intl.formatMessage(messages.unavailable)
                  : null,
              ]
                .filter(Boolean)
                .join('. ')}
              style={{
                left: position.x - NODE_SIZE / 2,
                top: position.y - NODE_SIZE / 2,
              }}
              onClick={() => onSelect(node.skillId)}
            >
              <img
                src={iconByFileName.get(node.icon.fileName)}
                alt=""
                draggable="false"
              />
              <span className="skill-tree-node__cost">{node.cost}</span>
              {preview.queued && (
                <i
                  className="skill-tree-node__queue"
                  aria-label={intl.formatMessage(messages.queued)}
                  title={intl.formatMessage(messages.queued)}
                >
                  +
                </i>
              )}
              {!preview.owned && requiredCount > 1 && (
                <span
                  className="skill-tree-node__requirements"
                  data-progress={
                    completedRequirementCount === requiredCount
                      ? 'complete'
                      : completedRequirementCount > 0
                        ? 'partial'
                        : 'none'
                  }
                  aria-label={intl.formatMessage(
                    messages.requirementsProgress,
                    {
                      complete: completedRequirementCount,
                      total: requiredCount,
                    },
                  )}
                >
                  {completedRequirementCount}/{requiredCount}
                </span>
              )}
            </button>
          )
        })}
      </div>
      <div className="skill-tree-viewport__controls">
        <button
          type="button"
          aria-label={intl.formatMessage(messages.zoomOut)}
          onClick={() => zoomAt(transform.scale - 0.1)}
        >
          −
        </button>
        <button
          type="button"
          aria-label={intl.formatMessage(messages.centreTree)}
          onClick={() => startNode && centreOn(startNode.skillId, false)}
        >
          ◎
        </button>
        <button
          type="button"
          aria-label={intl.formatMessage(messages.zoomIn)}
          onClick={() => zoomAt(transform.scale + 0.1)}
        >
          +
        </button>
      </div>
    </div>
  )
}

interface SkillDetailsProps {
  readonly locale: EnabledLocale
  readonly fragments: bigint
  readonly node: SkillPresentationNode
  readonly preview: CanonicalSkillAvailabilityPreview
  readonly previews: ReadonlyMap<string, CanonicalSkillAvailabilityPreview>
  readonly nodeById: ReadonlyMap<string, SkillPresentationNode>
  readonly commandAvailability: SkillCommandAvailability
  readonly selectedPresetSlot: CanonicalSkillPresetSlot
  readonly selectedPresetName: string
  readonly presetActions?: SkillPresetActions
  readonly pendingKind: string | null
  readonly onClose: () => void
  readonly dispatch: (
    command: SkillCommand,
    expectation?: Omit<PendingExpectation, 'beforeSignature'>,
  ) => Promise<boolean>
}

function SkillDetails({
  locale,
  fragments,
  node,
  preview,
  previews,
  nodeById,
  commandAvailability,
  selectedPresetSlot,
  selectedPresetName,
  presetActions,
  pendingKind,
  onClose,
  dispatch,
}: SkillDetailsProps) {
  const intl = useIntl()
  const [queuePreview, setQueuePreview] = useState<{
    readonly request: SkillPresetQueueChangeRequest
    readonly affectedSkillIds: readonly string[]
  } | null>(null)
  const [queuePending, setQueuePending] = useState(false)
  const [queueFailed, setQueueFailed] = useState(false)
  const names = (ids: readonly string[]) =>
    ids
      .map((id) => nodeById.get(id)?.displayName ?? id)
      .join(', ')
  const canPurchase =
    commandAvailability.purchase && preview.purchase.eligible
  const canRefund = commandAvailability.refund && preview.refund.eligible
  const palette: SkillDetailsPalette =
    preview.visualState.startsWith('non-refundable')
      ? 'non-refundable'
      : preview.fragment
        ? 'fragment'
        : 'normal'
  const fragmentDelta = preview.owned ? -1 : 1
  const completedRequirementIds = preview.requiredSkillIds.filter(
    (skillId) => previews.get(skillId)?.owned,
  )
  const missingRequirementIds = preview.requiredSkillIds.filter(
    (skillId) => !previews.get(skillId)?.owned,
  )
  const applyQueueChange = async (
    request: SkillPresetQueueChangeRequest,
  ) => {
    if (presetActions === undefined || queuePending) return
    setQueuePending(true)
    setQueueFailed(false)
    try {
      const changed = await presetActions.applyQueueChange(request)
      setQueueFailed(!changed)
      if (changed) setQueuePreview(null)
    } catch {
      setQueueFailed(true)
    } finally {
      setQueuePending(false)
    }
  }
  const requestQueueChange = async (included: boolean) => {
    if (presetActions === undefined || queuePending) return
    const request = {
      slot: selectedPresetSlot,
      skillId: node.skillId,
      included,
    } satisfies SkillPresetQueueChangeRequest
    setQueuePending(true)
    setQueueFailed(false)
    try {
      const result = await presetActions.previewQueueChange(request)
      if (result.confirmationRequired) {
        setQueuePreview({
          request,
          affectedSkillIds: result.affectedSkillIds,
        })
      } else {
        setQueuePending(false)
        await applyQueueChange(request)
        return
      }
    } catch {
      setQueueFailed(true)
    } finally {
      setQueuePending(false)
    }
  }

  return (
    <SkillDetailsDialog
      title={node.displayName}
      closeLabel={intl.formatMessage(messages.close)}
      palette={palette}
      onClose={onClose}
    >
      <div
        className="skill-details"
        data-state={preview.visualState}
      >
        <div className="skill-details__intro">
          <img
            src={iconByFileName.get(node.icon.fileName)}
            alt=""
            className="skill-details__icon"
          />
          <p className="skill-details__description">
            {node.description}
          </p>
        </div>
        <p className="skill-details__technical">
          <strong>{intl.formatMessage(messages.effect)}</strong>{' '}
          {node.technicalDescription}
        </p>
        <div className="skill-details__metadata">
          <strong>
            {intl.formatMessage(messages.cost, {
              value: formatGameNumber(locale, preview.cost),
            })}
          </strong>
          {preview.requiredSkillIds.length > 0 && (
            <p className="skill-details__requirements">
              <strong>
                {intl.formatMessage(messages.requirementsProgress, {
                  complete: completedRequirementIds.length,
                  total: preview.requiredSkillIds.length,
                })}
              </strong>
              {missingRequirementIds.length > 0 && (
                <span>
                  {intl.formatMessage(messages.missingRequirements, {
                    names: names(missingRequirementIds),
                  })}
                </span>
              )}
            </p>
          )}
          {preview.fragment && (
            <p className="skill-details__fragments">
              {intl.formatMessage(messages.fragmentsContext, {
                value: formatGameNumber(locale, fragments),
                delta:
                  fragmentDelta > 0
                    ? `+${fragmentDelta}`
                    : String(fragmentDelta),
              })}
            </p>
          )}
          {preview.owned && <p>{intl.formatMessage(messages.owned)}</p>}
          {preview.queued && <p>{intl.formatMessage(messages.queued)}</p>}
          {preview.exclusiveWithSkillIds.length > 0 && (
            <p>
              {intl.formatMessage(messages.exclusive, {
                names: names(preview.exclusiveWithSkillIds),
              })}
            </p>
          )}
        </div>
        <div className="skill-details__actions">
          <label className="skill-details__preset-toggle">
            <input
              type="checkbox"
              checked={preview.queued}
              disabled={presetActions === undefined || queuePending}
              onChange={(event) =>
                void requestQueueChange(event.currentTarget.checked)
              }
            />
            <span>
              {intl.formatMessage(messages.includedInPreset, {
                name: selectedPresetName,
              })}
            </span>
          </label>
          {!preview.owned ? (
            <Button
              variant="primary"
              state={
                pendingKind === 'skill.purchase' ? 'pending' : 'idle'
              }
              disabled={!canPurchase}
              onClick={() => {
                void dispatch(
                  {
                    kind: 'skill.purchase',
                    skillId: node.skillId,
                  },
                  {
                    skillId: node.skillId,
                    expectedOwned: true,
                    closeDetails: true,
                  },
                )
              }}
            >
              {intl.formatMessage(messages.purchase)}
            </Button>
          ) : (
            <Button
              variant="danger"
              state={
                pendingKind === 'skill.refund' ? 'pending' : 'idle'
              }
              disabled={!canRefund}
              onClick={() => {
                void dispatch(
                  {
                    kind: 'skill.refund',
                    skillId: node.skillId,
                  },
                  {
                    skillId: node.skillId,
                    expectedOwned: false,
                    closeDetails: true,
                  },
                )
              }}
            >
              {intl.formatMessage(messages.refund)}
            </Button>
          )}
          {queuePreview && (
            <div
              className="skill-confirmation skill-details__queue-confirmation"
              role="group"
              aria-label={intl.formatMessage(
                messages.confirmPresetChange,
              )}
            >
              <p>
                {intl.formatMessage(
                  queuePreview.request.included
                    ? messages.includeDependencies
                    : messages.removeDependants,
                )}
              </p>
              <ul
                className="skill-details__affected-skills"
                aria-label={intl.formatMessage(
                  messages.affectedSkills,
                )}
              >
                {queuePreview.affectedSkillIds
                  .filter((skillId) => skillId !== node.skillId)
                  .map((skillId) => {
                    const affectedNode = nodeById.get(skillId)
                    return (
                      <li key={skillId}>
                        {affectedNode && (
                          <img
                            src={iconByFileName.get(
                              affectedNode.icon.fileName,
                            )}
                            alt=""
                          />
                        )}
                        <span>
                          {affectedNode?.displayName ?? skillId}
                        </span>
                      </li>
                    )
                  })}
              </ul>
              <Button
                variant="primary"
                state={queuePending ? 'pending' : 'idle'}
                onClick={() =>
                  void applyQueueChange(queuePreview.request)
                }
              >
                {intl.formatMessage(messages.confirm)}
              </Button>
              <Button
                disabled={queuePending}
                onClick={() => setQueuePreview(null)}
              >
                {intl.formatMessage(messages.cancel)}
              </Button>
            </div>
          )}
          {queueFailed && (
            <StatusFeedback tone="error">
              {intl.formatMessage(messages.presetChangeFailed)}
            </StatusFeedback>
          )}
        </div>
      </div>
    </SkillDetailsDialog>
  )
}

interface SkillSettingsProps {
  readonly id: string
  readonly presets: SkillsSurfaceProps['presets']
  readonly selectedPresetSlot: CanonicalSkillPresetSlot
  readonly autoAssignNonRefundable: boolean
  readonly commandAvailability: SkillCommandAvailability
  readonly presetActions?: SkillPresetActions
  readonly pendingKind: string | null
  readonly dispatch: (
    command: SkillCommand,
    expectation?: Omit<PendingExpectation, 'beforeSignature'>,
  ) => Promise<boolean>
}

function SkillSettings({
  id,
  presets,
  selectedPresetSlot,
  autoAssignNonRefundable,
  commandAvailability,
  presetActions,
  pendingKind,
  dispatch,
}: SkillSettingsProps) {
  const intl = useIntl()
  const confirmId = useId()
  const [confirmReset, setConfirmReset] = useState(false)
  const [managedSlot, setManagedSlot] =
    useState<CanonicalSkillPresetSlot | null>(null)

  return (
    <div id={id} className="skill-settings">
      <section>
        <h2>{intl.formatMessage(messages.presets)}</h2>
        <div className="skill-settings__presets">
          {presets.slice(0, 5).map((preset, index) => {
            const slot = (index + 1) as CanonicalSkillPresetSlot
            const workers = Math.round((1 - preset.botDistribution) * 100)
            return (
              <div
                key={slot}
                className="skill-settings__preset-row"
                data-current={selectedPresetSlot === slot || undefined}
                style={skillPresetColorStyle(preset.colorId)}
              >
                <button
                  type="button"
                  className="skill-settings__preset-load"
                  disabled={
                    !commandAvailability.selectPreset ||
                    pendingKind === 'skill.select-preset'
                  }
                  aria-pressed={selectedPresetSlot === slot}
                  onClick={() =>
                    void dispatch(
                      {
                        kind: 'skill.select-preset',
                        slot,
                      },
                      selectedPresetSlot === slot
                        ? {}
                        : { expectedPresetSlot: slot },
                    )
                  }
                >
                  <strong>
                    <span
                      className="skill-preset-color-swatch"
                      aria-hidden="true"
                    />
                    {intl.formatMessage(messages.loadPreset, {
                      name: preset.name,
                    })}
                  </strong>
                  {selectedPresetSlot === slot && (
                    <em className="skill-settings__current">
                      {intl.formatMessage(messages.currentPreset)}
                    </em>
                  )}
                  <PresetSummary
                    count={preset.skillIds.length}
                    workers={workers}
                  />
                </button>
                <button
                  type="button"
                  className="skill-settings__preset-manage"
                  aria-label={intl.formatMessage(
                    messages.managePreset,
                    { name: preset.name },
                  )}
                  onClick={() => setManagedSlot(slot)}
                >
                  <span aria-hidden="true">⋯</span>
                </button>
              </div>
            )
          })}
        </div>
      </section>
      <label className="skill-settings__toggle">
        <input
          type="checkbox"
          checked={autoAssignNonRefundable}
          disabled={
            !commandAvailability.setAutoAssignNonRefundable ||
            pendingKind ===
              'skill.set-auto-assign-non-refundable'
          }
          onChange={(event) =>
            void dispatch({
              kind: 'skill.set-auto-assign-non-refundable',
              enabled: event.currentTarget.checked,
            })
          }
        />
        <span>{intl.formatMessage(messages.nonRefundable)}</span>
      </label>
      <section className="skill-settings__reset">
        {!confirmReset ? (
          <Button
            variant="danger"
            disabled={!commandAvailability.reset}
            onClick={() => setConfirmReset(true)}
          >
            {intl.formatMessage(messages.reset)}
          </Button>
        ) : (
          <div
            className="skill-confirmation"
            role="group"
            aria-labelledby={confirmId}
          >
            <span id={confirmId}>
              {intl.formatMessage(messages.resetWarning)}
            </span>
            <Button
              variant="danger"
              state={
                pendingKind === 'skill.reset' ? 'pending' : 'idle'
              }
              onClick={async () => {
                if (await dispatch({ kind: 'skill.reset' })) {
                  setConfirmReset(false)
                }
              }}
            >
              {intl.formatMessage(messages.reset)}
            </Button>
            <Button onClick={() => setConfirmReset(false)}>
              {intl.formatMessage(messages.close)}
            </Button>
          </div>
        )}
      </section>
      {managedSlot !== null && presets[managedSlot - 1] && (
        <PresetManagementDialog
          key={managedSlot}
          slot={managedSlot}
          preset={presets[managedSlot - 1]}
          canSetColor={commandAvailability.setPresetColor}
          presetActions={presetActions}
          pendingKind={pendingKind}
          dispatch={dispatch}
          onClose={() => setManagedSlot(null)}
        />
      )}
    </div>
  )
}

interface PresetManagementDialogProps {
  readonly slot: CanonicalSkillPresetSlot
  readonly preset: SkillPresetState
  readonly canSetColor: boolean
  readonly presetActions?: SkillPresetActions
  readonly pendingKind: string | null
  readonly dispatch: (
    command: SkillCommand,
    expectation?: Omit<PendingExpectation, 'beforeSignature'>,
  ) => Promise<boolean>
  readonly onClose: () => void
}

function PresetManagementDialog({
  slot,
  preset,
  canSetColor,
  presetActions,
  pendingKind,
  dispatch,
  onClose,
}: PresetManagementDialogProps) {
  const intl = useIntl()
  const [name, setName] = useState(preset.name)
  const [exportText, setExportText] = useState('')
  const [copyComplete, setCopyComplete] = useState(false)
  const [importText, setImportText] = useState('')
  const [importPreview, setImportPreview] =
    useState<SkillPresetImportPreview | null>(null)
  const [transferPending, setTransferPending] = useState<
    'export' | 'preview' | 'import' | null
  >(null)
  const [transferFailed, setTransferFailed] = useState(false)
  const exportAreaRef = useRef<HTMLTextAreaElement>(null)
  const colorPickerRef = useRef<HTMLDetailsElement>(null)
  const trimmedName = name.trim()
  const colorName = (colorId: SkillPresetColorId) =>
    intl.formatMessage(PRESET_COLOR_MESSAGES[colorId])

  const exportPreset = async () => {
    if (presetActions === undefined || transferPending !== null) return
    setTransferPending('export')
    setTransferFailed(false)
    setCopyComplete(false)
    try {
      setExportText(await presetActions.exportPreset(slot))
    } catch {
      setTransferFailed(true)
    } finally {
      setTransferPending(null)
    }
  }

  const copyExport = async () => {
    if (exportText.length === 0) return
    setCopyComplete(false)
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(exportText)
      } else {
        exportAreaRef.current?.select()
        if (!document.execCommand('copy')) throw new Error('copy failed')
      }
      setCopyComplete(true)
    } catch {
      setTransferFailed(true)
    }
  }

  const previewImport = async () => {
    if (
      presetActions === undefined ||
      transferPending !== null ||
      importText.trim().length === 0
    ) {
      return
    }
    setTransferPending('preview')
    setTransferFailed(false)
    setImportPreview(null)
    try {
      setImportPreview(
        await presetActions.previewImportPreset(slot, importText),
      )
    } catch {
      setTransferFailed(true)
    } finally {
      setTransferPending(null)
    }
  }

  const pasteImport = async () => {
    if (!navigator.clipboard?.readText || transferPending !== null) {
      return
    }
    setTransferFailed(false)
    try {
      const text = await navigator.clipboard.readText()
      setImportText(text)
      setImportPreview(null)
    } catch {
      setTransferFailed(true)
    }
  }

  const importPreset = async () => {
    if (
      presetActions === undefined ||
      importPreview === null ||
      transferPending !== null
    ) {
      return
    }
    setTransferPending('import')
    setTransferFailed(false)
    try {
      if (await presetActions.importPreset(slot, importText)) onClose()
      else setTransferFailed(true)
    } catch {
      setTransferFailed(true)
    } finally {
      setTransferPending(null)
    }
  }

  return (
    <SkillDetailsDialog
      title={intl.formatMessage(messages.managePresetTitle, {
        name: preset.name,
      })}
      closeLabel={intl.formatMessage(messages.close)}
      palette="normal"
      className="skill-preset-management-dialog"
      onClose={onClose}
    >
      <div className="skill-preset-management">
        <form
          className="skill-preset-management__rename"
          onSubmit={(event) => {
            event.preventDefault()
            if (trimmedName.length === 0 || trimmedName === preset.name) {
              return
            }
            void dispatch({
              kind: 'skill.rename-preset',
              slot,
              name: trimmedName,
            })
          }}
        >
          <label>
            <span>{intl.formatMessage(messages.presetName)}</span>
            <input
              value={name}
              autoComplete="off"
              onChange={(event) => setName(event.currentTarget.value)}
            />
          </label>
          <Button
            variant="primary"
            state={
              pendingKind === 'skill.rename-preset'
                ? 'pending'
                : 'idle'
            }
            disabled={
              trimmedName.length === 0 || trimmedName === preset.name
            }
            type="submit"
          >
            {intl.formatMessage(messages.rename)}
          </Button>
        </form>

        <section
          className="skill-preset-management__color"
          style={skillPresetColorStyle(preset.colorId)}
        >
          <h3>{intl.formatMessage(messages.presetColor)}</h3>
          <details
            ref={colorPickerRef}
            className="skill-preset-color-picker"
          >
            <summary>
              <span
                className="skill-preset-color-swatch"
                aria-hidden="true"
              />
              <span>{colorName(preset.colorId)}</span>
            </summary>
            <div className="skill-preset-color-picker__options">
              {SKILL_PRESET_COLOR_IDS.map((colorId) => (
                <button
                  key={colorId}
                  type="button"
                  aria-pressed={preset.colorId === colorId}
                  style={skillPresetColorStyle(colorId)}
                  disabled={
                    !canSetColor ||
                    pendingKind === 'skill.set-preset-color'
                  }
                  onClick={async () => {
                    const accepted = await dispatch({
                      kind: 'skill.set-preset-color',
                      slot,
                      colorId,
                    })
                    if (accepted) {
                      colorPickerRef.current?.removeAttribute('open')
                    }
                  }}
                >
                  <span
                    className="skill-preset-color-swatch"
                    aria-hidden="true"
                  />
                  <span>{colorName(colorId)}</span>
                </button>
              ))}
            </div>
          </details>
        </section>

        <section className="skill-preset-management__export">
          <h3>{intl.formatMessage(messages.exportPreset)}</h3>
          <p>{intl.formatMessage(messages.exportPresetHelp)}</p>
          <Button
            disabled={presetActions === undefined}
            state={transferPending === 'export' ? 'pending' : 'idle'}
            onClick={() => void exportPreset()}
          >
            {intl.formatMessage(messages.createExport)}
          </Button>
          {exportText.length > 0 && (
            <>
              <label>
                <span className="skills-surface__visually-hidden">
                  {intl.formatMessage(messages.exportText)}
                </span>
                <textarea
                  ref={exportAreaRef}
                  readOnly
                  rows={4}
                  value={exportText}
                  onFocus={(event) => event.currentTarget.select()}
                />
              </label>
              <Button onClick={() => void copyExport()}>
                {intl.formatMessage(messages.copy)}
              </Button>
              {copyComplete && (
                <span role="status">
                  {intl.formatMessage(messages.copied)}
                </span>
              )}
            </>
          )}
        </section>

        <section className="skill-preset-management__import">
          <h3>{intl.formatMessage(messages.importPreset)}</h3>
          <p>{intl.formatMessage(messages.importPresetHelp)}</p>
          <label>
            <span className="skills-surface__visually-hidden">
              {intl.formatMessage(messages.importText)}
            </span>
            <textarea
              rows={4}
              value={importText}
              placeholder={intl.formatMessage(
                messages.importPlaceholder,
              )}
              onChange={(event) => {
                setImportText(event.currentTarget.value)
                setImportPreview(null)
                setTransferFailed(false)
              }}
            />
          </label>
          <Button
            disabled={!navigator.clipboard?.readText}
            onClick={() => void pasteImport()}
          >
            {intl.formatMessage(messages.paste)}
          </Button>
          <Button
            disabled={
              presetActions === undefined ||
              importText.trim().length === 0
            }
            state={transferPending === 'preview' ? 'pending' : 'idle'}
            onClick={() => void previewImport()}
          >
            {intl.formatMessage(messages.previewImport)}
          </Button>
          {importPreview && (
            <div className="skill-confirmation skill-preset-management__preview">
              <strong>{importPreview.name}</strong>
              <PresetSummary
                count={importPreview.queuedSkillCount}
                workers={importPreview.workerPercent}
              />
              <span
                className="skill-preset-management__import-color"
                style={skillPresetColorStyle(importPreview.colorId)}
              >
                <span
                  className="skill-preset-color-swatch"
                  aria-hidden="true"
                />
                {colorName(importPreview.colorId)}
              </span>
              <p>
                {intl.formatMessage(messages.replacePreset, {
                  name: preset.name,
                })}
              </p>
              <Button
                variant="primary"
                state={
                  transferPending === 'import' ? 'pending' : 'idle'
                }
                onClick={() => void importPreset()}
              >
                {intl.formatMessage(messages.confirmImport)}
              </Button>
              <Button
                disabled={transferPending !== null}
                onClick={() => setImportPreview(null)}
              >
                {intl.formatMessage(messages.cancel)}
              </Button>
            </div>
          )}
        </section>
        {transferFailed && (
          <StatusFeedback tone="error">
            {intl.formatMessage(messages.presetTransferFailed)}
          </StatusFeedback>
        )}
      </div>
    </SkillDetailsDialog>
  )
}

function PresetSummary({
  count,
  workers,
}: {
  readonly count: number
  readonly workers: number
}) {
  const intl = useIntl()
  const workerPercent = Math.max(0, Math.min(100, Math.round(workers)))
  const scientistPercent = 100 - workerPercent

  return (
    <span className="skill-preset-summary">
      {intl.formatMessage(messages.presetSummary, {
        count,
        workers: workerPercent,
        scientists: scientistPercent,
        workerValue: (chunks: ReactNode) => (
          <span className="skill-preset-summary__workers">
            {chunks}
          </span>
        ),
        scientistValue: (chunks: ReactNode) => (
          <span className="skill-preset-summary__scientists">
            {chunks}
          </span>
        ),
      })}
    </span>
  )
}
