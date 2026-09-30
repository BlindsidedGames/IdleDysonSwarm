import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { readConfig } from './config.mjs';
const { root, originals } = readConfig();
const out = resolve(root, 'audit');
mkdirSync(out, { recursive: true });
const manifest = JSON.parse(readFileSync(resolve(root, 'manifest.json'), 'utf8'));
const sha = b => createHash('sha256').update(b).digest('hex');
const results = [];
for (const f of manifest.files) {
    const s = f.profile === 'iphone69' ? { x: 110, y: 410, width: 1100, height: 2384, radius: 30 } : { x: 252, y: 320, width: 2228, height: 1670, radius: 30 };
    const raw = resolve(root, 'raw', f.profile, f.scene + '.png');
    const rawMeta = await sharp(raw).metadata();
    const mask = Buffer.from(`<svg width="${s.width}" height="${s.height}"><rect width="100%" height="100%" rx="${s.radius}" fill="white"/></svg>`);
    const panel = await sharp(raw).resize(s.width, s.height, { fit: 'cover' }).ensureAlpha().composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
    const reconstructed = await sharp(resolve(originals, f.file)).composite([{ input: panel, left: s.x, top: s.y }]).removeAlpha().toColourspace('srgb').raw().toBuffer();
    const final = await sharp(resolve(root, f.file)).raw().toBuffer();
    const evidence = JSON.parse(readFileSync(resolve(root, 'raw', f.profile, f.scene + '.json'), 'utf8'));
    const item = { file: f.file, finalHashMatchesManifest: sha(readFileSync(resolve(root, f.file))) === f.sha256, deliveryHashMatches: sha(readFileSync(resolve(root, 'delivery', f.deliveryFilename))) === f.sha256, rawDimensions: [rawMeta.width, rawMeta.height], expectedRawDimensions: [f.viewport.width * f.viewport.dpr, f.viewport.height * f.viewport.dpr], reconstructionPixelIdentical: final.equals(reconstructed), recordedSourceHashMatches: evidence.outputSha256 === f.sha256, hostTarget: evidence.evidence.hostTarget, sourceTitle: evidence.evidence.title, renderedFooter: evidence.evidence.footer, runtimeExceptions: evidence.exceptions.length };
    if (!item.finalHashMatchesManifest || !item.deliveryHashMatches || !item.reconstructionPixelIdentical || !item.recordedSourceHashMatches || item.rawDimensions.join() !== item.expectedRawDimensions.join())
        throw Error(JSON.stringify(item));
    results.push(item);
}
writeFileSync(resolve(out, 'pixel-provenance-audit.json'), JSON.stringify({ status: 'passed', images: results.length, method: 'Reconstruct every final image solely from archived original marketing canvas plus existing raw capture with archived scale, rounded alpha clip and sRGB conversion. Compare decoded pixels, all hashes and raw viewport dimensions.', results }, null, 2));
console.log(JSON.stringify({ status: 'passed', images: results.length, pixelIdentical: true }));
