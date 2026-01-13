using Expansion;
using static Expansion.Oracle;

namespace IdleDysonSwarm.Services
{
    /// <summary>
    /// Default implementation of IGameStateService that wraps Oracle static access.
    /// This adapter allows gradual migration from static access to dependency injection.
    /// </summary>
    public sealed class GameStateService : IGameStateService
    {
        public DysonVerseInfinityData InfinityData => StaticInfinityData;
        public DysonVersePrestigeData PrestigeData => StaticPrestigeData;
        public DysonVerseSkillTreeData SkillTreeData => StaticSkillTreeData;
        public PrestigePlus PrestigePlus => StaticPrestigePlus;
        public SecretBuffState Secrets => StaticSecrets;
        public SaveDataSettings SaveSettings => StaticSaveSettings;
    }
}
