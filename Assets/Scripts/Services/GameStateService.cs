using Buildings;
using Expansion;
using Systems;
using static Expansion.Oracle;

namespace IdleDysonSwarm.Services
{
    /*
     * GameStateService
     * Purpose: Adapter exposing Oracle-backed runtime save state through IGameStateService.
     * Runs: Runtime.
     * Primary entry points: property getters and GetResearchLevel/SetResearchLevel.
     * Owns vs delegates: Owns null-safe adapter behavior; delegates persistence/storage to Oracle.
     *
     * Interacts with:
     * - Assets/Scripts/Expansion/Oracle.cs
     * - Assets/Scripts/Services/IGameStateService.cs
     *
     * Change notes:
     * - Accessors intentionally return preload-safe defaults until Oracle save state is ready.
     * - Changing fallback defaults can alter first-frame UI behavior before Load() completes.
     */
    /// <summary>
    /// Default implementation of IGameStateService that wraps Oracle static access.
    /// This adapter allows gradual migration from static access to dependency injection.
    /// </summary>
    public sealed class GameStateService : IGameStateService
    {
        public DysonVerseInfinityData InfinityData => StaticInfinityData;
        public DysonVersePrestigeData PrestigeData => StaticPrestigeData;
        public DysonVerseSkillTreeData SkillTreeData => StaticSkillTreeData;
        public PrestigePlus PrestigePlus => StaticSaveSettings != null ? StaticSaveSettings.prestigePlus : null;
        public SecretBuffState Secrets => ModifierSystem.BuildSecretBuffState(StaticPrestigeData);
        public SaveDataSettings SaveSettings => StaticSaveSettings;

        public double Science
        {
            get => Oracle.Science;
            set => Oracle.Science = value;
        }

        public BuyMode ResearchBuyMode => StaticSaveSettings != null ? StaticResearchBuyMode : BuyMode.Buy1;
        public bool RoundedBulkBuy => StaticSaveSettings != null && StaticRoundedBulkBuy;

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
