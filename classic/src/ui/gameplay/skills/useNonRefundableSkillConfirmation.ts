import { useCallback, useEffect, useRef, useState } from 'react'
import { readBooleanPresentationPreference, writeBooleanPresentationPreference } from '../../presentationPreferences'

export const NON_REFUNDABLE_SKILL_ACKNOWLEDGEMENT_KEY =
  'idle-dyson-swarm:non-refundable-skill-warning-acknowledged'

/** One device-local acknowledgement shared by every Skills assignment route. */
export function useNonRefundableSkillConfirmation() {
  const [initialAcknowledgement] = useState(() =>
    readBooleanPresentationPreference(NON_REFUNDABLE_SKILL_ACKNOWLEDGEMENT_KEY))
  const acknowledged = useRef(initialAcknowledgement)
  const resolver = useRef<((confirmed: boolean) => void) | null>(null)
  const mounted = useRef(false)
  const [pending, setPending] = useState(false)

  const requestConfirmation = useCallback((): Promise<boolean> => {
    if (!mounted.current) return Promise.resolve(false)
    if (acknowledged.current) return Promise.resolve(true)
    // A second activation must not resume another action after one confirmation.
    if (resolver.current !== null) return Promise.resolve(false)
    setPending(true)
    return new Promise(resolve => { resolver.current = resolve })
  }, [])

  const resolveConfirmation = useCallback((confirmed: boolean) => {
    const resolve = resolver.current
    if (resolve === null) return
    resolver.current = null
    if (confirmed) {
      acknowledged.current = true
      writeBooleanPresentationPreference(NON_REFUNDABLE_SKILL_ACKNOWLEDGEMENT_KEY, true)
    }
    setPending(false)
    resolve(confirmed)
  }, [])

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      resolver.current?.(false)
      resolver.current = null
    }
  }, [])

  return { pending, requestConfirmation, resolveConfirmation }
}
