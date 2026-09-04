const fs = require('fs');
const path = require('path');

const root = process.cwd();
const out = path.join(root, 'dist');
const excluded = new Set(['.git', '.vercel', 'dist', 'node_modules']);

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

function copyEntry(name) {
  if (excluded.has(name)) return;
  const src = path.join(root, name);
  const dest = path.join(out, name);
  fs.cpSync(src, dest, { recursive: true });
}

for (const name of fs.readdirSync(root)) copyEntry(name);

for (const file of ['assessment-need.html', 'assessment-method.html']) {
  const target = path.join(out, file);
  if (!fs.existsSync(target)) continue;
  let html = fs.readFileSync(target, 'utf8');
  const tag = '<script src="assessment-ai.js"></script>';
  if (!html.includes(tag)) {
    const marker = '</body>';
    if (!html.includes(marker)) throw new Error(`Missing ${marker} in ${file}`);
    html = html.replace(marker, `${tag}${marker}`);
    fs.writeFileSync(target, html, 'utf8');
  }
}

console.log('Tutorin build complete: dist/ created and assessment AI client injected.');
