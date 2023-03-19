using System.Collections.Generic;

namespace Classes
{
    public class SkillTreeItem
    {
        public bool Owned;
        public int[] RequiredSkill;
        public int[] ShadowRequirements;
        public int[] ExclusvieWith;
        public int[] UnrefundableWith;

        public string SkillName;
        public string SkillNamePopup;
        public string SkillDescription;
        public string SkillTechnicalDescription;
        public bool Refundable = true;
        public int Cost = 1;
        public bool isFragment;
        public bool purityLine;
        public bool terraLine;
        public bool powerLine;
        public bool paragadeLine;
        public bool stellarLine;
        public bool firstRunBlocked;
    }
}