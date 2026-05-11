const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const TARGET_DIR = path.join(ROOT_DIR, 'docs');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
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

ensureDir(TARGET_DIR);
clearTarget(TARGET_DIR);
console.log(`Cleared ${TARGET_DIR} except for .nojekyll`);
