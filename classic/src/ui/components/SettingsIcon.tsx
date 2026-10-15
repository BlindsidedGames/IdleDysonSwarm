import settingsIconSrc from '../assets/nav-settings.png'
import { InlineImageSymbol } from './InlineImageSymbol'
import './components.css'

/** Decorative settings artwork for controls whose accessible name is on the button. */
export function SettingsIcon() {
  return (
    <InlineImageSymbol
      src={settingsIconSrc}
      className="ui-settings-icon"
      symbol="settings"
      tint
    />
  )
}
