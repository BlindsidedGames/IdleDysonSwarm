/** Provider-neutral publication. Platform IDs and account tokens never cross this port. */
export interface AchievementFacts {
  readonly unlocked: readonly string[]
  readonly statistics: Readonly<Record<string, number>>
  readonly presence: string
  readonly progression?: { readonly bots: number; readonly infinityPoints: string; readonly quantumPoints: string; readonly avocadoMultiplier: number; readonly realityUnlocked: boolean; readonly avocadoUnlocked: boolean }
}
export interface AchievementPublication {
  available(): Promise<boolean>
  submit(facts: Readonly<AchievementFacts>): Promise<void>
  flush(): Promise<void>
}
