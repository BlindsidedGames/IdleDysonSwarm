import type {
  BrowserSaveDatabase,
  BrowserSaveMutation,
  WriterLeaseAcquisition,
  WriterLeaseFence,
} from './browserSaveDatabase'
import { WriterLeaseLostError } from './browserSaveDatabase'

/**
 * A native package owns one renderer/WebView, so it does not need a browser
 * database to coordinate tabs. This in-process fence preserves the runtime's
 * cancellation and orderly-shutdown invariants without opening IndexedDB or
 * storing any save bytes in the renderer.
 */
export class NativeSingleHostWriterDatabase
implements BrowserSaveDatabase {
  private fence: WriterLeaseFence | null = null
  private generation = 0

  async acquireWriterLease(
    ownerToken: string,
    nowUtcMilliseconds: number,
    leaseDurationMilliseconds: number,
    allowUnexpiredSameOwnerTakeover = false,
    allowUnexpiredAnyOwnerTakeover = false,
  ): Promise<WriterLeaseAcquisition> {
    const current = this.fence
    if (
      current !== null &&
      current.expiresAtUtcMilliseconds > nowUtcMilliseconds &&
      !allowUnexpiredAnyOwnerTakeover &&
      !(
        allowUnexpiredSameOwnerTakeover &&
        current.ownerToken === ownerToken
      )
    ) {
      return Object.freeze({
        acquired: false as const,
        generation: current.generation,
        expiresAtUtcMilliseconds:
          current.expiresAtUtcMilliseconds,
      })
    }
    this.generation += 1
    this.fence = freezeFence({
      ownerToken,
      generation: this.generation,
      expiresAtUtcMilliseconds:
        nowUtcMilliseconds + leaseDurationMilliseconds,
    })
    return Object.freeze({
      acquired: true as const,
      fence: this.fence,
    })
  }

  async renewWriterLease(
    fence: WriterLeaseFence,
    nowUtcMilliseconds: number,
    leaseDurationMilliseconds: number,
  ): Promise<WriterLeaseFence> {
    this.assertFence(fence, nowUtcMilliseconds)
    this.fence = freezeFence({
      ...fence,
      expiresAtUtcMilliseconds:
        nowUtcMilliseconds + leaseDurationMilliseconds,
    })
    return this.fence
  }

  async releaseWriterLease(fence: WriterLeaseFence): Promise<boolean> {
    if (!sameFence(this.fence, fence)) return false
    this.fence = null
    return true
  }

  async inspectWriterLease(): Promise<WriterLeaseFence | null> {
    return this.fence
  }

  fileExists(_path: string): Promise<boolean> {
    return nativeFileOperationError()
  }

  readFile(_path: string): Promise<string> {
    return nativeFileOperationError()
  }

  listLegacyCandidates(): Promise<readonly []> {
    return nativeFileOperationError()
  }

  mutateFiles(
    _mutation: BrowserSaveMutation,
    _fence: WriterLeaseFence,
    _nowUtcMilliseconds: number,
  ): Promise<void> {
    return nativeFileOperationError()
  }

  private assertFence(
    fence: WriterLeaseFence,
    nowUtcMilliseconds: number,
  ): void {
    if (
      !sameFence(this.fence, fence) ||
      fence.expiresAtUtcMilliseconds <= nowUtcMilliseconds
    ) {
      throw new WriterLeaseLostError(
        'The native renderer no longer owns its writer fence.',
      )
    }
  }
}

function freezeFence(
  fence: WriterLeaseFence,
): WriterLeaseFence {
  return Object.freeze({ ...fence })
}

function sameFence(
  current: WriterLeaseFence | null,
  expected: WriterLeaseFence,
): boolean {
  return current !== null &&
    current.ownerToken === expected.ownerToken &&
    current.generation === expected.generation &&
    current.expiresAtUtcMilliseconds ===
      expected.expiresAtUtcMilliseconds
}

function nativeFileOperationError<T>(): Promise<T> {
  return Promise.reject(new Error(
    'Native save bytes must use the rooted host filesystem bridge.',
  ))
}
