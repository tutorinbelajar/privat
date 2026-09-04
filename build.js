const fs = require('fs');

for (const file of ['assessment-need.html', 'assessment-method.html']) {
  if (!fs.existsSync(file)) continue;
  let html = fs.readFileSync(file, 'utf8');
  const tag = '<script src="assessment-ai.js"></script>';
  if (!html.includes(tag)) {
    html = html.replace('</body>', `${tag}</body>`);
    fs.writeFileSync(file, html, 'utf8');
  }
}
