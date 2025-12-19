import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SKILL_BUTTON_PREFAB_GUID = "63def614896650346ad3eab31ba9e48b";
const UNITY_UI_IMAGE_SCRIPT_GUID = "fe87c0e1cc204ed48ad3b37840f39efc";

function readLines(filePath) {
  return fs.readFileSync(filePath, "utf8").split(/\r?\n/);
}

function findBlockStartIndex(lines, predicate, headerPrefix) {
  const matchIndex = lines.findIndex(predicate);
  if (matchIndex === -1) return -1;
  let headerIndex = matchIndex;
  while (headerIndex >= 0 && !lines[headerIndex].startsWith(headerPrefix)) headerIndex--;
  return headerIndex;
}

function collectComponentFileIdsFromGameObjectBlock(lines, gameObjectHeaderIndex) {
  /** @type {string[]} */
  const componentFileIds = [];
  for (let i = gameObjectHeaderIndex; i < lines.length; i++) {
    const line = lines[i];
    if (i > gameObjectHeaderIndex && line.startsWith("--- !u!")) break;
    const match = line.trim().match(/^- component: \{fileID: (\d+)\}$/);
    if (!match) continue;
    componentFileIds.push(match[1]);
  }
  return componentFileIds;
}

function monoBlockHasScriptGuid(lines, monoHeaderIndex, guid) {
  for (let i = monoHeaderIndex; i < lines.length; i++) {
    const line = lines[i];
    if (i > monoHeaderIndex && line.startsWith("--- !u!")) break;
    if (line.includes(`guid: ${guid}`)) return true;
  }
  return false;
}

function parseRootComponentIdsFromSkillButtonPrefab(lines) {
  const nameLineIndex = lines.findIndex((l) => l.trim() === "m_Name: SkillButtonPrefab");
  if (nameLineIndex === -1) throw new Error(`Could not find SkillButtonPrefab GameObject name`);

  const gameObjectHeaderIndex = findBlockStartIndex(lines, (_l, idx) => idx === nameLineIndex, "--- !u!1 &");
  if (gameObjectHeaderIndex < 0) throw new Error(`Could not locate SkillButtonPrefab GameObject header`);

  const componentFileIds = collectComponentFileIdsFromGameObjectBlock(lines, gameObjectHeaderIndex);

  /** @type {string | null} */
  let rectTransformFileId = null;
  /** @type {string | null} */
  let monoBehaviourFileId = null;

  for (const fileId of componentFileIds) {
    const hasRect = lines.some((l) => l.startsWith(`--- !u!224 &${fileId}`));
    if (hasRect) rectTransformFileId = fileId;

    const monoHeaderIndex = lines.findIndex((l) => l.startsWith(`--- !u!114 &${fileId}`));
    if (monoHeaderIndex !== -1 && !monoBlockHasScriptGuid(lines, monoHeaderIndex, UNITY_UI_IMAGE_SCRIPT_GUID)) {
      monoBehaviourFileId = fileId;
    }
  }

  if (rectTransformFileId == null) throw new Error(`Failed to locate root RectTransform component for SkillButtonPrefab`);
  if (monoBehaviourFileId == null) throw new Error(`Failed to locate root MonoBehaviour component for SkillButtonPrefab`);

  return { rectTransformFileId, monoBehaviourFileId };
}

function parseImageBigSpriteComponentFileIdFromSkillButtonPrefab(lines) {
  const nameLineIndex = lines.findIndex((l) => l.trim() === "m_Name: Image big");
  if (nameLineIndex === -1) throw new Error(`Could not find Image big GameObject name`);

  const gameObjectHeaderIndex = findBlockStartIndex(lines, (_l, idx) => idx === nameLineIndex, "--- !u!1 &");
  if (gameObjectHeaderIndex < 0) throw new Error(`Could not locate Image big GameObject header`);

  const componentFileIds = collectComponentFileIdsFromGameObjectBlock(lines, gameObjectHeaderIndex);
  for (const fileId of componentFileIds) {
    const monoHeaderIndex = lines.findIndex((l) => l.startsWith(`--- !u!114 &${fileId}`));
    if (monoHeaderIndex === -1) continue;
    if (monoBlockHasScriptGuid(lines, monoHeaderIndex, UNITY_UI_IMAGE_SCRIPT_GUID)) return fileId;
  }

  throw new Error(`Failed to locate Image component fileID for Image big`);
}

function parseIconGuidBySkillIdFromPanelPrefab(lines, ids) {
  /** @type {Map<number, { spriteGuid: string, spriteFileId: string | null }>} */
  const iconBySkillId = new Map();

  /** @type {{ skillKey: number | null, spriteGuid: string | null, target: {fileId: string, guid: string} | null } | null} */
  let current = null;

  function flush() {
    if (!current) return;
    if (current.skillKey != null && current.spriteGuid) iconBySkillId.set(current.skillKey, { spriteGuid: current.spriteGuid });
    current = null;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("--- !u!")) {
      flush();
      if (line.startsWith("--- !u!1001 &")) current = { skillKey: null, spriteGuid: null, target: null };
      continue;
    }

    if (!current) continue;

    const targetMatch = line.trim().match(/^- target: \{fileID: (\d+), guid: ([0-9a-fA-F]+), type: \d+\}$/);
    if (targetMatch) {
      current.target = { fileId: targetMatch[1], guid: targetMatch[2] };
      continue;
    }

    const propMatch = line.trim().match(/^propertyPath: (.+)$/);
    if (!propMatch) continue;
    if (!current.target) continue;
    if (current.target.guid !== SKILL_BUTTON_PREFAB_GUID) continue;

    const propertyPath = propMatch[1];

    if (propertyPath === "skillKey" && current.target.fileId === ids.monoBehaviourFileId) {
      const valueLine = lines[i + 1]?.trim() ?? "";
      const valueMatch = valueLine.match(/^value: (.+)$/);
      if (!valueMatch) continue;
      const skillKey = Number.parseInt(valueMatch[1], 10);
      if (Number.isFinite(skillKey)) current.skillKey = skillKey;
      continue;
    }

    if (propertyPath === "m_Sprite" && current.target.fileId === ids.imageBigFileId) {
      const objectRefLine = lines[i + 2]?.trim() ?? "";
      const objectRefMatch = objectRefLine.match(/^objectReference: \{fileID: (\d+), guid: ([0-9a-fA-F]+), type: \d+\}$/);
      if (!objectRefMatch) continue;
      current.spriteGuid = objectRefMatch[2];
    }
  }

  flush();

  if (iconBySkillId.size !== 104) {
    throw new Error(`Expected 104 SkillButtonPrefab instances, got ${iconBySkillId.size}`);
  }
  for (let i = 1; i <= 104; i++) {
    if (!iconBySkillId.has(i)) throw new Error(`Missing skillKey ${i} in parsed icon layout`);
  }

  return iconBySkillId;
}

function parseGuidFromUnityMeta(metaContents) {
  const match = metaContents.match(/^\s*guid:\s*([0-9a-fA-F]+)\s*$/m);
  return match ? match[1] : null;
}

function buildGuidToIconFileNameMap(skillIconsDir) {
  /** @type {Map<string, string>} */
  const map = new Map();
  const entries = fs.readdirSync(skillIconsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith(".png.meta")) continue;
    const metaPath = path.join(skillIconsDir, entry.name);
    const meta = fs.readFileSync(metaPath, "utf8");
    const guid = parseGuidFromUnityMeta(meta);
    if (!guid) continue;
    const pngName = entry.name.replace(/\.meta$/, "");
    map.set(guid, pngName);
  }
  return map;
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../../..");

const panelPrefabPath = path.join(repoRoot, "UnityIDS/Assets/Prefabs/Panel.prefab");
const skillButtonPrefabPath = path.join(repoRoot, "UnityIDS/Assets/Prefabs/SkillButtonPrefab.prefab");
const skillIconsDir = path.join(repoRoot, "UnityIDS/Assets/Sprites/SkillIcons");
const outPath = path.join(repoRoot, "packages/balance/src/dysonverse/skillTreeIcons.json");

const skillButtonLines = readLines(skillButtonPrefabPath);
const rootIds = parseRootComponentIdsFromSkillButtonPrefab(skillButtonLines);
const imageBigFileId = parseImageBigSpriteComponentFileIdFromSkillButtonPrefab(skillButtonLines);

const panelLines = readLines(panelPrefabPath);
const iconBySkillId = parseIconGuidBySkillIdFromPanelPrefab(panelLines, { ...rootIds, imageBigFileId });

const guidToFileName = buildGuidToIconFileNameMap(skillIconsDir);

const icons = Array.from(iconBySkillId.entries())
  .map(([id, v]) => {
    const fileName = guidToFileName.get(v.spriteGuid);
    if (!fileName) throw new Error(`Could not resolve sprite guid ${v.spriteGuid} for skill ${id} in ${skillIconsDir}`);
    return {
      id,
      fileName,
      spriteGuid: v.spriteGuid,
      sourcePng: `UnityIDS/Assets/Sprites/SkillIcons/${fileName}`,
    };
  })
  .sort((a, b) => a.id - b.id);

const out = {
  icons,
  source: {
    prefab: "UnityIDS/Assets/Prefabs/Panel.prefab",
    nestedPrefab: "UnityIDS/Assets/Prefabs/SkillButtonPrefab.prefab",
    iconsDir: "UnityIDS/Assets/Sprites/SkillIcons",
  },
};

fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n", "utf8");
console.log(`Wrote SkillTree icons to ${path.relative(repoRoot, outPath)}`);
