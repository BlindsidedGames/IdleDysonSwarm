import { describe, expect, test, vi } from 'vitest'
import { MobileAchievementPublication } from './mobilePublication'

describe('mobile publication', () => {
  test('bounds retries and replaces evidence when a different save opens', async () => {
    let now = 0
    const submitAchievements = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined)
    const publication = new MobileAchievementPublication({ submitAchievements, achievementStatus: async () => ({available:true}) }, () => now)
    const facts = { unlocked:['achievement.first_bot'], statistics:{}, presence:'' }
    await expect(publication.submit(facts)).rejects.toThrow('offline')
    await publication.submit(facts)
    expect(submitAchievements).toHaveBeenCalledTimes(1)
    now = 30_000
    await publication.submit(facts)
    expect(submitAchievements).toHaveBeenCalledTimes(2)
    await publication.submit({...facts, unlocked:[]})
    await publication.flush()
    expect(submitAchievements).toHaveBeenCalledTimes(2)
  })

  test('serializes reporting and periodically rechecks native account state', async () => {
    let resolve!: () => void
    const submitAchievements = vi.fn().mockImplementationOnce(() => new Promise<void>(r => {resolve=r})).mockResolvedValue(undefined)
    let now = 0
    const publication = new MobileAchievementPublication({ submitAchievements, achievementStatus: async () => ({available:true}) }, () => now)
    const facts = { unlocked:['achievement.first_bot'], statistics:{}, presence:'' }
    const first = publication.submit(facts)
    await Promise.resolve()
    expect(publication.flush()).toBe(first)
    resolve()
    await first
    now = 30_000
    await publication.submit(facts)
    expect(submitAchievements).toHaveBeenCalledTimes(2)
  })

  test('an unavailable native provider remains optional', async () => {
    const publication = new MobileAchievementPublication({ achievementStatus: async () => {throw new Error('unavailable')}, submitAchievements: async () => {} })
    expect(await publication.available()).toBe(false)
  })
})
