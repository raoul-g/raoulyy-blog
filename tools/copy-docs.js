const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const SOURCE_DIR = path.join(ROOT_DIR, '_site');
const TARGET_DIR = path.join(ROOT_DIR, 'docs');
const SITEMAP_SOURCE = path.join(ROOT_DIR, 'sitemap.xml');
const SITEMAP_TARGET = path.join(TARGET_DIR, 'sitemap.xml');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);

  if (stat.isDirectory()) {
    ensureDir(dest);
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

function clearTarget(dir) {
  if (!fs.existsSync(dir)) {
    return;
  }

  for (const entry of fs.readdirSync(dir)) {
    if (entry === '.nojekyll') {
      continue;
    }

    const entryPath = path.join(dir, entry);
    fs.rmSync(entryPath, { recursive: true, force: true });
  }
}

if (!fs.existsSync(SOURCE_DIR)) {
  console.error('Build directory not found. Run `npm run build` first.');
  process.exit(1);
}

ensureDir(TARGET_DIR);
clearTarget(TARGET_DIR);
copyRecursive(SOURCE_DIR, TARGET_DIR);

if (fs.existsSync(SITEMAP_SOURCE)) {
  fs.copyFileSync(SITEMAP_SOURCE, SITEMAP_TARGET);
}

fs.writeFileSync(path.join(TARGET_DIR, '.nojekyll'), '');

console.log('✅ Copied _site/ to docs/ and preserved docs/.nojekyll');
if (fs.existsSync(SITEMAP_SOURCE)) {
  console.log('✅ Copied sitemap.xml to docs/sitemap.xml');
} else {
  console.log('⚠️ sitemap.xml was not found in the repo root.');
}
