// Publishes the built dist/ folder to the repo's gh-pages branch.
//
// The build runs locally rather than in GitHub Actions because asset-kit is a
// private repo that a workflow's default token can't install.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const PAGES_BRANCH = 'gh-pages';
const distDir = resolve('dist');

const run = (command, args, options = {}) =>
  execFileSync(command, args, { stdio: 'inherit', ...options });

const readGit = (args) => execFileSync('git', args, { encoding: 'utf8' }).trim();

if (!existsSync(resolve(distDir, 'index.html'))) {
  throw new Error('dist/index.html is missing - run `npm run build` first.');
}

const remoteUrl = readGit(['remote', 'get-url', 'origin']);
const sourceCommit = readGit(['rev-parse', '--short', 'HEAD']);

// A fresh single-commit repo inside dist/ each time: the branch only ever
// holds the latest build, so there's no history to merge or clean up.
const inDist = { cwd: distDir };
run('git', ['init', '--quiet', '--initial-branch', PAGES_BRANCH], inDist);
run('git', ['add', '--all'], inDist);
run('git', ['commit', '--quiet', '--message', `Deploy ${sourceCommit}`], inDist);
run('git', ['push', '--force', '--quiet', remoteUrl, PAGES_BRANCH], inDist);

console.log(`Deployed ${sourceCommit} to ${PAGES_BRANCH}.`);
