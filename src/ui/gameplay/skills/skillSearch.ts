export interface SkillSearchDocument {
  readonly skillId: string
  readonly legacySkillKey: number
  readonly displayName: string
  readonly description: string
  readonly technicalDescription: string
}

interface PreparedSkillSearchQuery {
  readonly normalized: string
  readonly compact: string
  readonly tokens: readonly string[]
}

const SEARCH_TOKEN_PATTERN = /[\p{L}\p{N}]+/gu

function normalizeSearchText(value: string, locale: string) {
  return value.normalize('NFKC').toLocaleLowerCase(locale)
}

function tokenizeSearchText(value: string) {
  return value.match(SEARCH_TOKEN_PATTERN) ?? []
}

function prepareQuery(
  query: string,
  locale: string,
): PreparedSkillSearchQuery {
  const normalized = normalizeSearchText(query.trim(), locale)
  const tokens = tokenizeSearchText(normalized)
  return {
    normalized,
    compact: tokens.join(''),
    tokens,
  }
}

function matchesOrderedWordPrefixes(
  queryTokens: readonly string[],
  titleTokens: readonly string[],
) {
  if (queryTokens.length < 2 || queryTokens.length > titleTokens.length) {
    return false
  }

  return queryTokens.every((token, index) =>
    titleTokens[index]?.startsWith(token),
  )
}

function matchesCompactWordPrefixes(
  query: string,
  titleTokens: readonly string[],
) {
  if (query.length < 2 || titleTokens.length < 2) return false

  const visited = new Set<string>()
  const visit = (
    titleIndex: number,
    queryIndex: number,
    matchedWords: number,
  ): boolean => {
    if (queryIndex === query.length) return matchedWords >= 2
    if (titleIndex === titleTokens.length) return false

    const visitKey = `${titleIndex}:${queryIndex}:${matchedWords}`
    if (visited.has(visitKey)) return false
    visited.add(visitKey)

    const titleToken = titleTokens[titleIndex]
    for (
      let queryEnd = queryIndex + 1;
      queryEnd <= query.length;
      queryEnd += 1
    ) {
      const queryPart = query.slice(queryIndex, queryEnd)
      if (!titleToken.startsWith(queryPart)) break
      if (visit(titleIndex + 1, queryEnd, matchedWords + 1)) {
        return true
      }
    }

    return false
  }

  return visit(0, 0, 0)
}

function orderedLetterGap(
  query: string,
  title: string,
): number | null {
  if (
    query.length < 3 ||
    title.length === 0 ||
    query[0] !== title[0]
  ) {
    return null
  }

  let titleIndex = 0
  let gap = 0
  for (const character of query) {
    const nextIndex = title.indexOf(character, titleIndex)
    if (nextIndex < 0) return null
    gap += nextIndex - titleIndex
    titleIndex = nextIndex + character.length
  }

  return gap
}

/**
 * Scores a skill against a query without reproducing any gameplay rules.
 * Title matches are ranked ahead of literal authored-copy matches, while
 * approximate matching is deliberately limited to the displayed title.
 */
export function scoreSkillSearchMatch(
  skill: SkillSearchDocument,
  query: string,
  locale: string,
): number | null {
  const prepared = prepareQuery(query, locale)
  if (prepared.normalized.length === 0) return null

  const title = normalizeSearchText(skill.displayName, locale)
  const titleTokens = tokenizeSearchText(title)
  const compactTitle = titleTokens.join('')

  if (title.startsWith(prepared.normalized)) return 500
  if (title.includes(prepared.normalized)) return 475

  const literalMetadata = [
    skill.description,
    skill.technicalDescription,
    skill.skillId,
    String(skill.legacySkillKey),
  ]
    .map((value) => normalizeSearchText(value, locale))
    .join(' ')
  if (literalMetadata.includes(prepared.normalized)) return 425

  if (matchesOrderedWordPrefixes(prepared.tokens, titleTokens)) {
    return 350
  }
  if (matchesCompactWordPrefixes(prepared.compact, titleTokens)) {
    return 300
  }

  const gap = orderedLetterGap(prepared.compact, compactTitle)
  return gap === null ? null : 200 - Math.min(gap, 100)
}

/**
 * Returns matching skills in deterministic relevance order. Equal-scoring
 * matches preserve the authored tree order supplied by the caller.
 */
export function rankSkillSearchResults<
  TSkill extends SkillSearchDocument,
>(
  skills: readonly TSkill[],
  query: string,
  locale: string,
) {
  return skills
    .map((skill, index) => ({
      skill,
      index,
      score: scoreSkillSearchMatch(skill, query, locale),
    }))
    .filter(
      (
        candidate,
      ): candidate is {
        readonly skill: TSkill
        readonly index: number
        readonly score: number
      } => candidate.score !== null,
    )
    .sort(
      (left, right) =>
        right.score - left.score || left.index - right.index,
    )
    .map(({ skill }) => skill)
}
