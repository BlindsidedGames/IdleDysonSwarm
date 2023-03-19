using System;
using System.Collections.Generic;
using UnityEngine;
using SA.Foundation.Templates;
using StansAssets.Foundation;

namespace SA.iOS.GameKit
{
    /// <summary>
    /// An object containing information for a score that was earned by the player.
    ///
    /// Your game creates GKScore objects to post scores to a leaderboard on Game Center.
    /// When your game retrieves score information from a leaderboard, those scores are returned as GKScore objects.
    /// </summary>
    [Serializable]
    public class ISN_GKScore
    {
        [SerializeField]
        long m_Rank = 0;
        [SerializeField]
        long m_Value = 0;
        [SerializeField]
        ulong m_Context = 0;
        [SerializeField]
        long m_Date = 0;

        [SerializeField]
        string m_FormattedValue = null;
        [SerializeField]
        string m_LeaderboardIdentifier = null;

        [SerializeField]
        ulong m_PlayerKey = 0;

        ISN_GKPlayer m_Player;

        public ISN_GKScore(string leaderboardIdentifier)
        {
            m_LeaderboardIdentifier = leaderboardIdentifier;
            m_Date = TimeUtility.ToUnixTime(DateTime.Now);
        }

        /// <summary>
        /// The position of the score in the results of a leaderboard search.
        ///
        /// The value of this property is only valid on score objects returned from Game Center.
        /// The rank property represents the position of the score in the returned results, with 1 being the best score, 2 being the second best, and so on.
        /// </summary>
        public long Rank => m_Rank;

        /// <summary>
        /// The score earned by the player.
        ///
        /// You can use any algorithm you want to calculate scores in your game.
        /// Your game must set the value property before reporting a score, otherwise an error is returned.
        ///
        /// The value provided by a score object is interpreted by Game Center only when formatted for display.
        /// You determine how your scores are formatted when you define the leaderboard on iTunes Connect.
        /// </summary>
        public long Value
        {
            get => m_Value;
            set => m_Value = value;
        }

        /// <summary>
        /// An integer value used by your game.
        ///
        /// The <see cref="Context"/> property is stored and returned to your game,
        /// but is otherwise ignored by Game Center.
        /// It allows your game to associate an arbitrary 32-bit unsigned integer value
        /// with the score data reported to Game Center.
        /// You decide how this integer value is interpreted by your game.
        /// For example, you might use the <see cref="Context"/> property
        /// to store flags that provide game-specific details about a player’s score,
        /// or you might use the context as a key to other data stored on the device or on your own server.
        /// The context is most useful when your game displays a custom leaderboard user interface.
        /// </summary>
        public ulong Context
        {
            get => m_Context;
            set => m_Context = value;
        }

        /// <summary>
        /// The date and time when the score was earned.
        ///
        /// When you initialize the new score object, the date property is automatically set to the current date and time.
        /// </summary>
        public DateTime Date => TimeUtility.FromUnixTime(m_Date);

        /// <summary>
        /// The <see cref="Date"/> field value as unix time stamp
        /// </summary>
        public long DateUnix => m_Date;

        /// <summary>
        /// Returns the player’s score as a localized string
        ///
        /// This property is invalid on a newly initialized score object.
        /// On a score returned from GameKit, it contains a formatted string based on the player’s score.
        /// You determine how a score is formatted when you define the leaderboard on iTunes Connect.
        ///
        /// Never convert the value property into a string directly; always use this method to receive the formatted string.
        ///
        /// <c>Important</c>
        /// You may be tempted to write your own formatting code rather than using the formattedValue property.
        /// Do not do this. Using the built-in support makes it easy to localize the score value into other languages,
        /// and provides a string that is consistent with the presentation of your scores in the Game Center app.
        /// </summary>
        public string FormattedValue => m_FormattedValue;

        /// <summary>
        /// The identifier for the leaderboard.
        /// </summary>
        public string LeaderboardIdentifier => m_LeaderboardIdentifier;

        /// <summary>
        /// The player identifier for the player that earned the score.
        ///
        /// When you initialize a new score object, the <see cref="Player"/> property
        /// is set to the identifier for the local player.
        /// If the score object was returned to your game by loading scores from Game Center,
        /// the <see cref="Player"/> property identifies the player who recorded that score.
        /// </summary>
        public ISN_GKPlayer Player => m_Player ?? (m_Player = new ISN_GKPlayer(m_PlayerKey));

        //--------------------------------------
        // Public Methods
        //--------------------------------------

        /// <summary>
        /// Reports score to Game Center
        /// Use this class method whenever you need to submit scores to Game Center.
        ///
        /// If you nee to report multiple scores, consider using the <see cref="ReportScores"/> method
        /// </summary>
        /// <param name="callback">A block to be called after the score is reported.</param>
        public void Report(Action<SA_Result> callback)
        {
            var scores = new List<ISN_GKScore>() { this };
            ReportScores(scores, callback);
        }

        //--------------------------------------
        // Public Static Methods
        //--------------------------------------

        /// <summary>
        /// Reports a list of scores to Game Center
        ///
        /// Use this class method whenever you need to submit scores to Game Center,
        /// whether you are reporting a single score or multiple scores.
        /// The method runs through the array of GKScore objects, submitting scores one at a time.
        ///
        /// Method provides a sample method to report a score.
        /// The <see cref="ISN_GKScore"/> object is initialized with the leaderboard ID
        /// for the leaderboard it reports its score to and then the value and context for the score are assigned.
        /// The leaderboard ID must be the identifier for a leaderboard you configured in iTunes Connect.
        /// Scores are always reported for the current local player and never for friends.
        /// </summary>
        /// <param name="scores">An array of <see cref="ISN_GKScore"/> objects that contains the scores to report to Game Center.</param>
        /// <param name="callback">A block to be called after the score is reported.</param>
        public static void ReportScores(List<ISN_GKScore> scores, Action<SA_Result> callback)
        {
            var request = new ISN_GKScoreRequest(scores);
            ISN_GKLib.Api.ReportScore(request, callback);
        }
    }
}
