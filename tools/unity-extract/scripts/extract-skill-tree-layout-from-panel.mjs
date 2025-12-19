import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SKILL_BUTTON_PREFAB_GUID = "63def614896650346ad3eab31ba9e48b";

function readLines(filePath) {
  return fs.readFileSync(filePath, "utf8").split(/\r?\n/);
}

function parseRootComponentIdsFromSkillButtonPrefab(lines) {
  const nameLineIndex = lines.findIndex((l) => l.trim() === "m_Name: SkillButtonPrefab");
  if (nameLineIndex === -1) throw new Error(`Could not find SkillButtonPrefab GameObject name`);

  let gameObjectHeaderIndex = nameLineIndex;
  while (gameObjectHeaderIndex >= 0 && !lines[gameObjectHeaderIndex].startsWith("--- !u!1 &")) {
    gameObjectHeaderIndex--;
  }
  if (gameObjectHeaderIndex < 0) throw new Error(`Could not locate SkillButtonPrefab GameObject header`);

  /** @type {string[]} */
  const componentFileIds = [];
  for (let i = gameObjectHeaderIndex; i < lines.length; i++) {
    const line = lines[i];
    if (i > gameObjectHeaderIndex && line.startsWith("--- !u!")) break;
    const match = line.trim().match(/^- component: \{fileID: (\d+)\}$/);
    if (!match) continue;
    componentFileIds.push(match[1]);
  }

  /** @type {string | null} */
  let rectTransformFileId = null;
  /** @type {string | null} */
  let monoBehaviourFileId = null;

  for (const fileId of componentFileIds) {
    if (lines.some((l) => l.startsWith(`--- !u!224 &${fileId}`))) rectTransformFileId = fileId;
    if (lines.some((l) => l.startsWith(`--- !u!114 &${fileId}`))) monoBehaviourFileId = fileId;
  }

  if (rectTransformFileId == null) throw new Error(`Failed to locate root RectTransform component for SkillButtonPrefab`);
  if (monoBehaviourFileId == null) throw new Error(`Failed to locate root MonoBehaviour component for SkillButtonPrefab`);

  return { rectTransformFileId, monoBehaviourFileId };
}

function parseLayoutFromPanelPrefab(lines, ids) {
  /** @type {Array<{id: number, x: number, y: number}>} */
  const nodes = [];

  /** @type {{ skillKey: number | null, x: number | null, y: number | null, target: {fileId: string, guid: string} | null } | null} */
  let current = null;

  function flush() {
    if (!current) return;
    const { skillKey, x, y } = current;
    if (skillKey != null && x != null && y != null) nodes.push({ id: skillKey, x, y });
    current = null;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("--- !u!")) {
      flush();
      if (line.startsWith("--- !u!1001 &")) {
        current = { skillKey: null, x: null, y: null, target: null };
      }
      continue;
    }

    if (!current) continue;

    const targetMatch = line.trim().match(/^- target: \{fileID: (\d+), guid: ([0-9a-fA-F]+), type: \d+\}$/);
    if (targetMatch) {
      const fileId = targetMatch[1];
      const guid = targetMatch[2];
      if (fileId && guid) current.target = { fileId, guid };
      continue;
    }

    const propMatch = line.trim().match(/^propertyPath: (.+)$/);
    if (!propMatch) continue;
    if (!current.target) continue;
    if (current.target.guid !== SKILL_BUTTON_PREFAB_GUID) continue;

    const propertyPath = propMatch[1];
    const valueLine = lines[i + 1]?.trim() ?? "";
    const valueMatch = valueLine.match(/^value: (.+)$/);
    if (!valueMatch) continue;

    const raw = valueMatch[1];
    if (propertyPath === "skillKey" && current.target.fileId === ids.monoBehaviourFileId) {
      const skillKey = Number.parseInt(raw, 10);
      if (Number.isFinite(skillKey)) current.skillKey = skillKey;
    } else if (propertyPath === "m_AnchoredPosition.x" && current.target.fileId === ids.rectTransformFileId) {
      const x = Number.parseFloat(raw);
      if (Number.isFinite(x)) current.x = x;
    } else if (propertyPath === "m_AnchoredPosition.y" && current.target.fileId === ids.rectTransformFileId) {
      const y = Number.parseFloat(raw);
      if (Number.isFinite(y)) current.y = y;
    }
  }

  flush();

  const byId = new Map();
  for (const node of nodes) {
    if (byId.has(node.id)) throw new Error(`Duplicate skillKey ${node.id} in parsed layout`);
    byId.set(node.id, node);
  }

  if (byId.size !== 104) {
    throw new Error(`Expected 104 SkillButtonPrefab instances, got ${byId.size}`);
  }

  for (let i = 1; i <= 104; i++) {
    if (!byId.has(i)) throw new Error(`Missing skillKey ${i} in parsed layout`);
  }

  return Array.from(byId.values()).sort((a, b) => a.id - b.id);
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../../..");

const panelPrefabPath = path.join(repoRoot, "UnityIDS/Assets/Prefabs/Panel.prefab");
const skillButtonPrefabPath = path.join(repoRoot, "UnityIDS/Assets/Prefabs/SkillButtonPrefab.prefab");
const outPath = path.join(repoRoot, "packages/balance/src/dysonverse/skillTreeLayout.json");

const skillButtonLines = readLines(skillButtonPrefabPath);
const ids = parseRootComponentIdsFromSkillButtonPrefab(skillButtonLines);

const panelLines = readLines(panelPrefabPath);
const nodes = parseLayoutFromPanelPrefab(panelLines, ids);

const out = {
  nodes,
  source: {
    prefab: "UnityIDS/Assets/Prefabs/Panel.prefab",
    nestedPrefab: "UnityIDS/Assets/Prefabs/SkillButtonPrefab.prefab",
  },
};

fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n", "utf8");
console.log(`Wrote SkillTree layout to ${path.relative(repoRoot, outPath)}`);
