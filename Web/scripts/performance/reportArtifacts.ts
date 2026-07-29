import {
  mkdirSync,
  writeFileSync,
} from 'node:fs'
import { resolve } from 'node:path'
import {
  assertPerformanceReport,
  performanceReportText,
  type FirstSlicePerformanceReport,
} from './performanceReport'

export function writePerformanceReport(
  webRoot: string,
  stem: string,
  report: FirstSlicePerformanceReport,
): {
  readonly jsonPath: string
  readonly textPath: string
} {
  assertPerformanceReport(report)
  const outputRoot = resolve(webRoot, 'output', 'performance')
  mkdirSync(outputRoot, { recursive: true })
  const jsonPath = resolve(outputRoot, `${stem}.json`)
  const textPath = resolve(outputRoot, `${stem}.txt`)
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`)
  writeFileSync(textPath, performanceReportText(report))
  return { jsonPath, textPath }
}

export function integerArgument(
  argumentsList: readonly string[],
  name: string,
  fallback: number,
): number {
  const prefix = `--${name}=`
  const supplied = argumentsList.find((argument) =>
    argument.startsWith(prefix),
  )
  if (supplied === undefined) return fallback
  const value = Number(supplied.slice(prefix.length))
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError(`--${name} must be a positive integer.`)
  }
  return value
}

export function hasFlag(
  argumentsList: readonly string[],
  name: string,
): boolean {
  return argumentsList.includes(`--${name}`)
}
