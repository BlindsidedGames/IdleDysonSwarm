import { createContext, useContext } from 'react'

export const NonRefundableSkillConfirmationContext = createContext<(() => Promise<boolean>) | null>(null)

export function useSharedNonRefundableSkillConfirmation() {
  return useContext(NonRefundableSkillConfirmationContext)
}
