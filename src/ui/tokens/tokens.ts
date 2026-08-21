export const semanticColors = Object.freeze({
  appBackground: '#1D151F',
  surface: '#1A1A26',
  surfaceRaised: '#262633',
  border: '#62627A',
  control: '#33334D',
  controlHover: '#4D4D66',
  controlPressed: '#262633',
  accentValue: '#FFA45E',
  highlight: '#00E1FF',
  positive: '#91DD8F',
  warning: '#FFEB3B',
  negative: '#FF6B6B',
  textPrimary: '#F7F4F8',
  textSecondary: '#C4BFC8',
} as const)

export const breakpoints = Object.freeze({
  compactMaximum: 599,
  mediumMinimum: 600,
  mediumMaximum: 1023,
  wideMinimum: 1024,
} as const)

export const targetSizes = Object.freeze({
  minimum: 44,
  preferredTouch: 48,
} as const)

export const scriptFontFamilies = Object.freeze({
  latin:
    '"Lexend Variable", "Lexend", ui-sans-serif, system-ui, sans-serif',
  japanese:
    '"Noto Sans JP", "Yu Gothic UI", "Hiragino Sans", sans-serif',
  simplifiedChinese:
    '"Noto Sans SC", "Microsoft YaHei UI", "PingFang SC", sans-serif',
  traditionalChinese:
    '"Noto Sans TC", "Microsoft JhengHei UI", "PingFang TC", sans-serif',
  arabic:
    '"Noto Sans Arabic", "Segoe UI", Tahoma, sans-serif',
  hebrew:
    '"Noto Sans Hebrew", "Segoe UI", Arial, sans-serif',
  devanagari:
    '"Noto Sans Devanagari", "Nirmala UI", sans-serif',
} as const)
