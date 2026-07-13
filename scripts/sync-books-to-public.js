/**
 * Copy books/*.epub into public/books/ and write manifest.json for the app.
 * Same-origin serving avoids Firebase Storage CORS in the browser.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const srcDir = path.join(root, 'books');
const destDir = path.join(root, 'public', 'books');

const titleFromId = (id) =>
  id
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());

fs.mkdirSync(destDir, { recursive: true });

const epubs = fs.readdirSync(srcDir).filter((f) => f.toLowerCase().endsWith('.epub'));
if (epubs.length === 0) {
  console.log('No .epub files in books/ — skipping.');
  process.exit(0);
}

const manifest = epubs
  .map((filename) => {
    const id = filename.slice(0, -'.epub'.length);
    fs.copyFileSync(path.join(srcDir, filename), path.join(destDir, filename));
    console.log(`Copied ${filename} -> public/books/`);
    return { id, title: titleFromId(id) };
  })
  .sort((a, b) => a.title.localeCompare(b.title));

fs.writeFileSync(path.join(destDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`Wrote manifest.json (${manifest.length} book(s))`);
