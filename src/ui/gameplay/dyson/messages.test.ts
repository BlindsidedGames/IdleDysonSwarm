import { describe, expect, test } from 'vitest'
import { readyDysonMessages } from './messages'

describe('automatic partial preset banner copy', () => {
  test('does not promise navigation from the dismiss-only banner', () => {
    const accessibleMessage =
      readyDysonMessages.presetPartiallyApplied.defaultMessage
    const visibleMessage =
      readyDysonMessages.presetPartiallyAppliedBanner.defaultMessage

    expect(accessibleMessage).not.toMatch(/open skills|skills for details/i)
    expect(visibleMessage).not.toMatch(/open skills|skills for details/i)
    expect(visibleMessage).not.toContain('<details>')
  })
})
