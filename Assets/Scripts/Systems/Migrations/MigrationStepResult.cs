namespace Systems.Migrations
{
    public sealed class MigrationStepResult
    {
        public MigrationStep Step { get; set; }
        public MigrationSnapshot Before { get; set; }
        public MigrationSnapshot After { get; set; }
        public bool Applied { get; set; }
        public string Error { get; set; }
        public string ValidationMessage { get; set; }
    }
}
