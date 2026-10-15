import { useRef, useState } from 'react'
import type { CanonicalPlayerCommand } from '../../../application/canonicalPlayerCommands'
import type { CanonicalSkillPresetSlot } from '../../../game-state/types'
import type { SkillPresetActions, SkillPresetSelectionPreview } from './SkillsSurface'

export type PresetSelectionCommand = Extract<CanonicalPlayerCommand, { kind: 'skill.select-preset' }>
type SelectionPreview = SkillPresetSelectionPreview & { readonly slot: CanonicalSkillPresetSlot }

/** Both entry points preview retained conflicts before the same atomic command. */
export function useSkillPresetSelection({ presetActions, select, onFailure, onConflict }: {
  readonly presetActions?: Pick<SkillPresetActions, 'previewSelection'>
  readonly select: (command: PresetSelectionCommand) => Promise<boolean>
  readonly onFailure: () => void
  readonly onConflict?: () => void
}) {
  const busy = useRef(false)
  const [pending, setPending] = useState(false)
  const [preview, setPreview] = useState<SelectionPreview | null>(null)
  const run = async (action: () => Promise<void>) => {
    if (busy.current) return
    busy.current = true
    setPending(true)
    try { await action() } catch { onFailure() }
    finally { busy.current = false; setPending(false) }
  }
  return {
    pending, preview,
    dismiss: () => { if (!busy.current) setPreview(null) },
    request: (slot: CanonicalSkillPresetSlot) => run(async () => {
      const result = await presetActions?.previewSelection(slot)
      if (result && result.blockedByRetainedSkillIds.length > 0) {
        setPreview({ ...result, slot })
        onConflict?.()
      } else {
        await select({ kind: 'skill.select-preset', slot })
      }
    }),
    confirm: () => run(async () => {
      if (preview && await select({ kind: 'skill.select-preset', slot: preview.slot,
        retainedConflictPolicy: { kind: 'confirmed', retainedSkillIds: preview.retainedSkillIds,
          blockedSkillIds: preview.blockedByRetainedSkillIds } })) setPreview(null)
    }),
  }
}
