import { useIntl } from 'react-intl'
import type { InfinityChallengeState } from '../../../game-state/types'
import { Button, InlineImageSymbol } from '../../components'
import challengeIcon from '../../assets/nav-challenges-target.png'
import { challengeMessages as messages } from './challengeMessages'
import { challengePresentation } from './challengePresentation'
import './activeChallengeMarker.css'

export function ActiveChallengeMarker({
  challengeId,
  onOpen,
}: {
  readonly challengeId: NonNullable<InfinityChallengeState['active']>
  readonly onOpen: () => void
}) {
  const intl = useIntl()
  const name = intl.formatMessage(challengePresentation[challengeId].name)
  return <Button
    className="active-challenge-marker"
    onClick={onOpen}
    aria-label={`${intl.formatMessage(messages.activeLabel)}: ${name}. ${intl.formatMessage(messages.view)}`}
  >
    <InlineImageSymbol src={challengeIcon} tint maskMode="luminance" />
    <span>{name}</span>
  </Button>
}
