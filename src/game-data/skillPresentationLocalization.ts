import type { IntlShape } from 'react-intl'

interface LocalizableSkillPresentation {
  readonly displayName: string
  readonly description: string
  readonly technicalDescription: string
  readonly messageIds: {
    readonly displayName: string
    readonly description: string
    readonly technicalDescription: string
  }
}

/**
 * Resolves stable generated Skill message IDs while retaining the authored
 * Unity copy as the English fallback. Keeping this helper outside the UI
 * extractor lets destination locale catalogs supply the generated IDs without
 * asking FormatJS to statically extract runtime-generated descriptors.
 */
export function localizeSkillPresentation<
  T extends LocalizableSkillPresentation,
>(
  intl: Pick<IntlShape, 'formatMessage'>,
  node: T,
): T {
  return {
    ...node,
    displayName: intl.formatMessage({
      id: node.messageIds.displayName,
      defaultMessage: node.displayName,
    }),
    description: intl.formatMessage({
      id: node.messageIds.description,
      defaultMessage: node.description,
    }),
    technicalDescription: intl.formatMessage({
      id: node.messageIds.technicalDescription,
      defaultMessage: node.technicalDescription,
    }),
  }
}
