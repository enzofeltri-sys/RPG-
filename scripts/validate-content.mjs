// Cross-references string identifiers that TypeScript's compiler can't check
// on its own (monster/chest/quest ids are plain strings scattered across
// dozens of independent scene files, not a shared union type) — encodes the
// same checks a manual audit ran by hand once, so future content additions
// (a new dungeon, a new boss, a new gather node) get caught here instead of
// needing another manual pass. Exits non-zero on any hard error; warnings
// are informational only. Run with: node scripts/validate-content.mjs
import { readFileSync, globSync } from 'node:fs';

const SRC = new URL('../src/', import.meta.url);

function read(relPath) {
  return readFileSync(new URL(relPath, SRC), 'utf8');
}

function readAll(pattern) {
  const files = globSync(new URL(pattern, SRC).pathname);
  return files.map((f) => ({ file: f, text: readFileSync(f, 'utf8') }));
}

let errors = 0;
let warnings = 0;
function fail(msg) {
  console.error(`ERROR: ${msg}`);
  errors++;
}
function warn(msg) {
  console.warn(`WARN: ${msg}`);
  warnings++;
}

// ---- Monster ids ----
const monsterText = read('game/monster.ts');
const templatesStart = monsterText.indexOf('const TEMPLATES: Record<string, MonsterTemplate> = {');
const braceStart = monsterText.indexOf('{', templatesStart) + 1;
let depth = 1;
let braceEnd = braceStart;
for (let i = braceStart; i < monsterText.length; i++) {
  if (monsterText[i] === '{') depth++;
  else if (monsterText[i] === '}') {
    depth--;
    if (depth === 0) {
      braceEnd = i;
      break;
    }
  }
}
const monsterBlock = monsterText.slice(braceStart, braceEnd);
const monsterIds = new Set([...monsterBlock.matchAll(/id:\s*'([^']+)'/g)].map((m) => m[1]));

const sceneFiles = readAll('scenes/*.ts');
const referencedMonsterIds = new Map(); // id -> [files]
function addRef(id, file) {
  if (!referencedMonsterIds.has(id)) referencedMonsterIds.set(id, []);
  if (!referencedMonsterIds.get(id).includes(file)) referencedMonsterIds.get(id).push(file);
}
for (const { file, text } of sceneFiles) {
  for (const m of text.matchAll(/monsterId:\s*'([^']+)'/g)) addRef(m[1], file);
  for (const m of text.matchAll(/BOSS_MONSTER_ID\s*=\s*'([^']+)'/g)) addRef(m[1], file);
  for (const m of text.matchAll(/TREASURE_MONSTER_ID\s*=\s*'([^']+)'/g)) addRef(m[1], file);
  for (const m of text.matchAll(/startCombat\('([^']+)'\)/g)) addRef(m[1], file);
  for (const m of text.matchAll(/startEncounter\('([^']+)'\)/g)) addRef(m[1], file);
  for (const m of text.matchAll(/_MONSTERS\s*=\s*\[([^\]]+)\]/g)) {
    for (const id of [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1])) addRef(id, file);
  }
  for (const m of text.matchAll(/_MONSTER_IDS\s*=\s*new Set<string>\(\[([^\]]+)\]\)/g)) {
    for (const id of [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1])) addRef(id, file);
  }
}
for (const [id, files] of referencedMonsterIds) {
  if (!monsterIds.has(id)) fail(`monsterId '${id}' referenced in ${files.join(', ')} but not defined in game/monster.ts`);
}
for (const id of monsterIds) {
  if (!referencedMonsterIds.has(id)) warn(`monster.ts template '${id}' is never referenced by any scene (dead entry, or spawned via a pattern this script doesn't recognize)`);
}

// ---- Chest ids ----
const chestIds = new Map(); // id -> [files]
for (const { file, text } of sceneFiles) {
  for (const m of text.matchAll(/const CHEST_ID\s*=\s*'([^']+)'/g)) {
    if (!chestIds.has(m[1])) chestIds.set(m[1], []);
    chestIds.get(m[1]).push(file);
  }
}
for (const [id, files] of chestIds) {
  if (files.length > 1) fail(`chest id '${id}' declared in multiple files: ${files.join(', ')} — opening one marks all of them opened`);
}

// ---- Side quests ----
const questText = read('game/quest.ts');
const questsBlockMatch = questText.match(/QUESTS: Record<string, QuestDefinition> = \{([\s\S]*)/);
const questIds = new Set([...questsBlockMatch[1].matchAll(/id:\s*'([^']+)'/g)].map((m) => m[1]));
const allSceneText = sceneFiles.map((f) => f.text).join('\n');
for (const id of questIds) {
  if (!allSceneText.includes(`'${id}'`)) warn(`quest id '${id}' (game/quest.ts) never appears as a literal string in any scene file — likely orphaned`);
}

// ---- Resumable scenes vs actual `data?.resume` usage ----
const returnContextText = read('ui/returnContext.ts');
const resumableMatch = returnContextText.match(/const RESUMABLE_SCENES = new Set<ReturnSceneKey>\(\[([\s\S]*?)\]\)/);
const declaredResumable = new Set([...resumableMatch[1].matchAll(/'([^']+)'/g)].map((m) => m[1]));
const actualResumable = new Set();
for (const { file, text } of sceneFiles) {
  if (/data\?\.resume|data\.resume/.test(text)) {
    const sceneName = file.match(/([A-Za-z]+)Scene\.ts$/)?.[1];
    if (sceneName) actualResumable.add(sceneName);
  }
}
for (const key of declaredResumable) {
  if (!actualResumable.has(key)) warn(`'${key}' is in RESUMABLE_SCENES but its scene file never checks data?.resume — resume:true is set but does nothing`);
}
for (const key of actualResumable) {
  if (!declaredResumable.has(key)) fail(`'${key}Scene.ts' checks data?.resume but '${key}' is missing from RESUMABLE_SCENES — resume is never set true, cleared encounters will respawn on every UI round trip`);
}

console.log(`\nvalidate-content: ${errors} error(s), ${warnings} warning(s).`);
process.exit(errors > 0 ? 1 : 0);
