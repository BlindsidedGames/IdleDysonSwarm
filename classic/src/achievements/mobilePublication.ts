import type { AchievementFacts, AchievementPublication } from './contracts'

/** Only neutral evidence crosses the bridge; native hosts own IDs and accounts. */
export interface MobileAchievementPlugin {
  achievementStatus(): Promise<{ available: boolean }>
  submitAchievements(request: { unlocked: readonly string[] }): Promise<void>
}

export class MobileAchievementPublication implements AchievementPublication {
  readonly persistEvidence = true
  private latest: readonly string[] = []
  private nextAttempt = 0
  private inFlight: Promise<void> | undefined

  private readonly plugin: MobileAchievementPlugin
  private readonly now: () => number

  constructor(plugin: MobileAchievementPlugin, now = Date.now) {
    this.plugin = plugin
    this.now = now
  }

  async available(): Promise<boolean> {
    try { return (await this.plugin.achievementStatus()).available } catch { return false }
  }

  submit(facts: Readonly<AchievementFacts>): Promise<void> {
    // Replace, never union: importing a save must not inherit another save's queue.
    this.latest = [...new Set(facts.unlocked)].sort()
    return this.now() >= this.nextAttempt ? this.flush() : Promise.resolve()
  }

  flush(): Promise<void> {
    if (this.inFlight) return this.inFlight
    if (this.latest.length === 0) return Promise.resolve()
    this.nextAttempt = this.now() + 30_000
    const unlocked = [...this.latest]
    this.inFlight = Promise.resolve().then(() => this.plugin.submitAchievements({ unlocked }))
      .finally(() => { this.inFlight = undefined })
    return this.inFlight
  }
}
