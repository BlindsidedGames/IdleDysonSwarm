import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function parseIdToKeyMapFromSetSkills(csSource) {
  /** @type {Map<number, string>} */
  const map = new Map();
  const caseRegex =
    /case\s+(\d+)\s*:\s*[\r\n]+\s*dvst\.([A-Za-z0-9_]+)\s*=\s*variable\.Value\.Owned\s*;/g;

  let match;
  while ((match = caseRegex.exec(csSource)) !== null) {
    const id = Number.parseInt(match[1], 10);
    const key = match[2];
    if (!Number.isFinite(id)) continue;
    map.set(id, key);
  }

  if (map.size !== 104) {
    throw new Error(`Expected 104 case mappings in SetSkillsOnOracle.cs, got ${map.size}`);
  }

  for (let i = 1; i <= 104; i++) {
    if (!map.has(i)) throw new Error(`Missing dvst mapping for skill id ${i}`);
  }

  return map;
}

function readLines(filePath) {
  return fs.readFileSync(filePath, "utf8").split(/\r?\n/);
}

function parseSerializationNodesFromOracleScene(lines) {
  const ORACLE_SCRIPT_GUID = "5c4391467e34f6a47a300839bfd03dd0";
  const guidLineIndex = lines.findIndex((l) => l.includes(`guid: ${ORACLE_SCRIPT_GUID}`));
  if (guidLineIndex === -1) {
    throw new Error(`Could not find Oracle MonoBehaviour guid ${ORACLE_SCRIPT_GUID} in scene`);
  }

  const nodesHeaderIndex = lines.findIndex(
    (l, idx) => idx > guidLineIndex && l.trim() === "SerializationNodes:",
  );
  if (nodesHeaderIndex === -1) {
    throw new Error(`Could not find SerializationNodes after Oracle guid`);
  }

  /** @type {Array<{name: string, entry: number, data: string}>} */
  const nodes = [];

  for (let i = nodesHeaderIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.startsWith("    - Name:")) {
      if (nodes.length > 0) break;
      continue;
    }

    const name = line.slice("    - Name:".length).trim();
    const entryLine = lines[i + 1] ?? "";
    const dataLine = lines[i + 2] ?? "";
    if (!entryLine.trimStart().startsWith("Entry:") || !dataLine.trimStart().startsWith("Data:")) {
      throw new Error(`Malformed SerializationNodes item at line ${i + 1}`);
    }

    const entry = Number.parseInt(entryLine.split(":")[1].trim(), 10);
    let data = dataLine.split(":").slice(1).join(":").trimEnd();

    let j = i + 3;
    while (j < lines.length && !lines[j].startsWith("    - Name:")) {
      if (lines[j].startsWith("      ")) {
        const continuation = lines[j].trimEnd();
        if (continuation.length > 0) data += "\n" + continuation.trimStart();
      }
      j++;
    }

    nodes.push({ name, entry, data });
    i = j - 1;
  }

  if (nodes.length < 10) throw new Error(`Unexpectedly small SerializationNodes list (${nodes.length})`);
  return nodes;
}

function parseIntArrayFromNodes(nodes, startIndex) {
  const lengthNode = nodes[startIndex + 1];
  if (!lengthNode || lengthNode.entry !== 14) {
    throw new Error(`Expected int[] length node at index ${startIndex + 1}`);
  }
  const length = Number.parseInt(lengthNode.data.trim().split(/\s+/)[0], 10);
  if (!Number.isFinite(length) || length < 0) throw new Error(`Invalid int[] length: ${lengthNode.data}`);

  const values = [];
  for (let i = 0; i < length; i++) {
    const valueNode = nodes[startIndex + 2 + i];
    if (!valueNode || valueNode.entry !== 3) {
      throw new Error(`Expected int[] value node at index ${startIndex + 2 + i}`);
    }
    const v = Number.parseInt(valueNode.data.trim().split(/\s+/)[0], 10);
    if (!Number.isFinite(v)) throw new Error(`Invalid int value: ${valueNode.data}`);
    values.push(v);
  }
  return { values, endIndexExclusive: startIndex + 2 + length };
}

function parseBool(data) {
  return data.trim() === "true";
}

function parseSkillTree(nodes) {
  const skillTreeIndex = nodes.findIndex((n) => n.name === "SkillTree");
  if (skillTreeIndex === -1) throw new Error(`Could not find SkillTree node`);

  let expectedCount = null;
  /** @type {Map<number, any>} */
  const skillsById = new Map();

  let currentId = null;
  for (let i = skillTreeIndex; i < nodes.length; i++) {
    const n = nodes[i];

    if (expectedCount == null && n.entry === 12) {
      const count = Number.parseInt(n.data.trim().split(/\s+/)[0], 10);
      if (Number.isFinite(count) && count > 0) expectedCount = count;
    }

    if (n.name === "$k" && n.entry === 3) {
      currentId = Number.parseInt(n.data.trim().split(/\s+/)[0], 10);
      if (!Number.isFinite(currentId)) throw new Error(`Invalid skill id at node ${i}: ${n.data}`);
      skillsById.set(currentId, {
        id: currentId,
        requirements: [],
        shadowRequirements: [],
        exclusiveWith: [],
        unrefundableWith: [],
      });
      continue;
    }

    if (currentId == null) continue;
    const skill = skillsById.get(currentId);
    if (!skill) continue;

    if (n.name === "RequiredSkill") {
      if (n.entry === 6 || n.data.trim() === "") {
        skill.requirements = [];
      } else {
        const { values, endIndexExclusive } = parseIntArrayFromNodes(nodes, i);
        skill.requirements = values;
        i = endIndexExclusive - 1;
      }
    } else if (n.name === "ShadowRequirements") {
      if (n.entry === 6 || n.data.trim() === "") {
        skill.shadowRequirements = [];
      } else {
        const { values, endIndexExclusive } = parseIntArrayFromNodes(nodes, i);
        skill.shadowRequirements = values;
        i = endIndexExclusive - 1;
      }
    } else if (n.name === "ExclusvieWith") {
      if (n.entry === 6 || n.data.trim() === "") {
        skill.exclusiveWith = [];
      } else {
        const { values, endIndexExclusive } = parseIntArrayFromNodes(nodes, i);
        skill.exclusiveWith = values;
        i = endIndexExclusive - 1;
      }
    } else if (n.name === "UnrefundableWith") {
      if (n.entry === 6 || n.data.trim() === "") {
        skill.unrefundableWith = [];
      } else {
        const { values, endIndexExclusive } = parseIntArrayFromNodes(nodes, i);
        skill.unrefundableWith = values;
        i = endIndexExclusive - 1;
      }
    } else if (n.name === "SkillName") {
      skill.skillName = n.data.replaceAll(/\s*\n\s*/g, " ").trim();
    } else if (n.name === "SkillNamePopup") {
      skill.skillNamePopup = n.data.replaceAll(/\s*\n\s*/g, " ").trim();
    } else if (n.name === "SkillDescription") {
      skill.skillDescription = n.data.replaceAll(/\s*\n\s*/g, " ").trim();
    } else if (n.name === "SkillTechnicalDescription") {
      skill.skillTechnicalDescription = n.data.replaceAll(/\s*\n\s*/g, " ").trim();
    } else if (n.name === "Refundable") {
      skill.refundable = parseBool(n.data);
    } else if (n.name === "Cost") {
      const cost = Number.parseInt(n.data.trim().split(/\s+/)[0], 10);
      if (!Number.isFinite(cost)) throw new Error(`Invalid cost for skill ${currentId}: ${n.data}`);
      skill.cost = cost;
    } else if (n.name === "isFragment") {
      skill.isFragment = parseBool(n.data);
    } else if (n.name === "purityLine") {
      skill.purityLine = parseBool(n.data);
    } else if (n.name === "terraLine") {
      skill.terraLine = parseBool(n.data);
    } else if (n.name === "powerLine") {
      skill.powerLine = parseBool(n.data);
    } else if (n.name === "paragadeLine") {
      skill.paragadeLine = parseBool(n.data);
    } else if (n.name === "stellarLine") {
      skill.stellarLine = parseBool(n.data);
    } else if (n.name === "firstRunBlocked") {
      skill.firstRunBlocked = parseBool(n.data);
    }

    if (expectedCount != null && skillsById.size === expectedCount) break;
  }

  if (expectedCount == null) throw new Error(`Failed to determine SkillTree count`);
  if (skillsById.size !== expectedCount) {
    throw new Error(`Expected ${expectedCount} skills, got ${skillsById.size}`);
  }

  return { skillsById, expectedCount };
}

function parseListOfSkillsNotToAutoBuy(sceneText) {
  const match = sceneText.match(/listOfSkillsNotToAutoBuy:\s*0b([0-9a-fA-F]+)/);
  if (!match) return [];

  let hex = match[1];
  if (hex.length % 2 === 1) hex += "0";

  const raw = Buffer.from(hex, "hex");
  const pad = (4 - (raw.length % 4)) % 4;
  const bytes = pad > 0 ? Buffer.concat([raw, Buffer.alloc(pad)]) : raw;

  const ids = [];
  for (let i = 0; i < bytes.length; i += 4) {
    const value = bytes.readUInt32BE(i);
    if (value > 0) ids.push(value);
  }

  return ids;
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../../..");

const scenePath = path.join(repoRoot, "UnityIDS/Assets/Scenes/Game.unity");
const setSkillsPath = path.join(repoRoot, "UnityIDS/Assets/Scripts/SkillTresStuff/SetSkillsOnOracle.cs");
const outPath = path.join(repoRoot, "packages/balance/src/dysonverse/skillTree.json");
const autoBuyOutPath = path.join(repoRoot, "packages/balance/src/dysonverse/skillTreeAutoBuy.json");

const setSkillsSource = fs.readFileSync(setSkillsPath, "utf8");
const idToKey = parseIdToKeyMapFromSetSkills(setSkillsSource);

const sceneText = fs.readFileSync(scenePath, "utf8");
const nodes = parseSerializationNodesFromOracleScene(sceneText.split(/\r?\n/));
const { skillsById, expectedCount } = parseSkillTree(nodes);

const skills = [];
for (let id = 1; id <= expectedCount; id++) {
  const data = skillsById.get(id);
  if (!data) throw new Error(`Missing parsed SkillTree item for id ${id}`);

  const key = idToKey.get(id);
  if (!key) throw new Error(`Missing SetSkillsOnOracle mapping for id ${id}`);

  skills.push({
    id,
    key,
    skillName: data.skillName ?? "",
    skillNamePopup: data.skillNamePopup ?? "",
    skillDescription: data.skillDescription ?? "",
    skillTechnicalDescription: data.skillTechnicalDescription ?? "",
    cost: data.cost ?? 1,
    requirements: data.requirements ?? [],
    shadowRequirements: data.shadowRequirements ?? [],
    exclusiveWith: data.exclusiveWith ?? [],
    unrefundableWith: data.unrefundableWith ?? [],
    refundable: data.refundable ?? true,
    isFragment: data.isFragment ?? false,
    purityLine: data.purityLine ?? false,
    terraLine: data.terraLine ?? false,
    powerLine: data.powerLine ?? false,
    paragadeLine: data.paragadeLine ?? false,
    stellarLine: data.stellarLine ?? false,
    firstRunBlocked: data.firstRunBlocked ?? false,
    source: {
      script: "UnityIDS/Assets/Scripts/SkillTresStuff/SetSkillsOnOracle.cs",
      scene: "UnityIDS/Assets/Scenes/Game.unity",
    },
  });
}

fs.writeFileSync(outPath, JSON.stringify(skills, null, 2) + "\n", "utf8");
console.log(`Wrote ${skills.length} skills to ${path.relative(repoRoot, outPath)}`);

const skillTreeAutoBuy = {
  doNotAutoBuy: parseListOfSkillsNotToAutoBuy(sceneText),
  source: {
    scene: "UnityIDS/Assets/Scenes/Game.unity",
  },
};
fs.writeFileSync(autoBuyOutPath, JSON.stringify(skillTreeAutoBuy, null, 2) + "\n", "utf8");
console.log(`Wrote SkillTree auto-buy settings to ${path.relative(repoRoot, autoBuyOutPath)}`);
