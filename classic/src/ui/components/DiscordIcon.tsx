import discordIconSrc from '../assets/discord.svg'
import { InlineImageSymbol } from './InlineImageSymbol'

/** Decorative Discord mark for actions whose accessible name is visible text. */
export function DiscordIcon() {
  return (
    <InlineImageSymbol
      src={discordIconSrc}
      className="ui-discord-icon"
      symbol="discord"
      tint
    />
  )
}
