export interface ProductionDisplay {
  readonly text: string
  readonly prefix: string
  readonly highlightedValue?: string
  readonly suffix: string
}

export function splitProductionDisplay(
  text: string,
  highlightedValue?: string,
): ProductionDisplay {
  if (highlightedValue === undefined) {
    return { text, prefix: text, suffix: '' }
  }
  const valueIndex = text.indexOf(highlightedValue)
  if (valueIndex < 0) return { text, prefix: text, suffix: '' }
  return {
    text,
    prefix: text.slice(0, valueIndex),
    highlightedValue,
    suffix: text.slice(valueIndex + highlightedValue.length),
  }
}
