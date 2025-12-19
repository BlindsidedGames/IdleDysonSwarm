import { z } from "zod";

import buildingsJson from "./dysonverse/buildings.json";
import researchJson from "./dysonverse/research.json";
import panelLifetimeJson from "./dysonverse/panelLifetime.json";
import progressionJson from "./dysonverse/progression.json";
import realityCostsJson from "./reality/costs.json";
import skillTreeJson from "./dysonverse/skillTree.json";
import skillTreeAutoBuyJson from "./dysonverse/skillTreeAutoBuy.json";
import skillTreeLayoutJson from "./dysonverse/skillTreeLayout.json";
import skillTreeIconsJson from "./dysonverse/skillTreeIcons.json";

const SourceSchema = z.object({
  script: z.string().optional(),
  oracleScript: z.string().optional(),
  gameManagerScript: z.string().optional(),
  scene: z.string().optional(),
  prefab: z.string().optional(),
  nestedPrefab: z.string().optional(),
  iconsDir: z.string().optional(),
});

const BuildingSchema = z.object({
  id: z.enum(["assemblyLines", "managers", "servers", "dataCenters", "planets"]),
  name: z.string(),
  baseCost: z.number(),
  exponent: z.number(),
  wordUsed: z.string(),
  productionWordUsed: z.string(),
  source: SourceSchema,
});

const ResearchUpgradeSchema = z.object({
  id: z.string(),
  name: z.string(),
  baseCost: z.number(),
  exponent: z.number(),
  notes: z.array(z.string()),
  source: SourceSchema,
});

const PanelLifetimeUpgradeSchema = z.object({
  id: z.number().int(),
  cost: z.number(),
  saveFlag: z.string(),
  baseLifetimeSecondsDelta: z.number(),
  source: SourceSchema,
});

const DysonverseProgressionSchema = z.object({
  infinityExponent: z.number(),
  maxInfinityBuff: z.number(),
  source: SourceSchema,
});

const RealityCostsSchema = z.object({
  translation: z.array(z.number().int()).length(8),
  speed: z.array(z.number().int()).length(8),
  source: SourceSchema,
});

const SkillTreeSkillSchema = z.object({
  id: z.number().int(),
  key: z.string(),
  skillName: z.string(),
  skillNamePopup: z.string(),
  skillDescription: z.string(),
  skillTechnicalDescription: z.string(),
  cost: z.number().int(),
  requirements: z.array(z.number().int()).default([]),
  shadowRequirements: z.array(z.number().int()).default([]),
  exclusiveWith: z.array(z.number().int()).default([]),
  unrefundableWith: z.array(z.number().int()).default([]),
  refundable: z.boolean(),
  isFragment: z.boolean(),
  purityLine: z.boolean(),
  terraLine: z.boolean(),
  powerLine: z.boolean(),
  paragadeLine: z.boolean(),
  stellarLine: z.boolean(),
  firstRunBlocked: z.boolean(),
  source: SourceSchema.optional(),
});

const SkillTreeAutoBuySchema = z.object({
  doNotAutoBuy: z.array(z.number().int()),
  source: SourceSchema,
});

const SkillTreeLayoutSchema = z.object({
  nodes: z.array(
    z.object({
      id: z.number().int(),
      x: z.number(),
      y: z.number(),
    }),
  ),
  source: SourceSchema,
});

const SkillTreeIconSchema = z.object({
  id: z.number().int(),
  fileName: z.string(),
  spriteGuid: z.string(),
  sourcePng: z.string(),
});

const SkillTreeIconsSchema = z.object({
  icons: z.array(SkillTreeIconSchema),
  source: SourceSchema,
});

export type DysonverseBuilding = z.infer<typeof BuildingSchema>;
export type DysonverseResearchUpgrade = z.infer<typeof ResearchUpgradeSchema>;
export type DysonversePanelLifetimeUpgrade = z.infer<typeof PanelLifetimeUpgradeSchema>;
export type DysonverseProgression = z.infer<typeof DysonverseProgressionSchema>;
export type RealityCosts = z.infer<typeof RealityCostsSchema>;
export type SkillTreeSkill = z.infer<typeof SkillTreeSkillSchema>;
export type SkillTreeAutoBuy = z.infer<typeof SkillTreeAutoBuySchema>;
export type SkillTreeLayout = z.infer<typeof SkillTreeLayoutSchema>;
export type SkillTreeIcons = z.infer<typeof SkillTreeIconsSchema>;

export const DysonverseBuildings = z.array(BuildingSchema).parse(buildingsJson);
export const DysonverseResearch = z.array(ResearchUpgradeSchema).parse(researchJson);
export const DysonversePanelLifetime = z.array(PanelLifetimeUpgradeSchema).parse(panelLifetimeJson);
export const DysonverseProgression = DysonverseProgressionSchema.parse(progressionJson);
export const RealityCosts = RealityCostsSchema.parse(realityCostsJson);
export const DysonverseSkillTree = z.array(SkillTreeSkillSchema).parse(skillTreeJson);
export const DysonverseSkillTreeAutoBuy = SkillTreeAutoBuySchema.parse(skillTreeAutoBuyJson);
export const DysonverseSkillTreeLayout = SkillTreeLayoutSchema.parse(skillTreeLayoutJson);
export const DysonverseSkillTreeIcons = SkillTreeIconsSchema.parse(skillTreeIconsJson);
