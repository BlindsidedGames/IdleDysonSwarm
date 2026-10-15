import { useContext } from 'react'
import { BottomNavigationTextContext } from './context'

export function useBottomNavigationText() {
  return useContext(BottomNavigationTextContext)
}
