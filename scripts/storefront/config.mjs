import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
export const profiles = [
    { id: 'iphone69', label: 'iPhone 6.9-inch', width: 430, height: 932,
        deviceScaleFactor: 3, cpuThrottleRate: 1, finalWidth: 1320, finalHeight: 2868,
        shot: { x: 110, y: 410, width: 1100, height: 2384, radius: 30 }, thumb: 360 },
    { id: 'ipad13', label: 'iPad 13-inch landscape', width: 1366, height: 1024,
        deviceScaleFactor: 2, cpuThrottleRate: 1, finalWidth: 2732, finalHeight: 2048,
        shot: { x: 252, y: 320, width: 2228, height: 1670, radius: 30 }, thumb: 600 },
];
export function readConfig() {
    const required = (name) => {
        const value = process.env[name]?.trim();
        if (!value)
            throw new Error(`Set ${name}; see docs/platform/windows-storefront-capture.md`);
        return value;
    };
    const gameplayCommit = required('IDS_STORE_GAMEPLAY_COMMIT');
    const workflowCommit = required('IDS_STORE_WORKFLOW_COMMIT');
    const version = required('IDS_STORE_IOS_VERSION');
    const build = required('IDS_STORE_IOS_BUILD');
    if (![gameplayCommit, workflowCommit].every(value => /^[a-f0-9]{40}$/.test(value))) {
        throw new Error('Gameplay and workflow commits must be full Git SHAs');
    }
    if (!/^\d+\.\d+\.\d+$/.test(version) || !/^\d+(?:\.\d+){0,2}$/.test(build)) {
        throw new Error('Supply verified iOS marketing version and bundle build number');
    }
    return {
        repo: process.cwd(),
        root: resolve(process.env.IDS_STORE_OUTPUT_ROOT ?? 'output/storefront-captures'),
        originals: resolve(required('IDS_STORE_ORIGINALS_ROOT')),
        archive: resolve(process.env.IDS_STORE_WORKFLOW_ROOT ?? 'docs/archive/2026-08/store-screenshot-production'),
        buildDirectory: process.env.IDS_STORE_BUILD_DIR ?? 'dist-native',
        gameplayCommit, workflowCommit, version, build,
        frozenUtc: '2026-08-19T00:00:00.000Z',
        originalArchiveLibraryId: process.env.IDS_STORE_ORIGINAL_LIBRARY_ID ?? null,
    };
}
export function verifyGameplaySource(config) {
    const git = (...args) => execFileSync('git', [
        '-c', `safe.directory=${config.repo.replaceAll('\\', '/')}`, ...args,
    ], { encoding: 'utf8', windowsHide: true }).trim();
    git('cat-file', '-e', `${config.gameplayCommit}^{commit}`);
    const protectedPaths = ['src', 'public', 'hosts', 'index.html', 'vite.config.ts',
        'securityHeaders.js', 'package.json', 'package-lock.json', 'scripts/support',
        'scripts/performance', 'scripts/packaged-release-identity.ts'];
    const changed = git('diff', '--name-only', config.gameplayCommit, '--', ...protectedPaths);
    const untracked = git('ls-files', '--others', '--exclude-standard', '--', ...protectedPaths);
    if (changed || untracked)
        throw new Error(`Capture source differs from the recorded gameplay commit:\n${[changed, untracked].filter(Boolean).join('\n')}`);
    return git('rev-parse', 'HEAD');
}
