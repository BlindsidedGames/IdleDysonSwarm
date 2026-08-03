import { resolve } from 'node:path'
import { applyWebsitePromotion } from './websitePromotion'

const argumentsByName = parseArguments(process.argv.slice(2))
applyWebsitePromotion({
  webRoot: resolve(import.meta.dirname, '..'),
  packageDirectory: required(argumentsByName, 'package'),
  websiteCheckout: required(argumentsByName, 'website-checkout'),
})

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
