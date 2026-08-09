// scripts/optimize-images.mjs
//
// Auto-shrinks oversized photos so a big image can never slow the site down.
//
//   node scripts/optimize-images.mjs           one-off pass — only touches images that still need it
//   node scripts/optimize-images.mjs --watch   stays running; shrinks any image the moment you drop it in
//   node scripts/optimize-images.mjs --force    re-compress everything from the pristine backups
//                                               (use after you change MAX_WIDTH / QUALITY below)
//
// A file is left alone once it's already small enough, so re-runs and the watcher never
// double-compress or loop. Pristine originals are copied ONCE into _image-originals/ (kept out
// of /public so they aren't deployed) — add that folder to .gitignore. Your existing gallery
// backups are reused as-is.
//
// Deps:  pnpm add -D sharp chokidar
// Add the package.json "scripts" (see chat) to run this as `pnpm images`, `pnpm images:watch`, etc.

import sharp from "sharp";
import chokidar from "chokidar";
import { readdir, mkdir, copyFile, rename, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

// --- config ---------------------------------------------------------------
const DIRS = [
  "public/images/gallery",
  "public/images/home/services",
  "public/images/about",
  "public/images/about/Gallery",
  "public/images/software/team",
]; // add any other photo folder here — must live under public/images
const BACKUP_ROOT   = "_image-originals";   // pristine copies (mirrors the folder tree under images/)
const MAX_WIDTH     = 1600;   // widest a photo is ever shown (retina-safe). Lower = smaller files.
const QUALITY       = 80;     // JPEG quality — 78-82 is invisible loss
const TARGET_MAX_KB = 500;    // wider than MAX_WIDTH OR heavier than this => optimize it
// --------------------------------------------------------------------------

const EXTS  = new Set([".jpeg", ".jpg", ".png"]);
const kb    = (b) => `${Math.round(b / 1024)} kB`;
const FORCE = process.argv.includes("--force");
const WATCH = process.argv.includes("--watch");

const backupFor = (src) => path.join(BACKUP_ROOT, path.relative("public/images", src));
const inFlight  = new Set();   // no two runs on the same file at once
const lastDone  = new Map();   // cooldown so a just-written file can't retrigger itself

async function optimize(src, { force = FORCE } = {}) {
  const key = path.resolve(src);
  if (inFlight.has(key)) return null;
  if (Date.now() - (lastDone.get(key) || 0) < 3000) return null;   // we just wrote this — ignore the echo
  inFlight.add(key);
  try {
    if (!existsSync(src) || !EXTS.has(path.extname(src).toLowerCase())) return null;

    const beforeSize = (await stat(src)).size;
    const meta       = await sharp(src).metadata();
    const needsWork  = meta.width > MAX_WIDTH || beforeSize / 1024 > TARGET_MAX_KB;
    if (!force && !needsWork) return null;   // already small enough — leave it (this is what stops loops)

    // preserve the pristine original exactly once
    const backup = backupFor(src);
    if (!existsSync(backup)) {
      await mkdir(path.dirname(backup), { recursive: true });
      await copyFile(src, backup);
    }

    const source = force && existsSync(backup) ? backup : src;   // --force re-derives from pristine
    const ext    = path.extname(src).toLowerCase();
    const pipe   = sharp(source).resize({ width: MAX_WIDTH, withoutEnlargement: true });
    if (ext === ".png") pipe.png({ compressionLevel: 9, palette: true });
    else                pipe.jpeg({ quality: QUALITY, mozjpeg: true });

    const tmp = `${src}.tmp`;
    await pipe.toFile(tmp);
    await rename(tmp, src);
    lastDone.set(key, Date.now());

    const afterSize = (await stat(src)).size;
    console.log(`${path.relative("public/images", src).padEnd(36)} ${kb(beforeSize).padStart(9)}  ->  ${kb(afterSize).padStart(8)}`);
    return { before: beforeSize, after: afterSize };
  } catch (err) {
    console.error(`  ! ${src}: ${err.message}`);
    return null;
  } finally {
    inFlight.delete(key);
  }
}

async function pass() {
  let before = 0, after = 0, count = 0;
  for (const dir of DIRS) {
    if (!existsSync(dir)) continue;
    const files = (await readdir(dir)).filter((f) => EXTS.has(path.extname(f).toLowerCase()));
    for (const f of files) {
      const r = await optimize(path.join(dir, f));
      if (r) { before += r.before; after += r.after; count++; }
    }
  }
  if (count) {
    const saved = (100 - (after / before) * 100).toFixed(1);
    console.log("-".repeat(62));
    console.log(`${String(count).padStart(2)} optimized${" ".repeat(22)} ${kb(before).padStart(9)}  ->  ${kb(after).padStart(8)}   (${saved}% smaller)`);
  } else {
    console.log("All images already optimized — nothing to do.");
  }
}

async function main() {
  await pass();
  if (!WATCH) return;

  const watchDirs = DIRS.filter((d) => existsSync(d));
  console.log(`\nWatching for new images:\n  ${watchDirs.join("\n  ")}\n(Ctrl+C to stop.)`);
  chokidar
    .watch(watchDirs, {
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 400, pollInterval: 100 },
    })
    .on("add",    (p) => optimize(p, { force: false }))   // watch never forces — avoids loops
    .on("change", (p) => optimize(p, { force: false }));
}

main().catch((err) => { console.error(err); process.exit(1); });
