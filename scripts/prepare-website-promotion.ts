import { resolve } from 'node:path'
import { prepareWebsitePromotion } from './websitePromotion'

const argumentsByName = parseArguments(process.argv.slice(2))
const result = prepareWebsitePromotion({
  webRoot: resolve(import.meta.dirname, '..'),
  releaseId: required(argumentsByName, 'release-id'),
  sourceCommitSha: required(argumentsByName, 'source-sha'),
  websiteCommitSha: required(argumentsByName, 'website-ref'),
})

process.stdout.write(`${result.packageDirectory}\n`)

function parseArguments(args: readonly string[]): ReadonlyMap<string, string> {
  const values = new Map<string, string>()
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index]
    const value = args[index + 1]
    if (!key?.startsWith('--') || value === undefined) {
      throw new Error('Promotion arguments must use --name value pairs.')
    }
    values.set(key.slice(2), value)
  }
  return values
}

function required(values: ReadonlyMap<string, string>, key: string): string {
  const value = values.get(key)
  if (value === undefined) throw new Error(`Missing --${key}.`)
  return value
}
