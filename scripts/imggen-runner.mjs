// kie.ai image runner per PROJECT_PLAN Appendix A. Usage: node scripts/imggen-runner.mjs <config.json>
import { createRequire } from 'node:module';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(resolve(projectRoot, 'package.json'));
const sharp = require('sharp');

const env = readFileSync(resolve(projectRoot, '.env'), 'utf8');
const KEY = (env.match(/^KIE_API_KEY=(.+)$/m) || [])[1]?.trim();
if (!KEY) throw new Error('KIE_API_KEY not found in .env');

const cfg = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const outDir = resolve(projectRoot, cfg.out);
mkdirSync(outDir, { recursive: true });

const H = { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

async function createTask(prompt, aspect_ratio) {
  const r = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
    method: 'POST', headers: H,
    body: JSON.stringify({ model: 'nano-banana-2-lite', input: { prompt, aspect_ratio } }),
  });
  const j = await r.json();
  if (!j?.data?.taskId) throw new Error('createTask failed: ' + JSON.stringify(j));
  return j.data.taskId;
}

async function poll(taskId) {
  for (let i = 0; i < 40; i++) {
    await new Promise((s) => setTimeout(s, 8000));
    const r = await fetch(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${taskId}`, { headers: H });
    const j = await r.json();
    const st = j?.data?.state;
    if (st === 'success') return JSON.parse(j.data.resultJson).resultUrls[0];
    if (st === 'fail') throw new Error('generation failed: ' + JSON.stringify(j.data));
    process.stdout.write(`  ${taskId.slice(0, 8)} ${st}\n`);
  }
  throw new Error('poll timeout');
}

async function toWebp(url, file, width, maxKB = 150) {
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
  for (let q = 82; q >= 40; q -= 8) {
    const out = await sharp(buf).resize({ width }).webp({ quality: q }).toBuffer();
    if (out.length <= maxKB * 1024 || q <= 40) {
      writeFileSync(resolve(outDir, file), out);
      return { bytes: out.length, quality: q };
    }
  }
}

const map = [];
for (const img of cfg.images) {
  console.log(`[${img.n}] ${img.file}`);
  const prompt = `${img.prompt} ${cfg.style}`;
  const url = await poll(await createTask(prompt, img.aspect_ratio));
  const res = await toWebp(url, img.file, img.width);
  console.log(`  saved ${img.file} ${(res.bytes / 1024).toFixed(0)}KB q${res.quality}`);
  map.push({ ...img, source: url, bytes: res.bytes });
  if (img.og) {
    const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
    const ogDir = resolve(projectRoot, img.og.dir);
    mkdirSync(ogDir, { recursive: true });
    await sharp(buf).resize(1200, 630, { fit: 'cover' }).jpeg({ quality: 80 }).toFile(resolve(ogDir, img.og.file));
    console.log(`  og ${img.og.file}`);
  }
}
writeFileSync(resolve(outDir, 'asset-map.json'), JSON.stringify(map, null, 2));
console.log('DONE');
