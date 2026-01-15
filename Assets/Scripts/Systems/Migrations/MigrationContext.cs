using Expansion;

namespace Systems.Migrations
{
    public sealed class MigrationContext
    {
        public MigrationContext(Oracle oracle, Oracle.SaveDataSettings saveData, bool isDryRun)
        {
            Oracle = oracle;
            SaveData = saveData;
            IsDryRun = isDryRun;
        }

        public Oracle Oracle { get; }
        public Oracle.SaveDataSettings SaveData { get; }
        public bool IsDryRun { get; }

        public Oracle.DysonVerseSaveData DysonVerseSaveData => SaveData?.dysonVerseSaveData;
        public Oracle.DysonVerseInfinityData InfinityData => DysonVerseSaveData?.dysonVerseInfinityData;
        public Oracle.DysonVersePrestigeData PrestigeData => DysonVerseSaveData?.dysonVersePrestigeData;
        public Oracle.DysonVerseSkillTreeData SkillTreeData => DysonVerseSaveData?.dysonVerseSkillTreeData;
        public Oracle.PrestigePlus PrestigePlus => SaveData?.prestigePlus;
        public Oracle.AvocadoData AvocadoData => SaveData?.avocadoData;
    }
}
