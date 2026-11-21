// ViceCover Studio — the hand-in program for gta6-cover-art-01.
//
// The entry itself is the static web app in app/ (open app/index.html in a
// desktop browser, or serve it with `node serve.ts`). This program is what
// the grader runs: it assembles the deliverable in the output directory —
// the app tree, the screenshots, a manifest of everything handed in, and
// dossier.json, the judge's summary, built with the vendored make.fun
// library — and it refuses to hand in a package that breaks the bounty's
// own caps, rather than letting the scorer refuse it later.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// Node 22, standard library only. The output is a pure function of the
// repository tree: no clock, no randomness, nothing read from the network,
// so two runs over the same tree produce byte-identical results.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier, readAppTree } from './vendor/makefun-app.ts';

const repoDir = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The bounty's caps, named once so the pre-flight checks below and the
// dossier call can never drift apart.
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

/** Every file under a directory, as repo-relative paths, sorted. */
function listFiles(dir, base = dir) {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...listFiles(full, base));
    else if (entry.isFile()) found.push(relative(base, full));
  }
  return found.sort();
}

/** Fail loudly, before anything is written, when the package breaks a cap. */
function preflight() {
  const problems = [];
  const appDir = join(repoDir, 'app');
  const shotsDir = join(repoDir, 'screenshots');

  // The library enforces the app caps itself by throwing; catch that here so
  // a breach is reported as a pre-flight problem, not a stack trace.
  let tree = null;
  try {
    tree = readAppTree(appDir, {
      app_max_files: CAPS.app_max_files,
      app_max_bytes: CAPS.app_max_bytes,
      app_path_max_bytes: CAPS.app_path_max_bytes,
    });
  } catch (err) {
    problems.push(`app/ breaks a cap: ${err.message}`);
  }
  if (tree && tree.totalBytes > CAPS.app_max_bytes) {
    problems.push(`app/ totals ${tree.totalBytes} bytes, over the ${CAPS.app_max_bytes} cap`);
  }
  if (!existsSync(join(appDir, 'index.html'))) {
    problems.push('app/index.html is missing: the app has no page to open');
  }

  if (!existsSync(shotsDir)) {
    problems.push('screenshots/ is missing: the bounty asks for 3 or 4 screenshots');
  } else {
    const shots = listFiles(shotsDir).filter((name) => /\.(png|jpe?g)$/i.test(name));
    if (shots.length < 3 || shots.length > CAPS.screenshots.max) {
      problems.push(`screenshots/ holds ${shots.length} images, outside the 3..${CAPS.screenshots.max} the bounty takes`);
    }
    for (const shot of shots) {
      const size = statSync(join(shotsDir, shot)).size;
      if (size > CAPS.screenshots.max_bytes) {
        problems.push(`screenshot ${shot} is ${size} bytes, over the ${CAPS.screenshots.max_bytes} cap`);
      }
    }
  }

  if (problems.length > 0) {
    for (const problem of problems) console.error(`vicecover: ${problem}`);
    process.exit(1);
  }
  return tree;
}

/** Copy one tree (app/ or screenshots/) into the output directory. */
function deliver(name) {
  const from = join(repoDir, name);
  if (!existsSync(from)) return [];
  cpSync(from, join(outputDir, name), { recursive: true });
  return listFiles(from).map((path) => `${name}/${path}`);
}

preflight();

mkdirSync(outputDir, { recursive: true });
const handedIn = [...deliver('app'), ...deliver('screenshots')].sort();

// A plain manifest of the package, so a human can see at a glance what was
// handed in before reading the dossier's hashes.
writeFileSync(
  join(outputDir, 'manifest.txt'),
  ['ViceCover Studio — hand-in manifest', '', ...handedIn, '', `${handedIn.length} files`].join('\n') + '\n',
);

writeFileSync(join(outputDir, 'dossier.json'), buildDossier(outputDir, CAPS));

console.log(`vicecover: handed in ${handedIn.length} files (app, screenshots, manifest.txt, dossier.json)`);
