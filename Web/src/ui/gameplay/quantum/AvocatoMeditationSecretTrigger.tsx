import { useEffect, useRef } from 'react'
import type { CanonicalPlayerCommand } from '../../../application/canonicalPlayerCommands'
import type { UiRuntimePlayerCommandResult } from '../../runtime'
import dabbingAvocadoUrl from '../../assets/avotation-dabbing-avocado.png'
import {
  AVOCATO_MEDITATION_ROUTE_STEPS,
  type AvocatoMeditationPlacement,
} from './meditationTargets'
import './meditationSecrets.css'

type MeditationCommand = Extract<
  CanonicalPlayerCommand,
  { readonly kind: 'avocado.complete-meditation-step' }
>

export interface AvocatoMeditationSecretTriggerProps {
  readonly placement: AvocatoMeditationPlacement
  readonly requiredStepIndex: number | null
  readonly completed: boolean
  readonly routeAvailable: boolean
  readonly dispatchPlayer: (
    command: MeditationCommand,
  ) => Promise<UiRuntimePlayerCommandResult>
  readonly onSequenceCompleted?: () => void
}

const TARGET_SELECTORS: Readonly<
  Record<AvocatoMeditationPlacement, string>
> = Object.freeze({
  quantum: '[data-quantum-upgrade-id="Secrets"]',
  infinity: '.infinity-surface__summary',
  bots: '.dyson-shell__production-summary',
  skills: '.skill-settings__preset-row:first-child',
  settings: '.settings-surface__panel--more',
  research: '.research-surface__settings',
  side: '.dyson-shell__side-panel',
})

const COMPLETED_MEDITATION_REPLAY_SELECTOR =
  '.dyson-shell__side-heading'

/**
 * Connects Unity's seven ordered Avotation targets to their equivalent full
 * Web panels. Discovery observes the panel's ordinary click without blocking
 * its normal action, then leaves Unity's small found marker on the panel.
 */
export function AvocatoMeditationSecretTrigger({
  placement,
  requiredStepIndex,
  completed,
  routeAvailable,
  dispatchPlayer,
  onSequenceCompleted,
}: AvocatoMeditationSecretTriggerProps) {
  const pendingRef = useRef(false)
  const feedbackRef = useRef<HTMLImageElement | null>(null)
  const feedbackTimerRef = useRef<number | null>(null)
  const stepIndex = AVOCATO_MEDITATION_ROUTE_STEPS[placement]
  const active =
    !completed &&
    requiredStepIndex === stepIndex &&
    routeAvailable
  const discovered =
    completed ||
    (requiredStepIndex !== null && requiredStepIndex > stepIndex)

  useEffect(() => {
    if (!active && !discovered) return
    const selector = TARGET_SELECTORS[placement]
    let markedTarget: Element | null = null
    let foundMarker: HTMLImageElement | null = null

    const markTarget = () => {
      const nextTarget = document.querySelector(selector)
      if (markedTarget === nextTarget) return
      markedTarget?.removeAttribute('data-avocato-secret-step')
      markedTarget?.removeAttribute('data-avotation-target')
      markedTarget?.removeAttribute('data-avotation-marker-host')
      foundMarker?.remove()
      foundMarker = null
      markedTarget = nextTarget
      if (active) {
        markedTarget?.setAttribute(
          'data-avocato-secret-step',
          String(stepIndex),
        )
        markedTarget?.setAttribute('data-avotation-target', placement)
      }
      if (discovered && markedTarget !== null) {
        foundMarker = document.createElement('img')
        foundMarker.src = dabbingAvocadoUrl
        foundMarker.alt = ''
        foundMarker.setAttribute('aria-hidden', 'true')
        foundMarker.setAttribute('data-avotation-found-marker', placement)
        foundMarker.className = placement === 'quantum'
          ? 'avotation-found-marker avotation-found-marker--inline'
          : 'avotation-found-marker'
        markedTarget.setAttribute('data-avotation-marker-host', placement)
        const markerHost = placement === 'quantum'
          ? markedTarget.querySelector('h4') ?? markedTarget
          : markedTarget
        markerHost.append(foundMarker)
      }
    }

    const clearFeedback = () => {
      if (feedbackTimerRef.current !== null) {
        window.clearTimeout(feedbackTimerRef.current)
        feedbackTimerRef.current = null
      }
      feedbackRef.current?.remove()
      feedbackRef.current = null
    }

    const showFeedback = (panel: Element) => {
      clearFeedback()
      const panelRect = panel.getBoundingClientRect()
      const feedback = document.createElement('img')
      feedback.src = dabbingAvocadoUrl
      feedback.alt = ''
      feedback.setAttribute('aria-hidden', 'true')
      feedback.setAttribute('data-avotation-found-feedback', placement)
      feedback.className = 'avotation-secret-found'
      feedback.style.setProperty(
        '--avotation-feedback-left',
        `${panelRect.left + panelRect.width / 2}px`,
      )
      feedback.style.setProperty(
        '--avotation-feedback-top',
        `${panelRect.top + panelRect.height / 2}px`,
      )
      feedback.style.setProperty(
        '--avotation-feedback-settle-x',
        `${Math.max(0, panelRect.width / 2 - 18)}px`,
      )
      feedback.style.setProperty(
        '--avotation-feedback-settle-y',
        `${Math.min(0, 18 - panelRect.height / 2)}px`,
      )
      document.body.append(feedback)
      feedbackRef.current = feedback
      feedbackTimerRef.current = window.setTimeout(clearFeedback, 1_200)
    }

    const activate = async (panel: Element) => {
      if (pendingRef.current) return
      pendingRef.current = true
      try {
        const result = await dispatchPlayer({
          kind: 'avocado.complete-meditation-step',
          requiredStepIndex: stepIndex,
        })
        if (result.status === 'accepted') {
          showFeedback(panel)
          if (stepIndex === 6) {
            onSequenceCompleted?.()
          }
        }
      } finally {
        pendingRef.current = false
      }
    }

    const observePanelClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return
      if (completed && placement === 'side') {
        if (
          event.target.closest(COMPLETED_MEDITATION_REPLAY_SELECTOR) !== null
        ) {
          onSequenceCompleted?.()
        }
        return
      }
      if (!active) return
      const panel = event.target.closest(selector)
      if (panel === null) return
      void activate(panel)
    }

    markTarget()
    const observer = new MutationObserver(markTarget)
    observer.observe(document.body, { childList: true, subtree: true })
    document.addEventListener('click', observePanelClick)
    return () => {
      observer.disconnect()
      document.removeEventListener('click', observePanelClick)
      markedTarget?.removeAttribute('data-avocato-secret-step')
      markedTarget?.removeAttribute('data-avotation-target')
      markedTarget?.removeAttribute('data-avotation-marker-host')
      foundMarker?.remove()
    }
  }, [
    active,
    completed,
    discovered,
    dispatchPlayer,
    onSequenceCompleted,
    placement,
    stepIndex,
  ])

  return null
}
