using System;
using System.Collections.Generic;
using UnityEngine;

namespace SA.iOS.GameKit
{
    [Serializable]
    class ISN_GKScoreRequest
    {
        [SerializeField]
        List<ISN_GKScore> m_Scores;

        public ISN_GKScoreRequest(List<ISN_GKScore> scores)
        {
            m_Scores = scores;
        }

        /// <summary>
        /// Scores to submit
        /// </summary>
        public List<ISN_GKScore> Scores => m_Scores;
    }
}
