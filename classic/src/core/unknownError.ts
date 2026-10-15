/** Preserves an Error's message and stringifies every other thrown value. */
export function formatUnknownError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
