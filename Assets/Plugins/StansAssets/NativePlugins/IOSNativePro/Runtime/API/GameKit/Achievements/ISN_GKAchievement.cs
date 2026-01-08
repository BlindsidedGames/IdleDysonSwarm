using System;
using System.Collections.Generic;
using UnityEngine;
using SA.Foundation.Templates;
using StansAssets.Foundation;

namespace SA.iOS.GameKit
{
    /// <summary>
    /// An object that communicates with Game Center
    /// about the local player’s progress toward completing an achievement.
    /// </summary>
    [Serializable]
    public class ISN_GKAchievement
    {
        [SerializeField]
        string m_Identifier = null;
        [SerializeField]
        float m_PercentComplete = 0f;
        [SerializeField]
        long m_LastReportedDate = 0;

        //Editor only
        [SerializeField]
        string m_Name = "unset";

        public ISN_GKAchievement(string identifier)
        {
            m_Identifier = identifier;
        }

        //--------------------------------------
        // Get / Set
        //--------------------------------------

        /// <summary>
        /// A string used to uniquely identify the specific achievement the object refers to.
        /// The identifier property must match the identifier string
        /// for an achievement you created for your game on iTunes Connect.
        /// </summary>
        public string Identifier
        {
            get => m_Identifier;
            set => m_Identifier = value;
        }

        /// <summary>
        /// A percentage value that states how far the player has progressed on this achievement.
        ///
        /// The default value for a newly initialized achievement object is 0.0.
        /// The range of legal values is between 0.0 and 100.0, inclusive.
        /// You decide how that percentage is calculated and when it changes.
        /// For example, if the player earns an achievement simply for discovering a location in your game,
        /// then you would simply report the achievement as 100 percent complete
        /// the first time you report progress to Game Center.
        /// On the other hand, for an achievement like “Capture 10 pirates”,
        /// your reporting mechanism increments by 10 percent each time the player captures a pirate.
        /// </summary>
        public float PercentComplete
        {
            get => m_PercentComplete;
            set => m_PercentComplete = value;
        }

        /// <summary>
        /// A Boolean value that states whether the player has completed the achievement.
        ///
        /// The value of this property is <c>true</c> if the percentComplete property is equal to 100.0;
        /// otherwise, it is <c>false</c>.
        /// </summary>
        public bool Completed => m_PercentComplete >= 100f;

        /// <summary>
        /// The last time that progress on the achievement was successfully reported to Game Center.
        /// On a newly initialized achievement object, this property holds the current date.
        /// </summary>
        public DateTime LastReportedDate => TimeUtility.FromUnixTime(m_LastReportedDate);

        /// <summary>
        /// The Achievement name, can only be set via the editor.
        /// </summary>
        /// <value>The name.</value>
        public string Name
        {
            get => m_Name;
            set => m_Name = value;
        }

        //--------------------------------------
        // Public  Methods
        //--------------------------------------

        /// <summary>
        /// Reports progress of achievement.
        /// Consider using <see cref="ReportAchievements"/> instead
        /// </summary>
        /// <param name="callback">A block to be called after the operation completes.</param>
        public void Report(Action<SA_Result> callback)
        {
            var achievements = new List<ISN_GKAchievement>();
            achievements.Add(this);

            ReportAchievements(achievements, callback);
        }

        //--------------------------------------
        // Public Static Methods
        //--------------------------------------

        /// <summary>
        /// Returns list of achievements metadata from an editor settings ui.
        /// </summary>
        public static List<ISN_GKAchievement> GetGameAchievements()
        {
            return new List<ISN_GKAchievement>(ISN_Settings.Instance.Achievements);
        }

        /// <summary>
        /// Loads previously submitted achievement progress for the local player from Game Center.
        /// When this method is called, it creates a new background task to handle the request.
        /// The method then returns control to your game.
        /// Later, when the task is complete, Game Kit calls your completion handler.
        /// The completion handler is always called on the main thread. Listing 1 shows an example of how to load the local player’s achievements.
        ///
        /// </summary>
        /// <param name="callback">
        /// A block to be called when the download is completed.
        /// An array of <see cref="ISN_GKAchievement"/> objects that
        /// represents all progress reported to Game Center for the local player.
        /// If an error occurred, this parameter may be non-nil,
        /// in which case the array holds whatever achievement information Game Kit was able to fetch.
        /// </param>
        public static void LoadAchievements(Action<ISN_GKAchievementsResult> callback)
        {
            ISN_GKLib.Api.LoadAchievements(callback);
        }

        /// <summary>
        /// Resets all achievement progress for the local player.
        ///
        /// Calling this class method deletes all progress towards achievements previously reported for the local player.
        /// Hidden achievements that were previously visible are now hidden again.
        /// </summary>
        /// <param name="callback">A block to be called when the reset action is completed.</param>
        public static void ResetAchievements(Action<SA_Result> callback)
        {
            ISN_GKLib.Api.ResetAchievements(callback);
        }

        /// <summary>
        /// Reports progress on an array of achievements.
        ///
        /// Use this class method whenever you need to submit one or more achievement updates at the same time.
        /// Calling this method reports each of the achievements in the array.
        /// Processing multiple achievements at once allows the entire operation to be processed more efficiently
        /// using this method as the callback handler is only called once.
        /// </summary>
        /// <param name="achievements">
        /// An array of <see cref="ISN_GKAchievement"/> objects
        /// that contains the achievements whose progress is being updated.
        /// </param>
        /// <param name="callback">
        /// A block to be called after the operation completes.
        /// </param>
        public static void ReportAchievements(List<ISN_GKAchievement> achievements, Action<SA_Result> callback)
        {
            ISN_GKLib.Api.ReportAchievements(achievements, callback);
        }
    }
}
