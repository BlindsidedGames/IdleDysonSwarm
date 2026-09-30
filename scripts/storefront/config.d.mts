export interface StorefrontProfile {
  readonly id: string;
  readonly label: string;
  readonly width: number;
  readonly height: number;
  readonly deviceScaleFactor: number;
  readonly cpuThrottleRate: number;
  readonly finalWidth: number;
  readonly finalHeight: number;
  readonly shot: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly radius: number;
  };
  readonly thumb: number;
}

export interface StorefrontConfig {
  readonly repo: string;
  readonly root: string;
  readonly originals: string;
  readonly archive: string;
  readonly buildDirectory: string;
  readonly gameplayCommit: string;
  readonly workflowCommit: string;
  readonly version: string;
  readonly build: string;
  readonly frozenUtc: string;
  readonly originalArchiveLibraryId: string | null;
}

export const profiles: readonly StorefrontProfile[];
export function readConfig(): StorefrontConfig;
export function verifyGameplaySource(config: StorefrontConfig): string;
