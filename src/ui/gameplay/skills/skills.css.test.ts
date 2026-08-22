import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const skillsCss = readFileSync(
  resolve(import.meta.dirname, 'skills.css'),
  'utf8',
)

describe('Skills CSS contract', () => {
  it('keeps one focus ring on the portalled preset checkbox', () => {
    expect(skillsCss).toMatch(
      /\.skill-details__preset-toggle input:focus-visible\s*\{[^}]*outline:\s*3px solid #f7e766;[^}]*outline-offset:\s*2px;/s,
    )
  })

  it('gives its body-portalled dialogs the current unified Skills palette', () => {
    expect(skillsCss).toMatch(
      /\.skill-details-dialog__backdrop\s*\{[^}]*--theme-page:\s*#1c1427;[^}]*--theme-panel:\s*#30244f;[^}]*--theme-selected:\s*#483563;[^}]*--theme-divider:\s*#5b4674;[^}]*--theme-accent:\s*#d3c2ff;/s,
    )
  })

  it('keeps portalled preset editors legible and natively editable on iOS', () => {
    expect(skillsCss).toMatch(
      /\.skill-preset-management input,\s*\.skill-preset-management textarea\s*\{[^}]*font-size:\s*1rem;[^}]*-webkit-touch-callout:\s*default;[^}]*-webkit-user-select:\s*text;[^}]*user-select:\s*text;/s,
    )
    expect(skillsCss).toMatch(
      /\.skill-details-dialog__backdrop\s*\{[^}]*touch-action:\s*manipulation;/s,
    )
  })
})
