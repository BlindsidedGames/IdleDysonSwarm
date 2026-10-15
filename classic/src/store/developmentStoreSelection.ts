export type BrowserStoreAdapterKind = 'development' | 'stripe'

export interface BrowserStoreBuildEnvironment {
  readonly developmentBuild: boolean
  readonly mode: string
}

/** Pure selection policy; production composition also wraps this in DEV. */
export function selectBrowserStoreAdapterKind(
  environment: Readonly<BrowserStoreBuildEnvironment>,
): BrowserStoreAdapterKind {
  return environment.developmentBuild &&
    environment.mode !== 'development-stripe'
    ? 'development'
    : 'stripe'
}
