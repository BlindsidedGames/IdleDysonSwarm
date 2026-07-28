const SUFFIXES = [
  '',
  'K',
  'M',
  'B',
  'T',
  'Qa',
  'Qi',
  'Sx',
  'Sp',
  'Oc',
  'No',
  'Dc',
] as const

export function formatGameNumber(value: number): string {
  if (value === Number.MAX_VALUE) return 'MAX'
  if (!Number.isFinite(value)) return '—'
  if (value === 0) return '0'

  const sign = value < 0 ? '-' : ''
  const magnitude = Math.abs(value)
  if (magnitude < 1) {
    return `${sign}${magnitude.toLocaleString('en-AU', {
      maximumFractionDigits: 3,
    })}`
  }
  if (magnitude < 1_000) {
    return `${sign}${magnitude.toLocaleString('en-AU', {
      maximumFractionDigits: magnitude < 10 ? 2 : 1,
    })}`
  }

  const exponentGroup = Math.floor(Math.log10(magnitude) / 3)
  if (exponentGroup < SUFFIXES.length) {
    const scaled = magnitude / 1_000 ** exponentGroup
    return `${sign}${scaled.toLocaleString('en-AU', {
      maximumFractionDigits: scaled < 10 ? 2 : 1,
    })}${SUFFIXES[exponentGroup]}`
  }
  return `${sign}${magnitude.toExponential(2).replace('+', '')}`
}

export function formatRate(value: number): string {
  return `${formatGameNumber(value)}/s`
}
