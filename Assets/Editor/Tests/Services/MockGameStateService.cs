using Buildings;
using Expansion;
using IdleDysonSwarm.Services;
using Systems;
using static Expansion.Oracle;

namespace Tests.Services
{
    /// <summary>
    /// Mock implementation of IGameStateService for unit testing.
    /// Provides controllable, in-memory game state without Oracle dependency.
    /// </summary>
    public class MockGameStateService : IGameStateService
    {
        // Backing fields for mock data
        private DysonVerseInfinityData _infinityData = new DysonVerseInfinityData();
        private DysonVersePrestigeData _prestigeData = new DysonVersePrestigeData();
        private DysonVerseSkillTreeData _skillTreeData = new DysonVerseSkillTreeData();
        private PrestigePlus _prestigePlus = new PrestigePlus();
        private SecretBuffState _secrets = new SecretBuffState();
        private SaveDataSettings _saveSettings = new SaveDataSettings();
        private double _science;
        private BuyMode _researchBuyMode = BuyMode.Buy1;
        private bool _roundedBulkBuy;

        // Properties
        public DysonVerseInfinityData InfinityData => _infinityData;
        public DysonVersePrestigeData PrestigeData => _prestigeData;
        public DysonVerseSkillTreeData SkillTreeData => _skillTreeData;
        public PrestigePlus PrestigePlus => _prestigePlus;
        public SecretBuffState Secrets => _secrets;
        public SaveDataSettings SaveSettings => _saveSettings;

        public double Science
        {
            get => _science;
            set => _science = value;
        }

        public BuyMode ResearchBuyMode => _researchBuyMode;
        public bool RoundedBulkBuy => _roundedBulkBuy;

        // Methods to configure mock state for tests
        public void SetScience(double value) => _science = value;
        public void SetResearchBuyMode(BuyMode mode) => _researchBuyMode = mode;
        public void SetRoundedBulkBuy(bool value) => _roundedBulkBuy = value;

        // Research level tracking (simplified in-memory dictionary)
        private readonly System.Collections.Generic.Dictionary<string, double> _researchLevels =
            new System.Collections.Generic.Dictionary<string, double>();

        public double GetResearchLevel(string researchId)
        {
            return _researchLevels.TryGetValue(researchId, out double level) ? level : 0;
        }

        public void SetResearchLevel(string researchId, double level)
        {
            _researchLevels[researchId] = level;
        }
    }
}
