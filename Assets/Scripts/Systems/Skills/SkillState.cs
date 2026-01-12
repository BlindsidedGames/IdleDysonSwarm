using System;

namespace Systems.Skills
{
    [Serializable]
    public sealed class SkillState
    {
        public bool owned;
        public int level;
        public double timerSeconds;
        public double secondaryTimerSeconds;
    }
}
