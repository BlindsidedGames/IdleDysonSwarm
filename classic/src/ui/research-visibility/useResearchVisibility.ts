import { useContext } from 'react'
import { ResearchVisibilityContext } from './context'

export function useResearchVisibility() {
  return useContext(ResearchVisibilityContext)
}
