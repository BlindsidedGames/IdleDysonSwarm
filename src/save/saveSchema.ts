export const CURRENT_SAVE_SCHEMA = 21

/** An authoritative newer input must never trigger replacement by an older save. */
export class UnsupportedFutureSaveSchemaError extends Error {
  readonly sourceSchema: number
  readonly supportedSchema: number

  constructor(sourceSchema: number, supportedSchema: number, reason?: string) {
    super(reason ?? `Save schema ${sourceSchema} is newer than supported schema ${supportedSchema}.`)
    this.name = 'UnsupportedFutureSaveSchemaError'
    this.sourceSchema = sourceSchema
    this.supportedSchema = supportedSchema
  }
}
