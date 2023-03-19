namespace StansAssets.Plugins.Editor
{
    public interface ILayoutElementIMGUI
    {
        /// <summary>
        /// Draw a Layout element instance.
        /// </summary>
        void OnGUI();

        void OnLayoutEnable();
    }
}
