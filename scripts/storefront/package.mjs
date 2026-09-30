import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, readdirSync, copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { readConfig, profiles as captureProfiles } from './config.mjs';
const config = readConfig();
const { root, originals } = config;
const delivery = resolve(root, 'delivery');
mkdirSync(delivery, { recursive: true });
const sha = b => createHash('sha256').update(b).digest('hex');
const profiles = captureProfiles.map(p => ({ ...p, width: p.finalWidth, height: p.finalHeight }));
const captureRecords = [];
const files = [];
for (const p of profiles) {
    const names = readdirSync(resolve(root, p.id)).filter(n => n.endsWith('.png')).sort();
    if (names.length !== 8)
        throw Error(`${p.id}: expected 8 images`);
    for (const name of names) {
        const file = resolve(root, p.id, name), meta = await sharp(file).metadata(), data = await sharp(file).removeAlpha().raw().toBuffer(), old = await sharp(resolve(originals, p.id, name)).removeAlpha().raw().toBuffer();
        if (meta.width !== p.width || meta.height !== p.height || meta.hasAlpha || meta.space !== 'srgb')
            throw Error(`Invalid output: ${file}`);
        let outsideDifferences = 0, insideDifferences = 0;
        for (let y = 0; y < p.height; y++)
            for (let x = 0; x < p.width; x++) {
                const i = (y * p.width + x) * 3, diff = data[i] !== old[i] || data[i + 1] !== old[i + 1] || data[i + 2] !== old[i + 2];
                if (!diff)
                    continue;
                const s = p.shot;
                if (x < s.x || x >= s.x + s.width || y < s.y || y >= s.y + s.height)
                    outsideDifferences++;
                else
                    insideDifferences++;
            }
        if (outsideDifferences !== 0 || insideDifferences === 0)
            throw Error(`Marketing preservation/capture refresh failed: ${file}`);
        const evidence = JSON.parse(readFileSync(resolve(root, 'raw', p.id, name.replace('.png', '.json')), 'utf8'));
        captureRecords.push(evidence);
        if (evidence.gameplayCommit !== config.gameplayCommit || evidence.workflowCommit !== config.workflowCommit || evidence.releaseMetadata?.version !== config.version || evidence.releaseMetadata?.build !== config.build)
            throw Error('Capture provenance differs from package configuration');
        if (evidence.exceptions.length || evidence.evidence.overflow || evidence.evidence.undefinedVisible)
            throw Error(`Capture failure ${file}`);
        if (name.startsWith('01') && evidence.evidence.phase !== 'galaxy')
            throw Error('Bots phase mismatch');
        if (name.startsWith('02') && !/Skills\n4|\n4\n/.test(evidence.evidence.text))
            throw Error('Skills 4-point evidence missing');
        const delivered = `IDS-${p.id}-${name}`;
        copyFileSync(file, resolve(delivery, delivered));
        files.push({ profile: p.id, file: `${p.id}/${name}`, deliveryFilename: delivered, sha256: sha(readFileSync(file)), sizeBytes: readFileSync(file).length, width: p.width, height: p.height, opaque: true, colorspace: 'srgb', unchangedMarketingPixels: true, changedGameplayPixels: insideDifferences, scene: evidence.scene, route: evidence.route, fixture: evidence.fixture, fixtureSha256: evidence.fixtureSha256, viewport: evidence.evidence.viewport, footer: evidence.evidence.footer, phase: evidence.evidence.phase, positioning: name.startsWith('02') && p.id === 'iphone69' ? 'Two real zoom-out clicks' : name.startsWith('06') ? 'Real content scroller positioned at populated upgrades' : 'Captured route position', nativeVerified: false });
    }
    await sheet(p, names, false);
    await sheet(p, names, true);
}
async function sheet(p, names, comparison) {
    const gap = 20, cardW = p.thumb, cardH = Math.round(cardW * p.height / p.width), rowLabel = 40, rows = comparison ? 4 : 2, width = cardW * 4 + gap * 5, height = 100 + rows * (cardH + rowLabel + gap);
    const comps = [];
    for (let row = 0; row < rows; row++) {
        const old = comparison && row % 2 === 0, group = comparison ? Math.floor(row / 2) : row;
        const rowText = comparison ? (old ? 'ORIGINAL' : 'REFRESH — CHROMIUM / iOS HOST FIXTURE') : 'REFRESH — CHROMIUM / iOS HOST FIXTURE';
        comps.push({ input: Buffer.from(`<svg width="${width}" height="${rowLabel}"><text x="20" y="27" fill="#d88de2" font-family="Arial" font-size="18">${rowText} · ${group * 4 + 1}–${group * 4 + 4}</text></svg>`), left: 0, top: 80 + row * (cardH + rowLabel + gap) });
        for (let col = 0; col < 4; col++) {
            const name = names[group * 4 + col], path = resolve(old ? originals : root, p.id, name), buffer = await sharp(path).resize(cardW, cardH).png().toBuffer();
            comps.push({ input: buffer, left: gap + col * (cardW + gap), top: 80 + row * (cardH + rowLabel + gap) + rowLabel });
        }
    }
    comps.push({ input: Buffer.from(`<svg width="${width}" height="70"><text x="20" y="42" fill="white" font-family="Arial" font-size="30">${p.label} — ${comparison ? 'Before / after comparison' : 'Eight-scene review'}</text></svg>`), left: 0, top: 0 });
    const name = `IDS-${p.id}-${comparison ? 'comparison' : 'contact-sheet'}.png`;
    await sharp({ create: { width, height, channels: 3, background: '#160e20' } }).composite(comps).png({ compressionLevel: 9 }).toFile(resolve(delivery, name));
}
const manifest = { status: 'Review assets; native-device acceptance unverified', createdAt: new Date().toISOString(), repository: 'https://github.com/BlindsidedGames/IdleDysonSwarm.git', gameplayCommit: config.gameplayCommit, workflowCommit: config.workflowCommit, toolingCommits: [...new Set(captureRecords.map(r => r.toolingCommit))], submittedVersion: config.version, submittedAppleBuild: config.build, originalArchiveLibraryId: config.originalArchiveLibraryId, captureEnvironments: captureRecords.map(r => r.environment), nativeFixture: { target: 'ios', metadata: { applicationVersion: config.version, buildNumber: config.build }, files: 'Disposable in-memory map', lifecycle: 'active', entitlements: 'No owned paid products', store: 'Unavailable; no actions performed', capacitorExecution: false }, limitations: ['Not an iOS simulator, WKWebView, signed application or physical device capture', 'Capacitor-specific behavior, native safe areas, system bars, Game Center, StoreKit and actual package execution unverified', 'Footer is rendered by source using explicit fixture metadata; not independent verification of submitted bundle metadata', 'Reality historical Undefined artifact is outside the capture after real scrolling, as required by the archived workflow'], captureTimeControl: 'Frozen Date 2026-08-19T00:00:00Z; suppress active-time 33ms delivery and setInterval, following archive', gameplayChanges: 'None; current source remains frozen', botsDerivation: 'Submitted mid-swarm save: set total bots=500000, workers=300000, researchers=200000; apply canonical goal progression; validate and reserialize through app codec; import through production Settings. Result: 30000 active panels / 20000 = 1.50 stars, galaxy phase.', skillsDerivation: 'Use archived explicit four-point save with current codec/import; phone view uses two real zoom-out clicks', presentation: 'Original frames, headlines, gradients and pixels outside archived inner screenshot rectangle preserved exactly; all gameplay interiors recaptured; Standard number notation selected for matching Research presentation.', locale: 'English AU main set; inherited by seven other locales; no translated variants', appleSpecification: 'https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/', files };
writeFileSync(resolve(root, 'manifest.json'), JSON.stringify(manifest, null, 2));
writeFileSync(resolve(root, 'qa-report.json'), JSON.stringify({ status: 'passed-render-and-pixel-validation', images: 16, exactDimensions: true, opaqueSrgb: true, allMarketingPixelsOutsideGameplayUnchanged: true, allGameplayInteriorsChanged: true, botsPhase: 'galaxy', skillsPoints: 4, runtimeExceptions: 0, horizontalOverflow: false, undefinedVisible: false, nativeDeviceVerified: false, visualReview: 'Pending manual inspection of every final image and review sheet; this script only validates rendered evidence and pixels' }, null, 2));
writeFileSync(resolve(root, 'README.txt'), `IDS ${config.version} screenshot refresh REVIEW package\nGameplay commit: ${config.gameplayCommit}\nWorkflow commit: ${config.workflowCommit}\nEight numbered phone images 1320x2868 and eight landscape iPad images 2732x2048.\nAll gameplay recaptured; original marketing pixels retained. Bots: intermediate galaxy with 1.50 stars.\nChromium with a disposable production iOS host fixture; not native-device or simulator validated. Native safe areas and OS bars are not emulated.\nManual visual review is still required. No account or release actions are performed by this tool.\nSee manifest.json and qa-report.json for provenance and limits.\n`);
console.log(JSON.stringify({ images: files.length, delivery, marketingPreserved: true }));
