namespace SA.iOS.UIKit
{
    /// <summary>
    /// Static class with the collection of dialogs helper methods.
    /// </summary>
    public static class ISN_UIAlertUtility
    {
        /// <summary>
        /// Creates new simple alert and immediately shows it.
        /// </summary>
        /// <param name="title">Alert title.</param>
        /// <param name="message">Alert message.</param>
        public static void ShowMessage(string title, string message)
        {
            var alert = new ISN_UIAlertController(title, message, ISN_UIAlertControllerStyle.Alert);
            var defaultAction = new ISN_UIAlertAction("Ok", ISN_UIAlertActionStyle.Default, () =>
            {
                //Do nothing
            });

            alert.AddAction(defaultAction);
            alert.Present();
        }
    }
}
