import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function numberFromScene(sceneText, fieldName) {
  const re = new RegExp(`\\b${fieldName}:\\s*([^\\s]+)`);
  const match = sceneText.match(re);
  if (!match) throw new Error(`Missing field '${fieldName}' in scene`);
  const n = Number(match[1]);
  if (!Number.isFinite(n)) throw new Error(`Field '${fieldName}' is not a finite number: ${match[1]}`);
  return n;
}

function intFromScene(sceneText, fieldName) {
  const re = new RegExp(`\\b${fieldName}:\\s*([^\\s]+)`);
  const match = sceneText.match(re);
  if (!match) throw new Error(`Missing field '${fieldName}' in scene`);
  const n = Number.parseInt(match[1], 10);
  if (!Number.isFinite(n)) throw new Error(`Field '${fieldName}' is not an int: ${match[1]}`);
  return n;
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../../..");
const scenePath = path.join(repoRoot, "UnityIDS/Assets/Scenes/Game.unity");

const sceneText = fs.readFileSync(scenePath, "utf8");

const infinityExponent = numberFromScene(sceneText, "infinityExponent");
const maxInfinityBuff = numberFromScene(sceneText, "maxInfinityBuff");

const translation = Array.from({ length: 8 }, (_, idx) =>
  intFromScene(sceneText, `translation${idx + 1}Cost`),
);
const speed = Array.from({ length: 8 }, (_, idx) => intFromScene(sceneText, `speed${idx + 1}Cost`));

const progressionPath = path.join(repoRoot, "packages/balance/src/dysonverse/progression.json");
const realityCostsPath = path.join(repoRoot, "packages/balance/src/reality/costs.json");

fs.writeFileSync(
  progressionPath,
  JSON.stringify(
    {
      infinityExponent,
      maxInfinityBuff,
      source: {
        oracleScript: "UnityIDS/Assets/Scripts/Expansion/Oracle.cs",
        gameManagerScript: "UnityIDS/Assets/Scripts/Systems/GameManager.cs",
        scene: "UnityIDS/Assets/Scenes/Game.unity",
      },
    },
    null,
    2,
  ) + "\n",
  "utf8",
);

fs.writeFileSync(
  realityCostsPath,
  JSON.stringify(
    {
      translation,
      speed,
      source: {
        script: "UnityIDS/Assets/Scripts/Expansion/ResearchManager.cs",
        scene: "UnityIDS/Assets/Scenes/Game.unity",
      },
    },
    null,
    2,
  ) + "\n",
  "utf8",
);

console.log(`Wrote ${path.relative(repoRoot, progressionPath)}`);
console.log(`Wrote ${path.relative(repoRoot, realityCostsPath)}`);

