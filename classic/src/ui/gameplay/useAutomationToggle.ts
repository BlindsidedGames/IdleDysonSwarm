import { useRef, useState } from 'react'

/** Keeps the latest automation intent visible until its command settles. */
export function useAutomationToggle<Id extends string>(
  dispatch: (id: Id, enabled: boolean) => Promise<{ readonly status: string }>,
) {
  const [overrides, setOverrides] = useState<Partial<Record<Id, boolean>>>({})
  const [failures, setFailures] = useState<ReadonlySet<Id>>(new Set())
  const versions = useRef(new Map<Id, number>())

  const setAutomation = (id: Id, enabled: boolean): void => {
    const version = (versions.current.get(id) ?? 0) + 1
    versions.current.set(id, version)
    setOverrides((current) => ({ ...current, [id]: enabled }))
    setFailures((current) => {
      if (!current.has(id)) return current
      const next = new Set(current)
      next.delete(id)
      return next
    })

    const settle = (failed: boolean): void => {
      if (versions.current.get(id) !== version) return
      setOverrides((current) => {
        const next = { ...current }
        delete next[id]
        return next
      })
      if (failed) setFailures((current) => new Set(current).add(id))
    }

    void dispatch(id, enabled)
      .then((result) => settle(result.status !== 'accepted'))
      .catch(() => settle(true))
  }

  return { overrides, failures, setAutomation }
}
