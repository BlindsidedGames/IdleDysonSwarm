using static Expansion.Oracle;

namespace Systems.Stats
{
    public readonly struct EffectContext
    {
        public EffectContext(DysonVerseInfinityData infinityData, DysonVersePrestigeData prestigeData,
            DysonVerseSkillTreeData skillTreeData, PrestigePlus prestigePlus)
        {
            InfinityData = infinityData;
            PrestigeData = prestigeData;
            SkillTreeData = skillTreeData;
            PrestigePlus = prestigePlus;
        }

        public DysonVerseInfinityData InfinityData { get; }
        public DysonVersePrestigeData PrestigeData { get; }
        public DysonVerseSkillTreeData SkillTreeData { get; }
        public PrestigePlus PrestigePlus { get; }
    }
}
