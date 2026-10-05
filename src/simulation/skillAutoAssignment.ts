import { resolveSkillPurchaseOrder } from './canonicalSkillPresetTransactions'

export interface SkillAutoAssignmentRule {
  readonly cost: bigint
  readonly fragment: boolean
  readonly refundable: boolean
  readonly required: readonly string[]
  readonly shadowRequired: readonly string[]
  readonly exclusiveWith: readonly string[]
}

/** Shared spending/priority policy; live and reset callers own runtime initialization. */
export function planSkillAutoAssignment(
  priority: readonly string[],
  rules: ReadonlyMap<string, SkillAutoAssignmentRule>,
  initialOwned: ReadonlySet<string>,
  initialPoints: bigint,
  assignNonRefundable: boolean,
  eligible: (id: string) => boolean,
) {
  const owned = new Set(initialOwned)
  let points = initialPoints
  let fragmentsGranted = 0n
  const assignedIds: string[] = []
  for (const id of resolveSkillPurchaseOrder(priority, owned, rules)) {
    const rule = rules.get(id)
    if (rule === undefined || owned.has(id) || !eligible(id) ||
      rule.exclusiveWith.some(other => owned.has(other)) ||
      (!assignNonRefundable && !rule.refundable) ||
      !rule.required.every(other => owned.has(other)) ||
      !rule.shadowRequired.every(other => owned.has(other))) continue
    if (points < rule.cost) break
    points -= rule.cost
    if (rule.fragment) fragmentsGranted += 1n
    owned.add(id)
    assignedIds.push(id)
  }
  return { points, fragmentsGranted, assignedIds: Object.freeze(assignedIds) }
}
