import type { UiRuntimeFoundation } from './contracts'

type SafeReloadRuntime = Pick<
  UiRuntimeFoundation,
  'status' | 'checkpointBeforeSafeReload' | 'shutdown'
>

/** Verifies durable state, then closes runtime admission for a host reload. */
export async function prepareRuntimeForSafeReload(
  runtime: SafeReloadRuntime,
): Promise<void> {
  const status = runtime.status()
  if (status.phase === 'ready') {
    const checkpointed = await runtime.checkpointBeforeSafeReload()
    if (!checkpointed) {
      throw new Error(
        'Safe reload requires a verified checkpoint.',
      )
    }
  } else if (
    status.phase !== 'blocked' &&
    status.phase !== 'ownership-lost'
  ) {
    throw new Error(
      `Safe reload is unavailable while the runtime is ${status.phase}.`,
    )
  }
  // There is intentionally no await between a non-ready status sample and
  // shutdown. The runtime closes new startup, lifecycle, and command
  // admission synchronously when shutdown() is invoked.
  await runtime.shutdown()
}
