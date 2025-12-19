import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function parseIntList(value) {
  if (!value) return [];
  return value
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => Number.parseInt(x, 10))
    .filter((x) => Number.isFinite(x));
}

function uniqInts(list) {
  return Array.from(new Set(list)).sort((a, b) => a - b);
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../../..");
const inventoryPath = path.join(repoRoot, "skill_tree_inventory.md");
const outPath = path.join(repoRoot, "packages/balance/src/dysonverse/skillTree.json");

const inventory = fs.readFileSync(inventoryPath, "utf8");
const lines = inventory.split(/\r?\n/);

/** @type {Array<any>} */
const skills = [];

for (const rawLine of lines) {
  const line = rawLine.trim();
  if (!line.startsWith("-")) continue;

  const m = line.match(/^-\s+(\d+)\s+`([^`]+)`:\s+(.*)$/);
  if (!m) continue;

  const id = Number.parseInt(m[1], 10);
  const key = m[2];
  const rest = m[3];

  const costMatch = rest.match(/\(cost\s+(\d+)\)/);
  if (!costMatch || costMatch.index == null) {
    throw new Error(`Failed to parse cost for skill ${id} (${key}) from: ${line}`);
  }

  const cost = Number.parseInt(costMatch[1], 10);
  const name = rest.slice(0, costMatch.index).trim();
  let after = rest.slice(costMatch.index + costMatch[0].length).trim();

  const tags = [];
  /** @type {boolean | undefined} */
  let refundable;
  /** @type {boolean | undefined} */
  let firstRunBlocked;

  const bracketRegex = /\[([^\]]+)\]/g;
  let bracketMatch;
  while ((bracketMatch = bracketRegex.exec(after)) !== null) {
    const rawTags = bracketMatch[1]
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    for (const tag of rawTags) {
      if (tag === "unrefundable") refundable = false;
      else if (tag === "firstRunBlocked") firstRunBlocked = true;
      else tags.push(tag);
    }
  }
  after = after.replace(bracketRegex, "").trim();

  let meta = "";
  const pipeIndex = after.indexOf("|");
  if (pipeIndex !== -1) meta = after.slice(pipeIndex + 1).trim();

  const requirements = [];
  const exclusiveWith = [];
  /** @type {number | undefined} */
  let lock;

  if (meta) {
    for (const token of meta.split(/\s+/).filter(Boolean)) {
      const match = token.match(/^(req|exclusive|lock):(.*)$/);
      if (!match) continue;
      const [, field, value] = match;
      if (field === "req") requirements.push(...parseIntList(value));
      else if (field === "exclusive") exclusiveWith.push(...parseIntList(value));
      else if (field === "lock") {
        const lockInt = Number.parseInt(value, 10);
        if (Number.isFinite(lockInt)) lock = lockInt;
      }
    }
  }

  const skill = {
    id,
    key,
    name,
    cost,
    requirements: uniqInts(requirements),
    exclusiveWith: uniqInts(exclusiveWith),
    tags: Array.from(new Set(tags)),
    source: {
      script: "skill_tree_inventory.md",
      scene: "UnityIDS/Assets/Scenes/Game.unity",
    },
  };
  if (refundable === false) skill.refundable = false;
  if (firstRunBlocked === true) skill.firstRunBlocked = true;
  if (lock != null) skill.lock = lock;

  skills.push(skill);
}

skills.sort((a, b) => a.id - b.id);

if (skills.length !== 104) {
  throw new Error(`Expected 104 skills, got ${skills.length}`);
}

for (let i = 0; i < skills.length; i++) {
  const expectedId = i + 1;
  if (skills[i].id !== expectedId) {
    throw new Error(`Expected skill id ${expectedId}, got ${skills[i].id}`);
  }
}

fs.writeFileSync(outPath, JSON.stringify(skills, null, 2) + "\n", "utf8");
console.log(`Wrote ${skills.length} skills to ${path.relative(repoRoot, outPath)}`);
