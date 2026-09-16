/**
 * Write the navigation into every page from nav.json.
 *
 * Seven pages carried seven copies of the header, and the licence texts
 * across this estate showed what happens to copies over a year. One
 * definition, one script, and a header nobody edits by hand.
 *
 *   node scripts/nav.mjs            write
 *   node scripts/nav.mjs --check    exit 1 if any page is out of date
 *
 * The markers are HTML comments, so a page keeps rendering if this script is
 * never run again.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const NAV = JSON.parse(readFileSync(join(root, 'nav.json'), 'utf8'));
const OPEN = '<!-- NAV:start -->';
const CLOSE = '<!-- NAV:end -->';

/** Which nav item a page is, so it can be marked active. */
const ACTIVE = {
  'index.html': 'home',
  'about.html': 'about',
  'contact.html': 'contact',
  'license/index.html': 'legal',
  // terms, privacy and anchor are reached from the footer and mark nothing
};

function pages() {
  const top = readdirSync(root).filter((f) => f.endsWith('.html'));
  return [...top, 'license/index.html'];
}

/** A page one directory down needs `../` on every local link. */
function href(item, depth) {
  if (/^https?:/.test(item.href)) return item.href;
  return depth ? '../'.repeat(depth) + item.href : item.href;
}

function block(page) {
  const depth = page.includes('/') ? page.split('/').length - 1 : 0;
  const active = ACTIVE[page] ?? null;
  const items = NAV.items
    .map((i) => {
      const cls = i.id === active ? ' class="active"' : '';
      return `          <li><a href="${href(i, depth)}"${cls}>${i.label}</a></li>`;
    })
    .join('\n');
  return `${OPEN}\n${items}\n        ${CLOSE}`;
}

let changed = 0;
let stale = [];

for (const page of pages()) {
  const path = join(root, page);
  const before = readFileSync(path, 'utf8');
  let after;

  if (before.includes(OPEN)) {
    after = before.replace(new RegExp(`${OPEN}[\\s\\S]*?${CLOSE}`), block(page));
  } else {
    // First run: replace the hand-written <ul> inside the main nav.
    const ul = /(<nav class="site-nav"[^>]*>\s*<ul>)([\s\S]*?)(<\/ul>)/;
    if (!ul.test(before)) {
      console.error(`${page}: no site-nav list found — left alone`);
      continue;
    }
    after = before.replace(ul, (_m, open, _body, close) => `${open}\n        ${block(page)}\n        ${close}`);
  }

  if (after === before) continue;
  if (process.argv.includes('--check')) { stale.push(page); continue; }
  writeFileSync(path, after);
  changed++;
  console.log(`${page}: navigation written`);
}

if (process.argv.includes('--check')) {
  if (stale.length) {
    console.error(`out of date: ${stale.join(', ')}\nrun: node scripts/nav.mjs`);
    process.exit(1);
  }
  console.log(`all pages carry the navigation in nav.json`);
} else {
  console.log(`${changed} page(s) updated`);
}
