namespace SA.iOS.GameKit
{
    /// <summary>
    /// An object that allows players to view and manage their Game Center information from within your game.
    ///
    /// The access point displays a control in a corner of your game that opens a Game Center dashboard
    /// when the player taps or clicks it.
    ///
    /// Set <see cref="Active"/> to YES to display the access point control.
    /// To change the default location of the control, use the <see cref="Location"/> property.
    /// </summary>
    public static class GKAccessPoint
    {

        /// <summary>
        /// A Boolean value that determines whether to display the access point.
        /// </summary>
        public static bool Active
        {
            get => GKAccessPointNative._ISN_GKAccessPoint_getActive();
            set => GKAccessPointNative._ISN_GKAccessPoint_setActive(value);
        }

        /// <summary>
        /// The corner of the screen to display the access point.
        /// </summary>
        public static GKAccessPointLocation Location
        {
            get => (GKAccessPointLocation)GKAccessPointNative._ISN_GKAccessPoint_getLocation();
            set => GKAccessPointNative._ISN_GKAccessPoint_setLocation((int) value);
        }

        /// <summary>
        /// A Boolean value that indicates whether the game is presenting the Game Center dashboard.
        /// This property is `true` when the player taps the access point control
        /// and `false` when the player dismisses the Game Center dashboard.
        /// </summary>
        public static bool IsPresentingGameCenter => GKAccessPointNative._ISN_GKAccessPoint_getIsPresentingGameCenter();

        /// <summary>
        /// A Boolean value that indicates whether the access point is visible.
        /// On Apple TV, you can set this property to YES to move the focus to the access point.
        /// </summary>
        public static bool Visible => GKAccessPointNative._ISN_GKAccessPoint_getVisible();

        /// <summary>
        /// A Boolean value that indicates whether to display highlights for achievements
        /// and current ranks for leaderboards.
        /// </summary>
        public static bool ShowHighlights
        {
            get => GKAccessPointNative._ISN_GKAccessPoint_getShowHighlights();
            set => GKAccessPointNative._ISN_GKAccessPoint_setShowHighlights(value);
        }
    }
}
