namespace SA.Foundation.Editor
{
    public interface SA_iAPIResolver
    {
        bool IsSettingsEnabled { get; set; }
        void ResetRequirementsCache();
    }
}
