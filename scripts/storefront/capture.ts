import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { openChromiumPage, startProductionPreview, delay, type ChromiumPage } from '../performance/chromiumHarness';
import { importSaveThroughSettings } from '../performance/browserFixtureImport';
import { loadCheckedInProgressionMatrixFixtures } from '../support/progressionMatrixFixtures';
import { hydrateGameState, dehydrateGameState } from '../../src/game-state/mapping';
import { prepareImportedSaveText } from '../../src/save/import';
import { serializeWebSave } from '../../src/save/serialization';
import { validateCanonicalGameState } from '../../src/game-state/validate';
import { advanceCanonicalGoalProgression } from '../../src/simulation/canonicalGoalProgression';
import { deriveBasicDysonState } from '../../src/simulation/canonicalDysonDerivation';
import { readConfig, verifyGameplaySource, profiles } from './config.mjs';
const config = readConfig();
const toolingCommit = verifyGameplaySource(config);
const { repo, root, originals, archive } = config;
const sha = (s: string | Buffer) => createHash('sha256').update(s).digest('hex');
mkdirSync(resolve(root, 'fixtures'), { recursive: true });
const fixtures = loadCheckedInProgressionMatrixFixtures();
const mid = fixtures.find(f => f.id === 'mid-swarm');
if (!mid) throw Error('The source has no certified mid-swarm fixture');
const session = hydrateGameState(prepareImportedSaveText(mid.saveText, config.frozenUtc));
let seed = { ...session.state, dyson: { ...session.state.dyson, bots: 500000, workers: 300000, researchers: 200000 } };
const progressed = advanceCanonicalGoalProgression(seed, (state) => {
    const d = deriveBasicDysonState(state, session.compatibilityTuning, { permanentDoubleIp: false }, session.skillEffectEvaluationSnapshot);
    if (!d.ok)
        throw Error('Bots derivation failed');
    return { panelsPerSecond: d.value.globals.panelsPerSecond, panelLifetimeSeconds: d.value.globals.panelLifetimeSeconds };
});
if (!progressed.ok)
    throw Error(progressed.detail);
seed = progressed.state;
const stagedDyson = deriveBasicDysonState(seed, session.compatibilityTuning, { permanentDoubleIp: false }, session.skillEffectEvaluationSnapshot);
if (!stagedDyson.ok || stagedDyson.value.globals.panelsPerSecond * stagedDyson.value.globals.panelLifetimeSeconds !== 30000) {
    throw Error('The archived first-star recipe no longer derives exactly 30000 active panels; review the source before capture');
}
const v = validateCanonicalGameState(seed);
if (!v.valid)
    throw Error(v.errors.join('\n'));
const botsSave = serializeWebSave(dehydrateGameState(session, seed).copyValidatedState());
writeFileSync(resolve(root, 'fixtures/first-star-galaxy.idsweb1.txt'), botsSave);
const skillsSave = readFileSync(resolve(archive, 'store-screenshot-package-v1/fixtures/maximum-skills-4-points.idsweb1.txt'), 'utf8').trimEnd();
const realitySave = readFileSync(resolve(archive, 'store-screenshot-reality-simulations-review-v1/fixtures/mature-reality-review.idsweb1.txt'), 'utf8').trimEnd();
const simulationsSave = readFileSync(resolve(archive, 'store-screenshot-reality-simulations-review-v1/fixtures/populated-simulations-review.idsweb1.txt'), 'utf8').trimEnd();
for (const s of [skillsSave, realitySave, simulationsSave])
    hydrateGameState(prepareImportedSaveText(s, config.frozenUtc));
const save = (id: string) => fixtures.find(f => f.id === id)!.saveText;
const scenes = [
    { id: '01-from-one-bot-to-galactic-brains', route: 'bots', fixture: 'derived-first-star-galaxy', saveText: botsSave },
    { id: '02-choose-your-path', route: 'skills', fixture: 'archived-maximum-skills-4-points', saveText: skillsSave },
    { id: '03-break-infinity-keep-going', route: 'infinity', fixture: 'mature-infinity', saveText: save('mature-infinity') },
    { id: '04-leap-into-the-quantum', route: 'quantum', fixture: 'late-quantum', saveText: save('late-quantum') },
    { id: '05-rebuild-civilization', route: 'simulations', fixture: 'archived-populated-simulations', saveText: simulationsSave },
    { id: '06-decode-the-anomaly', route: 'reality', fixture: 'archived-mature-reality', saveText: realitySave },
    { id: '07-automate-the-impossible', route: 'research', fixture: 'mature-infinity', saveText: save('mature-infinity') },
    { id: '08-unlock-a-strange-story', route: 'story', fixture: 'late-quantum', saveText: save('late-quantum') },
];
const bootstrap = `(()=>{
 const files=new Map(); const empty=()=>({botBoost:false,doubleInfinityPoints:false,developerOptions:false,supporterCatGallery:false});
 window.idleDysonSwarmNativeHost={target:'ios',ready:async()=>{},exists:async p=>files.has(p),readText:async p=>{if(!files.has(p))throw Error('Absent disposable file');return files.get(p)},writeText:async(p,s)=>{files.set(p,s)},replaceAtomically:async(a,b)=>{if(!files.has(a))throw Error('Missing temporary file');files.set(b,files.get(a));files.delete(a)},copy:async(a,b)=>{files.set(b,files.get(a))},discoverUnitySaves:async()=>[],currentLifecyclePhase:()=> 'active',subscribeLifecycle:()=>()=>{},metadata:async()=>({applicationVersion:${JSON.stringify(config.version)},buildNumber:${JSON.stringify(config.build)}}),exportDiagnostics:async()=>({exported:false}),storeProducts:async()=>[],storePurchase:async productId=>({accepted:false,productId,code:'store-unavailable'}),storeRestorePurchases:async()=>({restoredProductIds:[]}),readEntitlements:async()=>empty()};
 const timer=globalThis.setTimeout.bind(globalThis);globalThis.setInterval=()=>1;globalThis.setTimeout=(f,d,...a)=>Number(d)===33?1:timer(f,d,...a);
 const RealDate=Date,frozen=RealDate.parse(${JSON.stringify(config.frozenUtc)});globalThis.Date=class extends RealDate{constructor(...a){super(...(a.length?a:[frozen]))}static now(){return frozen}};
 localStorage.setItem('idle-dyson-swarm.presentation-locale','en');
})()`;
const selectedScenes = (process.env.IDS_STORE_CAPTURE_SCENES ?? '').split(',').filter(Boolean), selectedProfiles = (process.env.IDS_STORE_CAPTURE_PROFILES ?? '').split(',').filter(Boolean);
if (selectedScenes.some(id => !scenes.some(scene => scene.id.startsWith(id + '-'))) || selectedProfiles.some(id => !profiles.some(profile => profile.id === id))) {
    throw Error('Unknown scene/profile filter; use 01 through 08 and iphone69/ipad13');
}
async function expand(page: ChromiumPage, selector: string) { await page.evaluate(`(()=>{for(const node of document.querySelectorAll(${JSON.stringify(selector)})){const heading=[...node.children].find(n=>n.classList.contains('ui-collapsible-section__heading'));const button=heading?.querySelector('button');if(button?.getAttribute('aria-expanded')==='false')button.click()}})()`); await delay(150); }
const preview = await startProductionPreview(repo, 4199, config.buildDirectory), url = preview.url.replace('/play/', '/');
try {
    for (const profile of profiles.filter(p => !selectedProfiles.length || selectedProfiles.includes(p.id))) {
        mkdirSync(resolve(root, 'raw', profile.id), { recursive: true });
        mkdirSync(resolve(root, profile.id), { recursive: true });
        const page = await openChromiumPage(profile, url);
        const exceptions: string[] = [];
        page.cdp.on<any>('Runtime.exceptionThrown', e => exceptions.push(e.exceptionDetails?.exception?.description ?? e.exceptionDetails?.text));
        try {
            await page.cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: bootstrap });
            await page.navigate(url);
            for (const scene of scenes.filter(s => !selectedScenes.length || selectedScenes.includes(s.id.slice(0, 2)))) {
                if (existsSync(resolve(root, profile.id, scene.id + '.png')) || existsSync(resolve(root, 'raw', profile.id, scene.id + '.png')))
                    throw Error('Refusing to overwrite a captured scene; choose a new output folder');
                const viewport = profile.id === 'ipad13' && ['simulations', 'reality'].includes(scene.route) ? { width: 1024, height: 768 } : profile;
                await page.cdp.send('Emulation.setDeviceMetricsOverride', { width: viewport.width, height: viewport.height, deviceScaleFactor: profile.deviceScaleFactor, mobile: viewport.width < 768 });
                const fixtureSha256 = sha(scene.saveText);
                await importSaveThroughSettings(page, { saveText: scene.saveText, saveSha256: fixtureSha256 });
                await page.evaluate(`document.querySelector('[data-navigation-id="settings"] .dyson-navigation__link')?.click()`);
                await page.waitForSelector('.settings-surface');
                await page.evaluate(`(()=>{const i=document.querySelector('.settings-surface__panel--visualization input');if(i&&!i.checked)i.click()})()`);
                await page.evaluate(`(()=>{const i=document.querySelector('.settings-surface__panel--number-notation select');if(i){i.value='standard';i.dispatchEvent(new Event('change',{bubbles:true}))}})()`);
                await page.evaluate(`document.querySelector('[data-navigation-id="${scene.route}"] .dyson-navigation__link')?.click()`);
                await page.waitForSelector(scene.route === 'bots' ? '.dyson-shell__stage' : scene.route === 'research' ? '.research-surface' : '.' + scene.route + '-surface');
                await delay(500);
                if (scene.route === 'bots') {
                    await page.evaluate(`(()=>{const s=document.querySelector('.dyson-shell__facility-region');if(s)s.scrollTop=0})()`);
                    const phase = await page.evaluate(`document.querySelector('.dyson-swarm-visual')?.getAttribute('data-phase')`);
                    if (phase !== 'galaxy')
                        throw Error('Wrong Bots visual phase: ' + phase);
                }
                if (scene.route === 'skills' && profile.id === 'iphone69') {
                    for (let i = 0; i < 2; i++) {
                        await page.evaluate(`document.querySelector('button[aria-label="Zoom out"]')?.click()`);
                        await delay(150);
                    }
                }
                if (scene.route === 'simulations')
                    await expand(page, '.simulation-category--foundational');
                if (scene.route === 'reality') {
                    for (const selector of ['.simulation-permanent-upgrades', '.simulation-permanent-upgrade-category', '.reality-upgrades', '.reality-upgrade-category--anomaly', '.reality-upgrade-subcategory'])
                        await expand(page, selector);
                    await page.evaluate(`(()=>{const s=document.querySelector('.reality-surface__content'),t=document.querySelector('.reality-upgrade-category--anomaly');if(s&&t){s.scrollTop=Math.max(0,t.getBoundingClientRect().top-s.getBoundingClientRect().top+s.scrollTop-s.clientHeight*.62)}})()`);
                }
                if (scene.route === 'research')
                    await page.evaluate(`(()=>{const s=document.querySelector('.dyson-shell__facility-region');if(s)s.scrollTop=Math.min(s.scrollHeight,s.clientHeight*.7)})()`);
                await delay(500);
                await page.evaluate('document.fonts.ready.then(() => true)');
                const evidence = await page.evaluate(`({title:document.title,text:document.body.innerText,phase:document.querySelector('.dyson-swarm-visual')?.getAttribute('data-phase'),hostTarget:window.idleDysonSwarmNativeHost?.target,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},overflow:document.documentElement.scrollWidth>innerWidth,footer:[...document.querySelectorAll('[class*=release]')].map(n=>n.textContent),undefinedVisible:[...document.querySelectorAll('.${scene.route}-surface *')].some(n=>{const r=n.getBoundingClientRect();return !n.children.length&&/^undefined$/i.test(n.textContent?.trim()??'')&&r.bottom>0&&r.top<innerHeight})})`);
                if ((evidence as any).overflow || (evidence as any).undefinedVisible)
                    throw Error('Visible UI defect: ' + JSON.stringify(evidence));
                const shot = await page.cdp.send<{
                    data: string;
                }>('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, fromSurface: true });
                const raw = resolve(root, 'raw', profile.id, scene.id + '.png');
                writeFileSync(raw, Buffer.from(shot.data, 'base64'));
                const s = profile.shot, mask = Buffer.from(`<svg width="${s.width}" height="${s.height}"><rect width="100%" height="100%" rx="${s.radius}" fill="white"/></svg>`);
                const image = await sharp(raw).resize(s.width, s.height, { fit: 'cover' }).ensureAlpha().composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
                const output = resolve(root, profile.id, scene.id + '.png');
                const original = resolve(originals, profile.id, scene.id + '.png');
                const originalMetadata = await sharp(original).metadata();
                if (originalMetadata.width !== profile.finalWidth || originalMetadata.height !== profile.finalHeight)
                    throw Error('Original marketing canvas dimensions do not match the archived profile');
                await sharp(original).composite([{ input: image, left: s.x, top: s.y }]).removeAlpha().toColourspace('srgb').png({ compressionLevel: 9 }).toFile(output);
                const record = { scene: scene.id, route: scene.route, fixture: scene.fixture, fixtureSha256, gameplayCommit: config.gameplayCommit, workflowCommit: config.workflowCommit, toolingCommit, releaseMetadata: { version: config.version, build: config.build }, environment: page.environment, evidence, exceptions, provenance: 'Production mobile-native composition in Chromium with disposable NativeHostBridgeApi fixture; not Capacitor/iOS execution', captureControl: 'Frozen Date and suppressed 33ms active-time delivery and intervals, matching archived capture staging', composition: 'Archived screenshot geometry; original marketing background/headline/frame pixels retained exactly; current raw gameplay composed with rounded clip', outputSha256: sha(readFileSync(output)) };
                writeFileSync(resolve(root, 'raw', profile.id, scene.id + '.json'), JSON.stringify(record, null, 2));
                console.log(JSON.stringify({ output, phase: (evidence as any).phase, footer: (evidence as any).footer, exceptions }));
            }
        }
        finally {
            await page.close();
        }
    }
}
finally {
    await preview.stop();
}
