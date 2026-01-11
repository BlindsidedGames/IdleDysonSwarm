namespace Systems.Stats
{
    [System.Serializable]
    public struct StatRef
    {
        public string Id;

        public bool IsValid => !string.IsNullOrEmpty(Id);

        public override string ToString()
        {
            return Id;
        }
    }
}
