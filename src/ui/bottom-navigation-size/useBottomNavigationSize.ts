import { useContext } from 'react'
import { BottomNavigationSizeContext } from './context'

export function useBottomNavigationSize() {
  return useContext(BottomNavigationSizeContext)
}
