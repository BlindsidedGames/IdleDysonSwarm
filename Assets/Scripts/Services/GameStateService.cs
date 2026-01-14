using Buildings;
using Expansion;
using Systems;
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
        public PrestigePlus PrestigePlus => StaticSaveSettings.prestigePlus;
        public SecretBuffState Secrets => ModifierSystem.BuildSecretBuffState(StaticPrestigeData);
        public SaveDataSettings SaveSettings => StaticSaveSettings;

        public double Science
        {
            get => Oracle.Science;
            set => Oracle.Science = value;
        }

        public BuyMode ResearchBuyMode => StaticResearchBuyMode;
        public bool RoundedBulkBuy => StaticRoundedBulkBuy;

        public double GetResearchLevel(string researchId)
        {
            return Oracle.GetResearchLevel(researchId);
        }

        public void SetResearchLevel(string researchId, double level)
        {
            Oracle.SetResearchLevel(researchId, level);
        }
    }
}
